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
      const mentorIncomeL1Updates = {};

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
              // matching mentor Income L1 start
              if (parent.status === SILVER && parent.sponsor.status === GOLD) {
                mentorIncomeL1Updates.matchingMentorIncomeL1 = {
                  increment: availableCommissionCount * 100 * 0.05,
                };
              }
              // matching mentor Income L1 end
            } else {
              updates.matchingIncomeWalletBalance = {
                increment: minBalance * 100,
              };
              updates.commissionCount = {
                increment: minBalance,
              };
              // matching mentor Income L1 start
              if (parent.status === SILVER && parent.sponsor.status === GOLD) {
                mentorIncomeL1Updates.matchingMentorIncomeL1 = {
                  increment: minBalance * 100 * 0.05,
                };
              }
              // matching mentor Income L1 end
            }
          }
        } else {
          updates.commissionDate = today;
          if (minBalance < MAX_COMMISSIONS_PER_DAY) {
            updates.matchingIncomeWalletBalance = {
              increment: minBalance * 100,
            };

            updates.commissionCount = minBalance;
            // matching mentor Income L1 start
            if (parent.status === SILVER && parent.sponsor.status === GOLD) {
              mentorIncomeL1Updates.matchingMentorIncomeL1 = {
                increment: minBalance * 100 * 0.05,
              };
            }
            // matching mentor Income L1 end
          } else {
            updates.matchingIncomeWalletBalance = {
              increment: MAX_COMMISSIONS_PER_DAY * 100,
            };
            updates.commissionCount = MAX_COMMISSIONS_PER_DAY;
            // matching mentor Income L1 start
            if (parent.status === SILVER && parent.sponsor.status === GOLD) {
              mentorIncomeL1Updates.matchingMentorIncomeL1 = {
                increment: MAX_COMMISSIONS_PER_DAY * 100 * 0.05,
              };
            }
            // matching mentor Income L1 end
          }
        }
      }

      parent = await prisma.member.update({
        where: { id: parent.id },
        data: { ...updates },
      });

      // Only call matching mentor Income L1 update if there's something to update
      if (Object.keys(mentorIncomeL1Updates).length > 0) {
        await prisma.member.update({
          where: { id: parent.sponsor.id },
          data: { ...mentorIncomeL1Updates },
        });
      }
    } else {
      const leftTotal = parent.leftCount + parent.leftDirectCount;
      const rightTotal = parent.rightCount + parent.rightDirectCount;

      // let is2_1Qualified = false;
      const updates = {
        is2_1Pass: true,
      };
      const mentorIncomeL1Updates = {};

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
        // matching mentor Income L1 start
        if (parent.status === SILVER && parent.sponsor.status === GOLD) {
          mentorIncomeL1Updates.matchingMentorIncomeL1 = {
            increment: 1 * 100 * 0.05,
          };
        }
        // matching mentor Income L1 end
      }

      parent = await prisma.member.update({
        where: { id: parent.id },
        data: {
          ...updates,
        },
      });

      // Only call matching mentor Income L1 update if there's something to update
      if (Object.keys(mentorIncomeL1Updates).length > 0) {
        await prisma.member.update({
          where: { id: parent.sponsor.id },
          data: { ...mentorIncomeL1Updates },
        });
      }
    }

    currentMember = parent;
  }
};

module.exports = { check2_1Pass };
