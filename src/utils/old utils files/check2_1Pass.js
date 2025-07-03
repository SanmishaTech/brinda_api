const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const {
  LEFT,
  RIGHT,
  TOP,
  INACTIVE,
  MAX_COMMISSIONS_PER_DAY,
  SILVER,
  GOLD,
} = require("../config/data");
const {
  checkMatchingMentorIncomeL1,
} = require("./checkMatchingMentorIncomeL1");

const check2_1Pass = async (member) => {
  let currentMember = member;
  while (currentMember && currentMember.positionToParent !== TOP) {
    let parent = await prisma.member.findUnique({
      where: { id: currentMember.parentId },
      include: {
        parent: true,
        sponsor: true,
      },
    });
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isSameDay =
      parent.commissionDate?.toDateString() === today.toDateString();

    // if (!parent) break;

    if (parent.is2_1Pass) {
      const minBalance = Math.min(parent.leftBalance, parent.rightBalance);

      if (minBalance === 0) {
        currentMember = parent;
        continue; // ✅ Go to the next parent in the loop
      }

      const updates = {
        leftBalance: { decrement: minBalance },
        rightBalance: { decrement: minBalance },
      };

      let matchingMentorIncomeL1 = null;

      if (parent.status !== INACTIVE) {
        if (isSameDay) {
          if (parent.commissionCount < MAX_COMMISSIONS_PER_DAY) {
            const availableCommissionCount =
              MAX_COMMISSIONS_PER_DAY - parent.commissionCount;
            if (minBalance > availableCommissionCount) {
              updates.matchingIncomeWalletBalance = {
                increment: availableCommissionCount * 100,
              };

              updates.commissionCount = {
                increment: availableCommissionCount,
              };
              matchingMentorIncomeL1 = availableCommissionCount;
            } else {
              updates.matchingIncomeWalletBalance = {
                increment: minBalance * 100,
              };
              updates.commissionCount = {
                increment: minBalance,
              };
              matchingMentorIncomeL1 = minBalance;
            }
          }
        } else {
          updates.commissionDate = today;
          if (minBalance < MAX_COMMISSIONS_PER_DAY) {
            updates.matchingIncomeWalletBalance = {
              increment: minBalance * 100,
            };

            updates.commissionCount = minBalance;
            matchingMentorIncomeL1 = minBalance;
          } else {
            updates.matchingIncomeWalletBalance = {
              increment: MAX_COMMISSIONS_PER_DAY * 100,
            };
            updates.commissionCount = MAX_COMMISSIONS_PER_DAY;
            matchingMentorIncomeL1 = MAX_COMMISSIONS_PER_DAY;
          }
        }

        //
        parent = await prisma.member.update({
          where: { id: parent.id },
          data: { ...updates },
        });

        // Only call matching mentor Income L1 update if there's something to update
        if (matchingMentorIncomeL1) {
          await matchingMentorIncomeL1(parent, matchingMentorIncomeL1);
        }
      }
    } else {
      const leftTotal = parent.leftCount + parent.leftDirectCount;
      const rightTotal = parent.rightCount + parent.rightDirectCount;

      // let is2_1Qualified = false;
      const updates = {
        is2_1Pass: true,
      };

      // Decide which balances to decrement
      if (leftTotal >= 2 && rightTotal >= 1) {
        updates.leftBalance = {
          decrement: 2,
        };
        updates.rightBalance = {
          decrement: 1,
        };
      } else if (rightTotal >= 2 && leftTotal >= 1) {
        updates.rightBalance = {
          decrement: 2,
        };
        updates.leftBalance = {
          decrement: 1,
        };
      } else {
        currentMember = parent;
        continue; // ✅ Go to the next parent in the loop
      }

      // Check if matching income applies
      if (parent.isDirectMatch && parent.status !== INACTIVE) {
        updates.commissionDate = today;
        updates.commissionCount = 1;
        updates.matchingIncomeWalletBalance = {
          increment: 100,
        };
      }

      parent = await prisma.member.update({
        where: { id: parent.id },
        data: {
          ...updates,
        },
      });
      await checkMatchingMentorIncomeL1(parent, 1);
    }

    currentMember = parent;
  }
};

module.exports = { check2_1Pass };
