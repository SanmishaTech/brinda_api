const { PrismaClient, Prisma } = require("@prisma/client");
const prisma = require("../config/db");
const { z } = require("zod");
const validateRequest = require("./validateRequest");
const createError = require("http-errors");
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
dayjs.extend(utc);
const logger = require("./logger"); // Assuming you have a logger utility
const today = dayjs().utc().startOf("day").toDate();
const {
  CREDIT,
  APPROVED,
  INCREMENT,
  SELF,
  ASSOCIATE,
  LEFT,
  RIGHT,
  SILVER,
  GOLD,
  DIAMOND,
  ASSOCIATE_COMMISSION,
  GOLD_COMMISSION,
  SILVER_COMMISSION,
  DIAMOND_COMMISSION,
  MAX_COMMISSIONS_PER_DAY,
  DEBIT,
  MATCHING_INCOME_WALLET,
  TOP,
  FUND_WALLET,
} = require("../config/data");
const { updatePVBalance } = require("./updatePVBalance");

const {
  generateUserProductPurchaseInvoice,
} = require("../controllers/purchaseController");

const handlePurchase = async (data) => {
  const {
    user,
    totalAmountWithoutGst,
    totalAmountWithGst,
    totalGstAmount,
    totalProductPV,
    purchaseDetails,
    walletType,
  } = data;
  logger.info(`Purchase task for MemberId: ${user.member.id}`);

  const newPurchase = await prisma.purchase.create({
    data: {
      memberId: user.member.id,
      purchaseDate: new Date(),
      totalAmountWithoutGst: new Prisma.Decimal(totalAmountWithoutGst),
      totalAmountWithGst: new Prisma.Decimal(totalAmountWithGst),
      totalGstAmount: new Prisma.Decimal(totalGstAmount),
      totalProductPV: new Prisma.Decimal(totalProductPV),
      state: user.member.memberState,
      invoiceNumber: "TEMP",
      purchaseDetails: {
        create: purchaseDetails.map((detail) => ({
          productId: parseInt(detail.productId),
          quantity: detail.quantity,
          rate: new Prisma.Decimal(detail.rate),
          netUnitRate: new Prisma.Decimal(detail.netUnitRate),
          cgstPercent: new Prisma.Decimal(detail.cgstPercent),
          sgstPercent: new Prisma.Decimal(detail.sgstPercent),
          igstPercent: new Prisma.Decimal(detail.igstPercent),
          cgstAmount: new Prisma.Decimal(detail.cgstAmount),
          sgstAmount: new Prisma.Decimal(detail.sgstAmount),
          igstAmount: new Prisma.Decimal(detail.igstAmount),
          amountWithoutGst: new Prisma.Decimal(detail.amountWithoutGst),
          amountWithGst: new Prisma.Decimal(detail.amountWithGst),
          pvPerUnit: new Prisma.Decimal(detail.pvPerUnit),
          totalPV: new Prisma.Decimal(detail.totalPV),
        })),
      },
    },
  });

  const invoiceNumber = await generateUserProductPurchaseInvoice(
    newPurchase.id
  );
  const memberLog = await prisma.memberLog.create({
    data: {
      memberId: user.member.id,
      message: `Products  Purchased (${invoiceNumber})`,
      pv: new Prisma.Decimal(totalProductPV),
      bv: "0.00",
    },
  });

  member = await updatePVBalance(INCREMENT, totalProductPV, user.member.id);

  const transaction = await prisma.walletTransaction.create({
    data: {
      memberId: user.member.id,
      amount: new Prisma.Decimal(totalAmountWithGst),
      type: CREDIT,
      status: APPROVED,
      walletType: walletType,
      notes: `Products Purchased (${invoiceNumber})`,
      transactionDate: new Date(),
    },
  });
  logger.info(`Purchase Done MemberId: ${user.member.id}`);
};

module.exports = { handlePurchase };
