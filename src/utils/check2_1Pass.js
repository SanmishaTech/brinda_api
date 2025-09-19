const { PrismaClient } = require('@prisma/client');
const prisma = require("../config/db");
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
  REWARDS_COMMISSIONS,
} = require('../config/data');
const {
  checkMatchingMentorIncomeL1,
} = require('./checkMatchingMentorIncomeL1');
const {
  checkMatchingMentorIncomeL2,
} = require('./checkMatchingMentorIncomeL2');
const { calculateCommission } = require('./calculateCommission');

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

    const dayjs = require('dayjs');
    const utc = require('dayjs/plugin/utc');
    dayjs.extend(utc);

    const today = dayjs().utc().startOf('day').toDate(); // ✅ full JS Date in UTC 00:00:00

    const isSameAssociateCommissionDay =
      parent.associateCommissionDate &&
      dayjs(parent.associateCommissionDate).utc().isSame(today, 'day');

    const isSameSilverCommissionDay =
      parent.silverCommissionDate &&
      dayjs(parent.silverCommissionDate).utc().isSame(today, 'day');

    const isSameGoldCommissionDay =
      parent.goldCommissionDate &&
      dayjs(parent.goldCommissionDate).utc().isSame(today, 'day');

    const isSameDiamondCommissionDay =
      parent.diamondCommissionDate &&
      dayjs(parent.diamondCommissionDate).utc().isSame(today, 'day');

    if (parent.is2_1Pass) {
      let updates = {};
      let rewardDetails = {
        isRewardLevelReached: false,
        amount: 0,
      };
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

      if (parent.isDirectMatch) {
        if (parent.status === ASSOCIATE && minAssociateBalance > 0) {
          if (isSameAssociateCommissionDay) {
            if (parent.associateCommissionCount < MAX_COMMISSIONS_PER_DAY) {
              const availableCommissionCount =
                MAX_COMMISSIONS_PER_DAY - parent.associateCommissionCount;
              if (minAssociateBalance > availableCommissionCount) {
                matchingIncomeWalletBalance +=
                  availableCommissionCount * ASSOCIATE_COMMISSION;

                updates.associateCommissionCount = {
                  increment: availableCommissionCount,
                };
                updates.totalAssociateMatched = {
                  increment: availableCommissionCount,
                };
              } else {
                matchingIncomeWalletBalance +=
                  minAssociateBalance * ASSOCIATE_COMMISSION;

                updates.associateCommissionCount = {
                  increment: minAssociateBalance,
                };
                updates.totalAssociateMatched = {
                  increment: minAssociateBalance,
                };
                // matchingMentorIncomeL1 = minBalance;
              }
            }
          } else {
            updates.associateCommissionDate = today;
            if (minAssociateBalance < MAX_COMMISSIONS_PER_DAY) {
              matchingIncomeWalletBalance +=
                minAssociateBalance * ASSOCIATE_COMMISSION;
              updates.associateCommissionCount = minAssociateBalance;
              updates.totalAssociateMatched = {
                increment: minAssociateBalance,
              };
              // matchingMentorIncomeL1 = minBalance;
            } else {
              matchingIncomeWalletBalance +=
                MAX_COMMISSIONS_PER_DAY * ASSOCIATE_COMMISSION;
              updates.associateCommissionCount = MAX_COMMISSIONS_PER_DAY;
              updates.totalAssociateMatched = {
                increment: MAX_COMMISSIONS_PER_DAY,
              };
              // matchingMentorIncomeL1 = MAX_COMMISSIONS_PER_DAY;
            }
          }
        } else if (parent.status === SILVER) {
          // FOR ASSOCIATE
          if (isSameAssociateCommissionDay) {
            if (parent.associateCommissionCount < MAX_COMMISSIONS_PER_DAY) {
              const availableCommissionCount =
                MAX_COMMISSIONS_PER_DAY - parent.associateCommissionCount;
              if (minAssociateBalance > availableCommissionCount) {
                matchingIncomeWalletBalance +=
                  availableCommissionCount * ASSOCIATE_COMMISSION;

                updates.associateCommissionCount = {
                  increment: availableCommissionCount,
                };
                updates.totalAssociateMatched = {
                  increment: availableCommissionCount,
                };
                // matchingMentorIncomeL1 = availableCommissionCount;
              } else {
                matchingIncomeWalletBalance +=
                  minAssociateBalance * ASSOCIATE_COMMISSION;

                updates.associateCommissionCount = {
                  increment: minAssociateBalance,
                };
                updates.totalAssociateMatched = {
                  increment: minAssociateBalance,
                };
                // matchingMentorIncomeL1 = minBalance;
              }
            }
          } else {
            updates.associateCommissionDate = today;
            if (minAssociateBalance < MAX_COMMISSIONS_PER_DAY) {
              matchingIncomeWalletBalance +=
                minAssociateBalance * ASSOCIATE_COMMISSION;

              updates.associateCommissionCount = minAssociateBalance;
              updates.totalAssociateMatched = {
                increment: minAssociateBalance,
              };
            } else {
              matchingIncomeWalletBalance +=
                MAX_COMMISSIONS_PER_DAY * ASSOCIATE_COMMISSION;
              updates.associateCommissionCount = MAX_COMMISSIONS_PER_DAY;
              updates.totalAssociateMatched = {
                increment: MAX_COMMISSIONS_PER_DAY,
              };
            }
          }
          // FOR SILVER
          if (isSameSilverCommissionDay) {
            if (parent.silverCommissionCount < MAX_COMMISSIONS_PER_DAY) {
              const availableCommissionCount =
                MAX_COMMISSIONS_PER_DAY - parent.silverCommissionCount;
              if (minSilverBalance > availableCommissionCount) {
                matchingIncomeWalletBalance +=
                  availableCommissionCount * SILVER_COMMISSION;

                updates.silverCommissionCount = {
                  increment: availableCommissionCount,
                };
                updates.totalSilverMatched = {
                  increment: availableCommissionCount,
                };
              } else {
                matchingIncomeWalletBalance +=
                  minSilverBalance * SILVER_COMMISSION;

                updates.silverCommissionCount = {
                  increment: minSilverBalance,
                };
                updates.totalSilverMatched = {
                  increment: minSilverBalance,
                };
              }
            }
          } else {
            updates.silverCommissionDate = today;
            if (minSilverBalance < MAX_COMMISSIONS_PER_DAY) {
              matchingIncomeWalletBalance +=
                minSilverBalance * SILVER_COMMISSION;

              updates.silverCommissionCount = minSilverBalance;
              updates.totalSilverMatched = {
                increment: minSilverBalance,
              };
            } else {
              matchingIncomeWalletBalance +=
                MAX_COMMISSIONS_PER_DAY * SILVER_COMMISSION;
              updates.silverCommissionCount = MAX_COMMISSIONS_PER_DAY;
              updates.totalSilverMatched = {
                increment: MAX_COMMISSIONS_PER_DAY,
              };
            }
          }
        } else if (parent.status === GOLD) {
          // FOR ASSOCIATE
          if (isSameAssociateCommissionDay) {
            if (parent.associateCommissionCount < MAX_COMMISSIONS_PER_DAY) {
              const availableCommissionCount =
                MAX_COMMISSIONS_PER_DAY - parent.associateCommissionCount;
              if (minAssociateBalance > availableCommissionCount) {
                matchingIncomeWalletBalance +=
                  availableCommissionCount * ASSOCIATE_COMMISSION;

                updates.associateCommissionCount = {
                  increment: availableCommissionCount,
                };
                updates.totalAssociateMatched = {
                  increment: availableCommissionCount,
                };
              } else {
                matchingIncomeWalletBalance +=
                  minAssociateBalance * ASSOCIATE_COMMISSION;

                updates.associateCommissionCount = {
                  increment: minAssociateBalance,
                };
                updates.totalAssociateMatched = {
                  increment: minAssociateBalance,
                };
              }
            }
          } else {
            updates.associateCommissionDate = today;
            if (minAssociateBalance < MAX_COMMISSIONS_PER_DAY) {
              matchingIncomeWalletBalance +=
                minAssociateBalance * ASSOCIATE_COMMISSION;

              updates.associateCommissionCount = minAssociateBalance;
              updates.totalAssociateMatched = {
                increment: minAssociateBalance,
              };
            } else {
              matchingIncomeWalletBalance +=
                MAX_COMMISSIONS_PER_DAY * ASSOCIATE_COMMISSION;
              updates.associateCommissionCount = MAX_COMMISSIONS_PER_DAY;
              updates.totalAssociateMatched = {
                increment: MAX_COMMISSIONS_PER_DAY,
              };
            }
          }
          // FOR SILVER
          if (isSameSilverCommissionDay) {
            if (parent.silverCommissionCount < MAX_COMMISSIONS_PER_DAY) {
              const availableCommissionCount =
                MAX_COMMISSIONS_PER_DAY - parent.silverCommissionCount;
              if (minSilverBalance > availableCommissionCount) {
                matchingIncomeWalletBalance +=
                  availableCommissionCount * SILVER_COMMISSION;

                updates.silverCommissionCount = {
                  increment: availableCommissionCount,
                };
                updates.totalSilverMatched = {
                  increment: availableCommissionCount,
                };
              } else {
                matchingIncomeWalletBalance +=
                  minSilverBalance * SILVER_COMMISSION;

                updates.silverCommissionCount = {
                  increment: minSilverBalance,
                };
                updates.totalSilverMatched = {
                  increment: minSilverBalance,
                };
              }
            }
          } else {
            updates.silverCommissionDate = today;
            if (minSilverBalance < MAX_COMMISSIONS_PER_DAY) {
              matchingIncomeWalletBalance +=
                minSilverBalance * SILVER_COMMISSION;

              updates.silverCommissionCount = minSilverBalance;
              updates.totalSilverMatched = {
                increment: minSilverBalance,
              };
            } else {
              matchingIncomeWalletBalance +=
                MAX_COMMISSIONS_PER_DAY * SILVER_COMMISSION;
              updates.silverCommissionCount = MAX_COMMISSIONS_PER_DAY;
              updates.totalSilverMatched = {
                increment: MAX_COMMISSIONS_PER_DAY,
              };
            }
          }
          // FOR GOLD
          if (isSameGoldCommissionDay) {
            if (parent.goldCommissionCount < MAX_COMMISSIONS_PER_DAY) {
              const availableCommissionCount =
                MAX_COMMISSIONS_PER_DAY - parent.goldCommissionCount;
              if (minGoldBalance > availableCommissionCount) {
                matchingIncomeWalletBalance +=
                  availableCommissionCount * GOLD_COMMISSION;

                updates.goldCommissionCount = {
                  increment: availableCommissionCount,
                };
                updates.totalGoldMatched = {
                  increment: availableCommissionCount,
                };
                // start
                if (parent.goldRewardLevel < 17) {
                  updates.goldRewardBalance = {
                    increment: availableCommissionCount,
                  };
                  // Find the current reward level config
                  const nextRewardLevel = REWARDS_COMMISSIONS.find(
                    (r) => r.rewardLevel === parent.goldRewardLevel + 1
                  );

                  if (nextRewardLevel) {
                    if (
                      parseFloat(
                        parent.goldRewardBalance + availableCommissionCount
                      ) >= parseFloat(nextRewardLevel.pair)
                    ) {
                      // Reset reward balance
                      rewardDetails.isRewardLevelReached = true;
                      rewardDetails.amount = nextRewardLevel.amount;
                      updates.goldRewardBalance = 0;
                      updates.goldRewardLevel = {
                        increment: 1,
                      };
                    }
                  }
                }
                // end
              } else {
                matchingIncomeWalletBalance += minGoldBalance * GOLD_COMMISSION;

                updates.goldCommissionCount = {
                  increment: minGoldBalance,
                };
                updates.totalGoldMatched = {
                  increment: minGoldBalance,
                };
                // start
                if (parent.goldRewardLevel < 17) {
                  updates.goldRewardBalance = {
                    increment: minGoldBalance,
                  };
                  // Find the current reward level config
                  const nextRewardLevel = REWARDS_COMMISSIONS.find(
                    (r) => r.rewardLevel === parent.goldRewardLevel + 1
                  );

                  if (nextRewardLevel) {
                    if (
                      parseFloat(parent.goldRewardBalance + minGoldBalance) >=
                      parseFloat(nextRewardLevel.pair)
                    ) {
                      // Reset reward balance
                      rewardDetails.isRewardLevelReached = true;
                      rewardDetails.amount = nextRewardLevel.amount;
                      updates.goldRewardBalance = 0;
                      updates.goldRewardLevel = {
                        increment: 1,
                      };
                    }
                  }
                }
                // end
              }
            }
          } else {
            updates.goldCommissionDate = today;
            if (minGoldBalance < MAX_COMMISSIONS_PER_DAY) {
              matchingIncomeWalletBalance += minGoldBalance * GOLD_COMMISSION;

              updates.goldCommissionCount = minGoldBalance;
              updates.totalGoldMatched = {
                increment: minGoldBalance,
              };
              // start
              if (parent.goldRewardLevel < 17) {
                updates.goldRewardBalance = {
                  increment: minGoldBalance,
                };
                // Find the current reward level config
                const nextRewardLevel = REWARDS_COMMISSIONS.find(
                  (r) => r.rewardLevel === parent.goldRewardLevel + 1
                );

                if (nextRewardLevel) {
                  if (
                    parseFloat(parent.goldRewardBalance + minGoldBalance) >=
                    parseFloat(nextRewardLevel.pair)
                  ) {
                    // Reset reward balance
                    rewardDetails.isRewardLevelReached = true;
                    rewardDetails.amount = nextRewardLevel.amount;
                    updates.goldRewardBalance = 0;
                    updates.goldRewardLevel = {
                      increment: 1,
                    };
                  }
                }
              }
              // end
            } else {
              matchingIncomeWalletBalance +=
                MAX_COMMISSIONS_PER_DAY * GOLD_COMMISSION;
              updates.goldCommissionCount = MAX_COMMISSIONS_PER_DAY;
              updates.totalGoldMatched = {
                increment: MAX_COMMISSIONS_PER_DAY,
              };
              // start
              if (parent.goldRewardLevel < 17) {
                updates.goldRewardBalance = {
                  increment: MAX_COMMISSIONS_PER_DAY,
                };
                // Find the current reward level config
                const nextRewardLevel = REWARDS_COMMISSIONS.find(
                  (r) => r.rewardLevel === parent.goldRewardLevel + 1
                );

                if (nextRewardLevel) {
                  if (
                    parseFloat(
                      parent.goldRewardBalance + MAX_COMMISSIONS_PER_DAY
                    ) >= parseFloat(nextRewardLevel.pair)
                  ) {
                    // Reset reward balance
                    rewardDetails.isRewardLevelReached = true;
                    rewardDetails.amount = nextRewardLevel.amount;
                    updates.goldRewardBalance = 0;
                    updates.goldRewardLevel = {
                      increment: 1,
                    };
                  }
                }
              }
              // end
            }
          }
        } else if (parent.status === DIAMOND) {
          // FOR ASSOCIATE
          if (isSameAssociateCommissionDay) {
            if (parent.associateCommissionCount < MAX_COMMISSIONS_PER_DAY) {
              const availableCommissionCount =
                MAX_COMMISSIONS_PER_DAY - parent.associateCommissionCount;
              if (minAssociateBalance > availableCommissionCount) {
                matchingIncomeWalletBalance +=
                  availableCommissionCount * ASSOCIATE_COMMISSION;

                updates.associateCommissionCount = {
                  increment: availableCommissionCount,
                };
                updates.totalAssociateMatched = {
                  increment: availableCommissionCount,
                };
              } else {
                matchingIncomeWalletBalance +=
                  minAssociateBalance * ASSOCIATE_COMMISSION;

                updates.associateCommissionCount = {
                  increment: minAssociateBalance,
                };
                updates.totalAssociateMatched = {
                  increment: minAssociateBalance,
                };
              }
            }
          } else {
            updates.associateCommissionDate = today;
            if (minAssociateBalance < MAX_COMMISSIONS_PER_DAY) {
              matchingIncomeWalletBalance +=
                minAssociateBalance * ASSOCIATE_COMMISSION;

              updates.associateCommissionCount = minAssociateBalance;
              updates.totalAssociateMatched = {
                increment: minAssociateBalance,
              };
            } else {
              matchingIncomeWalletBalance +=
                MAX_COMMISSIONS_PER_DAY * ASSOCIATE_COMMISSION;
              updates.associateCommissionCount = MAX_COMMISSIONS_PER_DAY;
              updates.totalAssociateMatched = {
                increment: MAX_COMMISSIONS_PER_DAY,
              };
            }
          }
          // FOR SILVER
          if (isSameSilverCommissionDay) {
            if (parent.silverCommissionCount < MAX_COMMISSIONS_PER_DAY) {
              const availableCommissionCount =
                MAX_COMMISSIONS_PER_DAY - parent.silverCommissionCount;
              if (minSilverBalance > availableCommissionCount) {
                matchingIncomeWalletBalance +=
                  availableCommissionCount * SILVER_COMMISSION;

                updates.silverCommissionCount = {
                  increment: availableCommissionCount,
                };
                updates.totalSilverMatched = {
                  increment: availableCommissionCount,
                };
              } else {
                matchingIncomeWalletBalance +=
                  minSilverBalance * SILVER_COMMISSION;

                updates.silverCommissionCount = {
                  increment: minSilverBalance,
                };
                updates.totalSilverMatched = {
                  increment: minSilverBalance,
                };
              }
            }
          } else {
            updates.silverCommissionDate = today;
            if (minSilverBalance < MAX_COMMISSIONS_PER_DAY) {
              matchingIncomeWalletBalance +=
                minSilverBalance * SILVER_COMMISSION;

              updates.silverCommissionCount = minSilverBalance;
              updates.totalSilverMatched = {
                increment: minSilverBalance,
              };
            } else {
              matchingIncomeWalletBalance +=
                MAX_COMMISSIONS_PER_DAY * SILVER_COMMISSION;
              updates.silverCommissionCount = MAX_COMMISSIONS_PER_DAY;
              updates.totalSilverMatched = {
                increment: MAX_COMMISSIONS_PER_DAY,
              };
            }
          }
          // FOR GOLD
          if (isSameGoldCommissionDay) {
            if (parent.goldCommissionCount < MAX_COMMISSIONS_PER_DAY) {
              const availableCommissionCount =
                MAX_COMMISSIONS_PER_DAY - parent.goldCommissionCount;
              if (minGoldBalance > availableCommissionCount) {
                matchingIncomeWalletBalance +=
                  availableCommissionCount * GOLD_COMMISSION;

                updates.goldCommissionCount = {
                  increment: availableCommissionCount,
                };
                updates.totalGoldMatched = {
                  increment: availableCommissionCount,
                };
                // start
                if (parent.goldRewardLevel < 17) {
                  updates.goldRewardBalance = {
                    increment: availableCommissionCount,
                  };
                  // Find the current reward level config
                  const nextRewardLevel = REWARDS_COMMISSIONS.find(
                    (r) => r.rewardLevel === parent.goldRewardLevel + 1
                  );

                  if (nextRewardLevel) {
                    if (
                      parseFloat(
                        parent.goldRewardBalance + availableCommissionCount
                      ) >= parseFloat(nextRewardLevel.pair)
                    ) {
                      // Reset reward balance
                      rewardDetails.isRewardLevelReached = true;
                      rewardDetails.amount = nextRewardLevel.amount;
                      updates.goldRewardBalance = 0;
                      updates.goldRewardLevel = {
                        increment: 1,
                      };
                    }
                  }
                }
                // end
              } else {
                matchingIncomeWalletBalance += minGoldBalance * GOLD_COMMISSION;

                updates.goldCommissionCount = {
                  increment: minGoldBalance,
                };
                updates.totalGoldMatched = {
                  increment: minGoldBalance,
                };
                // start
                if (parent.goldRewardLevel < 17) {
                  updates.goldRewardBalance = {
                    increment: minGoldBalance,
                  };
                  // Find the current reward level config
                  const nextRewardLevel = REWARDS_COMMISSIONS.find(
                    (r) => r.rewardLevel === parent.goldRewardLevel + 1
                  );

                  if (nextRewardLevel) {
                    if (
                      parseFloat(parent.goldRewardBalance + minGoldBalance) >=
                      parseFloat(nextRewardLevel.pair)
                    ) {
                      // Reset reward balance
                      rewardDetails.isRewardLevelReached = true;
                      rewardDetails.amount = nextRewardLevel.amount;
                      updates.goldRewardBalance = 0;
                      updates.goldRewardLevel = {
                        increment: 1,
                      };
                    }
                  }
                }
                // end
              }
            }
          } else {
            updates.goldCommissionDate = today;
            if (minGoldBalance < MAX_COMMISSIONS_PER_DAY) {
              matchingIncomeWalletBalance += minGoldBalance * GOLD_COMMISSION;

              updates.goldCommissionCount = minGoldBalance;
              updates.totalGoldMatched = {
                increment: minGoldBalance,
              };
              // start
              if (parent.goldRewardLevel < 17) {
                updates.goldRewardBalance = {
                  increment: minGoldBalance,
                };
                // Find the current reward level config
                const nextRewardLevel = REWARDS_COMMISSIONS.find(
                  (r) => r.rewardLevel === parent.goldRewardLevel + 1
                );

                if (nextRewardLevel) {
                  if (
                    parseFloat(parent.goldRewardBalance + minGoldBalance) >=
                    parseFloat(nextRewardLevel.pair)
                  ) {
                    // Reset reward balance
                    rewardDetails.isRewardLevelReached = true;
                    rewardDetails.amount = nextRewardLevel.amount;
                    updates.goldRewardBalance = 0;
                    updates.goldRewardLevel = {
                      increment: 1,
                    };
                  }
                }
              }
              // end
            } else {
              matchingIncomeWalletBalance +=
                MAX_COMMISSIONS_PER_DAY * GOLD_COMMISSION;
              updates.goldCommissionCount = MAX_COMMISSIONS_PER_DAY;
              updates.totalGoldMatched = {
                increment: MAX_COMMISSIONS_PER_DAY,
              };
              // start
              if (parent.goldRewardLevel < 17) {
                updates.goldRewardBalance = {
                  increment: MAX_COMMISSIONS_PER_DAY,
                };
                // Find the current reward level config
                const nextRewardLevel = REWARDS_COMMISSIONS.find(
                  (r) => r.rewardLevel === parent.goldRewardLevel + 1
                );

                if (nextRewardLevel) {
                  if (
                    parseFloat(
                      parent.goldRewardBalance + MAX_COMMISSIONS_PER_DAY
                    ) >= parseFloat(nextRewardLevel.pair)
                  ) {
                    // Reset reward balance
                    rewardDetails.isRewardLevelReached = true;
                    rewardDetails.amount = nextRewardLevel.amount;
                    updates.goldRewardBalance = 0;
                    updates.goldRewardLevel = {
                      increment: 1,
                    };
                  }
                }
              }
              // end
            }
          }
          // FOR DIAMOND
          if (isSameDiamondCommissionDay) {
            if (parent.diamondCommissionCount < MAX_COMMISSIONS_PER_DAY) {
              const availableCommissionCount =
                MAX_COMMISSIONS_PER_DAY - parent.diamondCommissionCount;
              if (minDiamondBalance > availableCommissionCount) {
                matchingIncomeWalletBalance +=
                  availableCommissionCount * DIAMOND_COMMISSION;

                updates.diamondCommissionCount = {
                  increment: availableCommissionCount,
                };
                updates.totalDiamondMatched = {
                  increment: availableCommissionCount,
                };
              } else {
                matchingIncomeWalletBalance +=
                  minDiamondBalance * DIAMOND_COMMISSION;

                updates.diamondCommissionCount = {
                  increment: minDiamondBalance,
                };
                updates.totalDiamondMatched = {
                  increment: minDiamondBalance,
                };
              }
            }
          } else {
            updates.diamondCommissionDate = today;
            if (minDiamondBalance < MAX_COMMISSIONS_PER_DAY) {
              matchingIncomeWalletBalance +=
                minDiamondBalance * DIAMOND_COMMISSION;

              updates.diamondCommissionCount = minDiamondBalance;
              updates.totalDiamondMatched = {
                increment: minDiamondBalance,
              };
            } else {
              matchingIncomeWalletBalance +=
                MAX_COMMISSIONS_PER_DAY * DIAMOND_COMMISSION;
              updates.diamondCommissionCount = MAX_COMMISSIONS_PER_DAY;
              updates.totalDiamondMatched = {
                increment: MAX_COMMISSIONS_PER_DAY,
              };
            }
          }
        }
      }

      updates.matchingIncomeWalletBalance = {
        increment: matchingIncomeWalletBalance,
      };

      parent = await calculateCommission(parent, updates, rewardDetails);

      await checkMatchingMentorIncomeL1(parent, matchingIncomeWalletBalance);

      await checkMatchingMentorIncomeL2(parent, matchingIncomeWalletBalance);
    } else {
      // 2:1 not true
      const leftTotal = parent.leftCount + parent.leftDirectCount;
      const rightTotal = parent.rightCount + parent.rightDirectCount;
      let rewardDetails = {
        isRewardLevelReached: false,
        amount: 0,
      };
      let minSilverBalance = 0;
      let minGoldBalance = 0;
      let minDiamondBalance = 0;
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
        updates.associateCommissionDate = today;
        updates.silverCommissionDate = today;
        updates.goldCommissionDate = today;
        updates.diamondCommissionDate = today; // this is imp. if brinda is by default 1:1 and 2:1 true then will get commission date error
        if (parent.status === ASSOCIATE) {
          updates.associateCommissionCount = 1;
          updates.totalAssociateMatched = 1;
          updates.matchingIncomeWalletBalance = {
            increment: ASSOCIATE_COMMISSION,
          };
        } else if (parent.status === SILVER) {
          updates.associateCommissionCount = 1; //since 2:1 is not true that means silverCommissionCount must be 0
          updates.totalAssociateMatched = 1;
          updates.silverCommissionCount = minSilverBalance;
          updates.totalSilverMatched = minSilverBalance;
          let totalSilverCommission = minSilverBalance * SILVER_COMMISSION;
          updates.matchingIncomeWalletBalance = {
            increment: totalSilverCommission + ASSOCIATE_COMMISSION,
          };
        } else if (parent.status === GOLD) {
          updates.associateCommissionCount = 1;
          updates.totalAssociateMatched = 1;
          updates.silverCommissionCount = minSilverBalance;
          updates.totalSilverMatched = minSilverBalance;
          let totalSilverCommission = minSilverBalance * SILVER_COMMISSION;
          updates.goldCommissionCount = minGoldBalance;
          updates.totalGoldMatched = minGoldBalance;
          // start
          if (parent.goldRewardLevel < 17) {
            updates.goldRewardBalance = minGoldBalance;
            // Find the current reward level config
            const nextRewardLevel = REWARDS_COMMISSIONS.find(
              (r) => r.rewardLevel === parent.goldRewardLevel + 1
            );

            if (nextRewardLevel) {
              if (
                parseFloat(minGoldBalance) >= parseFloat(nextRewardLevel.pair)
              ) {
                // Reset reward balance
                rewardDetails.isRewardLevelReached = true;
                rewardDetails.amount = nextRewardLevel.amount;
                updates.goldRewardBalance = 0;
                updates.goldRewardLevel = {
                  increment: 1,
                };
              }
            }
          }
          //write rewared transaction in commission.js
          // i think logic is not writtin above .previous logic of matched
          // end
          let totalGoldCommission = minGoldBalance * GOLD_COMMISSION;
          updates.matchingIncomeWalletBalance = {
            increment:
              totalGoldCommission +
              totalSilverCommission +
              ASSOCIATE_COMMISSION,
          };
        } else if (parent.status === DIAMOND) {
          updates.associateCommissionCount = 1;
          updates.totalAssociateMatched = 1;
          updates.silverCommissionCount = minSilverBalance;
          updates.totalSilverMatched = minSilverBalance;
          let totalSilverCommission = minSilverBalance * SILVER_COMMISSION;
          updates.goldCommissionCount = minGoldBalance;
          updates.totalGoldMatched = minGoldBalance;
          // start
          if (parent.goldRewardLevel < 17) {
            updates.goldRewardBalance = minGoldBalance;
            // Find the current reward level config
            const nextRewardLevel = REWARDS_COMMISSIONS.find(
              (r) => r.rewardLevel === parent.goldRewardLevel + 1
            );

            if (nextRewardLevel) {
              if (
                parseFloat(minGoldBalance) >= parseFloat(nextRewardLevel.pair)
              ) {
                // Reset reward balance
                rewardDetails.isRewardLevelReached = true;
                rewardDetails.amount = nextRewardLevel.amount;
                updates.goldRewardBalance = 0;
                updates.goldRewardLevel = {
                  increment: 1,
                };
              }
            }
          }

          // end

          let totalGoldCommission = minGoldBalance * GOLD_COMMISSION;
          updates.diamondCommissionCount = minDiamondBalance;
          updates.totalDiamondMatched = minDiamondBalance;
          let totalDiamondCommission = minDiamondBalance * DIAMOND_COMMISSION;
          updates.matchingIncomeWalletBalance = {
            increment:
              totalDiamondCommission +
              totalGoldCommission +
              totalSilverCommission +
              ASSOCIATE_COMMISSION,
          };
        }
      }

      const matchingIncomeWalletBalance =
        updates.matchingIncomeWalletBalance?.increment;

      parent = await calculateCommission(parent, updates, rewardDetails);

      await checkMatchingMentorIncomeL1(parent, matchingIncomeWalletBalance);

      await checkMatchingMentorIncomeL2(parent, matchingIncomeWalletBalance);
    }

    currentMember = parent;
  }
};

module.exports = { check2_1Pass };
