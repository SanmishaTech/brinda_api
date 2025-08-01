// background/updatePVWorker.js
const { PrismaClient, Prisma } = require("@prisma/client");
const prisma = new PrismaClient();
const { CREDIT, APPROVED, INCREMENT, INACTIVE } = require("../src/config/data");
const logger = require("../src/utils/logger");
const {
  generateUserProductRepurchaseInvoice,
} = require("../src/controllers/repurchaseController");
const {
  applyRepurchaseCashback,
} = require("../src/utils/applyRepurchaseCashback");
const {
  distributeRepurchaseIncome,
} = require("../src/utils/distributeRepurchaseIncome");
const {
  distributeRepurchaseMentorIncome,
} = require("../src/utils/distributeRepurchaseMentorIncome");

process.on("message", async (data) => {
  try {
    const {
      user,
      totalAmountWithoutGst,
      totalAmountWithGst,
      totalGstAmount,
      totalProductBV,
      repurchaseDetails,
    } = data;

    const newRepurchase = await prisma.repurchase.create({
      data: {
        memberId: user.member.id,
        repurchaseDate: new Date(),
        totalAmountWithoutGst: new Prisma.Decimal(totalAmountWithoutGst),
        totalAmountWithGst: new Prisma.Decimal(totalAmountWithGst),
        totalGstAmount: new Prisma.Decimal(totalGstAmount),
        totalProductBV: new Prisma.Decimal(totalProductBV),
        state: user.member.memberState,
        repurchaseDetails: {
          create: repurchaseDetails.map((detail) => ({
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
            bvPerUnit: new Prisma.Decimal(detail.bvPerUnit),
            totalBV: new Prisma.Decimal(detail.totalBV),
          })),
        },
      },
    });

    const invoiceNumber = await generateUserProductRepurchaseInvoice(
      newRepurchase.id
    );

    const memberLog = await prisma.memberLog.create({
      data: {
        memberId: user.member.id,
        message: `Products  Repurchased (${invoiceNumber})`,
        bv: new Prisma.Decimal(totalProductBV),
        pv: "0.00",
      },
    });

    const transaction = await prisma.walletTransaction.create({
      data: {
        memberId: user.member.id,
        amount: new Prisma.Decimal(totalAmountWithGst),
        type: CREDIT,
        status: APPROVED,
        notes: `Products Repurchased (${invoiceNumber})`,
        transactionDate: new Date(),
      },
    });

    let member = await prisma.member.findUnique({
      where: { id: user.member.id },
      select: { id: true, percentage: true, status: true, sponsorId: true },
    });

    // repurchase logic start
    member = await applyRepurchaseCashback(member, totalAmountWithGst);
    const mentorCandidates = await distributeRepurchaseIncome(
      member,
      totalProductBV
    );
    await distributeRepurchaseMentorIncome(mentorCandidates);
    // repurchase logic end

    logger.info(`Repurchase Done MemberId: ${user.member.id}`);
  } catch (error) {
    logger.info("Error in background Repurchase:", error);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
});
