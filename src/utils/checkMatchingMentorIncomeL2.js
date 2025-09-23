const { PrismaClient } = require("@prisma/client");
const prisma = require("../config/db");
const {
  GOLD,
  DIAMOND,
  LEFT,
  RIGHT,
  HOLD_WALLET,
  APPROVED,
  DEBIT,
} = require("../config/data");
const calculateLoan = require("./calculateLoan");
const checkMatchingMentorIncomeL2 = async (parent, value) => {
  const L1SponsorId = parent?.sponsor?.id;
  if (!L1SponsorId) {
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
      percentage: true,
    },
  });

  if (
    !L2Sponsor ||
    ![GOLD, DIAMOND].includes(L2Sponsor.status) ||
    !L2Sponsor.is2_1Pass ||
    !L2Sponsor.isDirectMatch
  ) {
    return;
  }

  if (L2Sponsor.isMatchingMentorL2) {
    // start
    var commissionToGive = value * 0.4;
    const percentage = parseFloat(L2Sponsor.percentage);
    if (!isNaN(percentage) && percentage > 0 && percentage < 100) {
      commissionToGive = parseFloat(
        ((commissionToGive * percentage) / 100).toFixed(2)
      );
    } else if (percentage === 0) {
      commissionToGive = 0;
    }
    // end
    if (commissionToGive > 0) {
      let memberData = await prisma.member.update({
        where: { id: L2Sponsor.id },
        data: {
          matchingMentorIncomeL2: { increment: commissionToGive },
          holdWalletBalance: { increment: commissionToGive },
          walletTransactions: {
            create: {
              amount: commissionToGive,
              status: APPROVED,
              type: DEBIT,
              transactionDate: new Date(),
              walletType: HOLD_WALLET,
              notes: `Matching Mentor Income L2 (₹${commissionToGive})`,
            },
          },
        },
      });

      memberData = await calculateLoan(
        commissionToGive,
        memberData,
        HOLD_WALLET,
        "MMI_L2"
      );
    }

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
    return;
  }

  // end

  // working
  let LEFT_SIDE = false;

  const validStatuses = [GOLD, DIAMOND];

  for (const leftChild of leftCandidates) {
    const isLeftQualified = validStatuses.includes(leftChild.status);
    if (!isLeftQualified) {
      continue;
    }
    if (leftChild.leftDirectCount < 1 || leftChild.rightDirectCount < 1) {
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
      continue;
    }
    LEFT_SIDE = true;
  }

  let RIGHT_SIDE = false;

  for (const rightChild of rightCandidates) {
    const isRightQualified = validStatuses.includes(rightChild.status);
    if (!isRightQualified) {
      continue;
    }
    if (rightChild.leftDirectCount < 1 || rightChild.rightDirectCount < 1) {
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
      continue;
    }
    RIGHT_SIDE = true;
  }

  if (LEFT_SIDE && RIGHT_SIDE) {
    // ✅ Update L2Sponsor
    // start
    var commissionToGive = value * 0.4;
    const percentage = parseFloat(L2Sponsor.percentage);
    if (!isNaN(percentage) && percentage > 0 && percentage < 100) {
      commissionToGive = parseFloat(
        ((commissionToGive * percentage) / 100).toFixed(2)
      );
    } else if (percentage === 0) {
      commissionToGive = 0;
    }
    // end
    let memberData = await prisma.member.update({
      where: { id: L2Sponsor.id },
      data: {
        isMatchingMentorL2: true,
        ...(commissionToGive > 0 && {
          matchingMentorIncomeL2: { increment: commissionToGive },
          holdWalletBalance: { increment: commissionToGive },
          walletTransactions: {
            create: {
              amount: commissionToGive,
              status: APPROVED,
              type: DEBIT,
              transactionDate: new Date(),
              walletType: HOLD_WALLET,
              notes: `Matching Mentor Income L2 (₹${commissionToGive})`,
            },
          },
        }),
      },
    });
    if (parseFloat(commissionToGive) > 0) {
      memberData = await calculateLoan(
        commissionToGive,
        memberData,
        HOLD_WALLET,
        "MMI_L2"
      );
    }
    return;
  }

  return;
};

module.exports = { checkMatchingMentorIncomeL2 };
