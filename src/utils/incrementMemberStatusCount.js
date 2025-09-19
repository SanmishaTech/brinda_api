const { PrismaClient } = require("@prisma/client");
const prisma = require("../config/db");
const {
  LEFT,
  RIGHT,
  TOP,
  ASSOCIATE,
  SILVER,
  GOLD,
  DIAMOND,
} = require("../config/data");

const incrementMemberStatusCount = async (newUser) => {
  let parentId = newUser.parentId;
  if (!parentId) {
    return newUser;
  }
  let newUserId = newUser.id;
  const status = newUser.status;

  let currentPosition = newUser.positionToParent;

  let parent = null;
  do {
    parent = await prisma.member.findFirst({
      where: { id: parentId },
    });

    const updates = {};
    // General side count
    if (currentPosition === LEFT) {
      // Status-specific balance

      switch (status) {
        case ASSOCIATE:
          updates.leftAssociateBalance = { increment: 1 };
          updates.totalLeftAssociateBalance = { increment: 1 };
          break;
        case SILVER:
          updates.leftSilverBalance = { increment: 1 };
          updates.totalLeftSilverBalance = { increment: 1 };
          break;
        case GOLD:
          updates.leftGoldBalance = { increment: 1 };
          updates.totalLeftGoldBalance = { increment: 1 };
          break;
        case DIAMOND:
          updates.leftDiamondBalance = { increment: 1 };
          updates.totalLeftDiamondBalance = { increment: 1 };
          break;
      }
    } else if (currentPosition === RIGHT) {
      switch (status) {
        case ASSOCIATE:
          updates.rightAssociateBalance = { increment: 1 };
          updates.totalRightAssociateBalance = { increment: 1 };
          break;
        case SILVER:
          updates.rightSilverBalance = { increment: 1 };
          updates.totalRightSilverBalance = { increment: 1 };
          break;
        case GOLD:
          updates.rightGoldBalance = { increment: 1 };
          updates.totalRightGoldBalance = { increment: 1 };
          break;
        case DIAMOND:
          updates.rightDiamondBalance = { increment: 1 };
          updates.totalRightDiamondBalance = { increment: 1 };
          break;
      }
    }

    await prisma.member.update({
      where: { id: parent.id },
      data: updates,
    });

    parentId = parent.parentId;
    currentPosition = parent.positionToParent;
  } while (parent && parent.positionToParent !== TOP);

  newUser = await prisma.member.findUnique({
    where: { id: newUserId },
    include: { sponsor: true },
  });

  return newUser;
};

module.exports = { incrementMemberStatusCount };
