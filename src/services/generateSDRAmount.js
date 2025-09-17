const { PrismaClient, Prisma } = require("@prisma/client");
const prisma = new PrismaClient();
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

const BATCH_SIZE = 300;

const generateSDRAmount = async () => {
  try {
    const members = await prisma.member.findMany({
      select: {
        id: true,
        isFranchise: true,
        securityDepositAmount: true,
        securityDepositPending: true,
        securityDepositReturn: true,
        franchiseWalletBalance: true,
        securityDepositPercentage: true,
      },
      where: {
        isFranchise: true,
        securityDepositPending: {
          gt: 0,
        },
      },
    });

    if (members.length === 0) {
      console.log("No eligible members.");
      return;
    }

    for (member of members) {
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

      const updatedMember = await prisma.member.update({
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
              notes: `${member.securityDepositPercentage} monthly Security Deposit Return`,
              transactionDate: new Date(),
            },
          },
        },
      });

      const againUpdatedMember = await prisma.member.update({
        where: { id: member.id },
        data: {
          securityDepositPending:
            parseFloat(updatedMember.securityDepositAmount) -
            parseFloat(updatedMember.totalSecurityDepositReturn),
        },
      });

      // was here. test tommarwrow
    }
  } catch (error) {
    console.error("Error in generateSDRAmount:", error);
  }
};

module.exports = { generateSDRAmount };
