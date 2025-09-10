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
      holdWalletBalance: member.holdWalletBalance,
      pvBalance: member.pvBalance,
      status: member.status,
      totalPurchase: totalPurchase,
      matchingIncomeEarned: member.matchingIncomeEarned,
      repurchaseIncome: member.repurchaseIncome,
      repurchaseIncomeL1: member.repurchaseIncomeL1,
      repurchaseIncomeL2: member.repurchaseIncomeL2,
      repurchaseIncomeL3: member.repurchaseIncomeL3,
      repurchaseIncomeL4: member.repurchaseIncomeL4,
      repurchaseIncomeL5: member.repurchaseIncomeL5,
      repurchaseIncomeL6: member.repurchaseIncomeL6,
      repurchaseIncomeL7: member.repurchaseIncomeL7,
      repurchaseIncomeL8: member.repurchaseIncomeL8,
      repurchaseIncomeL9: member.repurchaseIncomeL9,
      repurchaseIncomeL10: member.repurchaseIncomeL10,
      repurchaseCashbackIncome: member.repurchaseCashbackIncome,
      repurchaseMentorIncomeL1: member.repurchaseMentorIncomeL1,
      repurchaseMentorIncomeL2: member.repurchaseMentorIncomeL2,
      repurchaseMentorIncomeL3: member.repurchaseMentorIncomeL3,
      matchingMentorIncomeL1: member.matchingMentorIncomeL1,
      matchingMentorIncomeL2: member.matchingMentorIncomeL2,
      matchingIncomeWalletBalance: member.matchingIncomeWalletBalance,
      upgradeWalletBalance: member.upgradeWalletBalance,
      repurchaseIncomeEarned: member.repurchaseIncomeEarned,
      rewardIncomeEarned: member.rewardIncomeEarned,
      goldRewardIncome: member.goldRewardIncome,
      goldRewardBalance: member.goldRewardBalance,
      goldRewardLevel: member.goldRewardLevel,
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
