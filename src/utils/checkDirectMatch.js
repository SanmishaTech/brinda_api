const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { LEFT, RIGHT, TOP } = require("../config/data");

const checkDirectMatch = async (member) => {
  if (member?.sponsor?.isDirectMatch === false) {
    if (
      member.sponsor.leftDirectCount > 0 &&
      member.sponsor.rightDirectCount > 0
    ) {
      await prisma.member.update({
        where: { id: member.sponsor.id },
        data: { isDirectMatch: true },
      });
    }
  }
  console.log("done");
  return;
};

module.exports = { checkDirectMatch };
