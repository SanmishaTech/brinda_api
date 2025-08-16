const { PrismaClient, Prisma } = require("@prisma/client");
const prisma = new PrismaClient();
const { z } = require("zod");
const validateRequest = require("../utils/validateRequest");
const createError = require("http-errors");
const { numberToWords } = require("../utils/numberToWords");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs").promises; // Use promises API
const path = require("path");
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
dayjs.extend(utc);
const logger = require("../utils/logger"); // Assuming you have a logger utility
const today = dayjs().utc().startOf("day").toDate();
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
} = require("../config/data");

const addVirtualPower = async (req, res) => {
  const { memberId, statusType, powerPosition, powerCount, powerType } =
    req.body;

  logger.info("Incoming request to addVirtualPower", {
    memberId,
    statusType,
    powerPosition,
    powerCount,
    powerType,
  });

  try {
    let member = await prisma.member.findUnique({
      where: { id: parseInt(memberId, 10) },
    });

    while (member) {
      logger.info(`Fetched member: ${member?.id || "NOT FOUND"}`);

      let columnName = null;
      let oppositeColumnName = null;
      let commissionCount = null;
      let commissionAmount = null;
      let commissionDate = null;
      let updates = {};
      let is2_1Pass = member.is2_1Pass;

      if (statusType === ASSOCIATE && powerPosition === LEFT) {
        logger.info("Matched ASSOCIATE / LEFT");
        columnName = "leftAssociateBalance";
        oppositeColumnName = "rightAssociateBalance";
        commissionCount = "associateCommissionCount";
        commissionDate = "associateCommissionDate";
        commissionAmount = ASSOCIATE_COMMISSION;
      } else if (statusType === ASSOCIATE && powerPosition === RIGHT) {
        logger.info("Matched ASSOCIATE / RIGHT");
        columnName = "rightAssociateBalance";
        oppositeColumnName = "leftAssociateBalance";
        commissionCount = "associateCommissionCount";
        commissionDate = "associateCommissionDate";
        commissionAmount = ASSOCIATE_COMMISSION;
      } else if (statusType === SILVER && powerPosition === LEFT) {
        logger.info("Matched SILVER / LEFT");
        columnName = "leftSilverBalance";
        oppositeColumnName = "rightSilverBalance";
        commissionCount = "silverCommissionCount";
        commissionDate = "silverCommissionDate";
        commissionAmount = SILVER_COMMISSION;
      } else if (statusType === SILVER && powerPosition === RIGHT) {
        logger.info("Matched SILVER / RIGHT");
        columnName = "rightSilverBalance";
        oppositeColumnName = "leftSilverBalance";
        commissionCount = "silverCommissionCount";
        commissionDate = "silverCommissionDate";
        commissionAmount = SILVER_COMMISSION;
      } else if (statusType === GOLD && powerPosition === LEFT) {
        logger.info("Matched GOLD / LEFT");
        columnName = "leftGoldBalance";
        oppositeColumnName = "rightGoldBalance";
        commissionCount = "goldCommissionCount";
        commissionDate = "silverCommissionDate";
        commissionAmount = GOLD_COMMISSION;
      } else if (statusType === GOLD && powerPosition === RIGHT) {
        logger.info("Matched GOLD / RIGHT");
        columnName = "rightGoldBalance";
        oppositeColumnName = "leftGoldBalance";
        commissionCount = "goldCommissionCount";
        commissionDate = "goldCommissionDate";
        commissionAmount = GOLD_COMMISSION;
      } else if (statusType === DIAMOND && powerPosition === LEFT) {
        logger.info("Matched DIAMOND / LEFT");
        columnName = "leftDiamondBalance";
        oppositeColumnName = "rightDiamondBalance";
        commissionCount = "diamondCommissionCount";
        commissionDate = "diamondCommissionDate";
        commissionAmount = DIAMOND_COMMISSION;
      } else if (statusType === DIAMOND && powerPosition === RIGHT) {
        logger.info("Matched DIAMOND / RIGHT");
        columnName = "rightDiamondBalance";
        oppositeColumnName = "leftDiamondBalance";
        commissionCount = "diamondCommissionCount";
        commissionDate = "diamondCommissionDate";
        commissionAmount = DIAMOND_COMMISSION;
      } else {
        logger.info("Invalid statusType or powerPosition");
        return res
          .status(400)
          .json({ errors: { message: "Invalid statusType or powerPosition" } });
      }

      logger.info(`Incrementing power on column: ${columnName}`);
      member = await prisma.member.update({
        where: { id: parseInt(member.id, 10) },
        data: {
          [columnName]: {
            increment: parseInt(powerCount),
          },
        },
      });

      logger.info(`Updated member: ${member.id} - incremented ${columnName}`);

      if (member[oppositeColumnName] === 0) {
        logger.info(
          `No opposite power (${oppositeColumnName}) available, skipping commission.`
        );

        if (powerType === SELF) {
          logger.info(`Self power.`);
          break;
        }

        if (member.positionToParent === TOP) {
          logger.info(`Top Member Found`);
          break;
        }

        member = await prisma.member.findUnique({
          where: { id: parseInt(member.parentId, 10) },
        });

        continue;
      }

      let minBalance = Math.min(member[columnName], member[oppositeColumnName]);
      let matchingIncomeIncrement = 0;

      if (!is2_1Pass && statusType === ASSOCIATE) {
        // 2:1 logic
        if (member[columnName] >= 2 && member[oppositeColumnName] >= 1) {
          updates[columnName] = { decrement: 2 };
          updates[oppositeColumnName] = { decrement: 1 };
          is2_1Pass = true;
        } else if (member[oppositeColumnName] >= 2 && member[columnName] >= 1) {
          updates[oppositeColumnName] = { decrement: 2 };
          updates[columnName] = { decrement: 1 };
          is2_1Pass = true;
        }

        const updatedMember = await prisma.member.update({
          where: { id: parseInt(member.id, 10) },
          data: {
            ...updates, //contains 2_1 ,left and right associate balance
            ...(member.isDirectMatch && {
              matchingIncomeIncrement: {
                increment: (ASSOCIATE_COMMISSION * member.percentage) / 100,
              },
              associateCommissionCount:{
                increment: 1,
              }
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

      logger.info(
        `Should increment matching income: ${shouldIncrementMatchingIncome}`
      );
      logger.info(`Starting commission logic...`);

      const isSameCommissionDay =
        member[commissionDate] &&
        dayjs(member[commissionDate]).utc().isSame(today, "day");

      if (isSameCommissionDay) {
        logger.info("Same commission day");
        if (member[commissionCount] < MAX_COMMISSIONS_PER_DAY) {
          const availableCount =
            MAX_COMMISSIONS_PER_DAY - member[commissionCount];
          logger.info(`Available commission count: ${availableCount}`);

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
        logger.info("New commission day");
        updates[commissionDate] = today;

        if (minBalance < MAX_COMMISSIONS_PER_DAY) {
          updates[commissionCount] = minBalance;
          matchingIncomeIncrement = minBalance * commissionAmount;
        } else {
          updates[commissionCount] = MAX_COMMISSIONS_PER_DAY;
          matchingIncomeIncrement = MAX_COMMISSIONS_PER_DAY * commissionAmount;
        }
      }
      matchingIncomeIncrement = parseFloat(
        (matchingIncomeIncrement * member.percentage) / 100
      );
      logger.info(`Commission amount: ${matchingIncomeIncrement}`);

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
            ...updates,
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

      logger.info(`Decremented balances and updated matching income`);

      if (powerType === SELF) {
        logger.info(`Self power.`);
        break;
      }

      if (member.positionToParent === TOP) {
        logger.info(`Top Member Found`);
        break;
      }

      member = await prisma.member.findUnique({
        where: { id: parseInt(member.parentId, 10) },
      });
    }

    await prisma.virtualPower.create({
      data: {
        memberId: parseInt(memberId),
        statusType,
        powerPosition,
        powerType,
        powerCount: parseInt(powerCount),
      },
    });

    logger.info(`Created virtual power record`);

    return res.status(200).json({
      message: "Virtual Power Added Successfully",
    });
  } catch (error) {
    logger.error(`Error in addVirtualPower: ${error}`);
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
