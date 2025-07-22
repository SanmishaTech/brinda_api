const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const calculateCommission = async (parent, updates) => {
  const percentage = parseFloat(parent.percentage);

  // Default increment to 0 if undefined or null to avoid NaN issues
  const incrementValue = updates.matchingIncomeWalletBalance?.increment ?? 0;

  console.log(`Before: ${incrementValue}`);

  if (!isNaN(percentage) && percentage > 0 && percentage < 100) {
    const commissionToGive = parseFloat(
      ((incrementValue * percentage) / 100).toFixed(2)
    );

    updates.matchingIncomeWalletBalance = {
      increment: commissionToGive,
    };
  } else if (percentage === 0) {
    updates.matchingIncomeWalletBalance = {
      increment: 0,
    };
  }
  // if percentage == 100 or invalid, keep original increment value (which is incrementValue)
  else if (percentage === 100) {
    updates.matchingIncomeWalletBalance = {
      increment: incrementValue,
    };
  }

  console.log(
    `[Commission] Percentage: ${percentage}, Final: ${updates.matchingIncomeWalletBalance.increment}`
  );

  parent = await prisma.member.update({
    where: { id: parent.id },
    data: {
      ...updates,
    },
    include: {
      sponsor: true,
      parent: true,
    },
  });

  return parent;
};

module.exports = { calculateCommission };
