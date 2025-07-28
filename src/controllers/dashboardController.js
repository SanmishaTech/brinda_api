const { PrismaClient, Prisma } = require("@prisma/client");
const prisma = new PrismaClient();
const { z } = require("zod");
const validateRequest = require("../utils/validateRequest");
const createError = require("http-errors");
const dayjs = require("dayjs"); // Import dayjs
const { numberToWords } = require("../utils/numberToWords");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs").promises; // Use promises API
const path = require("path");
const { CREDIT, APPROVED, INCREMENT } = require("../config/data");

// Get a purchase by ID
const dashboardInformation = async (req, res) => {
  const memberId = req.user.member.id;

  try {
    const member = await prisma.member.findUnique({
      where: { id: parseInt(memberId, 10) },
      include: {
        purchases: true,
      },
    });

    if (!member) {
      return res.status(404).json({ errors: { message: "Member not found" } });
    }

    // Calculate the total of totalAmountWithGst from purchases
    const totalPurchase = member.purchases.reduce((sum, purchase) => {
      return sum + Number(purchase.totalAmountWithGst || 0);
    }, 0);

    return res.status(200).json({
      walletBalance: member.walletBalance,
      pvBalance: member.pvBalance,
      status: member.status,
      totalPurchase: totalPurchase,
      matchingIncomeEarned: member.matchingIncomeEarned,
    });
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
  dashboardInformation,
};
