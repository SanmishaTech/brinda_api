const { PrismaClient, Prisma } = require('@prisma/client');
const prisma = new PrismaClient();
const {
  INACTIVE,
  MINIMUM_MATCHING_COMMISSION_LIMIT,
  CREDIT,
  PENDING,
  MATCHING_INCOME_WALLET,
} = require('../config/data');

const BATCH_SIZE = 300;

const weeklyMatchingPayout = async () => {
  try {
    const members = await prisma.member.findMany({
      select: {
        id: true,
        matchingIncomeWalletBalance: true,
      },
      where: {
        status: {
          not: INACTIVE,
        },
        isDirectMatch: true,
        is2_1Pass: true,
        matchingIncomeWalletBalance: {
          gte: new Prisma.Decimal(MINIMUM_MATCHING_COMMISSION_LIMIT),
        },
      },
    });

    if (members.length === 0) {
      console.log('No eligible members.');
      return;
    }

    const commissionData = [];
    const walletTransactions = [];
    const memberIdsToUpdate = [];

    for (const member of members) {
      const amount = member.matchingIncomeWalletBalance;

      commissionData.push({
        memberId: member.id,
        matchingIncomeCommission: amount,
        isPaid: false,
        createdAt: new Date(),
      });

      walletTransactions.push({
        memberId: member.id,
        amount,
        type: CREDIT,
        transactionDate: new Date(),
        status: PENDING,
        walletType: MATCHING_INCOME_WALLET,
        notes: 'Transferring Amount To your Bank.',
      });

      memberIdsToUpdate.push(member.id);
    }

    // Batch insert helper
    for (let i = 0; i < commissionData.length; i += BATCH_SIZE) {
      const commissionBatch = commissionData.slice(i, i + BATCH_SIZE);
      const transactionBatch = walletTransactions.slice(i, i + BATCH_SIZE);
      const memberIdBatch = memberIdsToUpdate.slice(i, i + BATCH_SIZE);

      await prisma.matchingIncomeCommission.createMany({
        data: commissionBatch,
        skipDuplicates: true,
      });

      await prisma.walletTransaction.createMany({
        data: transactionBatch,
      });

      await prisma.member.updateMany({
        where: { id: { in: memberIdBatch } },
        data: { matchingIncomeWalletBalance: new Prisma.Decimal(0) },
      });

      console.log(`Inserted batch ${Math.floor(i / BATCH_SIZE) + 1}`);
    }

    console.log(`Total inserted records: ${commissionData.length}`);
  } catch (error) {
    console.error('Error in weeklyMatchingPayout:', error);
  }
};

module.exports = { weeklyMatchingPayout };
