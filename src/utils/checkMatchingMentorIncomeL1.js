const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { LEFT, RIGHT, TOP, GOLD, SILVER, DIAMOND } = require("../config/data");

const checkMatchingMentorIncomeL1 = async (parent, value) => {
  if (parent?.sponsor?.isMatchingMentorL1 && value > 0) {
    const sponsor = await prisma.member.update({
      where: { id: parent.sponsor.id },
      data: {
        matchingMentorIncomeL1: { increment: value * 0.05 },
      },
    });
  } else if (
    parent.sponsor?.status === GOLD ||
    parent.sponsor?.status === DIAMOND
  ) {
    const sponsor = await prisma.member.update({
      where: { id: parent.sponsor.id },
      data: {
        isMatchingMentorL1: true,
        ...(value > 0 && {
          matchingMentorIncomeL1: { increment: value * 0.05 },
        }),
      },
    });
  }
  return;
};

module.exports = { checkMatchingMentorIncomeL1 };
