const { PrismaClient, Prisma } = require("@prisma/client");
const prisma = new PrismaClient();
const {
  INACTIVE,
  MINIMUM_MATCHING_COMMISSION_LIMIT,
} = require("../config/data");

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
      console.log("No eligible members.");
      return;
    }

    const commissionData = [];
    for (const member of members) {
      commissionData.push({
        memberId: member.id,
        matchingIncomeCommission: member.matchingIncomeWalletBalance,
        isPaid: false,
        createdAt: new Date(),
      });
    }

    // Batch insert helper
    for (let i = 0; i < commissionData.length; i += BATCH_SIZE) {
      const batch = commissionData.slice(i, i + BATCH_SIZE);
      await prisma.matchingIncomeCommission.createMany({
        data: batch,
        skipDuplicates: true,
      });

      console.log(`Inserted batch ${Math.floor(i / BATCH_SIZE) + 1}`);
    }

    console.log(`Total inserted records: ${commissionData.length}`);
  } catch (error) {
    console.error("Error in weeklyMatchingPayout:", error);
  }
};

module.exports = { weeklyMatchingPayout };
