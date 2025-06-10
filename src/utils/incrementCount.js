const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { LEFT, RIGHT, TOP } = require("../config/data");

const incrementCount = async (newUser) => {
  let current = await prisma.member.findFirst({
    where: {
      id: newUser.parentId,
      positionToParent: newUser.positionToParent,
    },
  });
  //condition for top
  if (!current) {
    let topMember = await prisma.member.findFirst({
      where: {
        id: newUser.parentId,
        positionToParent: TOP,
      },
    });
    if (topMember) {
      current = topMember;
    } else {
      return;
    }
  }

  let fromUser = newUser;
  //   console.log("new user", newUser);
  while (current) {
    const isDirect = current.id === fromUser.sponsorId;
    const position = fromUser.positionToParent;
    console.log(isDirect, position);
    if (isDirect && position === LEFT) {
      await prisma.member.update({
        where: { id: current.id },
        data: {
          leftDirectCount: { increment: 1 },
        },
      });
    } else if (isDirect && position === RIGHT) {
      await prisma.member.update({
        where: { id: current.id },
        data: {
          rightDirectCount: { increment: 1 },
        },
      });
    } else if (position === LEFT) {
      await prisma.member.update({
        where: { id: current.id },
        data: {
          leftCount: { increment: 1 },
        },
      });
    } else if (position === RIGHT) {
      await prisma.member.update({
        where: { id: current.id },
        data: {
          rightCount: { increment: 1 },
        },
      });
    }

    if (current.positionToParent === TOP) {
      console.log("top");
      break;
    }

    // Prepare for next loop (walk up the tree)
    fromUser = current;
    current = await prisma.member.findFirst({
      where: {
        id: current.parentId,
        positionToParent: current.positionToParent,
      },
    });

    if (!current) {
      current = await prisma.member.findFirst({
        where: {
          id: fromUser.parentId,
          positionToParent: TOP,
        },
      });
    }
  }
};

module.exports = { incrementCount };
