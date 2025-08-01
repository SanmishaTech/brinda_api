const { PrismaClient, Prisma } = require("@prisma/client");
const {
  hasMinDirectReferrals,
  hasQualifiedDownlines,
} = require("./distributeRepurchaseIncome");
const logger = require("./logger");

const prisma = new PrismaClient();

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

    await prisma.member.update({
      where: { id: sponsorId },
      data: {
        repurchaseWalletBalance: {
          increment: new Prisma.Decimal(actualMentorCommission),
        },
      },
    });
  }
};

module.exports = { distributeRepurchaseMentorIncome };
