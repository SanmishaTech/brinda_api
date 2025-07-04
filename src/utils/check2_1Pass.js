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
  ASSOCIATE,
  DIAMOND,
  ASSOCIATE_COMMISSION,
  SILVER_COMMISSION,
  GOLD_COMMISSION,
  DIAMOND_COMMISSION,
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

    if (parent.is2_1Pass) {
      const updates = {};
      let matchingIncomeWalletBalance = 0;
      const minAssociateBalance = Math.min(
        parent.leftAssociateBalance,
        parent.rightAssociateBalance
      );

      const minSilverBalance = Math.min(
        parent.leftSilverBalance,
        parent.rightSilverBalance
      );
      const minGoldBalance = Math.min(
        parent.leftGoldBalance,
        parent.rightGoldBalance
      );
      const minDiamondBalance = Math.min(
        parent.leftDiamondBalance,
        parent.rightDiamondBalance
      );

      if (minAssociateBalance > 0) {
        updates.leftAssociateBalance = {
          decrement: minAssociateBalance,
        };
        updates.rightAssociateBalance = {
          decrement: minAssociateBalance,
        };
      }

      if (minSilverBalance > 0) {
        updates.leftSilverBalance = {
          decrement: minSilverBalance,
        };
        updates.rightSilverBalance = {
          decrement: minSilverBalance,
        };
      }

      if (minGoldBalance > 0) {
        updates.leftGoldBalance = {
          decrement: minGoldBalance,
        };
        updates.rightGoldBalance = {
          decrement: minGoldBalance,
        };
      }

      if (minDiamondBalance > 0) {
        updates.leftDiamondBalance = {
          decrement: minDiamondBalance,
        };
        updates.rightDiamondBalance = {
          decrement: minDiamondBalance,
        };
      }

      if (parent.status === ASSOCIATE && minAssociateBalance > 0) {
        if (isSameDay) {
          if (parent.associateCommissionCount < MAX_COMMISSIONS_PER_DAY) {
            const availableCommissionCount =
              MAX_COMMISSIONS_PER_DAY - parent.associateCommissionCount;
            if (minAssociateBalance > availableCommissionCount) {
              matchingIncomeWalletBalance +=
                availableCommissionCount * ASSOCIATE_COMMISSION;

              updates.associateCommissionCount = {
                increment: availableCommissionCount,
              };
              // matchingMentorIncomeL1 = availableCommissionCount;
            } else {
              matchingIncomeWalletBalance +=
                minAssociateBalance * ASSOCIATE_COMMISSION;

              updates.associateCommissionCount = {
                increment: minAssociateBalance,
              };
              // matchingMentorIncomeL1 = minBalance;
            }
          }
        } else {
          updates.commissionDate = today;
          if (minAssociateBalance < MAX_COMMISSIONS_PER_DAY) {
            matchingIncomeWalletBalance +=
              minAssociateBalance * ASSOCIATE_COMMISSION;
            updates.associateCommissionCount = minAssociateBalance;
            // matchingMentorIncomeL1 = minBalance;
          } else {
            matchingIncomeWalletBalance +=
              MAX_COMMISSIONS_PER_DAY * ASSOCIATE_COMMISSION;
            updates.associateCommissionCount = MAX_COMMISSIONS_PER_DAY;
            // matchingMentorIncomeL1 = MAX_COMMISSIONS_PER_DAY;
          }
        }
      } else if (parent.status === SILVER) {
        // FOR ASSOCIATE
        if (isSameDay) {
          if (parent.associateCommissionCount < MAX_COMMISSIONS_PER_DAY) {
            const availableCommissionCount =
              MAX_COMMISSIONS_PER_DAY - parent.associateCommissionCount;
            if (minAssociateBalance > availableCommissionCount) {
              matchingIncomeWalletBalance +=
                availableCommissionCount * ASSOCIATE_COMMISSION;

              updates.associateCommissionCount = {
                increment: availableCommissionCount,
              };
              // matchingMentorIncomeL1 = availableCommissionCount;
            } else {
              matchingIncomeWalletBalance +=
                minAssociateBalance * ASSOCIATE_COMMISSION;

              updates.associateCommissionCount = {
                increment: minAssociateBalance,
              };
              // matchingMentorIncomeL1 = minBalance;
            }
          }
        } else {
          updates.commissionDate = today;
          if (minAssociateBalance < MAX_COMMISSIONS_PER_DAY) {
            matchingIncomeWalletBalance +=
              minAssociateBalance * ASSOCIATE_COMMISSION;

            updates.associateCommissionCount = minAssociateBalance;
            // matchingMentorIncomeL1 = minBalance;
          } else {
            matchingIncomeWalletBalance +=
              MAX_COMMISSIONS_PER_DAY * ASSOCIATE_COMMISSION;
            updates.associateCommissionCount = MAX_COMMISSIONS_PER_DAY;
            // matchingMentorIncomeL1 = MAX_COMMISSIONS_PER_DAY;
          }
        }
        // FOR SILVER
        if (isSameDay) {
          if (parent.silverCommissionCount < MAX_COMMISSIONS_PER_DAY) {
            const availableCommissionCount =
              MAX_COMMISSIONS_PER_DAY - parent.silverCommissionCount;
            if (minSilverBalance > availableCommissionCount) {
              matchingIncomeWalletBalance +=
                availableCommissionCount * SILVER_COMMISSION;

              updates.silverCommissionCount = {
                increment: availableCommissionCount,
              };
              // matchingMentorIncomeL1 = availableCommissionCount;
            } else {
              matchingIncomeWalletBalance +=
                minSilverBalance * SILVER_COMMISSION;

              updates.silverCommissionCount = {
                increment: minSilverBalance,
              };
              // matchingMentorIncomeL1 = minBalance;
            }
          }
        } else {
          updates.commissionDate = today;
          if (minSilverBalance < MAX_COMMISSIONS_PER_DAY) {
            matchingIncomeWalletBalance += minSilverBalance * SILVER_COMMISSION;

            updates.silverCommissionCount = minSilverBalance;
            // matchingMentorIncomeL1 = minBalance;
          } else {
            matchingIncomeWalletBalance +=
              MAX_COMMISSIONS_PER_DAY * SILVER_COMMISSION;
            updates.silverCommissionCount = MAX_COMMISSIONS_PER_DAY;
            // matchingMentorIncomeL1 = MAX_COMMISSIONS_PER_DAY;
          }
        }
      } else if (parent.status === GOLD) {
        // FOR ASSOCIATE
        if (isSameDay) {
          if (parent.associateCommissionCount < MAX_COMMISSIONS_PER_DAY) {
            const availableCommissionCount =
              MAX_COMMISSIONS_PER_DAY - parent.associateCommissionCount;
            if (minAssociateBalance > availableCommissionCount) {
              matchingIncomeWalletBalance +=
                availableCommissionCount * ASSOCIATE_COMMISSION;

              updates.associateCommissionCount = {
                increment: availableCommissionCount,
              };
              // matchingMentorIncomeL1 = availableCommissionCount;
            } else {
              matchingIncomeWalletBalance +=
                minAssociateBalance * ASSOCIATE_COMMISSION;

              updates.associateCommissionCount = {
                increment: minAssociateBalance,
              };
              // matchingMentorIncomeL1 = minBalance;
            }
          }
        } else {
          updates.commissionDate = today;
          if (minAssociateBalance < MAX_COMMISSIONS_PER_DAY) {
            matchingIncomeWalletBalance +=
              minAssociateBalance * ASSOCIATE_COMMISSION;

            updates.associateCommissionCount = minAssociateBalance;
            // matchingMentorIncomeL1 = minBalance;
          } else {
            matchingIncomeWalletBalance +=
              MAX_COMMISSIONS_PER_DAY * ASSOCIATE_COMMISSION;
            updates.associateCommissionCount = MAX_COMMISSIONS_PER_DAY;
            // matchingMentorIncomeL1 = MAX_COMMISSIONS_PER_DAY;
          }
        }
        // FOR SILVER
        if (isSameDay) {
          if (parent.silverCommissionCount < MAX_COMMISSIONS_PER_DAY) {
            const availableCommissionCount =
              MAX_COMMISSIONS_PER_DAY - parent.silverCommissionCount;
            if (minSilverBalance > availableCommissionCount) {
              matchingIncomeWalletBalance +=
                availableCommissionCount * SILVER_COMMISSION;

              updates.silverCommissionCount = {
                increment: availableCommissionCount,
              };
              // matchingMentorIncomeL1 = availableCommissionCount;
            } else {
              matchingIncomeWalletBalance +=
                minSilverBalance * SILVER_COMMISSION;

              updates.silverCommissionCount = {
                increment: minSilverBalance,
              };
              // matchingMentorIncomeL1 = minBalance;
            }
          }
        } else {
          updates.commissionDate = today;
          if (minSilverBalance < MAX_COMMISSIONS_PER_DAY) {
            matchingIncomeWalletBalance += minSilverBalance * SILVER_COMMISSION;

            updates.silverCommissionCount = minSilverBalance;
            // matchingMentorIncomeL1 = minBalance;
          } else {
            matchingIncomeWalletBalance +=
              MAX_COMMISSIONS_PER_DAY * SILVER_COMMISSION;
            updates.silverCommissionCount = MAX_COMMISSIONS_PER_DAY;
            // matchingMentorIncomeL1 = MAX_COMMISSIONS_PER_DAY;
          }
        }
        // FOR GOLD
        if (isSameDay) {
          if (parent.goldCommissionCount < MAX_COMMISSIONS_PER_DAY) {
            const availableCommissionCount =
              MAX_COMMISSIONS_PER_DAY - parent.goldCommissionCount;
            if (minGoldBalance > availableCommissionCount) {
              matchingIncomeWalletBalance +=
                availableCommissionCount * GOLD_COMMISSION;

              updates.goldCommissionCount = {
                increment: availableCommissionCount,
              };
              // matchingMentorIncomeL1 = availableCommissionCount;
            } else {
              matchingIncomeWalletBalance += minGoldBalance * GOLD_COMMISSION;

              updates.goldCommissionCount = {
                increment: minGoldBalance,
              };
              // matchingMentorIncomeL1 = minBalance;
            }
          }
        } else {
          updates.commissionDate = today;
          if (minGoldBalance < MAX_COMMISSIONS_PER_DAY) {
            matchingIncomeWalletBalance += minGoldBalance * GOLD_COMMISSION;

            updates.goldCommissionCount = minGoldBalance;
            // matchingMentorIncomeL1 = minBalance;
          } else {
            matchingIncomeWalletBalance +=
              MAX_COMMISSIONS_PER_DAY * GOLD_COMMISSION;
            updates.goldCommissionCount = MAX_COMMISSIONS_PER_DAY;
            // matchingMentorIncomeL1 = MAX_COMMISSIONS_PER_DAY;
          }
        }
      } else if (parent.status === DIAMOND) {
        // FOR ASSOCIATE
        if (isSameDay) {
          if (parent.associateCommissionCount < MAX_COMMISSIONS_PER_DAY) {
            const availableCommissionCount =
              MAX_COMMISSIONS_PER_DAY - parent.associateCommissionCount;
            if (minAssociateBalance > availableCommissionCount) {
              matchingIncomeWalletBalance +=
                availableCommissionCount * ASSOCIATE_COMMISSION;

              updates.associateCommissionCount = {
                increment: availableCommissionCount,
              };
              // matchingMentorIncomeL1 = availableCommissionCount;
            } else {
              matchingIncomeWalletBalance +=
                minAssociateBalance * ASSOCIATE_COMMISSION;

              updates.associateCommissionCount = {
                increment: minAssociateBalance,
              };
              // matchingMentorIncomeL1 = minBalance;
            }
          }
        } else {
          updates.commissionDate = today;
          if (minAssociateBalance < MAX_COMMISSIONS_PER_DAY) {
            matchingIncomeWalletBalance +=
              minAssociateBalance * ASSOCIATE_COMMISSION;

            updates.associateCommissionCount = minAssociateBalance;
            // matchingMentorIncomeL1 = minBalance;
          } else {
            matchingIncomeWalletBalance +=
              MAX_COMMISSIONS_PER_DAY * ASSOCIATE_COMMISSION;
            updates.associateCommissionCount = MAX_COMMISSIONS_PER_DAY;
            // matchingMentorIncomeL1 = MAX_COMMISSIONS_PER_DAY;
          }
        }
        // FOR SILVER
        if (isSameDay) {
          if (parent.silverCommissionCount < MAX_COMMISSIONS_PER_DAY) {
            const availableCommissionCount =
              MAX_COMMISSIONS_PER_DAY - parent.silverCommissionCount;
            if (minSilverBalance > availableCommissionCount) {
              matchingIncomeWalletBalance +=
                availableCommissionCount * SILVER_COMMISSION;

              updates.silverCommissionCount = {
                increment: availableCommissionCount,
              };
              // matchingMentorIncomeL1 = availableCommissionCount;
            } else {
              matchingIncomeWalletBalance +=
                minSilverBalance * SILVER_COMMISSION;

              updates.silverCommissionCount = {
                increment: minSilverBalance,
              };
              // matchingMentorIncomeL1 = minBalance;
            }
          }
        } else {
          updates.commissionDate = today;
          if (minSilverBalance < MAX_COMMISSIONS_PER_DAY) {
            matchingIncomeWalletBalance += minSilverBalance * SILVER_COMMISSION;

            updates.silverCommissionCount = minSilverBalance;
            // matchingMentorIncomeL1 = minBalance;
          } else {
            matchingIncomeWalletBalance +=
              MAX_COMMISSIONS_PER_DAY * SILVER_COMMISSION;
            updates.silverCommissionCount = MAX_COMMISSIONS_PER_DAY;
            // matchingMentorIncomeL1 = MAX_COMMISSIONS_PER_DAY;
          }
        }
        // FOR GOLD
        if (isSameDay) {
          if (parent.goldCommissionCount < MAX_COMMISSIONS_PER_DAY) {
            const availableCommissionCount =
              MAX_COMMISSIONS_PER_DAY - parent.goldCommissionCount;
            if (minGoldBalance > availableCommissionCount) {
              matchingIncomeWalletBalance +=
                availableCommissionCount * GOLD_COMMISSION;

              updates.goldCommissionCount = {
                increment: availableCommissionCount,
              };
              // matchingMentorIncomeL1 = availableCommissionCount;
            } else {
              matchingIncomeWalletBalance += minGoldBalance * GOLD_COMMISSION;

              updates.goldCommissionCount = {
                increment: minGoldBalance,
              };
              // matchingMentorIncomeL1 = minBalance;
            }
          }
        } else {
          updates.commissionDate = today;
          if (minGoldBalance < MAX_COMMISSIONS_PER_DAY) {
            matchingIncomeWalletBalance += minGoldBalance * GOLD_COMMISSION;

            updates.goldCommissionCount = minGoldBalance;
            // matchingMentorIncomeL1 = minBalance;
          } else {
            matchingIncomeWalletBalance +=
              MAX_COMMISSIONS_PER_DAY * GOLD_COMMISSION;
            updates.goldCommissionCount = MAX_COMMISSIONS_PER_DAY;
            // matchingMentorIncomeL1 = MAX_COMMISSIONS_PER_DAY;
          }
        }
        // FOR DIAMOND
        if (isSameDay) {
          if (parent.diamondCommissionCount < MAX_COMMISSIONS_PER_DAY) {
            const availableCommissionCount =
              MAX_COMMISSIONS_PER_DAY - parent.diamondCommissionCount;
            if (minDiamondBalance > availableCommissionCount) {
              matchingIncomeWalletBalance +=
                availableCommissionCount * DIAMOND_COMMISSION;

              updates.diamondCommissionCount = {
                increment: availableCommissionCount,
              };
              // matchingMentorIncomeL1 = availableCommissionCount;
            } else {
              matchingIncomeWalletBalance +=
                minDiamondBalance * DIAMOND_COMMISSION;

              updates.diamondCommissionCount = {
                increment: minDiamondBalance,
              };
              // matchingMentorIncomeL1 = minBalance;
            }
          }
        } else {
          updates.commissionDate = today;
          if (minDiamondBalance < MAX_COMMISSIONS_PER_DAY) {
            matchingIncomeWalletBalance +=
              minDiamondBalance * DIAMOND_COMMISSION;

            updates.diamondCommissionCount = minDiamondBalance;
            // matchingMentorIncomeL1 = minBalance;
          } else {
            matchingIncomeWalletBalance +=
              MAX_COMMISSIONS_PER_DAY * DIAMOND_COMMISSION;
            updates.diamondCommissionCount = MAX_COMMISSIONS_PER_DAY;
            // matchingMentorIncomeL1 = MAX_COMMISSIONS_PER_DAY;
          }
        }
      }

      parent = await prisma.member.update({
        where: { id: parent.id },
        data: {
          ...updates,
          matchingIncomeWalletBalance: {
            increment: matchingIncomeWalletBalance,
          },
        },
      });

      parent = await checkMatchingMentorIncomeL1(
        parent,
        matchingIncomeWalletBalance
      );
    } else {
      // 2:1 no true
      let matchingIncomeWalletBalance = 0;
      const leftTotal = parent.leftCount + parent.leftDirectCount;
      const rightTotal = parent.rightCount + parent.rightDirectCount;

      let minSilverBalance,
        minGoldBalance,
        minDiamondBalance = 0;
      const updates = {
        is2_1Pass: true,
      };

      // 2:1 logic
      if (leftTotal >= 2 && rightTotal >= 1) {
        updates.leftAssociateBalance = { decrement: 2 };
        updates.rightAssociateBalance = { decrement: 1 };
      } else if (rightTotal >= 2 && leftTotal >= 1) {
        updates.rightAssociateBalance = { decrement: 2 };
        updates.leftAssociateBalance = { decrement: 1 };
      } else {
        currentMember = parent;
        continue; // Skip if not eligible
      }

      // 🟡 Silver logic
      if (parent.leftSilverBalance > 0 && parent.rightSilverBalance > 0) {
        minSilverBalance = Math.min(
          parent.leftSilverBalance,
          parent.rightSilverBalance
        );
        updates.leftSilverBalance = { decrement: minSilverBalance };
        updates.rightSilverBalance = { decrement: minSilverBalance };
      }

      // 🟠 Gold logic
      if (parent.leftGoldBalance > 0 && parent.rightGoldBalance > 0) {
        minGoldBalance = Math.min(
          parent.leftGoldBalance,
          parent.rightGoldBalance
        );
        updates.leftGoldBalance = { decrement: minGoldBalance };
        updates.rightGoldBalance = { decrement: minGoldBalance };
      }

      // 🔷 Diamond logic
      if (parent.leftDiamondBalance > 0 && parent.rightDiamondBalance > 0) {
        minDiamondBalance = Math.min(
          parent.leftDiamondBalance,
          parent.rightDiamondBalance
        );
        updates.leftDiamondBalance = { decrement: minDiamondBalance };
        updates.rightDiamondBalance = { decrement: minDiamondBalance };
      }

      // Check if matching income applies
      if (parent.isDirectMatch) {
        if (parent.status === ASSOCIATE) {
          updates.commissionDate = today;
          updates.associateCommissionCount = 1;
          updates.matchingIncomeWalletBalance = {
            increment: ASSOCIATE_COMMISSION,
          };
          matchingIncomeWalletBalance += ASSOCIATE_COMMISSION;
        } else if (parent.status === SILVER) {
          updates.commissionDate = today;
          updates.associateCommissionCount = 1; //since 2:1 is not true that means silverCommissionCount must be 0
          updates.silverCommissionCount = minSilverBalance;
          let totalSilverCommission = minSilverBalance * SILVER_COMMISSION;
          updates.matchingIncomeWalletBalance = {
            increment: totalSilverCommission + ASSOCIATE_COMMISSION,
          };
          matchingIncomeWalletBalance +=
            totalSilverCommission + ASSOCIATE_COMMISSION;
        } else if (parent.status === GOLD) {
          updates.commissionDate = today;
          updates.associateCommissionCount = 1;
          updates.silverCommissionCount = minSilverBalance;
          let totalSilverCommission = minSilverBalance * SILVER_COMMISSION;
          updates.goldCommissionCount = minGoldBalance;
          let totalGoldCommission = minGoldBalance * GOLD_COMMISSION;
          updates.matchingIncomeWalletBalance = {
            increment:
              totalGoldCommission +
              totalSilverCommission +
              ASSOCIATE_COMMISSION,
          };
          matchingIncomeWalletBalance +=
            totalGoldCommission + totalSilverCommission + ASSOCIATE_COMMISSION;
        } else if (parent.status === DIAMOND) {
          updates.commissionDate = today;
          updates.associateCommissionCount = 1;
          updates.silverCommissionCount = minSilverBalance;
          let totalSilverCommission = minSilverBalance * SILVER_COMMISSION;
          updates.goldCommissionCount = minGoldBalance;
          let totalGoldCommission = minGoldBalance * GOLD_COMMISSION;
          updates.diamondCommissionCount = minDiamondBalance;
          let totalDiamondCommission = minDiamondBalance * DIAMOND_COMMISSION;
          updates.matchingIncomeWalletBalance = {
            increment:
              totalDiamondCommission +
              totalGoldCommission +
              totalSilverCommission +
              ASSOCIATE_COMMISSION,
          };
          matchingIncomeWalletBalance +=
            totalDiamondCommission +
            totalGoldCommission +
            totalSilverCommission +
            ASSOCIATE_COMMISSION;
        }
      }

      parent = await prisma.member.update({
        where: { id: parent.id },
        data: {
          ...updates,
        },
      });
      parent = await checkMatchingMentorIncomeL1(
        parent,
        matchingIncomeWalletBalance
      );
    }

    currentMember = parent;
  }
};

module.exports = { check2_1Pass };
