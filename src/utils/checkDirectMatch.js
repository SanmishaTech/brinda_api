const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { LEFT, RIGHT, TOP } = require("../config/data");

const checkDirectMatch = async (sponsor) => {
  if (!sponsor.isDirectMatch) {
    if (sponsor.leftDirectCount > 0 && sponsor.rightDirectCount > 0) {
        sponsor = await prisma.member.update({
          where: { id: sponsor.id },
          data: { isDirectMatch: true },
        });
    }
  }

  if(!sponsor.isDoubleMatch){
    if (sponsor.leftDirectCount > 1 && sponsor.rightDirectCount > 1) {
      sponsor = await prisma.member.update({
        where: { id: sponsor.id },
        data: { isDoubleMatch: true },
      });
  }
  }


};

module.exports = { checkDirectMatch };
