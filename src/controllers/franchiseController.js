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

module.exports = {
  getAllFranchise,
};
