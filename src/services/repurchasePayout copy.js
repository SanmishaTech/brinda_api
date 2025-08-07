const { PrismaClient, Prisma } = require("@prisma/client");
const prisma = new PrismaClient();
const dayjs = require("dayjs");
const logger = require("../utils/logger");
const {
  INACTIVE,
  MINIMUM_REPURCHASE_TOTAL,
  TDS_PERCENT,
  PLATFORM_CHARGE_PERCENT,
  ASSOCIATE,
  DIAMOND,
} = require("../config/data");

const BATCH_SIZE = 300;
const calculateTDS = process.env.CALCULATE_TDS === "true";

const repurchasePayout = async () => {
  const startOfPrevMonth = dayjs()
    .subtract(1, "month")
    .startOf("month")
    .format("YYYY-MM-DD HH:mm:ss");

  const startOfCurrMonth = dayjs()
    .startOf("month")
    .format("YYYY-MM-DD HH:mm:ss");

  try {
    const filteredMembers = await prisma.$queryRaw`
      SELECT 
        m.id,
        m.status,
        m.matchingMentorIncomeL1,
        m.matchingMentorIncomeL2,
        m.repurchaseIncome,
        m.repurchaseCashbackIncome,
        m.repurchaseMentorIncomeL1,
        m.repurchaseMentorIncomeL2,
        m.repurchaseMentorIncomeL3,
        SUM(r.amount) AS totalRepurchaseAmount,
        (
          m.matchingMentorIncomeL1 +
          m.matchingMentorIncomeL2 +
          m.repurchaseIncome +
          m.repurchaseCashbackIncome +
          m.repurchaseMentorIncomeL1 +
          m.repurchaseMentorIncomeL2 +
          m.repurchaseMentorIncomeL3
        ) AS totalCommissionAmount
      FROM members m
      JOIN repurchases r ON r.memberId = m.id
        AND r.createdAt >= ${startOfPrevMonth}
        AND r.createdAt < ${startOfCurrMonth}
      WHERE m.status != ${INACTIVE}
         AND m.status != ${ASSOCIATE}
        AND m.isDirectMatch = TRUE
        AND m.is2_1Pass = TRUE
      GROUP BY m.id
      HAVING 
      totalRepurchaseAmount >= ${MINIMUM_REPURCHASE_TOTAL}
    `;

    const lowRepurchaseMembers = await prisma.$queryRaw`
          SELECT
            m.id,
            m.repurchaseCashbackIncome,
            SUM(r.totalAmountWithGst) AS totalRepurchaseAmount
          FROM members m
          JOIN repurchases r ON r.memberId = m.id
            AND r.createdAt >= ${startOfPrevMonth}
            AND r.createdAt < ${startOfCurrMonth}
          WHERE m.status NOT IN (${INACTIVE}, ${ASSOCIATE})
            AND m.isDirectMatch = TRUE
            AND m.is2_1Pass = TRUE
          GROUP BY m.id
          HAVING SUM(r.totalAmountWithGst) < 700
        `;

    if (filteredMembers.length === 0) {
      logger.info("No eligible members found for repurchase payout.");
      return;
    }

    const commissionData = [];

    for (const member of filteredMembers) {
      // satrt
      if (member.status !== DIAMOND) {
        await prisma.member.update({
          where: { id: member.id },
          data: {
            upgradeWalletBalance: {
              increment:
                member.matchingMentorIncomeL1 +
                member.matchingMentorIncomeL2 +
                member.repurchaseCashbackIncome,
            },
          },
        });
      }
      // end
      const MMI1 = new Prisma.Decimal(member.matchingMentorIncomeL1);
      const MMI2 = new Prisma.Decimal(member.matchingMentorIncomeL2);
      const RIncome = new Prisma.Decimal(member.repurchaseIncome);
      const RCashback = new Prisma.Decimal(member.repurchaseCashbackIncome);
      const RMI1 = new Prisma.Decimal(member.repurchaseMentorIncomeL1);
      const RMI2 = new Prisma.Decimal(member.repurchaseMentorIncomeL2);
      const RMI3 = new Prisma.Decimal(member.repurchaseMentorIncomeL3);

      const totalCommissionAmount = new Prisma.Decimal(
        member.totalCommissionAmount
      );
      const TDS_PERCENT_USED = calculateTDS ? TDS_PERCENT : 0;

      const TDSAmount = totalCommissionAmount
        .mul(TDS_PERCENT_USED)
        .div(100)
        .toFixed(2);

      const platformChargeAmount = totalCommissionAmount
        .mul(PLATFORM_CHARGE_PERCENT)
        .div(100)
        .toFixed(2);

      const totalAmountToGive = totalCommissionAmount
        .sub(TDSAmount)
        .sub(platformChargeAmount)
        .toFixed(2);

      commissionData.push({
        memberId: member.id,
        MMI1,
        MMI2,
        repurchaseIncome: RIncome,
        repurchaseCashbackIncome: RCashback,
        RMI1,
        RMI2,
        RMI3,
        TDSPercent: new Prisma.Decimal(TDS_PERCENT_USED),
        TDSAmount: new Prisma.Decimal(TDSAmount),
        platformChargePercent: new Prisma.Decimal(PLATFORM_CHARGE_PERCENT),
        platformChargeAmount: new Prisma.Decimal(platformChargeAmount),
        totalAmountBeforeDeduction: totalCommissionAmount,
        totalAmountToGive: new Prisma.Decimal(totalAmountToGive),
        isPaid: false,
        createdAt: new Date(),
      });
    }

    for (let i = 0; i < commissionData.length; i += BATCH_SIZE) {
      const batch = commissionData.slice(i, i + BATCH_SIZE);

      await prisma.repurchaseIncomeCommission.createMany({
        data: batch,
        skipDuplicates: true,
      });

      await prisma.member.updateMany({
        where: {
          id: { in: batch.map((item) => item.memberId) },
        },
        data: {
          matchingMentorIncomeL1: new Prisma.Decimal(0),
          matchingMentorIncomeL2: new Prisma.Decimal(0),
          repurchaseIncome: new Prisma.Decimal(0),
          repurchaseCashbackIncome: new Prisma.Decimal(0),
          repurchaseMentorIncomeL1: new Prisma.Decimal(0),
          repurchaseMentorIncomeL2: new Prisma.Decimal(0),
          repurchaseMentorIncomeL3: new Prisma.Decimal(0),
        },
      });

      logger.info(`Inserted batch ${Math.floor(i / BATCH_SIZE) + 1}`);
    }

    logger.info(`Total inserted records: ${commissionData.length}`);
  } catch (error) {
    logger.error(`❌ Error in RepurchasePayout: ${error.message || error}`);
  }
};
// repurchase logic is still incomplete,
// u are not adding amount in upgrade wallet of not diamond and etc
module.exports = { repurchasePayout };
