const { PrismaClient, Prisma } = require("@prisma/client");
const prisma = require("../config/db");
const {
  INACTIVE,
  TDS_PERCENT,
  PLATFORM_CHARGE_PERCENT,
  HOLD_WALLET,
  CREDIT,
  APPROVED,
  PENDING,
} = require("../config/data");

const BATCH_SIZE = 300;

const rewardCommissionPayout = async () => {
  try {
    const calculateTDS = process.env.CALCULATE_TDS === "true";

    const members = await prisma.member.findMany({
      select: {
        id: true,
        goldRewardIncome: true,
      },
      where: {
        status: {
          not: INACTIVE,
        },
        isDirectMatch: true,
        is2_1Pass: true,
        goldRewardIncome: {
          gt: new Prisma.Decimal(0),
        },
      },
    });

    if (members.length === 0) {
      console.log("No eligible members.");
      return;
    }
    let totalInserted = 0;

    for (let i = 0; i < members.length; i += BATCH_SIZE) {
      const batch = members.slice(i, i + BATCH_SIZE);

      // Create an array of promises for this batch
      const createPromises = batch.map(async (member) => {
        const totalCommissionAmount = new Prisma.Decimal(
          member.goldRewardIncome ?? 0
        );

        const TDS_PERCENT_USED = calculateTDS ? TDS_PERCENT : 0;
        const TDSAmount = totalCommissionAmount.mul(TDS_PERCENT_USED).div(100);
        const platformChargeAmount = totalCommissionAmount
          .mul(PLATFORM_CHARGE_PERCENT)
          .div(100);
        const totalAmountToGive = totalCommissionAmount
          .sub(TDSAmount)
          .sub(platformChargeAmount);

        await prisma.walletTransaction.createMany({
          data: [
            ...(TDSAmount > 0
              ? [
                  {
                    memberId: member.id,
                    amount: TDSAmount,
                    type: CREDIT,
                    transactionDate: new Date(),
                    status: APPROVED,
                    walletType: HOLD_WALLET,
                    notes: `${TDS_PERCENT_USED}% TDS Amount Deducted on Reward Commission.`,
                  },
                ]
              : []),
            ...(platformChargeAmount > 0
              ? [
                  {
                    memberId: member.id,
                    amount: platformChargeAmount,
                    type: CREDIT,
                    transactionDate: new Date(),
                    status: APPROVED,
                    walletType: HOLD_WALLET,
                    notes: `${PLATFORM_CHARGE_PERCENT}% Platform Charge Deducted on Reward Commission.`,
                  },
                ]
              : []),
          ],
        });
        // console.log(totalAmountToGive);
        return prisma.member.update({
          where: { id: member.id },
          data: {
            holdWalletBalance: {
              decrement: new Prisma.Decimal(totalCommissionAmount),
            },
            goldRewardIncome: new Prisma.Decimal(0),

            rewardCommissions: {
              create: {
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
                walletTransaction: {
                  create: {
                    memberId: member.id,
                    amount: new Prisma.Decimal(totalAmountToGive),
                    type: CREDIT,
                    transactionDate: new Date(),
                    status: PENDING,
                    walletType: HOLD_WALLET,
                    notes: "Transferred Rewards Commission To your Bank.",
                  },
                },
              },
            },
          },
        });
      });

      // Execute all creates in parallel
      await Promise.all(createPromises);
      totalInserted += batch.length;

      console.log(`Inserted batch ${Math.floor(i / BATCH_SIZE) + 1}`);
    }

    console.log(`Total inserted records: ${totalInserted}`);
  } catch (error) {
    console.error("Error in rewardCommissionPayout:", error);
  }
};

module.exports = { rewardCommissionPayout };
