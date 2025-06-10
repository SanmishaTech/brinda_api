const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { LEFT, RIGHT, TOP } = require("../config/data");

const incrementCount = async (newUser) => {
  let parentId = newUser.parentId;
  let currentPosition = newUser.positionToParent;

  let parent = null;

  do {
    parent = await prisma.member.findFirst({
      where: {
        id: parentId,
      },
    });

    if(currentPosition === LEFT) {
        if(newUser.sponsorId === parent.id) {
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

    if(currentPosition === RIGHT) {
      if(newUser.sponsorId === parent.id) {
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
};

module.exports = { incrementCount };
