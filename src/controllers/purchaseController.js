const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { z } = require("zod");
const validateRequest = require("../utils/validateRequest");

// Get all purchases with pagination, sorting, and search
const getPurchases = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const search = req.query.search || "";
  const sortBy = req.query.sortBy || "id";
  const sortOrder = req.query.sortOrder === "desc" ? "desc" : "asc";

  try {
    const whereClause = {
      OR: [
        { invoiceNumber: { contains: search } },
        { member: { memberName: { contains: search } } },
      ],
    };

    const purchases = await prisma.purchase.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        member: true, // Include member details
        purchaseDetails: true, // Include purchase details
      },
    });

    const totalPurchases = await prisma.purchase.count({
      where: whereClause,
    });
    const totalPages = Math.ceil(totalPurchases / limit);

    res.json({
      purchases,
      page,
      totalPages,
      totalPurchases,
    });
  } catch (error) {
    return res.status(500).json({
      errors: {
        message: "Failed to fetch purchases",
        details: error.message,
      },
    });
  }
};

// Create a new purchase
const createPurchase = async (req, res) => {
  try {
    const {
      totalAmountWithoutGst,
      totalAmountWithGst,
      totalGstAmount,
      totalProductPV,
      purchaseDetails,
    } = req.body;

    const newPurchase = await prisma.purchase.create({
      data: {
        memberId: user.member.id,
        purchaseDate: new Date(),
        totalAmountWithoutGst,
        totalAmountWithGst,
        totalGstAmount,
        totalProductPV,
        purchaseDetails: {
          create: purchaseDetails.map((detail) => ({
            productId: detail.productId,
            quantity: detail.quantity,
            rate: detail.rate,
            cgstPercent: detail.cgstPercent,
            sgstPercent: detail.sgstPercent,
            igstPercent: detail.igstPercent,
            cgstAmount: detail.cgstAmount,
            sgstAmount: detail.sgstAmount,
            igstAmount: detail.igstAmount,
            amountWithoutGst: detail.amountWithoutGst,
            amountWithGst: detail.amountWithGst,
            pvPerUnit: detail.pvPerUnit,
            totalPV: detail.totalPV,
          })),
        },
      },
    });

    res.status(201).json(newPurchase);
  } catch (error) {
    return res.status(500).json({
      errors: {
        message: "Failed to create purchase",
        details: error.message,
      },
    });
  }
};

// Get a purchase by ID
const getPurchaseById = async (req, res) => {
  const { id } = req.params;

  try {
    const purchase = await prisma.purchase.findUnique({
      where: { id: parseInt(id, 10) },
      include: {
        member: true, // Include member details
        purchaseDetails: true, // Include purchase details
      },
    });

    if (!purchase) {
      return res
        .status(404)
        .json({ errors: { message: "Purchase not found" } });
    }

    res.status(200).json(purchase);
  } catch (error) {
    res.status(500).json({
      errors: {
        message: "Failed to fetch purchase",
        details: error.message,
      },
    });
  }
};

module.exports = {
  getPurchases,
  createPurchase,
  getPurchaseById,
};
