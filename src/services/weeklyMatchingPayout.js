const { PrismaClient, Prisma } = require("@prisma/client");
const prisma = new PrismaClient();
const {
  INACTIVE,
  MINIMUM_MATCHING_COMMISSION_LIMIT,
  CREDIT,
  PENDING,
  MATCHING_INCOME_WALLET,
} = require("../config/data");

const BATCH_SIZE = 150;

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
      console.log("No eligible members.");
      return;
    }

    let totalInserted = 0;

    for (let i = 0; i < members.length; i += BATCH_SIZE) {
      const batch = members.slice(i, i + BATCH_SIZE);

      // Create an array of promises for this batch
      const createPromises = batch.map((member) => {
        const amount = member.matchingIncomeWalletBalance;

        return prisma.walletTransaction.create({
          data: {
            memberId: member.id,
            amount,
            type: CREDIT,
            transactionDate: new Date(),
            status: PENDING,
            walletType: MATCHING_INCOME_WALLET,
            notes: "Transferring matching Wallet Amount To your Bank.",
            matchingIncomeCommission: {
              create: {
                memberId: member.id,
                matchingIncomeCommission: amount,
                isPaid: false,
                createdAt: new Date(),
              },
            },
          },
        });
      });

      // Execute all creates in parallel
      await Promise.all(createPromises);
      totalInserted += batch.length;

      // Batch update member balances
      const memberIds = batch.map((m) => m.id);
      await prisma.member.updateMany({
        where: { id: { in: memberIds } },
        data: { matchingIncomeWalletBalance: new Prisma.Decimal(0) },
      });

      console.log(`Inserted batch ${Math.floor(i / BATCH_SIZE) + 1}`);
    }

    console.log(`Total inserted records: ${totalInserted}`);
  } catch (error) {
    console.error("Error in weeklyMatchingPayout:", error);
  }
};

module.exports = { weeklyMatchingPayout };
