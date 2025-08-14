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
const {
  CREDIT,
  APPROVED,
  INCREMENT,
  SELF,
  ASSOCIATE,
  LEFT,
  RIGHT,
  SILVER,
  GOLD,
  DIAMOND,
  ASSOCIATE_COMMISSION,
  GOLD_COMMISSION,
  SILVER_COMMISSION,
  DIAMOND_COMMISSION,
  MAX_COMMISSIONS_PER_DAY,
} = require("../config/data");
const { ifError } = require("assert");

// Get a purchase by ID
const addVirtualPower = async (req, res) => {
  const { memberId, statusType, powerPosition, powerCount, powerType } =
    req.body;
  try {
    let member = await prisma.member.findUnique({
      where: { id: parseInt(memberId, 10) },
    });

    let columnName = null;
    let oppositeColumnName = null;
    let commissionCount = null;
    let commissionAmount = null;
    let commissionDate = null;

    if (statusType === ASSOCIATE && powerPosition === LEFT) {
      columnName = "leftAssociateBalance";
      oppositeColumnName = "rightAssociateBalance";
      commissionCount = "associateCommissionCount";
      commissionDate = "associateCommissionDate";
      commissionAmount = ASSOCIATE_COMMISSION;
    } else if (statusType === ASSOCIATE && powerPosition === RIGHT) {
      columnName = "rightAssociateBalance";
      oppositeColumnName = "leftAssociateBalance";
      commissionCount = "associateCommissionCount";
      commissionDate = "associateCommissionDate";
      commissionAmount = ASSOCIATE_COMMISSION;
    } else if (statusType === SILVER && powerPosition === LEFT) {
      columnName = "leftSilverBalance";
      oppositeColumnName = "rightSilverBalance";
      commissionCount = "silverCommissionCount";
      commissionDate = "silverCommissionDate";
      commissionAmount = SILVER_COMMISSION;
    } else if (statusType === SILVER && powerPosition === RIGHT) {
      columnName = "rightSilverBalance";
      oppositeColumnName = "leftSilverBalance";
      commissionCount = "silverCommissionCount";
      commissionDate = "silverCommissionDate";
      commissionAmount = SILVER_COMMISSION;
    } else if (statusType === GOLD && powerPosition === LEFT) {
      columnName = "leftGoldBalance";
      oppositeColumnName = "rightGoldBalance";
      commissionCount = "goldCommissionCount";
      commissionDate = "silverCommissionDate";
      commissionAmount = GOLD_COMMISSION;
    } else if (statusType === GOLD && powerPosition === RIGHT) {
      columnName = "rightGoldBalance";
      oppositeColumnName = "leftGoldBalance";
      commissionCount = "goldCommissionCount";
      commissionDate = "goldCommissionDate";
      commissionAmount = GOLD_COMMISSION;
    } else if (statusType === DIAMOND && powerPosition === LEFT) {
      columnName = "leftDiamondBalance";
      oppositeColumnName = "rightDiamondBalance";
      commissionCount = "diamondCommissionCount";
      commissionDate = "diamondCommissionDate";
      commissionAmount = DIAMOND_COMMISSION;
    } else if (statusType === DIAMOND && powerPosition === RIGHT) {
      columnName = "rightDiamondBalance";
      oppositeColumnName = "leftDiamondBalance";
      commissionCount = "diamondCommissionCount";
      commissionDate = "diamondCommissionDate";
      commissionAmount = DIAMOND_COMMISSION;
    } else {
      return res
        .status(400)
        .json({ errors: { message: "Invalid statusType or powerPosition" } });
    }

    member = await prisma.member.update({
      where: { id: parseInt(memberId, 10) },
      data: {
        [columnName]: {
          increment: parseInt(powerCount),
        },
      },
    });

    if (member[oppositeColumnName] === 0) {
      return;
    }

    const minBalance = Math.min(member[columnName], member[oppositeColumnName]);
    let matchingIncomeIncrement = 0;

    if (commissionCount < MAX_COMMISSIONS_PER_DAY) {
      matchingIncomeIncrement = MAX_COMMISSIONS_PER_DAY - commissionCount;
      matchingIncomeIncrement = matchingIncomeIncrement * commissionAmount;
    }
    // was here

    const shouldIncrementMatchingIncome =
      member.status === DIAMOND ||
      (member.status === GOLD && statusType !== DIAMOND) ||
      (member.status === SILVER &&
        statusType !== DIAMOND &&
        statusType !== GOLD) ||
      (member.status === ASSOCIATE && statusType === ASSOCIATE);

    member = await prisma.member.update({
      where: { id: parseInt(memberId, 10) },
      data: {
        [columnName]: {
          decrement: parseInt(minBalance),
        },
        [oppositeColumnName]: {
          decrement: parseInt(minBalance),
        },
        ...(shouldIncrementMatchingIncome && {
          matchingIncomeWalletBalance: {
            increment: matchingIncomeIncrement,
          },
        }),
      },
    });

    // Proceed with adding virtual power, e.g.:
    await prisma.virtualPower.create({
      data: {
        memberId: parseInt(memberId),
        statusType,
        powerPosition,
        powerType,
        powerCount: parseInt(powerCount),
      },
    });

    //crate virtual power entry
  } catch (error) {
    res.status(500).json({
      errors: {
        message: "Failed to Add Virtual Power",
        details: error.message,
      },
    });
  }
};

module.exports = {
  addVirtualPower,
};
