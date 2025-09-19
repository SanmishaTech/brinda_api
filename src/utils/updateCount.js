const { PrismaClient } = require("@prisma/client");
const prisma = require("../config/db");
const { LEFT, RIGHT, TOP } = require("../config/data");

const updateCount = async (newUser) => {
  let parentId = newUser?.parentId;
  if (!parentId) {
    return newUser;
  }
  let newUserId = newUser.id;

  let currentPosition = newUser.positionToParent;

  let parent = null;

  do {
    parent = await prisma.member.findFirst({
      where: {
        id: parentId,
      },
    });

    if (currentPosition === LEFT) {
      if (newUser.sponsorId === parent.id) {
        await prisma.member.update({
          where: { id: parent.id },
          data: {
            leftDirectCount: { increment: 1 },
          },
        });
      } else {
        await prisma.member.update({
          where: { id: parent.id },
          data: {
            leftCount: { increment: 1 },
          },
        });
      }
    }

    if (currentPosition === RIGHT) {
      if (newUser.sponsorId === parent.id) {
        await prisma.member.update({
          where: { id: parent.id },
          data: {
            rightDirectCount: { increment: 1 },
          },
        });
      } else {
        await prisma.member.update({
          where: { id: parent.id },
          data: {
            rightCount: { increment: 1 },
          },
        });
      }
    }

    parentId = parent.parentId;
    currentPosition = parent.positionToParent;
  } while (parent.positionToParent !== TOP);

  newUser = await prisma.member.findUnique({
    where: { id: newUserId },
    include: { sponsor: true },
  });

  return newUser;
};

module.exports = { updateCount };
