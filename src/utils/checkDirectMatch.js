const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { LEFT, RIGHT, TOP } = require("../config/data");

const checkDirectMatch = async (member) => {
  let sponsorData = await prisma.member.findUnique({
    where: { id: member.sponsor.id },
  });
  if (!member.sponsor.isDirectMatch) {
    if (
      member.sponsor.leftDirectCount > 0 &&
      member.sponsor.rightDirectCount > 0
    ) {
      sponsorData = await prisma.member.update({
        where: { id: member.sponsor.id },
        data: { isDirectMatch: true },
      });
    }
  }

  return sponsorData;
};

module.exports = { checkDirectMatch };
