const { PrismaClient, Prisma } = require('@prisma/client');
const prisma = new PrismaClient();
const { z } = require('zod');
const validateRequest = require('../utils/validateRequest');
const createError = require('http-errors');
const dayjs = require('dayjs'); // Import dayjs
const { numberToWords } = require('../utils/numberToWords');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs').promises; // Use promises API
const path = require('path');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
dayjs.extend(utc);

const today = dayjs().utc().startOf('day').toDate();
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
  DEBIT,
  MATCHING_INCOME_WALLET,
} = require('../config/data');
const { ifError } = require('assert');

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
    let updates = {};

    if (statusType === ASSOCIATE && powerPosition === LEFT) {
      columnName = 'leftAssociateBalance';
      oppositeColumnName = 'rightAssociateBalance';
      commissionCount = 'associateCommissionCount';
      commissionDate = 'associateCommissionDate';
      commissionAmount = ASSOCIATE_COMMISSION;
    } else if (statusType === ASSOCIATE && powerPosition === RIGHT) {
      columnName = 'rightAssociateBalance';
      oppositeColumnName = 'leftAssociateBalance';
      commissionCount = 'associateCommissionCount';
      commissionDate = 'associateCommissionDate';
      commissionAmount = ASSOCIATE_COMMISSION;
    } else if (statusType === SILVER && powerPosition === LEFT) {
      columnName = 'leftSilverBalance';
      oppositeColumnName = 'rightSilverBalance';
      commissionCount = 'silverCommissionCount';
      commissionDate = 'silverCommissionDate';
      commissionAmount = SILVER_COMMISSION;
    } else if (statusType === SILVER && powerPosition === RIGHT) {
      columnName = 'rightSilverBalance';
      oppositeColumnName = 'leftSilverBalance';
      commissionCount = 'silverCommissionCount';
      commissionDate = 'silverCommissionDate';
      commissionAmount = SILVER_COMMISSION;
    } else if (statusType === GOLD && powerPosition === LEFT) {
      columnName = 'leftGoldBalance';
      oppositeColumnName = 'rightGoldBalance';
      commissionCount = 'goldCommissionCount';
      commissionDate = 'silverCommissionDate';
      commissionAmount = GOLD_COMMISSION;
    } else if (statusType === GOLD && powerPosition === RIGHT) {
      columnName = 'rightGoldBalance';
      oppositeColumnName = 'leftGoldBalance';
      commissionCount = 'goldCommissionCount';
      commissionDate = 'goldCommissionDate';
      commissionAmount = GOLD_COMMISSION;
    } else if (statusType === DIAMOND && powerPosition === LEFT) {
      columnName = 'leftDiamondBalance';
      oppositeColumnName = 'rightDiamondBalance';
      commissionCount = 'diamondCommissionCount';
      commissionDate = 'diamondCommissionDate';
      commissionAmount = DIAMOND_COMMISSION;
    } else if (statusType === DIAMOND && powerPosition === RIGHT) {
      columnName = 'rightDiamondBalance';
      oppositeColumnName = 'leftDiamondBalance';
      commissionCount = 'diamondCommissionCount';
      commissionDate = 'diamondCommissionDate';
      commissionAmount = DIAMOND_COMMISSION;
    } else {
      return res
        .status(400)
        .json({ errors: { message: 'Invalid statusType or powerPosition' } });
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

    const shouldIncrementMatchingIncome =
      (member.status === DIAMOND && member.is2_1Pass && member.isDirectMatch) ||
      (member.status === GOLD &&
        statusType !== DIAMOND &&
        member.is2_1Pass &&
        member.isDirectMatch) ||
      (member.status === SILVER &&
        statusType !== DIAMOND &&
        statusType !== GOLD &&
        member.is2_1Pass &&
        member.isDirectMatch) ||
      (member.status === ASSOCIATE &&
        statusType === ASSOCIATE &&
        member.is2_1Pass &&
        member.isDirectMatch);

    // start commission logic

    const isSameCommissionDay =
      commissionDate && dayjs(commissionDate).utc().isSame(today, 'day');

    if (isSameCommissionDay) {
      if (commissionCount < MAX_COMMISSIONS_PER_DAY) {
        const availableCount = MAX_COMMISSIONS_PER_DAY - commissionCount;

        if (minBalance < availableCount) {
          updates[commissionCount] = {
            increment: minBalance,
          };
          matchingIncomeIncrement = minBalance * commissionAmount;
        } else {
          updates[commissionCount] = {
            increment: availableCount,
          };
          matchingIncomeIncrement = availableCount * commissionAmount;
        }
      }
    } else {
      updates[commissionDate] = today;

      if (minBalance < MAX_COMMISSIONS_PER_DAY) {
        updates[commissionCount] = minBalance;
        matchingIncomeIncrement = minBalance * commissionAmount;
      } else {
        updates[commissionCount] = MAX_COMMISSIONS_PER_DAY;
        matchingIncomeIncrement = MAX_COMMISSIONS_PER_DAY * commissionAmount;
      }
    }

    //add 2 if condition is2_1 pass and is direct match thats it.
    // end commission logic

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
          ...updates, //contains commission date and count
          walletTransactions: {
            create: {
              amount: matchingIncomeIncrement,
              status: APPROVED,
              type: DEBIT,
              transactionDate: new Date(),
              walletType: MATCHING_INCOME_WALLET,
              notes: `Virtual Power Commission`,
            },
          },
        }),
      },
    });

    // this code should be outside of loop
    await prisma.virtualPower.create({
      data: {
        memberId: parseInt(memberId),
        statusType,
        powerPosition,
        powerType,
        powerCount: parseInt(powerCount),
      },
    });
  } catch (error) {
    res.status(500).json({
      errors: {
        message: 'Failed to Add Virtual Power',
        details: error.message,
      },
    });
  }
};

module.exports = {
  addVirtualPower,
};
