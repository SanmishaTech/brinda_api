const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { LEFT, RIGHT, TOP, GOLD, SILVER, DIAMOND } = require("../config/data");

const checkMatchingMentorIncomeL1 = async (parent, value) => {
  if (parent?.sponsor?.isMatchingMentorL1 === true && value > 0) {
    const sponsor = await prisma.member.update({
      where: { id: parent.sponsor.id },
      data: {
        matchingMentorIncomeL1: { increment: value * 0.1 },
      },
    });
  } else if (
    (parent.sponsor?.status === GOLD || parent.sponsor?.status === DIAMOND) &&
    parent.sponsor?.isDirectMatch === true &&
    parent.sponsor?.is2_1Pass === true
  ) {
    const sponsor = await prisma.member.update({
      where: { id: parent.sponsor.id },
      data: {
        isMatchingMentorL1: true,
        ...(value > 0 && {
          matchingMentorIncomeL1: { increment: value * 0.1 },
        }),
      },
    });
  }
  return;
};

module.exports = { checkMatchingMentorIncomeL1 };
