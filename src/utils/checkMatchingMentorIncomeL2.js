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
    select: {
      sponsor: {
        select: {
          id: true,
        },
      },
    },
  });

  const L2SponsorId = L1Sponsor?.sponsor?.id;

  if (!L2SponsorId) {
    console.log("Error2");

    return;
  }

  // satrt
  // Fetch L2Sponsor basic info
  const L2Sponsor = await prisma.member.findUnique({
    where: { id: L2SponsorId },
    select: {
      id: true,
      status: true,
      isMatchingMentorL2: true,
      positionToParent: true,
      isDirectMatch: true,
      is2_1Pass: true,
    },
  });

  if (
    !L2Sponsor ||
    ![GOLD, DIAMOND].includes(L2Sponsor.status) ||
    !L2Sponsor.is2_1Pass ||
    !L2Sponsor.isDirectMatch
  ) {
    console.log("Error11");
    return;
  }

  if (L2Sponsor.isMatchingMentorL2) {
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

  // Now fetch only LEFT and RIGHT sponsor children
  const [leftCandidates, rightCandidates] = await Promise.all([
    prisma.member.findMany({
      where: {
        sponsorId: L2SponsorId,
        positionToParent: LEFT,
      },
      select: {
        id: true,
        status: true,
        leftDirectCount: true,
        rightDirectCount: true,
        positionToParent: true,
      },
    }),
    prisma.member.findMany({
      where: {
        sponsorId: L2SponsorId,
        positionToParent: RIGHT,
      },
      select: {
        id: true,
        status: true,
        leftDirectCount: true,
        rightDirectCount: true,
        positionToParent: true,
      },
    }),
  ]);

  if (leftCandidates.length === 0 || rightCandidates.length === 0) {
    console.log("Error5");
    return;
  }

  // end



  // working
  let LEFT_SIDE = false;

  const validStatuses = [GOLD, DIAMOND];

  for (const leftChild of leftCandidates) {
    const isLeftQualified = validStatuses.includes(leftChild.status);
    if (!isLeftQualified) {
      console.log("Error6");

      continue;
    }
    if (leftChild.leftDirectCount < 1 || leftChild.rightDirectCount < 1) {
      console.log("Error7");

      continue;
    }
    const leftDirects = await prisma.member.findMany({
      where: {
        sponsorId: leftChild.id,
        positionToParent: { in: [LEFT, RIGHT] },
      },
      select: {
        id: true,
        status: true,
        positionToParent: true,
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

      continue;
    }
    LEFT_SIDE = true;
  }

  let RIGHT_SIDE = false;

  for (const rightChild of rightCandidates) {
    const isRightQualified = validStatuses.includes(rightChild.status);
    if (!isRightQualified) {
      console.log("Error6");

      continue;
    }
    if (rightChild.leftDirectCount < 1 || rightChild.rightDirectCount < 1) {
      console.log("Error7");

      continue;
    }
    const rightDirects = await prisma.member.findMany({
      where: {
        sponsorId: rightChild.id,
        positionToParent: { in: [LEFT, RIGHT] },
      },
      select: {
        id: true,
        status: true,
        positionToParent: true,
      },
    });
    const rightHasGoldOrDiamondLeft = rightDirects.find(
      (m) => m.positionToParent === LEFT && validStatuses.includes(m.status)
    );

    const rightHasGoldOrDiamondRight = rightDirects.find(
      (m) => m.positionToParent === RIGHT && validStatuses.includes(m.status)
    );

    if (!rightHasGoldOrDiamondLeft || !rightHasGoldOrDiamondRight) {
      console.log("Error8");

      continue;
    }
    RIGHT_SIDE = true;
  }

  if (LEFT_SIDE && RIGHT_SIDE) {
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
    console.log("✅ L2Sponsor updated with matchingMentorIncomeL2");
    return;
  }

  return;
};

module.exports = { checkMatchingMentorIncomeL2 };
