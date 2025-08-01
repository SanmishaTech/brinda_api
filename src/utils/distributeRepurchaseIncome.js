const { PrismaClient, Prisma } = require("@prisma/client");
const { REPURCHASE_COMMISSIONS, INACTIVE } = require("../config/data");
const logger = require("./logger");

const prisma = new PrismaClient();

const hasMinDirectReferrals = async (memberId, minCount = 3) => {
  const count = await prisma.member.count({
    where: { sponsorId: memberId, status: { not: INACTIVE } },
  });
  logger.info(
    `Member ${memberId} has ${count} direct referrals (min required: ${minCount})`
  );
  return count >= minCount;
};

const hasQualifiedDownlines = async (memberId) => {
  const directReferrals = await prisma.member.findMany({
    where: { sponsorId: memberId, status: { not: INACTIVE } },
    select: { id: true },
  });

  let qualified = 0;
  for (const referral of directReferrals) {
    const count = await prisma.member.count({
      where: { sponsorId: referral.id, status: { not: INACTIVE } },
    });
    logger.info(`Direct referral ${referral.id} has ${count} referrals`);
    if (count >= 3) {
      qualified++;
      if (qualified >= 3) {
        logger.info(`Member ${memberId} has at least 3 qualified downlines`);
        return true;
      }
    }
  }
  logger.info(`Member ${memberId} does NOT have 3 qualified downlines`);
  return false;
};

const isEligible = async (memberId, group) => {
  logger.info(`Checking eligibility for member ${memberId} in group ${group}`);
  if (group === 1) {
    logger.info(`Group 1 members are always eligible`);
    return true;
  }
  if (group === 2) {
    const hasMin = await hasMinDirectReferrals(memberId);
    logger.info(
      `Member ${memberId} eligibility (group 2) based on min direct referrals: ${hasMin}`
    );
    return hasMin;
  }
  if (group === 3) {
    const hasDirects = await hasMinDirectReferrals(memberId);
    const hasQualified = await hasQualifiedDownlines(memberId);
    const eligible = hasDirects && hasQualified;
    logger.info(`Member ${memberId} eligibility (group 3): ${eligible}`);
    return eligible;
  }
  logger.info(`Member ${memberId} is NOT eligible (group ${group})`);
  return false;
};

const distributeRepurchaseIncome = async (startingMember, totalProductBV) => {
  let member = startingMember;
  const mentorCandidates = [];

  logger.info(
    `Starting repurchase income distribution for member ${member.id} with BV ${totalProductBV}`
  );

  for (const {
    level,
    repurchasePercentage,
    mentorPercentage,
    group,
  } of REPURCHASE_COMMISSIONS) {
    if (!member?.sponsorId) {
      logger.info(`No sponsor found at level ${level}, stopping distribution.`);
      break;
    }

    const sponsor = await prisma.member.findUnique({
      where: { id: member.sponsorId },
      select: { id: true, sponsorId: true, percentage: true, status: true },
    });

    if (sponsor.status === INACTIVE) {
      member = sponsor;
      continue;
    }

    logger.info(
      `Level ${level}: Found sponsor ${sponsor.id} with percentage ${sponsor.percentage}`
    );

    const eligible = await isEligible(sponsor.id, group);
    logger.info(
      `Sponsor ${sponsor.id} eligibility for group ${group}: ${eligible}`
    );

    if (eligible) {
      const commissionToGive =
        (parseFloat(totalProductBV) * repurchasePercentage) / 100;
      const actualCommission =
        (commissionToGive * parseFloat(sponsor.percentage)) / 100;

      logger.info(
        `Paying commission: base ${commissionToGive.toFixed(
          2
        )}, actual ${actualCommission.toFixed(2)} to sponsor ${sponsor.id}`
      );

      await prisma.member.update({
        where: { id: sponsor.id },
        data: {
          repurchaseWalletBalance: {
            increment: new Prisma.Decimal(actualCommission),
          },
        },
      });

      // Store for mentor commission if level is 1–3
      if (level <= 3 && mentorPercentage > 0 && sponsor.status !== INACTIVE) {
        mentorCandidates.push({
          sponsorId: sponsor.id,
          sponsorPercentage: sponsor.percentage,
          level,
          actualCommission,
          mentorPercentage,
        });
        logger.info(
          `Added sponsor ${sponsor.id} as mentor candidate at level ${level}`
        );
      }
    } else {
      logger.info(`Sponsor ${sponsor.id} is not eligible, no commission paid.`);
    }

    member = sponsor;
  }

  logger.info(
    `Completed distribution. Mentor candidates: ${mentorCandidates.length}`
  );

  return mentorCandidates;
};

module.exports = {
  distributeRepurchaseIncome,
  hasQualifiedDownlines,
  hasMinDirectReferrals,
};
