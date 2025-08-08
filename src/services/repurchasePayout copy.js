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
        SUM(r.totalAmountWithGst) AS totalRepurchaseAmount,
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
            m.status,
            SUM(r.totalAmountWithGst) AS totalRepurchaseAmount
          FROM members m
          JOIN repurchases r ON r.memberId = m.id
            AND r.createdAt >= ${startOfPrevMonth}
            AND r.createdAt < ${startOfCurrMonth}
          WHERE m.status NOT IN (${INACTIVE}, ${ASSOCIATE})
            AND m.isDirectMatch = TRUE
            AND m.is2_1Pass = TRUE
          GROUP BY m.id
          HAVING SUM(r.totalAmountWithGst) < ${MINIMUM_REPURCHASE_TOTAL}
        `;

    if (filteredMembers.length !== 0) {
      const commissionData = [];
      const nonDiamondData = [];
      const walletUpdateData = [];

      for (const member of filteredMembers) {
        const MMI1 = new Prisma.Decimal(member.matchingMentorIncomeL1 ?? 0);
        const MMI2 = new Prisma.Decimal(member.matchingMentorIncomeL2 ?? 0);
        const RCashback = new Prisma.Decimal(
          member.repurchaseCashbackIncome ?? 0
        );
        const RIncome = new Prisma.Decimal(member.repurchaseIncome ?? 0);
        const RMI1 = new Prisma.Decimal(member.repurchaseMentorIncomeL1 ?? 0);
        const RMI2 = new Prisma.Decimal(member.repurchaseMentorIncomeL2 ?? 0);
        const RMI3 = new Prisma.Decimal(member.repurchaseMentorIncomeL3 ?? 0);
        const totalCommissionAmount = new Prisma.Decimal(
          member.totalCommissionAmount ?? 0
        );
        const isDiamond = member.status === DIAMOND;

        const TDS_PERCENT_USED = calculateTDS ? TDS_PERCENT : 0;

        if (isDiamond) {
          const TDSAmount = totalCommissionAmount
            .mul(TDS_PERCENT_USED)
            .div(100);
          const platformChargeAmount = totalCommissionAmount
            .mul(PLATFORM_CHARGE_PERCENT)
            .div(100);
          const totalAmountToGive = totalCommissionAmount
            .sub(TDSAmount)
            .sub(platformChargeAmount);

          // Only push if totalAmountToGive is greater than 0
          if (totalAmountToGive.gt(0)) {
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
              platformChargePercent: new Prisma.Decimal(
                PLATFORM_CHARGE_PERCENT
              ),
              platformChargeAmount: new Prisma.Decimal(platformChargeAmount),
              totalAmountBeforeDeduction: totalCommissionAmount,
              totalAmountToGive: new Prisma.Decimal(totalAmountToGive),
              isPaid: false,
              createdAt: new Date(),
            });
          }
        } else {
          // Only include RIncome, RMI1, RMI2, RMI3
          const subtotal = RIncome.add(RMI1).add(RMI2).add(RMI3);

          const TDSAmount = subtotal.mul(TDS_PERCENT_USED).div(100);
          const platformChargeAmount = subtotal
            .mul(PLATFORM_CHARGE_PERCENT)
            .div(100);
          const totalAmountToGive = subtotal
            .sub(TDSAmount)
            .sub(platformChargeAmount);

          if (totalAmountToGive.gt(0)) {
            nonDiamondData.push({
              memberId: member.id,
              repurchaseIncome: RIncome,
              RMI1,
              RMI2,
              RMI3,
              TDSPercent: new Prisma.Decimal(TDS_PERCENT_USED),
              TDSAmount: new Prisma.Decimal(TDSAmount),
              platformChargePercent: new Prisma.Decimal(
                PLATFORM_CHARGE_PERCENT
              ),
              platformChargeAmount: new Prisma.Decimal(platformChargeAmount),
              totalAmountBeforeDeduction: subtotal,
              totalAmountToGive: new Prisma.Decimal(totalAmountToGive),
              isPaid: false,
              createdAt: new Date(),
            });
          }

          // This is always pushed, regardless of totalAmountToGive
          const amountToAddInWallet = MMI1.add(MMI2).add(RCashback);

          if (amountToAddInWallet.gt(0)) {
            walletUpdateData.push({
              memberId: member.id,
              amountToAddInWallet,
            });
          }
        }
      }

      for (let i = 0; i < commissionData.length; i += BATCH_SIZE) {
        const batch = commissionData.slice(i, i + BATCH_SIZE);

        // 1️⃣ Insert commissions for DIAMOND members only

        if (batch.length > 0) {
          await prisma.repurchaseIncomeCommission.createMany({
            data: batch,
            skipDuplicates: true,
          });
        }

        logger.info(`Inserted Diamond batch ${Math.floor(i / BATCH_SIZE) + 1}`);
      }

      // 🔹 Insert Non-Diamond commissions
      for (let i = 0; i < nonDiamondData.length; i += BATCH_SIZE) {
        const batch = nonDiamondData.slice(i, i + BATCH_SIZE);

        if (batch.length > 0) {
          await prisma.repurchaseIncomeCommission.createMany({
            data: batch,
            skipDuplicates: true,
          });
        }
        logger.info(
          `Inserted non-diamond batch ${Math.floor(i / BATCH_SIZE) + 1}`
        );
      }

      // 🔹 Insert walletData commissions start
      // for (let i = 0; i < walletUpdateData.length; i += BATCH_SIZE) {
      //   const batch = walletUpdateData.slice(i, i + BATCH_SIZE);

      //   // 1 Update upgradeWalletBalance for non-DIAMOND members sequentially
      //   for (const member of batch) {
      //     await prisma.member.update({
      //       where: { id: member.memberId },
      //       data: {
      //         upgradeWalletBalance: {
      //           increment: member.amountToAddInWallet,
      //         },
      //       },
      //     });
      //   }
      //   logger.info(`Inserted wallet batch ${Math.floor(i / BATCH_SIZE) + 1}`);
      // }
      for (let i = 0; i < walletUpdateData.length; i += BATCH_SIZE) {
        const batch = walletUpdateData.slice(i, i + BATCH_SIZE);

        await Promise.all(
          batch.map((member) =>
            prisma.member.update({
              where: { id: member.memberId },
              data: {
                upgradeWalletBalance: {
                  increment: member.amountToAddInWallet,
                },
              },
            })
          )
        );

        logger.info(`Inserted wallet batch ${Math.floor(i / BATCH_SIZE) + 1}`);
      }

      // 🔹 Insert walletData commissions end
    } else {
      logger.info("No members found with sufficient repurchase amount.");
    }

    // start
    if (lowRepurchaseMembers.length !== 0) {
      const commissionData = [];
      const nonDiamondData = [];

      for (const member of lowRepurchaseMembers) {
        const isDiamond = member.status === DIAMOND;
        const RCashback = new Prisma.Decimal(member.repurchaseCashbackIncome);

        const TDS_PERCENT_USED = calculateTDS ? TDS_PERCENT : 0;

        const TDSAmount = RCashback.mul(TDS_PERCENT_USED).div(100);

        const platformChargeAmount = RCashback.mul(PLATFORM_CHARGE_PERCENT).div(
          100
        );

        const totalAmountToGive =
          RCashback.sub(TDSAmount).sub(platformChargeAmount);

        if (isDiamond) {
          if (totalAmountToGive.gt(0)) {
            commissionData.push({
              memberId: member.id,
              repurchaseCashbackIncome: RCashback,
              TDSPercent: new Prisma.Decimal(TDS_PERCENT_USED),
              TDSAmount: new Prisma.Decimal(TDSAmount),
              platformChargePercent: new Prisma.Decimal(
                PLATFORM_CHARGE_PERCENT
              ),
              platformChargeAmount: new Prisma.Decimal(platformChargeAmount),
              totalAmountBeforeDeduction: RCashback,
              totalAmountToGive: new Prisma.Decimal(totalAmountToGive),
              isPaid: false,
              createdAt: new Date(),
            });
          }
        } else {
          if (RCashback.gt(0)) {
            nonDiamondData.push({
              memberId: member.id,
              repurchaseCashbackIncome: RCashback,
            });
          }
        }
      }

      for (let i = 0; i < commissionData.length; i += BATCH_SIZE) {
        const batch = commissionData.slice(i, i + BATCH_SIZE);

        // ✅ Insert commissions for DIAMOND members only
        await prisma.repurchaseIncomeCommission.createMany({
          data: batch,
          skipDuplicates: true,
        });

        logger.info(
          `Inserted Cashback batch ${Math.floor(i / BATCH_SIZE) + 1}`
        );
      }

      // start upgradeWalletBalance for non-DIAMOND members
      // for (let i = 0; i < nonDiamondData.length; i += BATCH_SIZE) {
      //   const batch = nonDiamondData.slice(i, i + BATCH_SIZE);

      //   // ✅ Update upgradeWalletBalance for non-DIAMOND members
      //   for (const member of batch) {
      //     await prisma.member.update({
      //       where: { id: member.memberId },
      //       data: {
      //         upgradeWalletBalance: {
      //           increment: new Prisma.Decimal(member.repurchaseCashbackIncome),
      //         },
      //       },
      //     });
      //   }

      //   logger.info(
      //     `Inserted upgrade wallet for non-diamnd low repurchase batch ${
      //       Math.floor(i / BATCH_SIZE) + 1
      //     }`
      //   );
      // }
      for (let i = 0; i < nonDiamondData.length; i += BATCH_SIZE) {
        const batch = nonDiamondData.slice(i, i + BATCH_SIZE);

        // Run updates in parallel within the batch
        await Promise.all(
          batch.map((member) =>
            prisma.member.update({
              where: { id: member.memberId },
              data: {
                upgradeWalletBalance: {
                  increment: new Prisma.Decimal(
                    member.repurchaseCashbackIncome
                  ),
                },
              },
            })
          )
        );

        logger.info(
          `Inserted upgrade wallet for non-diamond low repurchase batch ${
            Math.floor(i / BATCH_SIZE) + 1
          }`
        );
      }

      // end upgradeWalletBalance for non-DIAMOND members
    } else {
      logger.info(
        "No members With Cashback found with insufficient repurchase amount."
      );
    }
    // end

    await prisma.member.updateMany({
      where: {
        status: { not: INACTIVE },
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

    logger.info(
      `Total updated records: ${
        filteredMembers.length + lowRepurchaseMembers.length
      }`
    );
  } catch (error) {
    logger.error(`❌ Error in RepurchasePayout: ${error.message || error}`);
  }
};
// repurchase logic is still incomplete,
// u are not adding amount in upgrade wallet of not diamond and etc
module.exports = { repurchasePayout };
