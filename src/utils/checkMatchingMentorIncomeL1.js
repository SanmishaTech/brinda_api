const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { LEFT, RIGHT, TOP, GOLD, SILVER } = require("../config/data");

const checkMatchingMentorIncomeL1 = async (parent, value) => {
  if (parent.sponsor?.status === GOLD) {
    parent = await prisma.member.update({
      where: { id: parent.id },
      data: {
        isMatchingMentorL1: true,
        matchingMentorIncomeL1: { increment: value * 0.05 },
      },
    });
  }

  return parent;
};

module.exports = { checkMatchingMentorIncomeL1 };
