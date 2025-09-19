const { PrismaClient, Prisma } = require("@prisma/client");
const prisma = require("../config/db");
const { z } = require("zod");
const validateRequest = require("../utils/validateRequest");
const dayjs = require("dayjs"); // Import dayjs
const { numberToWords } = require("../utils/numberToWords");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs").promises; // Use promises API
const path = require("path");
const { updateStock } = require("../utils/updateStock");
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
const checkStockAvailability = require("../utils/checkStockAvailability");
const processDeliveryAndLedger = require("../utils/processDeliveryAndLedger");

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

    const depositDecimal = new Prisma.Decimal(depositAmount);
    const depositPending = depositDecimal.minus(
      member.totalSecurityDepositReturn
    );

    const updatedMember = await prisma.member.update({
      where: { id: parsedMemberId },
      data: {
        isFranchise: true,
        securityDepositAmount: depositDecimal,
        securityDepositPending: depositPending,
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
            notes: `5% Commission from Franchise Introduction ${member.memberUsername}`,
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

    if (isNaN(parsedMemberId) || isNaN(depositAmount)) {
      return res.status(400).json({ message: "Invalid input" });
    }

    const member = await prisma.member.findUnique({
      where: { id: parsedMemberId },
      select: {
        securityDepositAmount: true,
        totalSecurityDepositReturn: true,
      },
    });

    if (!member) {
      return res.status(404).json({ message: "Member not found" });
    }

    const depositDecimal = new Prisma.Decimal(depositAmount);
    const totalDeposit = member.securityDepositAmount.plus(depositDecimal);
    const totalReturn =
      member.totalSecurityDepositReturn || new Prisma.Decimal(0);
    const depositPending = totalDeposit.minus(totalReturn);

    await prisma.member.update({
      where: { id: parsedMemberId },
      data: {
        securityDepositAmount: totalDeposit,
        securityDepositPending: depositPending,
      },
    });

    return res
      .status(201)
      .json({ message: "Security Deposit amount updated successfully" });
  } catch (error) {
    console.error("Error adding deposit:", error);
    return res.status(500).json({
      message: "Failed to add deposit amount",
      details: error.message,
    });
  }
};

const FranchiseDashboard = async (req, res) => {
  const member = req.user.member;

  const purchases = await prisma.purchase.findMany({
    where: { status: DELIVERED, deliveredBy: member.id },
    include: {
      member: true,
    },
  });

  const repurchases = await prisma.repurchase.findMany({
    where: { status: DELIVERED, deliveredBy: member.id },
    include: {
      member: true,
    },
  });

  try {
    return res.status(200).json({
      securityDepositAmount: member.securityDepositAmount,
      isFranchise: member.isFranchise,
      securityDepositPending: member.securityDepositPending,
      franchiseCommission: member.franchiseCommission,
      securityDepositReturn: member.securityDepositReturn,
      franchiseWalletBalance: member.franchiseWalletBalance,
      securityDepositPercentage: member.securityDepositPercentage,
      franchiseIntroductionAmount: member.franchiseIntroductionAmount,
      repurchaseBillAmount: member.repurchaseBillAmount,
      totalSecurityDepositReturn: member.totalSecurityDepositReturn,
      purchases: purchases,
      repurchases: repurchases,
    });
  } catch (error) {
    console.error(error); // Always log the full error for debugging
    return res.status(500).json({
      message: "Failed to get Franchise Dashboard data",
      details: error.message,
    });
  }
};
const deliverProductsToCustomer = async (req, res) => {
  const { invoiceNumber } = req.body;
  const memberId = req?.user?.member?.id;

  if (!invoiceNumber) {
    return res.status(400).json({
      errors: { message: "Invoice number is required." },
    });
  }

  if (!req.user.member.isFranchise) {
    return res.status(400).json({
      errors: { message: "You Are Not A Franchise." },
    });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    const isRepurchase = invoiceNumber.startsWith("R");
    const model = isRepurchase ? prisma.repurchase : prisma.purchase;
    const detailField = isRepurchase ? "repurchaseDetails" : "purchaseDetails";
    const deliveredField = isRepurchase ? "deliveredBy" : "deliveredBy";
    const statusField = "status";
    const deliveredAtField = "deliveredAt";

    const record = await model.findUnique({
      where: { invoiceNumber },
      include: {
        [detailField]: {
          include: { product: true },
        },
      },
    });

    if (!record) {
      return res.status(400).json({
        errors: { message: "Invalid Invoice Number." },
      });
    }

    if (record.status === DELIVERED) {
      return res.status(400).json({
        errors: { message: "Products are already Delivered." },
      });
    }

    // Step 1: Check Stock

    const stockCheckResult = await checkStockAvailability(
      record[detailField],
      memberId,
      today
    );
    if (stockCheckResult.error) {
      return res.status(400).json({
        errors: { message: stockCheckResult.error },
      });
    }

    // Step 2: Process Stock Deduction and Ledger
    await processDeliveryAndLedger(
      record[detailField],
      memberId,
      today,
      isRepurchase
    );

    // Step 3: Update main model as Delivered
    await model.update({
      where: { id: record.id },
      data: {
        status: DELIVERED,
        deliveredAt: new Date(),
        deliveredBy: memberId,
      },
    });

    await updateStock();

    // Step 4: Commission logic (only for Purchase)
    if (isRepurchase) {
      // commission
      // 1. Get member details (to access securityDepositAmount)
      const member = req.user.member;

      const depositAmount = parseFloat(member.securityDepositAmount); // Ensure float

      // 2. Find matching range
      const matchedRange = SECURITY_DEPOSIT_AMOUNT_RANGE_OPTIONS.find(
        (range) => {
          const min = parseFloat(range.min);
          const max = range.max ? parseFloat(range.max) : Infinity;
          return depositAmount >= min && depositAmount <= max;
        }
      );

      // 3. If matched range and repurchase.totalAmountWithGst available
      if (matchedRange && parseFloat(record.totalAmountWithGst)) {
        const repurchaseAmount = new Prisma.Decimal(record.totalAmountWithGst);
        const commissionPercent = matchedRange.percentage;

        const commissionToGive = repurchaseAmount
          .mul(commissionPercent)
          .div(100);

        const updatedMember = await prisma.member.update({
          where: { id: memberId },
          data: {
            franchiseCommission: { increment: commissionToGive },
            franchiseWalletBalance: { increment: commissionToGive },
            walletTransactions: {
              create: {
                amount: commissionToGive,
                walletType: FRANCHISE_WALLET,
                status: APPROVED,
                type: DEBIT, // DEBIT because it's incoming money
                notes: `Repurchase Commission (${commissionPercent}%) for Invoice ${record.invoiceNumber}`,
                transactionDate: new Date(),
              },
            },
          },
        });
      }
      // SDR 15%
      const purchaseAmount = parseFloat(record.totalAmountWithGst);

      let commissionToGive = parseFloat(
        (parseFloat(purchaseAmount) * parseFloat(REPURCHASE_SDR_PERCENT)) / 100
      );
      let updatedMember = await prisma.member.findUnique({
        where: { id: memberId },
      });

      if (
        parseFloat(commissionToGive) >
        parseFloat(updatedMember.securityDepositPending)
      ) {
        commissionToGive = parseFloat(updatedMember.securityDepositPending);
      }

      updatedMember = await prisma.member.update({
        where: { id: updatedMember.id },
        data: {
          franchiseWalletBalance: {
            increment: parseFloat(commissionToGive),
          },
          securityDepositReturn: {
            increment: parseFloat(commissionToGive),
          },
          totalSecurityDepositReturn: {
            increment: parseFloat(commissionToGive),
          },
          walletTransactions: {
            create: {
              amount: new Prisma.Decimal(commissionToGive),
              walletType: FRANCHISE_WALLET,
              status: APPROVED,
              type: DEBIT, // FIXED: Was "DEBIT" — this is income to the influencer
              notes: `${REPURCHASE_SDR_PERCENT}% Security Deposit Return from Repurchase Invoice ${record.invoiceNumber}`,
              transactionDate: new Date(),
            },
          },
        },
      });

      const againUpdatedMember = await prisma.member.update({
        where: { id: member.id },
        data: {
          securityDepositPending:
            parseFloat(updatedMember.securityDepositAmount) -
            parseFloat(updatedMember.totalSecurityDepositReturn),
        },
      });

      // 2% to sponsor
      const sponsorCommission = parseFloat(
        (parseFloat(purchaseAmount) * REPURCHASE_BILL_TO_SPONSOR_PERCENT) / 100
      );

      await prisma.member.update({
        where: { id: updatedMember.sponsorId },
        data: {
          repurchaseBillAmount: { increment: sponsorCommission },
          franchiseWalletBalance: { increment: sponsorCommission },
          walletTransactions: {
            create: {
              amount: new Prisma.Decimal(sponsorCommission),
              walletType: FRANCHISE_WALLET,
              status: APPROVED,
              type: DEBIT,
              notes: `${REPURCHASE_BILL_TO_SPONSOR_PERCENT}% sponsor commission for repurchase invoice ${record.invoiceNumber}`,
              transactionDate: new Date(),
            },
          },
        },
      });
    } else {
      const purchaseAmount = new Prisma.Decimal(record.totalAmountWithGst);
      const commissionToGive =
        purchaseAmount * (PURCHASE_BILL_DELIVERY_PERCENT / 100);

      await prisma.member.update({
        where: { id: memberId },
        data: {
          franchiseCommission: { increment: commissionToGive },
          franchiseWalletBalance: { increment: commissionToGive },
          walletTransactions: {
            create: {
              amount: new Prisma.Decimal(commissionToGive),
              walletType: FRANCHISE_WALLET,
              status: APPROVED,
              type: DEBIT,
              notes: `Franchise Commission For Invoice ${record.invoiceNumber}`,
              transactionDate: new Date(),
            },
          },
        },
      });
    }

    return res.status(201).json({
      message: "Products Delivered Successfully.",
    });
  } catch (error) {
    return res.status(500).json({
      errors: {
        message: "Failed to Deliver Products",
        details: error.message,
      },
    });
  }
};

module.exports = {
  getAllFranchise,
  makeFranchise,
  AddSecurityDepositAmount,
  FranchiseDashboard,
  deliverProductsToCustomer,
};
