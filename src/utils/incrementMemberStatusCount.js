const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
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
  console.log("inside function");
  do {
    parent = await prisma.member.findFirst({
      where: { id: parentId },
    });

    const updates = {};
    console.log(currentPosition);
    // General side count
    if (currentPosition === LEFT) {
      // Status-specific balance
      console.log("must be here1");
      console.log(status, " and ", ASSOCIATE);
      switch (status) {
        case "Associate":
          console.log("must be here2");
          updates.leftAssociateBalance = { increment: 1 };
          break;
        case SILVER:
          updates.leftSilverBalance = { increment: 1 };
          break;
        case GOLD:
          updates.leftGoldBalance = { increment: 1 };
          break;
        case DIAMOND:
          updates.leftDiamondBalance = { increment: 1 };
          break;
      }
    } else if (currentPosition === RIGHT) {
      switch (status) {
        case ASSOCIATE:
          updates.rightAssociateBalance = { increment: 1 };
          break;
        case SILVER:
          updates.rightSilverBalance = { increment: 1 };
          break;
        case GOLD:
          updates.rightGoldBalance = { increment: 1 };
          break;
        case DIAMOND:
          updates.rightDiamondBalance = { increment: 1 };
          break;
      }
    }

    console.log("success", updates);

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
