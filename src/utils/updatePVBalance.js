const { PrismaClient, Prisma } = require("@prisma/client");
const prisma = new PrismaClient();
const { updateCount } = require("./updateCount");
const {
  INCREMENT,
  DECREMENT,
  INACTIVE,
  ASSOCIATE,
  SILVER,
  GOLD,
  DIAMOND,
  TRANSFERRED,
  CREDIT,
  HOLD_WALLET,
  UPGRADE_WALLET,
  APPROVED,
  DEBIT,
  MATCHING_INCOME_WALLET,
} = require("../config/data");
const { checkDirectMatch } = require("./checkDirectMatch");
const { check2_1Pass } = require("./check2_1Pass");
const { incrementMemberStatusCount } = require("./incrementMemberStatusCount");
const updatePVBalance = async (type = INCREMENT, value, memberId) => {
  let member = await prisma.member.update({
    where: { id: memberId },
    data: {
      pvBalance: {
        [type.toLowerCase()]: value,
      },
    },
    include: {
      sponsor: true,
    },
  });

  if (member.status === INACTIVE) {
    if (member.pvBalance >= 1) {
      member = await prisma.member.update({
        where: { id: memberId },
        data: {
          status: ASSOCIATE,
          pvBalance: {
            decrement: 1,
          },
        },
        include: {
          sponsor: true,
        },
      });
      member = await updateCount(member);

      member = await incrementMemberStatusCount(member);

      await prisma.memberLog.create({
        data: {
          memberId: member.id,
          pv: -1,
          bv: 0,
          message: "Member status updated to ASSOCIATE",
        },
      });
    }
  }
  if (member.status === ASSOCIATE) {
    if (member.pvBalance >= 2) {
      member = await prisma.member.update({
        where: { id: memberId },
        data: {
          status: SILVER,
          pvBalance: {
            decrement: 2,
          },
        },
        include: {
          sponsor: true,
        },
      });
      member = await incrementMemberStatusCount(member);

      await prisma.memberLog.create({
        data: {
          memberId: member.id,
          pv: -2,
          bv: 0,
          message: "Member status updated to SILVER",
        },
      });
    }
  }
  if (member.status === SILVER) {
    if (member.pvBalance >= 7) {
      member = await prisma.member.update({
        where: { id: memberId },
        data: {
          status: GOLD,
          pvBalance: {
            decrement: 7,
          },
        },
        include: {
          sponsor: true,
        },
      });

      member = await incrementMemberStatusCount(member);

      await prisma.memberLog.create({
        data: {
          memberId: member.id,
          pv: -7,
          bv: 0,
          message: "Member status updated to GOLD",
        },
      });
    }
  }
  if (member.status === GOLD) {
    if (member.pvBalance >= 10) {
      member = await prisma.member.update({
        where: { id: memberId },
        data: {
          status: DIAMOND,
          pvBalance: {
            decrement: 10,
          },
          upgradeWalletBalance: {
            decrement: member.upgradeWalletBalance,
          },
          matchingIncomeWalletBalance: {
            increment: member.upgradeWalletBalance,
          },

          walletTransactions:
            parseFloat(member.upgradeWalletBalance) > 0
              ? {
                  create: [
                    {
                      amount: new Prisma.Decimal(member.upgradeWalletBalance),
                      status: APPROVED,
                      type: CREDIT,
                      transactionDate: new Date(),
                      walletType: UPGRADE_WALLET,
                      notes: `Transferred Upgrade wallet Amount to Matching Income Wallet.`,
                    },
                    {
                      amount: new Prisma.Decimal(member.upgradeWalletBalance),
                      status: APPROVED,
                      type: DEBIT,
                      transactionDate: new Date(),
                      walletType: MATCHING_INCOME_WALLET,
                      notes: `Received amount from member's Upgrade Wallet.`,
                    },
                  ],
                }
              : undefined, // If the condition fails, no wallet transactions will be created
        },
        include: {
          sponsor: true,
        },
      });

      member = await incrementMemberStatusCount(member);

      await prisma.memberLog.create({
        data: {
          memberId: member.id,
          pv: -10,
          bv: 0,
          message: "Member status updated to DIAMOND",
        },
      });
    }
  }

  await checkDirectMatch(member);

  await check2_1Pass(member);

  return member;
  /*
  Inactive = 0
  Associate = 1
  Silver = 2
  Gold = 7
  Diamond = 10
  */
};

module.exports = { updatePVBalance };
