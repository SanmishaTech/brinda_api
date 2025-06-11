const { PrismaClient, Prisma } = require("@prisma/client");
const validateRequest = require("../utils/validateRequest");
const prisma = new PrismaClient();
const { z } = require("zod");

/**
 * Get all wallet transactions for a member with pagination, sorting, and search
 */
const getMemberTransactions = async (req, res) => {
  const { memberId } = req.user.member.id;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const search = req.query.search || "";
  const sortBy = req.query.sortBy || "id";
  const sortOrder = req.query.sortOrder === "desc" ? "desc" : "asc";

  try {
    const whereClause = {
      memberId: parseInt(memberId),
      OR: [
        { type: { contains: search } },
        { status: { contains: search } },
        { paymentMethod: { contains: search } },
        { referenceNumber: { contains: search } },
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
 * Add a wallet amount request (CREDIT or DEBIT)
 */
const addWalletAmountRequest = async (req, res) => {
  const schema = z.object({
    paymentMethod: z.string().optional(),
    referenceNumber: z.string().optional(),
    notes: z.string().optional(),
  });
  const { memberId } = req.user.member.id;

  const validationErrors = await validateRequest(schema, req.body, res);

  const { amount, type, paymentMethod, referenceNumber, notes } = req.body;

  try {
    const newTransaction = await prisma.walletTransaction.create({
      data: {
        memberId,
        amount: new Prisma.Decimal(amount),
        type,
        status: "PENDING",
        paymentMethod,
        referenceNumber,
        notes,
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
  const validationErrors = await validateRequest(schema, req.body, res);
  const { adminId } = req.user.id;
  const { id } = req.params;
  const { status } = req.body;

  try {
    const updatedTransaction = await prisma.walletTransaction.update({
      where: { id: parseInt(id) },
      data: {
        status,
        processedByAdminId: adminId,
      },
    });

    res.status(200).json(updatedTransaction);
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
 * Get wallet transactions by member ID
 */
const getWalletTransactionsByMemberId = async (req, res) => {
  const { memberId } = req.params; // Extract memberId from request parameters
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const search = req.query.search || "";
  const sortBy = req.query.sortBy || "id";
  const sortOrder = req.query.sortOrder === "desc" ? "desc" : "asc";

  try {
    const whereClause = {
      memberId: parseInt(memberId),
      OR: [
        { type: { contains: search, mode: "insensitive" } },
        { status: { contains: search, mode: "insensitive" } },
        { paymentMethod: { contains: search, mode: "insensitive" } },
        { referenceNumber: { contains: search, mode: "insensitive" } },
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

    res.status(200).json({
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
 * Get wallet amount for a member
 */
const getWalletAmount = async (req, res) => {
  const walletBalance = req.user.member.walletBalance; // Extract memberId from authenticated user
  console.log(req.user);
  try {
    // const walletAmount = await prisma.member.findUnique({
    //   where: { id: parseInt(memberId) },
    //   select: { walletBalance: true }, // Select only the wallet balance field
    // });

    // if (!walletAmount) {
    //   return res.status(404).json({
    //     message: "Member not found",
    //   });
    // }

    res.status(200).json({
      walletBalance: walletBalance,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch wallet amount",
      details: error.message,
    });
  }
};

module.exports = {
  getMemberTransactions,
  addWalletAmountRequest,
  updateWalletAmountRequest,
  getWalletTransactionById,
  getWalletTransactionsByMemberId,
  getWalletAmount,
};
