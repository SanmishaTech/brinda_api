const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { GOLD, DIAMOND, LEFT, RIGHT } = require("../config/data");

const checkMatchingMentorIncomeL2 = async (parent, value) => {
  const L1SponsorId = parent?.sponsor?.id;
  console.log("inside l2 function");
  if (!L1SponsorId) {
    console.log("Error1");
    return;
  }

  // Get L1 Sponsor with their own sponsor (L2)
  const L1Sponsor = await prisma.member.findUnique({
    where: { id: L1SponsorId },
    include: {
      sponsor: true,
    },
  });

  const L2SponsorId = L1Sponsor?.sponsor?.id;

  if (!L2SponsorId) {
    console.log("Error2");

    return;
  }

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
    console.log("Error3");

    return;
  }
  if (L2Sponsor.status !== GOLD || L2Sponsor.status !== DIAMOND) {
    console.log("Error11");
    return;
  }

  if (L2Sponsor.isMatchingMentorL2) {
    // ✅ Update L2Sponsor
    await prisma.member.update({
      where: { id: L2Sponsor.id },
      data: {
        ...(value > 0 && {
          matchingMentorIncomeL2: { increment: value * 0.4 },
        }),
      },
    });
    console.log("Error4");

    return;
  }

  const leftChild = L2Sponsor.parentChildren.find(
    (child) => child.positionToParent === LEFT
  );
  const rightChild = L2Sponsor.parentChildren.find(
    (child) => child.positionToParent === RIGHT
  );

  if (!leftChild || !rightChild) {
    console.log("Error5");

    return;
  }

  const validStatuses = [GOLD, DIAMOND];
  const isLeftQualified = validStatuses.includes(leftChild.status);
  const isRightQualified = validStatuses.includes(rightChild.status);

  if (!isLeftQualified || !isRightQualified) {
    console.log("Error6");

    return;
  }

  // Now check direct children of leftChild
  if (leftChild.leftDirectCount < 1 || leftChild.rightDirectCount < 1) {
    console.log("Error7");

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
    console.log("Error8");

    return;
  }

  // Now check direct children of rightChild
  if (rightChild.leftDirectCount < 1 || rightChild.rightDirectCount < 1) {
    console.log("Error9");

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
    console.log("Error10");
    return;
  }

  // ✅ Update L2Sponsor
  await prisma.member.update({
    where: { id: L2Sponsor.id },
    data: {
      isMatchingMentorL2: true,
      ...(value > 0 && {
        matchingMentorIncomeL2: { increment: value * 0.4 },
      }),
    },
  });
  console.log("Error11");

  return;
};

module.exports = { checkMatchingMentorIncomeL2 };
