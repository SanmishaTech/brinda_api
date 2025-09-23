const { PrismaClient, Prisma } = require("@prisma/client");
const prisma = require("../config/db");
const {
  INACTIVE,
  TDS_PERCENT,
  PLATFORM_CHARGE_PERCENT,
  HOLD_WALLET,
  CREDIT,
  APPROVED,
  PENDING,
  FRANCHISE_WALLET,
  DEBIT,
} = require("../config/data");
const logger = require("../utils/logger");
const calculateLoan = require("../utils/calculateLoan");
const BATCH_SIZE = 300;

const generateSDRAmount = async () => {
  try {
    const members = await prisma.member.findMany({
      where: {
        isFranchise: true,
        securityDepositPending: {
          gt: 0,
        },
      },
    });

    if (members.length === 0) {
      logger.info("No eligible members.");
      return;
    }

    logger.info(`Found ${members.length} eligible members.`);

    for (const member of members) {
      const amount = parseFloat(member.securityDepositAmount);
      const percentage = parseFloat(member.securityDepositPercentage);

      let commissionToGive = parseFloat(
        (parseFloat(amount) * parseFloat(percentage)) / 100
      );
      if (
        parseFloat(commissionToGive) > parseFloat(member.securityDepositPending)
      ) {
        commissionToGive = parseFloat(member.securityDepositPending);
      }

      let updatedMember = await prisma.member.update({
        where: { id: member.id },
        data: {
          franchiseWalletBalance: {
            increment: parseFloat(commissionToGive),
          },
          securityDepositReturn: {
            increment: parseFloat(commissionToGive),
          },
          totalSecurityDepositReturn: {
            increment: parseFloat(commissionToGive),
          },
          walletTransactions: {
            create: {
              amount: new Prisma.Decimal(commissionToGive),
              walletType: FRANCHISE_WALLET,
              status: APPROVED,
              type: DEBIT, // FIXED: Was "DEBIT" — this is income to the influencer
              notes: `Monthly Security Deposit Return`,
              transactionDate: new Date(),
            },
          },
        },
      });

      if (parseFloat(commissionToGive) > 0) {
        updatedMember = await calculateLoan(
          commissionToGive,
          updatedMember,
          FRANCHISE_WALLET,
          "GENERATE_SDR"
        );
      }

      const againUpdatedMember = await prisma.member.update({
        where: { id: member.id },
        data: {
          securityDepositPending:
            parseFloat(updatedMember.securityDepositAmount) -
            parseFloat(updatedMember.totalSecurityDepositReturn),
        },
      });
    }
    logger.info(`\n✅ Finished processing SDR ${members.length} members.`);
  } catch (error) {
    logger.error("Error in generateSDRAmount:", error);
  }
};

module.exports = { generateSDRAmount };
