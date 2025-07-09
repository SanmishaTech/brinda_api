const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { GOLD, DIAMOND, LEFT, RIGHT } = require("../config/data");

const checkMatchingMentorIncomeL2 = async (parent, value) => {
  const L1SponsorId = parent?.sponsor?.id;
  console.log("inside l2 function");

  if (!L1SponsorId) {
    console.log("Error1: L1 sponsor not found");
    return;
  }

  const L1Sponsor = await prisma.member.findUnique({
    where: { id: L1SponsorId },
    include: {
      sponsor: true,
    },
  });

  const L2SponsorId = L1Sponsor?.sponsor?.id;

  if (!L2SponsorId) {
    console.log("Error2: L2 sponsor not found");
    return;
  }

  const L2Sponsor = await prisma.member.findUnique({
    where: { id: L2SponsorId },
    include: {
      sponsorChildren: true,
    },
  });

  if (
    !L2Sponsor ||
    !L2Sponsor.sponsorChildren ||
    L2Sponsor.sponsorChildren.length < 2
  ) {
    console.log("Error3: L2 sponsor does not have enough sponsorChildren");
    return;
  }

  if (![GOLD, DIAMOND].includes(L2Sponsor.status)) {
    console.log("Error4: L2 sponsor not GOLD or DIAMOND");
    return;
  }

  if (L2Sponsor.isMatchingMentorL2) {
    // ✅ Already eligible, just increment income if value > 0
    await prisma.member.update({
      where: { id: L2Sponsor.id },
      data: {
        ...(value > 0 && {
          matchingMentorIncomeL2: { increment: value * 0.4 },
        }),
      },
    });
    console.log("Income incremented for already eligible L2 sponsor");
    return;
  }

  const validStatuses = [GOLD, DIAMOND];

  const leftCandidates = L2Sponsor.sponsorChildren.filter(
    (child) => child.positionToParent === LEFT
  );

  const rightCandidates = L2Sponsor.sponsorChildren.filter(
    (child) => child.positionToParent === RIGHT
  );

  for (const leftChild of leftCandidates) {
    for (const rightChild of rightCandidates) {
      const isLeftQualified = validStatuses.includes(leftChild.status);
      const isRightQualified = validStatuses.includes(rightChild.status);

      if (!isLeftQualified || !isRightQualified) {
        continue;
      }

      // Check if leftChild has both left and right directs
      if (leftChild.leftDirectCount < 1 || leftChild.rightDirectCount < 1) {
        continue;
      }

      const leftDirects = await prisma.member.findMany({
        where: {
          sponsorId: leftChild.id,
          positionToParent: { in: [LEFT, RIGHT] },
        },
      });

      const leftHasQualifiedLeft = leftDirects.find(
        (m) => m.positionToParent === LEFT && validStatuses.includes(m.status)
      );
      const leftHasQualifiedRight = leftDirects.find(
        (m) => m.positionToParent === RIGHT && validStatuses.includes(m.status)
      );

      if (!leftHasQualifiedLeft || !leftHasQualifiedRight) {
        continue;
      }

      // Check if rightChild has both left and right directs
      if (rightChild.leftDirectCount < 1 || rightChild.rightDirectCount < 1) {
        continue;
      }

      const rightDirects = await prisma.member.findMany({
        where: {
          sponsorId: rightChild.id,
          positionToParent: { in: [LEFT, RIGHT] },
        },
      });

      const rightHasQualifiedLeft = rightDirects.find(
        (m) => m.positionToParent === LEFT && validStatuses.includes(m.status)
      );
      const rightHasQualifiedRight = rightDirects.find(
        (m) => m.positionToParent === RIGHT && validStatuses.includes(m.status)
      );

      if (!rightHasQualifiedLeft || !rightHasQualifiedRight) {
        continue;
      }

      // ✅ All checks passed, update L2 sponsor
      await prisma.member.update({
        where: { id: L2Sponsor.id },
        data: {
          isMatchingMentorL2: true,
          ...(value > 0 && {
            matchingMentorIncomeL2: { increment: value * 0.4 },
          }),
        },
      });

      console.log(
        "✅ MatchingMentorL2 eligibility granted and income updated."
      );
      return;
    }
  }

  console.log("❌ No valid left-right sponsorChildren pair found");
  return;
};

module.exports = { checkMatchingMentorIncomeL2 };
