const { PrismaClient, Prisma } = require("@prisma/client");
const {
  hasMinDirectReferrals,
  hasQualifiedDownlines,
} = require("./distributeRepurchaseIncome");
const logger = require("./logger");
const { APPROVED, DEBIT, HOLD_WALLET } = require("../config/data");

const prisma = require("../config/db");

const isMentorEligibleByLevel = async (memberId, level) => {
  logger.info(
    `Checking mentor eligibility for member ${memberId} at level ${level}`
  );
  if (level === 1) {
    logger.info(`Level 1 mentor always eligible.`);
    return true;
  }
  if (level === 2) {
    const eligible = await hasMinDirectReferrals(memberId);
    logger.info(
      `Level 2 mentor eligibility for member ${memberId}: ${eligible}`
    );
    return eligible;
  }
  if (level === 3) {
    const hasDirects = await hasMinDirectReferrals(memberId);
    const hasQualified = await hasQualifiedDownlines(memberId);
    const eligible = hasDirects && hasQualified;
    logger.info(
      `Level 3 mentor eligibility for member ${memberId}: ${eligible}`
    );
    return eligible;
  }
  logger.info(
    `Mentor eligibility failed for member ${memberId} at level ${level}`
  );
  return false;
};
const distributeRepurchaseMentorIncome = async (mentorCandidates = []) => {
  logger.info(
    `Distributing mentor income for ${mentorCandidates.length} candidates`
  );

  for (const {
    sponsorId,
    sponsorPercentage,
    level,
    actualCommission,
    mentorPercentage,
  } of mentorCandidates) {
    if (!sponsorId) {
      logger.info(`Skipping candidate with no sponsorId`);
      continue;
    }
    if (level > 3) {
      logger.info(`Skipping candidate with level > 3 (level: ${level})`);
      continue;
    }
    if (mentorPercentage <= 0) {
      logger.info(`Skipping candidate with mentorPercentage <= 0`);
      continue;
    }

    const eligible = await isMentorEligibleByLevel(sponsorId, level);
    if (!eligible) {
      logger.info(
        `Sponsor ${sponsorId} is not eligible at level ${level}, skipping commission`
      );
      continue;
    }

    const mentorCommission = (actualCommission * mentorPercentage) / 100;
    const actualMentorCommission =
      (mentorCommission * parseFloat(sponsorPercentage)) / 100;

    logger.info(
      `Paying mentor commission of ${actualMentorCommission.toFixed(
        2
      )} to sponsor ${sponsorId} at level ${level}`
    );

    const updateData = {};

    if (level === 1) {
      if (actualMentorCommission > 0) {
        updateData.repurchaseMentorIncomeL1 = {
          increment: new Prisma.Decimal(actualMentorCommission),
        };
        updateData.holdWalletBalance = {
          increment: new Prisma.Decimal(actualMentorCommission),
        };
        updateData.walletTransactions = {
          create: {
            amount: new Prisma.Decimal(actualMentorCommission),
            status: APPROVED,
            type: DEBIT,
            transactionDate: new Date(),
            walletType: HOLD_WALLET,
            notes: `Repurchase Mentor Income L1 (₹${actualMentorCommission})`,
          },
        };
      }
    } else if (level === 2) {
      if (actualMentorCommission > 0) {
        updateData.repurchaseMentorIncomeL2 = {
          increment: new Prisma.Decimal(actualMentorCommission),
        };
        updateData.holdWalletBalance = {
          increment: new Prisma.Decimal(actualMentorCommission),
        };
        updateData.walletTransactions = {
          create: {
            amount: new Prisma.Decimal(actualMentorCommission),
            status: APPROVED,
            type: DEBIT,
            transactionDate: new Date(),
            walletType: HOLD_WALLET,
            notes: `Repurchase Mentor Income L2 (₹${actualMentorCommission})`,
          },
        };
      }
    } else if (level === 3) {
      if (actualMentorCommission > 0) {
        updateData.repurchaseMentorIncomeL3 = {
          increment: new Prisma.Decimal(actualMentorCommission),
        };
        updateData.holdWalletBalance = {
          increment: new Prisma.Decimal(actualMentorCommission),
        };
        updateData.walletTransactions = {
          create: {
            amount: new Prisma.Decimal(actualMentorCommission),
            status: APPROVED,
            type: DEBIT,
            transactionDate: new Date(),
            walletType: HOLD_WALLET,
            notes: `Repurchase Mentor Income L3 (₹${actualMentorCommission})`,
          },
        };
      }
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.member.update({
        where: { id: sponsorId },
        data: updateData,
      });
    } else {
      logger.info(`No valid fields to update for sponsor ${sponsorId}`);
    }
  }
};

module.exports = { distributeRepurchaseMentorIncome };
