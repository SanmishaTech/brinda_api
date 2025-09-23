const { PrismaClient } = require("@prisma/client");
const {
  DEBIT,
  APPROVED,
  MATCHING_INCOME_WALLET,
  HOLD_WALLET,
} = require("../config/data");
const prisma = require("../config/db");
const calculateLoan = require("./calculateLoan");
const calculateCommission = async (parent, updates, rewardDetails) => {
  const percentage = parseFloat(parent.percentage);
  const walletTransactions = [];

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
    if (commissionToGive > 0) {
      // updates.walletTransactions = {
      //   create: {
      //     amount: commissionToGive,
      //     status: APPROVED,
      //     type: DEBIT,
      //     transactionDate: new Date(),
      //     walletType: MATCHING_INCOME_WALLET,
      //     notes: `Matching Commission (₹${commissionToGive})`,

      //   },
      // };
      walletTransactions.push({
        amount: commissionToGive,
        status: APPROVED,
        type: DEBIT,
        transactionDate: new Date(),
        walletType: MATCHING_INCOME_WALLET,
        notes: `Matching Commission (₹${commissionToGive})`,
      });
    }
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
    if (incrementValue > 0) {
      // updates.walletTransactions = {
      //   create: {
      //     amount: incrementValue,
      //     status: APPROVED,
      //     type: DEBIT,
      //     transactionDate: new Date(),
      //     walletType: MATCHING_INCOME_WALLET,
      //     notes: `Matching Commission (₹${incrementValue})`,
      //   },
      // };
      walletTransactions.push({
        amount: incrementValue,
        status: APPROVED,
        type: DEBIT,
        transactionDate: new Date(),
        walletType: MATCHING_INCOME_WALLET,
        notes: `Matching Commission (₹${incrementValue})`,
      });
    }
  }

  // const rewardTransactions = {};
  if (rewardDetails.isRewardLevelReached && rewardDetails.amount > 0) {
    // rewardTransactions.walletTransactions = {
    //   create: {
    //     amount: rewardDetails.amount,
    //     status: APPROVED,
    //     type: DEBIT,
    //     transactionDate: new Date(),
    //     walletType: HOLD_WALLET,
    //     notes: `Gold Matching Reward`,
    //   },
    // };
    updates.holdWalletBalance = {
      increment: rewardDetails.amount,
    };
    updates.goldRewardIncome = {
      increment: rewardDetails.amount,
    };

    walletTransactions.push({
      amount: rewardDetails.amount,
      status: APPROVED,
      type: DEBIT,
      transactionDate: new Date(),
      walletType: HOLD_WALLET,
      notes: `Gold Matching Reward`,
    });
  }

  if (walletTransactions.length > 0) {
    updates.walletTransactions = {
      create: walletTransactions,
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

  const matchingCommission =
    updates.matchingIncomeWalletBalance?.increment ?? 0;
  if (matchingCommission > 0) {
    parent = await calculateLoan(
      matchingCommission,
      parent,
      MATCHING_INCOME_WALLET,
      "MATCHING_COMMISSION"
    );
  }

  const holdWalletAmount = updates.holdWalletBalance?.increment ?? 0;
  if (holdWalletAmount > 0) {
    parent = await calculateLoan(
      holdWalletAmount,
      parent,
      HOLD_WALLET,
      "REWARD_COMMISSION"
    );
  }

  return parent;
};

module.exports = { calculateCommission };
