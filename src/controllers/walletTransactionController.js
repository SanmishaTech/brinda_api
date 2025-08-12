const { PrismaClient, Prisma } = require("@prisma/client");
const validateRequest = require("../utils/validateRequest");
const prisma = new PrismaClient();
const { z } = require("zod");
const {
  CREDIT,
  DEBIT,
  PENDING,
  APPROVED,
  TRANSFERRED,
  MATCHING_INCOME_WALLET,
  FUND_WALLET,
} = require("../config/data");
/**
 * Get all wallet transactions for a member with pagination, sorting, and search
 */
const getMemberTransactions = async (req, res) => {
  const memberId = req.user.member.id;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const search = req.query.search || "";
  const sortBy = req.query.sortBy || "id";
  const sortOrder = req.query.sortOrder || "desc";

  try {
    const whereClause = {
      memberId: parseInt(memberId),
      OR: [
        { type: { contains: search } },
        { status: { contains: search } },
        { paymentMethod: { contains: search } },
        { referenceNumber: { contains: search } },
        { walletType: { contains: search } },
      ],
    };

    const walletTransactions = await prisma.walletTransaction.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
    });

    const totalTransactions = await prisma.walletTransaction.count({
      where: whereClause,
    });
    const totalPages = Math.ceil(totalTransactions / limit);

    res.json({
      walletTransactions,
      page,
      totalPages,
      totalTransactions,
    });
  } catch (error) {
    return res.status(500).json({
      errors: {
        message: "Failed to fetch wallet transactions",
        details: error.message,
      },
    });
  }
};

/**
 * Add a wallet amount request (CREDIT)
 */
const addWalletAmountRequest = async (req, res) => {
  const memberId = req.user.member.id;

  const { amount } = req.body;

  try {
    const newTransaction = await prisma.walletTransaction.create({
      data: {
        memberId,
        amount: new Prisma.Decimal(amount),
        transactionDate: new Date(),
        type: DEBIT,
        walletType: FUND_WALLET,
        status: PENDING,
      },
    });

    res.status(201).json(newTransaction);
  } catch (error) {
    return res.status(500).json({
      message: "Failed to create wallet transaction request",
      details: error.message,
    });
  }
};

/**
 * Update a wallet amount request (e.g., approve or reject)
 */
const updateWalletAmountRequest = async (req, res) => {
  const adminId = req.user.id;
  const { id } = req.params;
  const { paymentMode, referenceNumber, notes, status } = req.body;

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Update the wallet transaction
      const updatedTransaction = await tx.walletTransaction.update({
        where: { id: parseInt(id) },
        data: {
          status,
          processedByAdminId: adminId,
          paymentMethod: paymentMode || null,
          referenceNumber: referenceNumber || null,
          notes: notes || null,
        },
      });

      if (status === APPROVED) {
        const updatedMember = await tx.member.update({
          where: { id: updatedTransaction.memberId },
          data: {
            walletBalance: {
              increment: updatedTransaction.amount,
            },
          },
        });
      }

      return {
        updatedTransaction,
      };
    });

    res.status(200).json(result.updatedTransaction);
  } catch (error) {
    return res.status(500).json({
      message: "Failed to update wallet transaction request",
      details: error.message,
    });
  }
};

/**
 * Get wallet transaction by ID
 */
const getWalletTransactionById = async (req, res) => {
  const { id } = req.params;

  try {
    const transaction = await prisma.walletTransaction.findUnique({
      where: { id: parseInt(id) },
    });

    if (!transaction) {
      return res.status(404).json({
        message: "Wallet transaction not found",
      });
    }

    res.status(200).json(transaction);
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch wallet transaction",
      details: error.message,
    });
  }
};

/**
 * Get wallet transactions by member ID For Admin
 */
const getWalletTransactionsByMemberId = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const memberId = parseInt(req.params.memberId); // Get from req.params
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const search = req.query.search || "";
  const sortBy = req.query.sortBy || "id"; // Default sort by transactionDate
  const sortOrder = req.query.sortOrder || "desc";
  const trimmedSearch = search?.trim();
  const isSearchNumber =
    trimmedSearch !== "" &&
    !isNaN(Number(trimmedSearch)) &&
    /^\d+(\.\d{1,2})?$/.test(trimmedSearch);

  try {
    const whereClause = {
      memberId: memberId,
      OR: [
        { type: { contains: trimmedSearch } },
        { status: { contains: trimmedSearch } },
        { paymentMethod: { contains: trimmedSearch } },
        { referenceNumber: { contains: trimmedSearch } },
        { walletType: { contains: trimmedSearch } },
        {
          member: {
            is: {
              memberName: {
                contains: trimmedSearch,
              },
            },
          },
        },
        ...(isSearchNumber
          ? [
              {
                amount: {
                  equals: new Prisma.Decimal(trimmedSearch),
                },
              },
            ]
          : []),
      ],
    };

    const walletTransactions = await prisma.walletTransaction.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
    });

    const member = await prisma.member.findUnique({
      where: { id: memberId },
    });

    const totalTransactions = await prisma.walletTransaction.count({
      where: whereClause,
    });
    const totalPages = Math.ceil(totalTransactions / limit);

    res.status(200).json({
      walletTransactions,
      member,
      page,
      totalPages,
      totalTransactions,
    });
  } catch (error) {
    return res.status(500).json({
      errors: {
        message: "Failed to fetch wallet transactions",
        details: error.message,
      },
    });
  }
};

/**
 * Get wallet amount for a member
 */
const getWalletAmount = async (req, res) => {
  try {
    const walletBalance = req.user.member.walletBalance;
    const matchingIncomeWalletBalance =
      req.user.member.matchingIncomeWalletBalance;
    const upgradeWalletBalance = req.user.member.upgradeWalletBalance;

    res.status(200).json({
      matchingIncomeWalletBalance: Number(matchingIncomeWalletBalance),
      walletBalance: Number(walletBalance),
      upgradeWalletBalance: Number(upgradeWalletBalance),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch wallet amount",
      details: error.message,
    });
  }
};

/**
 * Transfer amount from one member to another
 */
const transferAmount = async (req, res) => {
  const { amount, walletType, memberId, tPin } = req.body; // Extract amount and memberId from the request body
  const senderId = req.user.member.id; // Get the sender's member ID from the authenticated user

  try {
    // Validate the sender's wallet balance
    // Fetch sender details including TPIN hash
    const sender = await prisma.member.findUnique({
      where: { id: senderId },
      select: {
        walletBalance: true,
        matchingIncomeWalletBalance: true,
        memberName: true,
        memberUsername: true,
        tPin: true, // Assuming the TPIN is stored in this field
      },
    });

    if (!sender) {
      return res.status(404).json({
        errors: {
          message: "Sender not founds",
        },
      });
    }

    // Check TPIN
    const isPinValid = Number(sender.tPin) === Number(tPin);
    if (!isPinValid) {
      return res.status(500).json({
        errors: {
          message: "Invalid Transaction PIN",
        },
      });
    }

    // Check sufficient balance
    if (walletType === MATCHING_INCOME_WALLET) {
      if (parseFloat(sender.matchingIncomeWalletBalance) < parseFloat(amount)) {
        return res.status(400).json({
          message: "Insufficient Matching Income wallet balance",
        });
      }
    } else if (walletType === FUND_WALLET) {
      if (parseFloat(sender.walletBalance) < parseFloat(amount)) {
        return res.status(400).json({
          message: "Insufficient Fund wallet balance",
        });
      }
    } else {
      return res.status(400).json({
        message: "Invalid wallet type",
      });
    }

    // Validate the recipient member
    const recipient = await prisma.member.findUnique({
      where: { id: memberId },
      select: { id: true, memberName: true, memberUsername: true },
    });

    if (!recipient) {
      return res.status(404).json({
        message: "Recipient member not found",
      });
    }

    // Perform the transfer within a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Deduct the amount from the sender's wallet
      const data = {};

      if (walletType === MATCHING_INCOME_WALLET) {
        data.matchingIncomeWalletBalance = {
          decrement: amount,
        };
      } else if (walletType === FUND_WALLET) {
        data.walletBalance = {
          decrement: amount,
        };
      } else {
        return res.status(404).json({
          message: "Invalid wallet type",
        });
      }

      await tx.member.update({
        where: { id: senderId },
        data,
      });

      // Add the amount to the recipient's wallet
      await tx.member.update({
        where: { id: memberId },
        data: {
          walletBalance: {
            increment: amount,
          },
        },
      });

      // Create a transaction record for the sender
      const senderTransaction = await tx.walletTransaction.create({
        data: {
          memberId: senderId,
          amount: new Prisma.Decimal(amount),
          type: CREDIT,
          transactionDate: new Date(),
          status: TRANSFERRED,
          walletType: walletType,
          notes: `Transferred ₹${amount} to ${recipient.memberName}(${recipient.memberUsername})`,
        },
      });

      // Create a transaction record for the recipient
      const recipientTransaction = await tx.walletTransaction.create({
        data: {
          memberId: memberId,
          amount: new Prisma.Decimal(amount),
          type: DEBIT,
          transactionDate: new Date(),
          status: TRANSFERRED,
          walletType: FUND_WALLET,
          notes: `Received ₹${amount} from  ${sender.memberName}(${sender.memberUsername})`,
        },
      });

      return { senderTransaction, recipientTransaction };
    });

    res.status(200).json({
      message: "Amount transferred successfully",
      transactions: result,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to transfer amount",
      details: error.message,
    });
  }
};

/**
 * Deposit amount to a member's wallet
 */
const depositAmount = async (req, res) => {
  const { paymentMode, referenceNumber, notes, amountToCredit } = req.body; // Extract details from the request body
  const adminId = req.user.id; // Get the admin's ID from the authenticated user
  const memberId = parseInt(req.params.memberId);
  try {
    // Validate the recipient member
    const recipient = await prisma.member.findUnique({
      where: { id: memberId },
      select: { id: true, memberName: true, walletBalance: true },
    });

    if (!recipient) {
      return res.status(404).json({
        message: "Recipient member not found",
      });
    }

    // Perform the deposit within a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Add the amount to the recipient's wallet
      const updatedMember = await tx.member.update({
        where: { id: memberId },
        data: {
          walletBalance: {
            increment: amountToCredit,
          },
        },
      });

      // Create a transaction record for the deposit
      const depositTransaction = await tx.walletTransaction.create({
        data: {
          memberId,
          amount: new Prisma.Decimal(amountToCredit),
          type: DEBIT,
          transactionDate: new Date(),
          status: APPROVED,
          paymentMethod: paymentMode,
          referenceNumber: referenceNumber || null,
          notes: notes || null,
          walletType: FUND_WALLET,
          processedByAdminId: adminId,
        },
      });

      return { updatedMember, depositTransaction };
    });

    res.status(200).json({
      message: "Amount deposited successfully",
      result,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to deposit amount",
      details: error.message,
    });
  }
};

/**
 * Withdraw amount from a member's wallet
 */
const withdrawAmount = async (req, res) => {
  const { paymentMode, referenceNumber, notes, amount } = req.body; // Extract details from the request body
  const adminId = req.user.id; // Get the admin's ID from the authenticated user
  const memberId = parseInt(req.params.memberId);

  try {
    // Validate the recipient member
    const member = await prisma.member.findUnique({
      where: { id: memberId },
      select: { id: true, memberName: true, walletBalance: true },
    });

    if (!member) {
      return res.status(500).json({
        errors: {
          message: "Member not found",
        },
      });
    }

    // Check if the member has sufficient wallet balance
    if (Number(member.walletBalance) < Number(amount)) {
      return res.status(500).json({
        errors: {
          message: "Insufficient wallet balance",
        },
      });
    }

    // Perform the withdrawal within a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Deduct the amount from the member's wallet
      const updatedMember = await tx.member.update({
        where: { id: memberId },
        data: {
          walletBalance: {
            decrement: amount,
          },
        },
      });

      // Create a transaction record for the withdrawal
      const withdrawalTransaction = await tx.walletTransaction.create({
        data: {
          memberId,
          amount: new Prisma.Decimal(amount),
          type: CREDIT,
          transactionDate: new Date(),
          status: APPROVED,
          paymentMethod: paymentMode,
          referenceNumber: referenceNumber || null,
          notes: notes || null,
          walletType: FUND_WALLET,
          processedByAdminId: adminId,
        },
      });

      return { updatedMember, withdrawalTransaction };
    });

    res.status(200).json({
      message: "Amount withdrawn successfully",
      result,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to withdraw amount",
      details: error.message,
    });
  }
};

/**
 * Get sponsor name by username
 */
const getMemberByUsername = async (req, res) => {
  const { username } = req.params;

  try {
    // Fetch the sponsor by username
    const member = await prisma.member.findUnique({
      where: { memberUsername: username },
      select: {
        id: true,
        memberName: true,
        memberUsername: true,
        memberState: true,
        memberEmail: true,
        memberMobile: true,
        memberDob: true,
        memberAddress: true,
        memberPincode: true,
        memberGender: true,
      },
    });

    if (!member) {
      return res.status(500).json({
        message: "Sponsor not found",
      });
    }

    res.status(200).json(member);
  } catch (error) {
    console.error("Error fetching sponsor:", error);
    res.status(500).json({
      message: "Failed to fetch sponsor",
      details: error.message,
    });
  }
};

module.exports = {
  getMemberTransactions, //transaction history
  addWalletAmountRequest, // member wallet top-up
  updateWalletAmountRequest, //admin approval
  getWalletTransactionById, // get transaction by id
  getWalletTransactionsByMemberId, //admin list
  getWalletAmount, // get wallet amount
  transferAmount, // transfer amount between members
  depositAmount, //admin deposit amount
  withdrawAmount, //admin withdraw amount
  getMemberByUsername,
};
