const { Prisma } = require("@prisma/client");
const prisma = require("../config/db");
const { APPROVED, DEBIT, CREDIT } = require("../config/data");

/**
 * Calculates loan deduction and updates member's loan and wallet transaction.
 *
 * @param {number | string} commission - The commission amount.
 * @param {Object} member - The member object (must include id, totalLoanPending, loanPercentage).
 * @param {string} walletType - The wallet type to record the transaction against.
 */
const calculateLoan = async (commission, member, walletType, module) => {
  const amount = new Prisma.Decimal(commission || 0);
  const pendingLoan = new Prisma.Decimal(member.totalLoanPending || 0);

  // Skip if either commission or pending loan is zero
  if (amount.isZero() || pendingLoan.isZero()) return member;

  const loanPercentage = new Prisma.Decimal(member.loanPercentage || 0);
  const potentialLoan = amount.mul(loanPercentage).div(100);
  const loanAmount = Prisma.Decimal.min(potentialLoan, pendingLoan);
  const isPendingAmount = parseFloat(loanAmount) === parseFloat(pendingLoan);
  // Skip if calculated loan is zero
  if (loanAmount.isZero()) return member;
  const notes = isPendingAmount
    ? `loan amount deducted from ${parseFloat(amount)}`
    : `${loanPercentage}% loan amount deducted from ${parseFloat(amount)}`;
  // Prepare dynamic data block
  const data = {
    totalLoanPending: { decrement: loanAmount },
    totalLoanCollected: { increment: loanAmount },
    walletTransactions: {
      create: {
        amount: loanAmount,
        walletType,
        status: APPROVED,
        type: CREDIT,
        notes: notes,
        transactionDate: new Date(),
      },
    },
  };

  //  conditions start
  if (module === "MATCHING_COMMISSION") {
    data.matchingIncomeWalletBalance = {
      decrement: loanAmount,
    };
  }

  if (module === "REWARD_COMMISSION") {
    data.holdWalletBalance = {
      decrement: loanAmount,
    };
    data.goldRewardIncome = {
      decrement: loanAmount,
    };
  }

  if (module === "MMI_L1") {
    data.matchingMentorIncomeL1 = {
      decrement: loanAmount,
    };
    data.holdWalletBalance = {
      decrement: loanAmount,
    };
  }

  if (module === "MMI_L2") {
    data.matchingMentorIncomeL2 = {
      decrement: loanAmount,
    };
    data.holdWalletBalance = {
      decrement: loanAmount,
    };
  }

  if (module === "CASHBACK") {
    data.repurchaseCashbackIncome = {
      decrement: loanAmount,
    };
    data.holdWalletBalance = {
      decrement: loanAmount,
    };
  }

  if (module?.startsWith("repurchaseIncomeL")) {
    data.repurchaseIncome = {
      decrement: loanAmount,
    };
    data.holdWalletBalance = {
      decrement: loanAmount,
    };

    // Add this to handle the dynamic field properly
    data[module] = {
      decrement: loanAmount,
    };
  }

  if (module?.startsWith("repurchaseMentorIncomeL")) {
    data.holdWalletBalance = {
      decrement: loanAmount,
    };
    // Add this to handle the dynamic field properly
    data[module] = {
      decrement: loanAmount,
    };
  }

  if (module === "VIRTUAL_POWER") {
    data.matchingIncomeWalletBalance = {
      decrement: loanAmount,
    };
  }

  if (module === "GENERATE_SDR") {
    data.franchiseWalletBalance = {
      decrement: loanAmount,
    };
    data.securityDepositReturn = {
      decrement: loanAmount,
    };
    data.totalSecurityDepositReturn = {
      decrement: loanAmount,
    };
  }

  if (module === "INFLUENCER") {
    data.franchiseWalletBalance = {
      decrement: loanAmount,
    };
    data.franchiseIntroductionAmount = {
      decrement: loanAmount,
    };
  }

  if (module === "PURCHASE_DELIVERY_COMMISSION") {
    data.franchiseCommission = {
      decrement: loanAmount,
    };
    data.franchiseWalletBalance = {
      decrement: loanAmount,
    };
  }

  if (module === "REPURCHASE_DELIVERY_COMMISSION") {
    data.franchiseCommission = {
      decrement: loanAmount,
    };
    data.franchiseWalletBalance = {
      decrement: loanAmount,
    };
  }

  if (module === "REPURCHASE_SDR") {
    data.securityDepositReturn = {
      decrement: loanAmount,
    };
    data.franchiseWalletBalance = {
      decrement: loanAmount,
    };
    data.totalSecurityDepositReturn = {
      decrement: loanAmount,
    };
  }

  if (module === "SPONSOR_COMMISSION") {
    data.repurchaseBillAmount = {
      decrement: loanAmount,
    };
    data.franchiseWalletBalance = {
      decrement: loanAmount,
    };
  }

  // conditions end

  // Update member and log wallet transaction
  const updatedMember = await prisma.member.update({
    where: { id: member.id },
    data,
    include: {
      sponsor: true,
      parent: true,
    },
  });

  return updatedMember;
};

module.exports = calculateLoan;
