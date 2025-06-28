const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { LEFT, RIGHT, TOP } = require("../config/data");

const updateCount = async (newUser) => {
  let parentId = newUser.parentId;
  let currentPosition = newUser.positionToParent;

  let parent = null;
  // // start
  // let test = null;

  // if (newUser.leftDirectCount > 0 && newUser.rightDirectCount >0) {
  //   test = await prisma.member.update({
  //     where: { id: newUser.id },
  //     data: {
  //       isDirectMatch: true,
  //     },
  //   });
  //   if(newUser.leftCount > 0){
  //     test = await prisma.member.update({
  //       where: { id: newUser.id },
  //       data: {
  //         is2_1Pass: true,
  //       },
  //     });
  //   }else if(newUser.rightCount > 0){
  //     test = await prisma.member.update({
  //       where: { id: newUser.id },
  //       data: {
  //         is2_1Pass: true,
  //       },
  //     });
  //   }
  // }

  //  if(newUser.leftDirectCount > 0 && newUser.leftCount > 0 && newUser.rightCount >0){
  //     test = await prisma.member.update({
  //       where: { id: newUser.id },
  //       data: {
  //         is2_1Pass: true,
  //       },
  //     });
  //  }
  // // end

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
};

module.exports = { updateCount };
