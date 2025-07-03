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

  if (!member.sponsor.isDoubleMatch) {
    if (
      member.sponsor.leftDirectCount > 1 &&
      member.sponsor.rightDirectCount > 1
    ) {
      sponsorData = await prisma.member.update({
        where: { id: member.sponsor.id },
        data: { isDoubleMatch: true },
      });
    }
  }

  return sponsorData;
};

module.exports = { checkDirectMatch };
