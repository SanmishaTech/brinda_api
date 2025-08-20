const { PrismaClient, Prisma } = require('@prisma/client');
const prisma = new PrismaClient();
const {
  INACTIVE,
  TDS_PERCENT,
  PLATFORM_CHARGE_PERCENT,
} = require('../config/data');

const BATCH_SIZE = 300;

const rewardCommissionPayout = async () => {
  try {
    const calculateTDS = process.env.CALCULATE_TDS === 'true';

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
      console.log('No eligible members.');
      return;
    }

    const commissionData = [];
    for (const member of members) {
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
      commissionData.push({
        memberId: member.id,
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

    // Batch insert helper
    for (let i = 0; i < commissionData.length; i += BATCH_SIZE) {
      const batch = commissionData.slice(i, i + BATCH_SIZE);
      await prisma.rewardCommission.createMany({
        data: batch,
        skipDuplicates: true,
      });

      console.log(`Inserted batch ${Math.floor(i / BATCH_SIZE) + 1}`);
    }

    console.log(`Total inserted records: ${commissionData.length}`);
  } catch (error) {
    console.error('Error in rewardCommissionPayout:', error);
  }
};

module.exports = { rewardCommissionPayout };
