const { PrismaClient, Prisma } = require("@prisma/client");
const prisma = new PrismaClient();
const { z } = require("zod");
const validateRequest = require("../utils/validateRequest");
const dayjs = require("dayjs"); // Import dayjs
const { numberToWords } = require("../utils/numberToWords");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs").promises; // Use promises API
const path = require("path");
const updateStock = require("../utils/updateStock");
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
} = require("../config/data");
const parseDate = require("../utils/parseDate");

/**
 * Get all members without pagination
 */
const getAllFranchise = async (req, res) => {
  try {
    const members = await prisma.member.findMany({
      where: { isFranchise: true },
      select: {
        id: true,
        memberName: true,
        memberUsername: true,
      },
    });

    res.status(200).json(members);
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch franchise",
      details: error.message,
    });
  }
};

const makeFranchise = async (req, res) => {
  const { memberId, influencerId, securityDepositAmount } = req.body;

  try {
    const parsedMemberId = parseInt(memberId);
    const depositAmount = parseFloat(securityDepositAmount);

    // Validate inputs early
    if (isNaN(parsedMemberId) || isNaN(depositAmount)) {
      return res.status(400).json({ message: "Invalid input values" });
    }

    const member = await prisma.member.findUnique({
      where: { id: parsedMemberId },
    });

    const influencer = await prisma.member.findUnique({
      where: { memberUsername: influencerId },
    });

    if (!member) {
      return res.status(500).json({ message: "Member not found" });
    }

    if (member.isFranchise) {
      return res.status(500).json({ message: "Member is already a Franchise" });
    }

    if (!influencer) {
      return res
        .status(500)
        .json({ errors: { message: "Influencer not found" } });
    }

    // Update member to become a franchisee
    const updatedMember = await prisma.member.update({
      where: { id: parsedMemberId },
      data: {
        isFranchise: true,
        securityDepositAmount: new Prisma.Decimal(depositAmount),
      },
    });

    const againUpdatedMember = await prisma.member.update({
      where: { id: parsedMemberId },
      data: {
        securityDepositPending:
          parseFloat(updatedMember.securityDepositAmount) -
          parseFloat(updatedMember.totalSecurityDepositReturn),
      },
    });

    // Update influencer's wallet and log the transaction
    await prisma.member.update({
      where: { id: influencer.id },
      data: {
        franchiseWalletBalance: {
          increment: depositAmount * 0.05,
        },
        franchiseIntroductionAmount: {
          increment: depositAmount * 0.05,
        },
        walletTransactions: {
          create: {
            amount: new Prisma.Decimal(depositAmount * 0.05),
            walletType: FRANCHISE_WALLET,
            status: APPROVED,
            type: DEBIT, // FIXED: Was "DEBIT" — this is income to the influencer
            notes: `5% of Security Deposit from Franchise ${member.memberUsername}`,
            transactionDate: new Date(),
          },
        },
      },
    });

    return res.status(201).json({ message: "Franchise created successfully" });
  } catch (error) {
    console.error(error); // Always log the full error for debugging
    return res.status(500).json({
      message: "Failed to create franchise",
      details: error.message,
    });
  }
};

const AddSecurityDepositAmount = async (req, res) => {
  const { memberId, securityDepositAmount } = req.body;

  try {
    const parsedMemberId = parseInt(memberId);
    const depositAmount = parseFloat(securityDepositAmount);

    const member = await prisma.member.findUnique({
      where: { id: parsedMemberId },
    });

    if (!member) {
      return res.status(500).json({ errors: { message: "Member not found" } });
    }

    // Update member to become a franchisee
    const updatedMember = await prisma.member.update({
      where: { id: parsedMemberId },
      data: {
        securityDepositAmount: { increment: new Prisma.Decimal(depositAmount) },
      },
    });

    return res
      .status(201)
      .json({ message: "Security Deposit amount incremented successfully" });
  } catch (error) {
    console.error(error); // Always log the full error for debugging
    return res.status(500).json({
      message: "Failed to add deposit amount",
      details: error.message,
    });
  }
};

const FranchiseDashboard = async (req, res) => {
  const member = req.user.member;

  try {
    return res.status(200).json({
      securityDepositAmount: member.securityDepositAmount,
      isFranchise: member.isFranchise,
      securityDepositPending: member.securityDepositPending,
      franchiseCommission: member.franchiseCommission,
      securityDepositReturn: member.securityDepositReturn,
      franchiseWalletBalance: member.franchiseWalletBalance,
    });
  } catch (error) {
    console.error(error); // Always log the full error for debugging
    return res.status(500).json({
      message: "Failed to get Franchise Dashboard data",
      details: error.message,
    });
  }
};

module.exports = {
  getAllFranchise,
  makeFranchise,
  AddSecurityDepositAmount,
  FranchiseDashboard,
};
