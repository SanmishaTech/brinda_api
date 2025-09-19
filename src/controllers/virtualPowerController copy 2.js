const { PrismaClient, Prisma } = require('@prisma/client');
const prisma = require("../config/db");
const { z } = require('zod');
const validateRequest = require('../utils/validateRequest');
const createError = require('http-errors');
const { numberToWords } = require('../utils/numberToWords');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs').promises; // Use promises API
const path = require('path');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
dayjs.extend(utc);
const logger = require('../utils/logger'); // Assuming you have a logger utility
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
  TOP,
  INACTIVE,
} = require('../config/data');
const purchaseTask = require('../../taskQueue/purchaseTask');

/**
 * Get all members with pagination, sorting, and search
 */
const getVirtualPowers = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const search = req.query.search?.trim() || '';
  const sortBy = req.query.sortBy || 'id';
  const sortOrder = req.query.sortOrder === 'desc' ? 'desc' : 'asc';
  let orderByClause = {};
  if (
    sortBy === 'memberUsername' ||
    sortBy === 'memberName' ||
    sortBy === 'bankAccountNumber'
  ) {
    orderByClause = {
      member: {
        [sortBy]: sortOrder,
      },
    };
  } else {
    orderByClause = {
      [sortBy]: sortOrder,
    };
  }
  try {
    const whereClause = {
      ...(search && {
        OR: [
          {
            member: {
              memberUsername: {
                contains: search,
              },
            },
          },
          {
            member: {
              memberName: {
                contains: search,
              },
            },
          },
        ],
      }),
    };

    const virtualPowers = await prisma.virtualPower.findMany({
      where: whereClause,
      include: {
        member: true,
      },
      skip,
      take: limit,
      orderBy: orderByClause,
    });

    const totalRecords = await prisma.virtualPower.count({
      where: whereClause,
    });

    const totalPages = Math.ceil(totalRecords / limit);

    res.json({
      virtualPowers,
      page,
      totalPages,
      totalRecords,
    });
  } catch (error) {
    logger.error(`Virtual Power List Error: ${error}`);
    return res.status(500).json({
      errors: {
        message: 'Failed to Fetch Virtual Power List',
        details: error.message,
      },
    });
  }
};

const addVirtualPower = async (req, res) => {
  const { memberId, statusType, powerPosition, powerCount, powerType } =
    req.body;

  logger.info(
    `Incoming request to addVirtualPower: ${memberId}, ${statusType}, ${powerPosition}, ${powerCount}, ${powerType}`
  );

  try {
    purchaseTask({
      type: 'vitualPower',
      memberId: memberId,
      statusType: statusType,
      powerPosition: powerPosition,
      powerCount: powerCount,
      powerType: powerType,
    });
    let parentId = parseInt(memberId, 10);
    let member = null;
    let currentPosition = powerPosition;

    do {
      member = await prisma.member.findUnique({
        where: {
          id: parentId,
        },
      });

      // start
      let columnName = null;
      let oppositeColumnName = null;
      let commissionCount = null;
      let commissionAmount = null;
      let commissionDate = null;
      let updates = {};
      let is2_1Pass = member.is2_1Pass;
      let totalStatusBalance = null;
      let totalStatusMatched = null;

      if (statusType === ASSOCIATE && currentPosition === LEFT) {
        // logger.info("Matched ASSOCIATE / LEFT");
        columnName = 'leftAssociateBalance';
        oppositeColumnName = 'rightAssociateBalance';
        totalStatusBalance = 'totalLeftAssociateBalance';
        commissionCount = 'associateCommissionCount';
        commissionDate = 'associateCommissionDate';
        commissionAmount = ASSOCIATE_COMMISSION;
        totalStatusMatched = 'totalAssociateMatched';
      } else if (statusType === ASSOCIATE && currentPosition === RIGHT) {
        // logger.info("Matched ASSOCIATE / RIGHT");
        columnName = 'rightAssociateBalance';
        oppositeColumnName = 'leftAssociateBalance';
        totalStatusBalance = 'totalRightAssociateBalance';
        commissionCount = 'associateCommissionCount';
        commissionDate = 'associateCommissionDate';
        commissionAmount = ASSOCIATE_COMMISSION;
        totalStatusMatched = 'totalAssociateMatched';
      } else if (statusType === SILVER && currentPosition === LEFT) {
        // logger.info("Matched SILVER / LEFT");
        columnName = 'leftSilverBalance';
        oppositeColumnName = 'rightSilverBalance';
        totalStatusBalance = 'totalLeftSilverBalance';
        commissionCount = 'silverCommissionCount';
        commissionDate = 'silverCommissionDate';
        commissionAmount = SILVER_COMMISSION;
        totalStatusMatched = 'totalSilverMatched';
      } else if (statusType === SILVER && currentPosition === RIGHT) {
        // logger.info("Matched SILVER / RIGHT");
        columnName = 'rightSilverBalance';
        oppositeColumnName = 'leftSilverBalance';
        totalStatusBalance = 'totalRightSilverBalance';
        commissionCount = 'silverCommissionCount';
        commissionDate = 'silverCommissionDate';
        commissionAmount = SILVER_COMMISSION;
        totalStatusMatched = 'totalSilverMatched';
      } else if (statusType === GOLD && currentPosition === LEFT) {
        // logger.info("Matched GOLD / LEFT");
        columnName = 'leftGoldBalance';
        oppositeColumnName = 'rightGoldBalance';
        totalStatusBalance = 'totalLeftGoldBalance';
        commissionCount = 'goldCommissionCount';
        commissionDate = 'silverCommissionDate';
        commissionAmount = GOLD_COMMISSION;
        totalStatusMatched = 'totalGoldMatched';
      } else if (statusType === GOLD && currentPosition === RIGHT) {
        // logger.info("Matched GOLD / RIGHT");
        columnName = 'rightGoldBalance';
        oppositeColumnName = 'leftGoldBalance';
        totalStatusBalance = 'totalRightGoldBalance';
        commissionCount = 'goldCommissionCount';
        commissionDate = 'goldCommissionDate';
        commissionAmount = GOLD_COMMISSION;
        totalStatusMatched = 'totalGoldMatched';
      } else if (statusType === DIAMOND && currentPosition === LEFT) {
        // logger.info("Matched DIAMOND / LEFT");
        columnName = 'leftDiamondBalance';
        oppositeColumnName = 'rightDiamondBalance';
        totalStatusBalance = 'totalLeftDiamondBalance';
        commissionCount = 'diamondCommissionCount';
        commissionDate = 'diamondCommissionDate';
        commissionAmount = DIAMOND_COMMISSION;
        totalStatusMatched = 'totalDiamondMatched';
      } else if (statusType === DIAMOND && currentPosition === RIGHT) {
        // logger.info("Matched DIAMOND / RIGHT");
        columnName = 'rightDiamondBalance';
        oppositeColumnName = 'leftDiamondBalance';
        totalStatusBalance = 'totalRightDiamondBalance';
        commissionCount = 'diamondCommissionCount';
        commissionDate = 'diamondCommissionDate';
        commissionAmount = DIAMOND_COMMISSION;
        totalStatusMatched = 'totalDiamondMatched';
      } else {
        // logger.info("Invalid statusType or powerPosition");
        return res
          .status(400)
          .json({ errors: { message: 'Invalid statusType or powerPosition' } });
      }

      // logger.info(`Incrementing power on column: ${columnName}`);
      member = await prisma.member.update({
        where: { id: parseInt(member.id, 10) },
        data: {
          [columnName]: {
            increment: parseInt(powerCount),
          },
          [totalStatusBalance]: {
            increment: parseInt(powerCount),
          },
        },
      });

      if (member[oppositeColumnName] !== 0) {
        let minBalance = Math.min(
          member[columnName],
          member[oppositeColumnName]
        );
        let matchingIncomeIncrement = 0;

        if (!is2_1Pass && statusType === ASSOCIATE) {
          // 2:1 logic
          if (member[columnName] >= 2 && member[oppositeColumnName] >= 1) {
            updates[columnName] = { decrement: 2 };
            updates[oppositeColumnName] = { decrement: 1 };
            is2_1Pass = true;
          } else if (
            member[oppositeColumnName] >= 2 &&
            member[columnName] >= 1
          ) {
            updates[oppositeColumnName] = { decrement: 2 };
            updates[columnName] = { decrement: 1 };
            is2_1Pass = true;
          }

          member = await prisma.member.update({
            where: { id: parseInt(member.id, 10) },
            data: {
              ...updates, //contains 2_1 ,left and right associate balance,total balance
              is2_1Pass: is2_1Pass, //before it was is2_1Pass: true
              ...(member.isDirectMatch &&
                is2_1Pass &&
                member.status !== INACTIVE && {
                  matchingIncomeWalletBalance: {
                    increment: (ASSOCIATE_COMMISSION * member.percentage) / 100,
                  },
                  associateCommissionCount: {
                    increment: 1,
                  },
                  totalAssociateMatched: { increment: 1 },
                  associateCommissionDate: today,
                  walletTransactions: {
                    create: {
                      amount: (ASSOCIATE_COMMISSION * member.percentage) / 100,
                      status: APPROVED,
                      type: DEBIT,
                      transactionDate: new Date(),
                      walletType: MATCHING_INCOME_WALLET,
                      notes: `2:1 Virtual Power Commission`,
                    },
                  },
                }),
            },
          });
          updates = {};
          minBalance = Math.min(member[columnName], member[oppositeColumnName]);
          // here
        }

        const shouldIncrementMatchingIncome =
          (member.status === DIAMOND &&
            member.is2_1Pass &&
            member.isDirectMatch) ||
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

        const isSameCommissionDay =
          member[commissionDate] &&
          dayjs(member[commissionDate]).utc().isSame(today, 'day');

        if (isSameCommissionDay) {
          // logger.info("Same commission day");
          if (member[commissionCount] < MAX_COMMISSIONS_PER_DAY) {
            const availableCount =
              MAX_COMMISSIONS_PER_DAY - member[commissionCount];
            // logger.info(`Available commission count: ${availableCount}`);

            if (minBalance < availableCount) {
              updates[commissionCount] = {
                increment: minBalance,
              };
              if (statusType !== GOLD) {
                updates[totalStatusMatched] = {
                  increment: minBalance,
                };
              }

              matchingIncomeIncrement = minBalance * commissionAmount;
            } else {
              updates[commissionCount] = {
                increment: availableCount,
              };
              if (statusType !== GOLD) {
                updates[totalStatusMatched] = {
                  increment: availableCount,
                };
              }
              matchingIncomeIncrement = availableCount * commissionAmount;
            }
          }
        } else {
          // logger.info("New commission day");
          updates[commissionDate] = today;

          if (minBalance < MAX_COMMISSIONS_PER_DAY) {
            updates[commissionCount] = minBalance;
            if (statusType !== GOLD) {
              updates[totalStatusMatched] = {
                increment: minBalance,
              };
            }
            matchingIncomeIncrement = minBalance * commissionAmount;
          } else {
            updates[commissionCount] = MAX_COMMISSIONS_PER_DAY;
            if (statusType !== GOLD) {
              updates[totalStatusMatched] = {
                increment: MAX_COMMISSIONS_PER_DAY,
              };
            }
            matchingIncomeIncrement =
              MAX_COMMISSIONS_PER_DAY * commissionAmount;
          }
        }
        matchingIncomeIncrement = parseFloat(
          (matchingIncomeIncrement * member.percentage) / 100
        );
        // logger.info(`Commission amount: ${matchingIncomeIncrement}`);

        member = await prisma.member.update({
          where: { id: parseInt(member.id, 10) },
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
              ...updates, // contains commissionCount, commissionDate,status matched
              ...(matchingIncomeIncrement > 0 && {
                walletTransactions: {
                  create: {
                    amount: matchingIncomeIncrement,
                    status: APPROVED,
                    type: DEBIT,
                    transactionDate: new Date(),
                    walletType: MATCHING_INCOME_WALLET,
                    notes: `${statusType} Virtual Power Commission`,
                  },
                },
              }),
            }),
          },
        });
      }

      if (powerType === SELF) {
        logger.info(`Self power.`);
        break;
      }

      // end

      parentId = member.parentId;
      currentPosition = member.positionToParent;
    } while (member.positionToParent !== TOP);

    await prisma.virtualPower.create({
      data: {
        memberId: parseInt(memberId),
        statusType,
        powerPosition,
        powerType,
        powerCount: parseInt(powerCount),
      },
    });

    // logger.info(`Created virtual power record`);

    return res.status(200).json({
      message: 'Virtual Power Added Successfully',
    });
  } catch (error) {
    logger.error(`Error in addVirtualPower: ${error}`);
    res.status(500).json({
      errors: {
        message: 'Failed to Add Virtual Power',
        details: error.message,
      },
    });
  }
};

module.exports = {
  getVirtualPowers,
  addVirtualPower,
};
