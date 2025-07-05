const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { GOLD, DIAMOND, LEFT, RIGHT } = require("../config/data");

const checkMatchingMentorIncomeL2 = async (parent, value) => {
  const L1SponsorId = parent?.sponsor?.id;
  if (!L1SponsorId) return;

  // Get L1 Sponsor with their own sponsor (L2)
  const L1Sponsor = await prisma.member.findUnique({
    where: { id: L1SponsorId },
    include: {
      sponsor: true,
    },
  });

  const L2SponsorId = L1Sponsor?.sponsor?.id;
  if (!L2SponsorId) return;

  // Get L2Sponsor with their parentChildren
  const L2Sponsor = await prisma.member.findUnique({
    where: { id: L2SponsorId },
    include: {
      parentChildren: true,
    },
  });

  if (
    !L2Sponsor ||
    !L2Sponsor.parentChildren ||
    L2Sponsor.parentChildren.length < 2
  ) {
    return;
  }

  if (L2Sponsor.isMatchingMentorL2) {
    // ✅ Update L2Sponsor
    await prisma.member.update({
      where: { id: L2Sponsor.id },
      data: {
        ...(value > 0 && {
          matchingMentorIncomeL2: { increment: value * 0.2 },
        }),
      },
    });
    return;
  }

  const leftChild = L2Sponsor.parentChildren.find(
    (child) => child.positionToParent === LEFT
  );
  const rightChild = L2Sponsor.parentChildren.find(
    (child) => child.positionToParent === RIGHT
  );

  if (!leftChild || !rightChild) {
    return;
  }

  const validStatuses = [GOLD, DIAMOND];
  const isLeftQualified = validStatuses.includes(leftChild.status);
  const isRightQualified = validStatuses.includes(rightChild.status);

  if (!isLeftQualified || !isRightQualified) {
    return;
  }

  // Now check direct children of leftChild
  if (leftChild.leftDirectCount < 1 || leftChild.rightDirectCount < 1) {
    return;
  }

  const leftDirects = await prisma.member.findMany({
    where: {
      parentId: leftChild.id,
      positionToParent: { in: [LEFT, RIGHT] },
    },
  });

  const leftHasGoldOrDiamondLeft = leftDirects.find(
    (m) => m.positionToParent === LEFT && validStatuses.includes(m.status)
  );

  const leftHasGoldOrDiamondRight = leftDirects.find(
    (m) => m.positionToParent === RIGHT && validStatuses.includes(m.status)
  );

  if (!leftHasGoldOrDiamondLeft || !leftHasGoldOrDiamondRight) {
    return;
  }

  // Now check direct children of rightChild
  if (rightChild.leftDirectCount < 1 || rightChild.rightDirectCount < 1) {
    return;
  }

  const rightDirects = await prisma.member.findMany({
    where: {
      parentId: rightChild.id,
      positionToParent: { in: [LEFT, RIGHT] },
    },
  });

  const rightHasGoldOrDiamondLeft = rightDirects.find(
    (m) => m.positionToParent === LEFT && validStatuses.includes(m.status)
  );
  const rightHasGoldOrDiamondRight = rightDirects.find(
    (m) => m.positionToParent === RIGHT && validStatuses.includes(m.status)
  );

  if (!rightHasGoldOrDiamondLeft || !rightHasGoldOrDiamondRight) {
    return;
  }

  // ✅ Update L2Sponsor
  await prisma.member.update({
    where: { id: L2Sponsor.id },
    data: {
      isMatchingMentorL2: true,
      ...(value > 0 && {
        matchingMentorIncomeL2: { increment: value * 0.2 },
      }),
    },
  });

  return;
};

module.exports = { checkMatchingMentorIncomeL2 };
