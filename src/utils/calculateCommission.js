const { PrismaClient } = require("@prisma/client");
const { DEBIT, APPROVED } = require("../config/data");
const prisma = new PrismaClient();

const calculateCommission = async (parent, updates) => {
  const percentage = parseFloat(parent.percentage);

  // Default increment to 0 if undefined or null to avoid NaN issues
  // const incrementValue = updates.matchingIncomeWalletBalance?.increment ?? 0;
  let incrementValue = parseFloat(
    updates.matchingIncomeWalletBalance?.increment
  );
  if (isNaN(incrementValue)) incrementValue = 0;

  updates.matchingIncomeWalletBalance = {
    increment: incrementValue,
  };

  if (!isNaN(percentage) && percentage > 0 && percentage < 100) {
    const commissionToGive = parseFloat(
      ((incrementValue * percentage) / 100).toFixed(2)
    );

    updates.matchingIncomeWalletBalance = {
      increment: commissionToGive,
    };

    updates.walletTransactions = {
      create: {
        amount: commissionToGive,
        status: APPROVED,
        type: DEBIT,
        transactionDate: new Date(),
        notes: `Matching Commission (${commissionToGive})`,
        // Optional:
        // paymentMethod: "System Auto",
      },
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
    updates.walletTransactions = {
      create: {
        amount: incrementValue,
        status: APPROVED,
        type: DEBIT,
        transactionDate: new Date(),
        notes: `Matching Commission (${incrementValue})`,
      },
    };
  }

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
