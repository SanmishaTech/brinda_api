const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { LEFT, RIGHT, TOP, GOLD, SILVER } = require("../config/data");

const checkMatchingMentorIncomeL1 = async (parent, value) => {
  if (parent.status === SILVER && parent.sponsor?.status === GOLD) {
    const leftChild = parent.parentChildren.find(
      (child) => child.positionToParent === LEFT && child.status === SILVER
    );

    const rightChild = parent.parentChildren.find(
      (child) => child.positionToParent === RIGHT && child.status === SILVER
    );

    const updates = {
      matchingMentorIncomeL1: {
        increment: value * 100 * 0.05,
      },
    };

    if (leftChild) {
      updates.isLeftChildrenSilver = true;
    } else {
      // Check deeper level: left side descendants
      const leftDescendants = parent.parentChildren
        .filter((child) => child.positionToParent === "left")
        .flatMap((child) => child.parentChildren || []);

      if (leftDescendants.some((d) => d.status === SILVER)) {
        updates.isLeftChildrenSilver = true;
      }
    }

    if (rightChild) {
      updates.isRightChildrenSilver = true;
    } else {
      // Check deeper level: right side descendants
      const rightDescendants = parent.parentChildren
        .filter((child) => child.positionToParent === "right")
        .flatMap((child) => child.parentChildren || []);

      if (rightDescendants.some((d) => d.status === SILVER)) {
        updates.isRightChildrenSilver = true;
      }
    }

    await prisma.member.update({
      where: { id: parent.id },
      data: updates,
    });
  }
};

module.exports = { checkMatchingMentorIncomeL1 };
