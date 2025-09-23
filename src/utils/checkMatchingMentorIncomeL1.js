const { PrismaClient } = require("@prisma/client");
const prisma = require("../config/db");
const {
  LEFT,
  RIGHT,
  TOP,
  GOLD,
  SILVER,
  DIAMOND,
  HOLD_WALLET,
  APPROVED,
  DEBIT,
} = require("../config/data");
const calculateLoan = require("./calculateLoan");
const checkMatchingMentorIncomeL1 = async (parent, value) => {
  if (parent?.sponsor?.isMatchingMentorL1 === true && value > 0) {
    // start
    var commissionToGive = value * 0.1;
    const percentage = parseFloat(parent?.sponsor?.percentage);
    if (!isNaN(percentage) && percentage > 0 && percentage < 100) {
      commissionToGive = parseFloat(
        ((commissionToGive * percentage) / 100).toFixed(2)
      );
    } else if (percentage === 0) {
      commissionToGive = 0;
    }
    // end
    if (commissionToGive > 0) {
      let sponsor = await prisma.member.update({
        where: { id: parent.sponsor.id },
        data: {
          matchingMentorIncomeL1: { increment: commissionToGive },
          holdWalletBalance: { increment: commissionToGive },
          walletTransactions: {
            create: {
              amount: commissionToGive,
              status: APPROVED,
              type: DEBIT,
              transactionDate: new Date(),
              walletType: HOLD_WALLET,
              notes: `Matching Mentor Income L1 (₹${commissionToGive})`,
            },
          },
        },
      });

      sponsor = await calculateLoan(
        commissionToGive,
        sponsor,
        HOLD_WALLET,
        "MMI_L1"
      );
    }
  } else if (
    (parent.sponsor?.status === GOLD || parent.sponsor?.status === DIAMOND) &&
    parent.sponsor?.isDirectMatch === true &&
    parent.sponsor?.is2_1Pass === true
  ) {
    // start

    var commissionToGive = value * 0.1;
    const percentage = parseFloat(parent?.sponsor?.percentage);
    if (!isNaN(percentage) && percentage > 0 && percentage < 100) {
      commissionToGive = parseFloat(
        ((commissionToGive * percentage) / 100).toFixed(2)
      );
    } else if (percentage === 0) {
      commissionToGive = 0;
    }
    // end
    const sponsor = await prisma.member.update({
      where: { id: parent.sponsor.id },
      data: {
        isMatchingMentorL1: true,
        ...(commissionToGive > 0 && {
          matchingMentorIncomeL1: { increment: commissionToGive },
          holdWalletBalance: { increment: commissionToGive },
          walletTransactions: {
            create: {
              amount: commissionToGive,
              status: APPROVED,
              type: DEBIT,
              transactionDate: new Date(),
              walletType: HOLD_WALLET,
              notes: `Matching Mentor Income L1 (₹${commissionToGive})`,
            },
          },
        }),
      },
    });
    if (commissionToGive > 0) {
      sponsor = await calculateLoan(
        commissionToGive,
        sponsor,
        HOLD_WALLET,
        "MMI_L1"
      );
    }
  }
  return;
};

module.exports = { checkMatchingMentorIncomeL1 };
