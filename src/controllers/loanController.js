const { PrismaClient, Prisma } = require("@prisma/client");
const prisma = require("../config/db");
const { z } = require("zod");
const validateRequest = require("../utils/validateRequest");
const dayjs = require("dayjs"); // Import dayjs
const { numberToWords } = require("../utils/numberToWords");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs").promises; // Use promises API
const path = require("path");
const logger = require("../utils/logger");
const {
  DIAMOND,
  UPGRADE_WALLET,
  MATCHING_INCOME_WALLET,
  FUND_WALLET,
  SECURITY_DEPOSIT_WALLET,
  DEBIT,
  FRANCHISE_WALLET,
  APPROVED,
  PENDING,
  DELIVERED,
  SECURITY_DEPOSIT_AMOUNT_RANGE_OPTIONS,
  PURCHASE_BILL_DELIVERY_PERCENT,
  REPURCHASE_BILL_TO_SPONSOR_PERCENT,
  REPURCHASE_SDR_PERCENT,
} = require("../config/data");
const parseDate = require("../utils/parseDate");

const AddLoanAmount = async (req, res) => {
  const { memberId, loanAmount, loanPercentage } = req.body;

  try {
    const parsedMemberId = parseInt(memberId);
    const parsedLoanAmount = new Prisma.Decimal(loanAmount);
    const parsedLoanPercentage = new Prisma.Decimal(loanPercentage);

    const member = await prisma.member.findUnique({
      where: { id: parsedMemberId },
    });

    if (!member) {
      return res.status(404).json({ message: "Member not found" });
    }

    const totalLoanGiven = member.totalLoanGiven.plus(parsedLoanAmount);
    const totalCollected = member.totalLoanCollected || new Prisma.Decimal(0);
    const totalLoanPending = totalLoanGiven.minus(totalCollected);

    await prisma.member.update({
      where: { id: parsedMemberId },
      data: {
        walletBalance: { increment: parsedLoanAmount },
        totalLoanGiven: totalLoanGiven,
        totalLoanPending: totalLoanPending,
        loanPercentage: parsedLoanPercentage,
        walletTransactions: {
          create: {
            amount: parsedLoanAmount,
            walletType: FUND_WALLET,
            status: APPROVED,
            type: DEBIT,
            notes: "Loan Amount Added In Fund Wallet.",
            transactionDate: new Date(),
          },
        },
      },
    });

    return res.status(201).json({ message: "Loan Given Successfully." });
  } catch (error) {
    console.error("Error adding deposit:", error);
    return res.status(500).json({
      message: "Failed to add deposit amount",
      details: error.message,
    });
  }
};

module.exports = {
  AddLoanAmount,
};
