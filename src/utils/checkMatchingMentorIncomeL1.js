const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { LEFT, RIGHT, TOP, GOLD, SILVER, DIAMOND } = require("../config/data");

const checkMatchingMentorIncomeL1 = async (parent, value) => {
  if (parent?.sponsor?.isMatchingMentorL1 === true && value > 0) {
    // start
    var commissionToGive = value * 0.1;
    const percentage = parseFloat(parent?.sponsor?.percentage);
    if (!isNaN(percentage) && percentage > 0 && percentage < 100) {
      commissionToGive = parseFloat(
        ((commissionToGive * percentage) / 100).toFixed(2)
      );
    } else if (percentage === 0) {
      commissionToGive = 0;
    }
    // end
    const sponsor = await prisma.member.update({
      where: { id: parent.sponsor.id },
      data: {
        matchingMentorIncomeL1: { increment: commissionToGive },
      },
    });
  } else if (
    (parent.sponsor?.status === GOLD || parent.sponsor?.status === DIAMOND) &&
    parent.sponsor?.isDirectMatch === true &&
    parent.sponsor?.is2_1Pass === true
  ) {
    // start

    var commissionToGive = value * 0.1;
    const percentage = parseFloat(parent?.sponsor?.percentage);
    if (!isNaN(percentage) && percentage > 0 && percentage < 100) {
      commissionToGive = parseFloat(
        ((commissionToGive * percentage) / 100).toFixed(2)
      );
    } else if (percentage === 0) {
      commissionToGive = 0;
    }
    // end
    const sponsor = await prisma.member.update({
      where: { id: parent.sponsor.id },
      data: {
        isMatchingMentorL1: true,
        ...(commissionToGive > 0 && {
          matchingMentorIncomeL1: { increment: commissionToGive },
        }),
      },
    });
  }
  return;
};

module.exports = { checkMatchingMentorIncomeL1 };
