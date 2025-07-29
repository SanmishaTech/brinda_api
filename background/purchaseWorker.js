// background/updatePVWorker.js
// const { updatePVBalance } = require("../utils/updatePVBalance"); // adjust path
const { PrismaClient, Prisma } = require("@prisma/client");
const prisma = new PrismaClient();
const {
  generateUserProductPurchaseInvoice,
} = require("../src/controllers/purchaseController");
const { updatePVBalance } = require("../src/utils/updatePVBalance");
const { CREDIT, APPROVED, INCREMENT, INACTIVE } = require("../src/config/data");

const logger = require("../src/utils/logger");
process.on("message", async (data) => {
  try {
    const {
      user,
      totalAmountWithoutGst,
      totalAmountWithGst,
      totalGstAmount,
      totalProductPV,
      purchaseDetails,
    } = data;

    const newPurchase = await prisma.purchase.create({
      data: {
        memberId: user.member.id,
        purchaseDate: new Date(),
        totalAmountWithoutGst: new Prisma.Decimal(totalAmountWithoutGst),
        totalAmountWithGst: new Prisma.Decimal(totalAmountWithGst),
        totalGstAmount: new Prisma.Decimal(totalGstAmount),
        totalProductPV: new Prisma.Decimal(totalProductPV),
        state: user.member.memberState,
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

    let member = await prisma.member.update({
      where: { id: user.member.id },
      data: {
        walletBalance: {
          decrement: new Prisma.Decimal(totalAmountWithGst),
        },
      },
    });
    logger.info("working1");

    const invoiceNumber = await generateUserProductPurchaseInvoice(
      newPurchase.id
    );

    logger.info("working2");

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
        notes: `Products Purchased (${invoiceNumber})`,
        transactionDate: new Date(),
      },
    });
  } catch (error) {
    logger.info("Error in background PV update:", error);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
});
