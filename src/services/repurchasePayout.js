const { PrismaClient, Prisma } = require("@prisma/client");
const prisma = require("../config/db");
const dayjs = require("dayjs");
const logger = require("../utils/logger");
const {
  INACTIVE,
  MINIMUM_REPURCHASE_TOTAL,
  TDS_PERCENT,
  PLATFORM_CHARGE_PERCENT,
  ASSOCIATE,
  DIAMOND,
  CREDIT,
  CASHBACK_PERCENT,
  DEBIT,
  UPGRADE_WALLET,
  REJECTED,
  HOLD_WALLET,
  APPROVED,
  PENDING,
} = require("../config/data");

const BATCH_SIZE = 150;
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
    // members with 700rs repurchase
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

    // members with repurchase less than 700rs
    // const lowRepurchaseMembers = await prisma.$queryRaw`
    //       SELECT
    //         m.id,
    //         m.repurchaseCashbackIncome,
    //         m.status,
    //         m.matchingMentorIncomeL1,
    //         m.matchingMentorIncomeL2,
    //         m.repurchaseIncome,
    //         m.repurchaseMentorIncomeL1,
    //         m.repurchaseMentorIncomeL2,
    //         m.repurchaseMentorIncomeL3,
    //         SUM(r.totalAmountWithGst) AS totalRepurchaseAmount
    //       FROM members m
    //       JOIN repurchases r ON r.memberId = m.id
    //         AND r.createdAt >= ${startOfPrevMonth}
    //         AND r.createdAt < ${startOfCurrMonth}
    //       WHERE m.status NOT IN (${INACTIVE}, ${ASSOCIATE})
    //         AND m.isDirectMatch = TRUE
    //         AND m.is2_1Pass = TRUE
    //       GROUP BY m.id
    //       HAVING SUM(r.totalAmountWithGst) < ${MINIMUM_REPURCHASE_TOTAL}
    //     `;
    const lowRepurchaseMembers = await prisma.$queryRaw`
          SELECT
            m.id,
            m.repurchaseCashbackIncome,
            m.status,
            m.matchingMentorIncomeL1,
            m.matchingMentorIncomeL2,
            m.repurchaseIncome,
            m.repurchaseMentorIncomeL1,
            m.repurchaseMentorIncomeL2,
            m.repurchaseMentorIncomeL3,
            COALESCE(SUM(r.totalAmountWithGst), 0) AS totalRepurchaseAmount
          FROM members m
          LEFT JOIN repurchases r ON r.memberId = m.id
            AND r.createdAt >= ${startOfPrevMonth}
            AND r.createdAt < ${startOfCurrMonth}
          WHERE m.status NOT IN (${INACTIVE}, ${ASSOCIATE})
            AND m.isDirectMatch = TRUE
            AND m.is2_1Pass = TRUE
          GROUP BY m.id
          HAVING COALESCE(SUM(r.totalAmountWithGst), 0) < ${MINIMUM_REPURCHASE_TOTAL}
        `;

    // logger.info(`lowRepurchaseMembers =  ${lowRepurchaseMembers}`);
    // logger.info(
    //   `lowRepurchaseMembers length =  ${lowRepurchaseMembers.length}`
    // );

    if (filteredMembers.length !== 0) {
      const commissionData = []; // Array to hold commission data for DIAMOND members with sufficient repurchase
      const nonDiamondData = []; // Array to hold commission data for non-DIAMOND members with sufficient repurchase
      const walletUpdateData = []; // Array to hold wallet update data for non-DIAMOND members with sufficient repurchase

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
          if (totalCommissionAmount.gt(0)) {
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
          // was here. above part is done
          // Only include RIncome, RMI1, RMI2, RMI3
          const subtotal = RIncome.add(RMI1).add(RMI2).add(RMI3);
          // logger.info("working");
          const TDSAmount = subtotal.mul(TDS_PERCENT_USED).div(100);
          const platformChargeAmount = subtotal
            .mul(PLATFORM_CHARGE_PERCENT)
            .div(100);
          const totalAmountToGive = subtotal
            .sub(TDSAmount)
            .sub(platformChargeAmount);
          // logger.info(`subtotal = ${subtotal}`);

          // if (subtotal.gt(0)) {
          nonDiamondData.push({
            memberId: member.id,
            repurchaseIncome: RIncome,
            RMI1,
            RMI2,
            RMI3,
            TDSPercent: new Prisma.Decimal(TDS_PERCENT_USED),
            TDSAmount: new Prisma.Decimal(TDSAmount),
            platformChargePercent: new Prisma.Decimal(PLATFORM_CHARGE_PERCENT),
            platformChargeAmount: new Prisma.Decimal(platformChargeAmount),
            totalAmountBeforeDeduction: subtotal,
            totalAmountToGive: new Prisma.Decimal(totalAmountToGive),
            isPaid: false,
            createdAt: new Date(),
          });
          // }

          // This is always pushed, regardless of totalAmountToGive
          const amountToAddInWallet = MMI1.add(MMI2).add(RCashback);
          // logger.info(`amountToAddInWallet = ${amountToAddInWallet}`);

          if (amountToAddInWallet.gt(0)) {
            walletUpdateData.push({
              memberId: member.id,
              amountToAddInWallet,
              MMI1: MMI1,
              MMI2: MMI2,
              RCashback: RCashback,
            });
          }
        }
      }

      //  start
      for (let i = 0; i < commissionData.length; i += BATCH_SIZE) {
        const batch = commissionData.slice(i, i + BATCH_SIZE);

        const createPromises = batch.map(async (member) => {
          await prisma.walletTransaction.createMany({
            data: [
              ...(member.TDSAmount > 0
                ? [
                    {
                      memberId: member.memberId,
                      amount: member.TDSAmount,
                      type: CREDIT,
                      transactionDate: new Date(),
                      status: APPROVED,
                      walletType: HOLD_WALLET,
                      notes: `${member.TDSPercent}% TDS Amount Deducted.`,
                    },
                  ]
                : []),
              ...(parseFloat(member.platformChargeAmount) > 0
                ? [
                    {
                      memberId: member.memberId,
                      amount: member.platformChargeAmount,
                      type: CREDIT,
                      transactionDate: new Date(),
                      status: APPROVED,
                      walletType: HOLD_WALLET,
                      notes: `${member.platformChargePercent}% Platform Charge Deducted.`,
                    },
                  ]
                : []),
            ],
          });

          // Update the member's income fields and hold wallet balance
          // logger.info(`member = ${member.memberId}`);
          await prisma.member.update({
            where: { id: member.memberId },
            data: {
              matchingMentorIncomeL1: new Prisma.Decimal(0),
              matchingMentorIncomeL2: new Prisma.Decimal(0),
              repurchaseIncome: new Prisma.Decimal(0),
              repurchaseIncomeL1: new Prisma.Decimal(0),
              repurchaseIncomeL2: new Prisma.Decimal(0),
              repurchaseIncomeL3: new Prisma.Decimal(0),
              repurchaseIncomeL4: new Prisma.Decimal(0),
              repurchaseIncomeL5: new Prisma.Decimal(0),
              repurchaseIncomeL6: new Prisma.Decimal(0),
              repurchaseIncomeL7: new Prisma.Decimal(0),
              repurchaseIncomeL8: new Prisma.Decimal(0),
              repurchaseIncomeL9: new Prisma.Decimal(0),
              repurchaseIncomeL10: new Prisma.Decimal(0),
              repurchaseCashbackIncome: new Prisma.Decimal(0),
              repurchaseMentorIncomeL1: new Prisma.Decimal(0),
              repurchaseMentorIncomeL2: new Prisma.Decimal(0),
              repurchaseMentorIncomeL3: new Prisma.Decimal(0),
              holdWalletBalance: {
                decrement: member.totalAmountBeforeDeduction,
              },
              repurchaseIncomeCommissions: {
                create: {
                  MMI1: member.MMI1,
                  MMI2: member.MMI2,
                  repurchaseIncome: member.repurchaseIncome,
                  repurchaseCashbackIncome: member.repurchaseCashbackIncome,
                  RMI1: member.RMI1,
                  RMI2: member.RMI2,
                  RMI3: member.RMI3,
                  TDSPercent: member.TDSPercent,
                  TDSAmount: member.TDSAmount,
                  platformChargePercent: member.platformChargePercent,
                  platformChargeAmount: member.platformChargeAmount,
                  totalAmountBeforeDeduction: member.totalAmountBeforeDeduction,
                  totalAmountToGive: member.totalAmountToGive,
                  isPaid: false,
                  createdAt: new Date(),
                  // optionally add walletTransactionId if your model supports it
                  // walletTransactionId: walletTransaction.id,
                  walletTransaction: {
                    create: {
                      memberId: member.memberId,
                      amount: member.totalAmountToGive,
                      type: CREDIT,
                      transactionDate: new Date(),
                      status: PENDING,
                      walletType: HOLD_WALLET,
                      notes: "Transferring Hold Wallet Amount To your Bank.",
                    },
                  },
                },
              },
            },
          });
        });

        await Promise.all(createPromises); // runs all DB operations in parallel
        // totalInserted += batch.length;

        logger.info(
          `✅ Diamond members (sufficient repurchase) batch ${
            Math.floor(i / BATCH_SIZE) + 1
          } inserted`
        );
      }
      //  diamond with 700 repurchase done
      // end

      // 🔹 Insert Non-Diamond commissions
      // logger.info(`nonDiamondData.length = ${nonDiamondData.length}`);
      for (let i = 0; i < nonDiamondData.length; i += BATCH_SIZE) {
        const batch = nonDiamondData.slice(i, i + BATCH_SIZE);
        // logger.info("workingInfo2");
        // if (batch.length > 0) {
        //   await prisma.repurchaseIncomeCommission.createMany({
        //     data: batch,
        //     skipDuplicates: true,
        //   });
        // }
        const createPromises = batch.map(async (member) => {
          await prisma.walletTransaction.createMany({
            data: [
              ...(member.TDSAmount > 0
                ? [
                    {
                      memberId: member.memberId,
                      amount: member.TDSAmount,
                      type: CREDIT,
                      transactionDate: new Date(),
                      status: APPROVED,
                      walletType: HOLD_WALLET,
                      notes: `${member.TDSPercent}% TDS Amount Deducted.`,
                    },
                  ]
                : []),
              ...(member.platformChargeAmount > 0
                ? [
                    {
                      memberId: member.memberId,
                      amount: member.platformChargeAmount,
                      type: CREDIT,
                      transactionDate: new Date(),
                      status: APPROVED,
                      walletType: HOLD_WALLET,
                      notes: `${member.platformChargePercent}% Platform Charge Deducted.`,
                    },
                  ]
                : []),
            ],
          });

          // Update the member's income fields and hold wallet balance
          // logger.info(`member = ${member.memberId}`);

          await prisma.member.update({
            where: { id: member.memberId },
            data: {
              repurchaseIncome: new Prisma.Decimal(0),
              repurchaseIncomeL1: new Prisma.Decimal(0),
              repurchaseIncomeL2: new Prisma.Decimal(0),
              repurchaseIncomeL3: new Prisma.Decimal(0),
              repurchaseIncomeL4: new Prisma.Decimal(0),
              repurchaseIncomeL5: new Prisma.Decimal(0),
              repurchaseIncomeL6: new Prisma.Decimal(0),
              repurchaseIncomeL7: new Prisma.Decimal(0),
              repurchaseIncomeL8: new Prisma.Decimal(0),
              repurchaseIncomeL9: new Prisma.Decimal(0),
              repurchaseIncomeL10: new Prisma.Decimal(0),
              repurchaseMentorIncomeL1: new Prisma.Decimal(0),
              repurchaseMentorIncomeL2: new Prisma.Decimal(0),
              repurchaseMentorIncomeL3: new Prisma.Decimal(0),
              holdWalletBalance: {
                decrement: member.totalAmountBeforeDeduction,
              },
              ...(member.subtotal > 0
                ? {
                    repurchaseIncomeCommissions: {
                      create: {
                        repurchaseIncome: member.repurchaseIncome,
                        RMI1: member.RMI1,
                        RMI2: member.RMI2,
                        RMI3: member.RMI3,
                        TDSPercent: member.TDSPercent,
                        TDSAmount: member.TDSAmount,
                        platformChargePercent: member.platformChargePercent,
                        platformChargeAmount: member.platformChargeAmount,
                        totalAmountBeforeDeduction:
                          member.totalAmountBeforeDeduction,
                        totalAmountToGive: member.totalAmountToGive,
                        isPaid: false,
                        createdAt: new Date(),
                        // optionally add walletTransactionId if your model supports it
                        // walletTransactionId: walletTransaction.id,
                        walletTransaction: {
                          create: {
                            memberId: member.memberId,
                            amount: member.totalAmountToGive,
                            type: CREDIT,
                            transactionDate: new Date(),
                            status: PENDING,
                            walletType: HOLD_WALLET,
                            notes:
                              "Transferring Hold Wallet Amount To your Bank.",
                          },
                        },
                      },
                    },
                  }
                : {}),
            },
          });
        });

        await Promise.all(createPromises); // runs all DB operations in parallel
        // totalInserted += batch.length;

        logger.info(
          `✅ Diamond members (sufficient repurchase) batch ${
            Math.floor(i / BATCH_SIZE) + 1
          } inserted`
        );
      }
      // logger.info(`walletUpdateData = ${walletUpdateData.length}`);
      for (let i = 0; i < walletUpdateData.length; i += BATCH_SIZE) {
        const batch = walletUpdateData.slice(i, i + BATCH_SIZE);

        const results = await Promise.allSettled(
          batch.map((member) => {
            const rawWalletTransactions = [
              {
                amount: new Prisma.Decimal(member.MMI1),
                status: APPROVED,
                type: CREDIT,
                transactionDate: new Date(),
                walletType: HOLD_WALLET,
                notes: `Matching Mentor Income L1 Transferred To Upgrade Wallet.`,
              },
              {
                amount: new Prisma.Decimal(member.MMI2),
                status: APPROVED,
                type: CREDIT,
                transactionDate: new Date(),
                walletType: HOLD_WALLET,
                notes: `Matching Mentor Income L2 Transferred To Upgrade Wallet.`,
              },
              {
                amount: new Prisma.Decimal(member.RCashback),
                status: APPROVED,
                type: CREDIT,
                transactionDate: new Date(),
                walletType: HOLD_WALLET,
                notes: `${CASHBACK_PERCENT}% Cashback Income Transferred To Upgrade Wallet`,
              },
              {
                amount: new Prisma.Decimal(member.MMI1),
                status: APPROVED,
                type: DEBIT,
                transactionDate: new Date(),
                walletType: UPGRADE_WALLET,
                notes: `Matching Mentor Income L1 Received from Member's Hold Wallet.`,
              },
              {
                amount: new Prisma.Decimal(member.MMI2),
                status: APPROVED,
                type: DEBIT,
                transactionDate: new Date(),
                walletType: UPGRADE_WALLET,
                notes: `Matching Mentor Income L2 Received from Member's Hold Wallet.`,
              },
              {
                amount: new Prisma.Decimal(member.RCashback),
                status: APPROVED,
                type: DEBIT,
                transactionDate: new Date(),
                walletType: UPGRADE_WALLET,
                notes: `${CASHBACK_PERCENT}% Cashback Income Received from Member's Hold Wallet.`,
              },
            ];

            // ✅ Filter out entries with amount <= 0
            const walletTransactions = rawWalletTransactions.filter((txn) =>
              txn.amount.gt(0)
            );

            // logger.info(`member = ${member.memberId}`);
            return prisma.member.update({
              where: { id: member.memberId },
              data: {
                matchingMentorIncomeL1: new Prisma.Decimal(0),
                matchingMentorIncomeL2: new Prisma.Decimal(0),
                repurchaseCashbackIncome: new Prisma.Decimal(0),
                upgradeWalletBalance: {
                  increment: member.amountToAddInWallet,
                },
                holdWalletBalance: {
                  decrement: member.amountToAddInWallet,
                },
                walletTransactions: {
                  create: walletTransactions,
                },
              },
            });
          })
        );
        // Optional: log failures
        results.forEach((result, idx) => {
          if (result.status === "rejected") {
            logger.error(
              `Failed to update member's upgrade wallet ${batch[idx].memberId}: ${result.reason}`
            );
          }
        });

        logger.info(
          ` Upgrade wallet for Non-Diamond (sufficient repurchase) batch ${
            Math.floor(i / BATCH_SIZE) + 1
          }`
        );
      }

      // 🔹 Insert walletData commissions end done.
    } else {
      logger.info("No members found with sufficient repurchase amount.");
    }

    // start
    if (lowRepurchaseMembers.length !== 0) {
      const commissionData = []; // Array to hold commission data for DIAMOND members with insufficient repurchase
      const nonDiamondData = []; // Array to hold commission data for non-DIAMOND members with insufficient repurchase
      const diamondWalletOperations = []; // Array to hold wallet operations for DIAMOND members
      const walletTransactions = [];

      for (const member of lowRepurchaseMembers) {
        const isDiamond = member.status === DIAMOND;
        const RCashback = new Prisma.Decimal(member.repurchaseCashbackIncome);
        //was here. still not completed.
        const MMI1 = new Prisma.Decimal(member.matchingMentorIncomeL1);
        const MMI2 = new Prisma.Decimal(member.matchingMentorIncomeL2);
        const RIncome = new Prisma.Decimal(member.repurchaseIncome);
        const RMI1 = new Prisma.Decimal(member.repurchaseMentorIncomeL1);
        const RMI2 = new Prisma.Decimal(member.repurchaseMentorIncomeL2);
        const RMI3 = new Prisma.Decimal(member.repurchaseMentorIncomeL3);
        const TDS_PERCENT_USED = calculateTDS ? TDS_PERCENT : 0;

        const TDSAmount = RCashback.mul(TDS_PERCENT_USED).div(100);

        const platformChargeAmount = RCashback.mul(PLATFORM_CHARGE_PERCENT).div(
          100
        );

        const totalAmountToGive =
          RCashback.sub(TDSAmount).sub(platformChargeAmount);

        // start

        // ✅ Conditionally add RMI3 if greater than 0
        if (MMI1 > 0) {
          walletTransactions.push({
            memberId: member.id,
            amount: new Prisma.Decimal(MMI1),
            status: REJECTED,
            type: CREDIT,
            transactionDate: new Date(),
            walletType: HOLD_WALLET,
            notes: `Not eligible for MMI L1 claim.`,
          });
        }

        if (MMI2 > 0) {
          walletTransactions.push({
            memberId: member.id,
            amount: new Prisma.Decimal(MMI2),
            status: REJECTED,
            type: CREDIT,
            transactionDate: new Date(),
            walletType: HOLD_WALLET,
            notes: `Not eligible for MMI L2 claim.`,
          });
        }
        if (RIncome > 0) {
          walletTransactions.push({
            memberId: member.id,
            amount: new Prisma.Decimal(RIncome),
            status: REJECTED,
            type: CREDIT,
            transactionDate: new Date(),
            walletType: HOLD_WALLET,
            notes: `Not eligible for Repurchase Income claim.`,
          });
        }
        if (RMI1 > 0) {
          walletTransactions.push({
            memberId: member.id,
            amount: new Prisma.Decimal(RMI1),
            status: REJECTED,
            type: CREDIT,
            transactionDate: new Date(),
            walletType: HOLD_WALLET,
            notes: `Not eligible for RMI L1 claim.`,
          });
        }
        if (RMI2 > 0) {
          walletTransactions.push({
            memberId: member.id,
            amount: new Prisma.Decimal(RMI2),
            status: REJECTED,
            type: CREDIT,
            transactionDate: new Date(),
            walletType: HOLD_WALLET,
            notes: `Not eligible for RMI L2 claim.`,
          });
        }
        if (RMI3 > 0) {
          walletTransactions.push({
            memberId: member.id,
            amount: new Prisma.Decimal(RMI3),
            status: REJECTED,
            type: CREDIT,
            transactionDate: new Date(),
            walletType: HOLD_WALLET,
            notes: `Not eligible for RMI L3 claim.`,
          });
        }

        if (isDiamond) {
          // diamondWalletOperations.push({
          //   memberId: member.id,
          //   data: {
          //     holdWalletBalance: {
          //       decrement: new Prisma.Decimal(
          //         MMI1 + MMI2 + RIncome + RMI1 + RMI2 + RMI3
          //       ),
          //     },
          //     walletTransactions: {
          //       create: walletTransactions,
          //     },
          //   },
          // });
          // if (RCashback.gt(0)) {
          // end
          commissionData.push({
            memberId: member.id,
            repurchaseCashbackIncome: RCashback,
            TDSPercent: new Prisma.Decimal(TDS_PERCENT_USED),
            TDSAmount: new Prisma.Decimal(TDSAmount),
            platformChargePercent: new Prisma.Decimal(PLATFORM_CHARGE_PERCENT),
            platformChargeAmount: new Prisma.Decimal(platformChargeAmount),
            totalAmountBeforeDeduction: RCashback,
            totalAmountToGive: new Prisma.Decimal(totalAmountToGive),
            isPaid: false,
            createdAt: new Date(),
            //
            MMI1,
            MMI2,
            RIncome,
            RMI1,
            RMI2,
            RMI3,
          });
          // }
        } else {
          // if (RCashback.gt(0)) {
          nonDiamondData.push({
            memberId: member.id,
            repurchaseCashbackIncome: RCashback,
            MMI1,
            MMI2,
            RIncome,
            RMI1,
            RMI2,
            RMI3,
          });
          // }
        }
      }

      for (let i = 0; i < commissionData.length; i += BATCH_SIZE) {
        const batch = commissionData.slice(i, i + BATCH_SIZE);

        // ✅ Insert commissions for DIAMOND members only
        // await prisma.repurchaseIncomeCommission.createMany({
        //   data: batch,
        //   skipDuplicates: true,
        // });
        const createPromises = batch.map(async (member) => {
          await prisma.walletTransaction.createMany({
            data: [
              ...(member.TDSAmount > 0
                ? [
                    {
                      memberId: member.memberId,
                      amount: member.TDSAmount,
                      type: CREDIT,
                      transactionDate: new Date(),
                      status: APPROVED,
                      walletType: HOLD_WALLET,
                      notes: `${member.TDSPercent}% TDS Amount Deducted.`,
                    },
                  ]
                : []),
              ...(parseFloat(member.platformChargeAmount) > 0
                ? [
                    {
                      memberId: member.memberId,
                      amount: member.platformChargeAmount,
                      type: CREDIT,
                      transactionDate: new Date(),
                      status: APPROVED,
                      walletType: HOLD_WALLET,
                      notes: `${member.platformChargePercent}% Platform Charge Deducted.`,
                    },
                  ]
                : []),
            ],
          });

          // Update the member's income fields and hold wallet balance
          // logger.info(`member = ${member.memberId}`);

          await prisma.member.update({
            where: { id: member.memberId },
            data: {
              matchingMentorIncomeL1: new Prisma.Decimal(0),
              matchingMentorIncomeL2: new Prisma.Decimal(0),
              repurchaseIncome: new Prisma.Decimal(0),
              repurchaseIncomeL1: new Prisma.Decimal(0),
              repurchaseIncomeL2: new Prisma.Decimal(0),
              repurchaseIncomeL3: new Prisma.Decimal(0),
              repurchaseIncomeL4: new Prisma.Decimal(0),
              repurchaseIncomeL5: new Prisma.Decimal(0),
              repurchaseIncomeL6: new Prisma.Decimal(0),
              repurchaseIncomeL7: new Prisma.Decimal(0),
              repurchaseIncomeL8: new Prisma.Decimal(0),
              repurchaseIncomeL9: new Prisma.Decimal(0),
              repurchaseIncomeL10: new Prisma.Decimal(0),
              repurchaseCashbackIncome: new Prisma.Decimal(0),
              repurchaseMentorIncomeL1: new Prisma.Decimal(0),
              repurchaseMentorIncomeL2: new Prisma.Decimal(0),
              repurchaseMentorIncomeL3: new Prisma.Decimal(0),
              holdWalletBalance: {
                decrement: new Prisma.Decimal(
                  parseFloat(member.MMI1) +
                    parseFloat(member.MMI2) +
                    parseFloat(member.RIncome) +
                    parseFloat(member.RMI1) +
                    parseFloat(member.RMI2) +
                    parseFloat(member.RMI3) +
                    parseFloat(member.repurchaseCashbackIncome)
                ),
              },
              ...(member.repurchaseCashbackIncome > 0
                ? {
                    repurchaseIncomeCommissions: {
                      create: {
                        repurchaseCashbackIncome:
                          member.repurchaseCashbackIncome,
                        TDSPercent: new Prisma.Decimal(member.TDSPercent),
                        TDSAmount: new Prisma.Decimal(member.TDSAmount),
                        platformChargePercent: new Prisma.Decimal(
                          member.platformChargePercent
                        ),
                        platformChargeAmount: new Prisma.Decimal(
                          member.platformChargeAmount
                        ),
                        totalAmountBeforeDeduction:
                          member.repurchaseCashbackIncome,
                        totalAmountToGive: new Prisma.Decimal(
                          member.totalAmountToGive
                        ),
                        isPaid: false,
                        createdAt: new Date(),
                        walletTransaction: {
                          create: {
                            memberId: member.memberId,
                            amount: member.totalAmountToGive,
                            type: CREDIT,
                            transactionDate: new Date(),
                            status: PENDING,
                            walletType: HOLD_WALLET,
                            notes:
                              "Transferring Hold Wallet Amount To your Bank.",
                          },
                        },
                      },
                    },
                  }
                : {}),
            },
          });
        });

        await Promise.all(createPromises); // runs all DB operations in parallel
        // totalInserted += batch.length;

        logger.info(
          `✅ Diamond members (insufficient repurchase) batch ${
            Math.floor(i / BATCH_SIZE) + 1
          } inserted`
        );
      }

      for (let i = 0; i < nonDiamondData.length; i += BATCH_SIZE) {
        const batch = nonDiamondData.slice(i, i + BATCH_SIZE);

        // Run updates in parallel within the batch
        // const results = await Promise.allSettled(
        //   batch.map((member) =>
        //     prisma.member.update({
        //       where: { id: member.memberId },
        //       data: {
        //         upgradeWalletBalance: {
        //           increment: new Prisma.Decimal(
        //             member.repurchaseCashbackIncome
        //           ),
        //         },
        //         holdWalletBalance: {
        //           increment: new Prisma.Decimal(
        //             member.repurchaseCashbackIncome
        //           ),
        //         }, //was here also.copy paste above
        //       },
        //       // log of things are missiong.100%
        //     })
        //   )
        // );

        // Optional: log failures
        // results.forEach((result, idx) => {
        //   if (result.status === "rejected") {
        //     logger.error(
        //       `Failed to update member ${batch[idx].memberId}: ${result.reason}`
        //     );
        //   }
        // });
        const createPromises = batch.map(async (member) => {
          await prisma.walletTransaction.createMany({
            data: [
              ...(member.repurchaseCashbackIncome > 0
                ? [
                    {
                      memberId: member.memberId,
                      amount: member.repurchaseCashbackIncome,
                      type: CREDIT,
                      transactionDate: new Date(),
                      status: APPROVED,
                      walletType: HOLD_WALLET,
                      notes: `Cashback Income Transferred to Upgrade Wallet.`,
                    },
                    {
                      memberId: member.memberId,
                      amount: member.repurchaseCashbackIncome,
                      type: DEBIT,
                      transactionDate: new Date(),
                      status: APPROVED,
                      walletType: UPGRADE_WALLET,
                      notes: `Cashback Income Received From Hold Wallet.`,
                    },
                  ]
                : []),
            ],
          });

          // Update the member's income fields and hold wallet balance
          // logger.info(`member = ${member.memberId}`);

          await prisma.member.update({
            where: { id: member.memberId },
            data: {
              matchingMentorIncomeL1: new Prisma.Decimal(0),
              matchingMentorIncomeL2: new Prisma.Decimal(0),
              repurchaseIncome: new Prisma.Decimal(0),
              repurchaseIncomeL1: new Prisma.Decimal(0),
              repurchaseIncomeL2: new Prisma.Decimal(0),
              repurchaseIncomeL3: new Prisma.Decimal(0),
              repurchaseIncomeL4: new Prisma.Decimal(0),
              repurchaseIncomeL5: new Prisma.Decimal(0),
              repurchaseIncomeL6: new Prisma.Decimal(0),
              repurchaseIncomeL7: new Prisma.Decimal(0),
              repurchaseIncomeL8: new Prisma.Decimal(0),
              repurchaseIncomeL9: new Prisma.Decimal(0),
              repurchaseIncomeL10: new Prisma.Decimal(0),
              repurchaseCashbackIncome: new Prisma.Decimal(0),
              repurchaseMentorIncomeL1: new Prisma.Decimal(0),
              repurchaseMentorIncomeL2: new Prisma.Decimal(0),
              repurchaseMentorIncomeL3: new Prisma.Decimal(0),
              holdWalletBalance: {
                decrement: new Prisma.Decimal(
                  parseFloat(member.MMI1) +
                    parseFloat(member.MMI2) +
                    parseFloat(member.RIncome) +
                    parseFloat(member.RMI1) +
                    parseFloat(member.RMI2) +
                    parseFloat(member.RMI3) +
                    parseFloat(member.repurchaseCashbackIncome)
                ),
              },

              upgradeWalletBalance: {
                increment: new Prisma.Decimal(
                  parseFloat(member.repurchaseCashbackIncome)
                ),
              },
            },
          });
        });

        await Promise.all(createPromises); // runs all DB operations in parallel
        // totalInserted += batch.length;

        logger.info(
          `Inserted Cashback: Upgrade wallet for Non-Diamond (insufficient repurchase) batch ${
            Math.floor(i / BATCH_SIZE) + 1
          }`
        );
      }
      // end upgradeWalletBalance for non-DIAMOND members

      //  e
      for (let i = 0; i < walletTransactions.length; i += BATCH_SIZE) {
        const batch = walletTransactions.slice(i, i + BATCH_SIZE);

        // ✅ Insert common not eligible wallet transactions
        await prisma.walletTransaction.createMany({
          data: batch,
          skipDuplicates: true,
        });

        logger.info(
          `✅ Diamond members (insufficient repurchase) batch ${
            Math.floor(i / BATCH_SIZE) + 1
          } inserted`
        );
      }
      // e
    } else {
      logger.info(
        "No members With Cashback found with insufficient repurchase amount."
      );
    }
    // end

    // await prisma.member.updateMany({
    //   where: {
    //     status: { not: INACTIVE },
    //   },
    //   data: {
    //     matchingMentorIncomeL1: new Prisma.Decimal(0),
    //     matchingMentorIncomeL2: new Prisma.Decimal(0),
    //     repurchaseIncome: new Prisma.Decimal(0),
    //     repurchaseIncomeL1: new Prisma.Decimal(0),
    //     repurchaseIncomeL2: new Prisma.Decimal(0),
    //     repurchaseIncomeL3: new Prisma.Decimal(0),
    //     repurchaseIncomeL4: new Prisma.Decimal(0),
    //     repurchaseIncomeL5: new Prisma.Decimal(0),
    //     repurchaseIncomeL6: new Prisma.Decimal(0),
    //     repurchaseIncomeL7: new Prisma.Decimal(0),
    //     repurchaseIncomeL8: new Prisma.Decimal(0),
    //     repurchaseIncomeL9: new Prisma.Decimal(0),
    //     repurchaseIncomeL10: new Prisma.Decimal(0),
    //     repurchaseCashbackIncome: new Prisma.Decimal(0),
    //     repurchaseMentorIncomeL1: new Prisma.Decimal(0),
    //     repurchaseMentorIncomeL2: new Prisma.Decimal(0),
    //     repurchaseMentorIncomeL3: new Prisma.Decimal(0),
    //   },
    // });

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
