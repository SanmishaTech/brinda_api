const { PrismaClient, Prisma } = require("@prisma/client");
const prisma = require("../config/db");
const { z } = require("zod");
const validateRequest = require("./validateRequest");
const createError = require("http-errors");
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
dayjs.extend(utc);
const logger = require("./logger"); // Assuming you have a logger utility
const today = dayjs().utc().startOf("day").toDate();
const calculateLoan = require("./calculateLoan");
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
} = require("../config/data");

const addVirtualPower = async (data) => {
  const { memberId, statusType, powerPosition, powerCount, powerType } = data;
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
      columnName = "leftAssociateBalance";
      oppositeColumnName = "rightAssociateBalance";
      totalStatusBalance = "totalLeftAssociateBalance";
      commissionCount = "associateCommissionCount";
      commissionDate = "associateCommissionDate";
      commissionAmount = ASSOCIATE_COMMISSION;
      totalStatusMatched = "totalAssociateMatched";
    } else if (statusType === ASSOCIATE && currentPosition === RIGHT) {
      // logger.info("Matched ASSOCIATE / RIGHT");
      columnName = "rightAssociateBalance";
      oppositeColumnName = "leftAssociateBalance";
      totalStatusBalance = "totalRightAssociateBalance";
      commissionCount = "associateCommissionCount";
      commissionDate = "associateCommissionDate";
      commissionAmount = ASSOCIATE_COMMISSION;
      totalStatusMatched = "totalAssociateMatched";
    } else if (statusType === SILVER && currentPosition === LEFT) {
      // logger.info("Matched SILVER / LEFT");
      columnName = "leftSilverBalance";
      oppositeColumnName = "rightSilverBalance";
      totalStatusBalance = "totalLeftSilverBalance";
      commissionCount = "silverCommissionCount";
      commissionDate = "silverCommissionDate";
      commissionAmount = SILVER_COMMISSION;
      totalStatusMatched = "totalSilverMatched";
    } else if (statusType === SILVER && currentPosition === RIGHT) {
      // logger.info("Matched SILVER / RIGHT");
      columnName = "rightSilverBalance";
      oppositeColumnName = "leftSilverBalance";
      totalStatusBalance = "totalRightSilverBalance";
      commissionCount = "silverCommissionCount";
      commissionDate = "silverCommissionDate";
      commissionAmount = SILVER_COMMISSION;
      totalStatusMatched = "totalSilverMatched";
    } else if (statusType === GOLD && currentPosition === LEFT) {
      // logger.info("Matched GOLD / LEFT");
      columnName = "leftGoldBalance";
      oppositeColumnName = "rightGoldBalance";
      totalStatusBalance = "totalLeftGoldBalance";
      commissionCount = "goldCommissionCount";
      commissionDate = "goldCommissionDate";
      commissionAmount = GOLD_COMMISSION;
      totalStatusMatched = "totalGoldMatched";
    } else if (statusType === GOLD && currentPosition === RIGHT) {
      // logger.info("Matched GOLD / RIGHT");
      columnName = "rightGoldBalance";
      oppositeColumnName = "leftGoldBalance";
      totalStatusBalance = "totalRightGoldBalance";
      commissionCount = "goldCommissionCount";
      commissionDate = "goldCommissionDate";
      commissionAmount = GOLD_COMMISSION;
      totalStatusMatched = "totalGoldMatched";
    } else if (statusType === DIAMOND && currentPosition === LEFT) {
      // logger.info("Matched DIAMOND / LEFT");
      columnName = "leftDiamondBalance";
      oppositeColumnName = "rightDiamondBalance";
      totalStatusBalance = "totalLeftDiamondBalance";
      commissionCount = "diamondCommissionCount";
      commissionDate = "diamondCommissionDate";
      commissionAmount = DIAMOND_COMMISSION;
      totalStatusMatched = "totalDiamondMatched";
    } else if (statusType === DIAMOND && currentPosition === RIGHT) {
      // logger.info("Matched DIAMOND / RIGHT");
      columnName = "rightDiamondBalance";
      oppositeColumnName = "leftDiamondBalance";
      totalStatusBalance = "totalRightDiamondBalance";
      commissionCount = "diamondCommissionCount";
      commissionDate = "diamondCommissionDate";
      commissionAmount = DIAMOND_COMMISSION;
      totalStatusMatched = "totalDiamondMatched";
    } else {
      // logger.info("Invalid statusType or powerPosition");
      return res
        .status(400)
        .json({ errors: { message: "Invalid statusType or powerPosition" } });
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

        let virtualAmt = (ASSOCIATE_COMMISSION * member.percentage) / 100;
        member = await calculateLoan(
          virtualAmt,
          member,
          MATCHING_INCOME_WALLET,
          "VIRTUAL_POWER"
        );
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
        dayjs(member[commissionDate]).utc().isSame(today, "day");

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
          matchingIncomeIncrement = MAX_COMMISSIONS_PER_DAY * commissionAmount;
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

      console.log("working1");

      member = await calculateLoan(
        matchingIncomeIncrement,
        member,
        MATCHING_INCOME_WALLET,
        "VIRTUAL_POWER"
      );
    }

    if (powerType === SELF) {
      logger.info(`Self power.`);
      break;
    }
    console.log("working2");
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

  logger.info(`Created virtual power record`);
};

module.exports = { addVirtualPower };
