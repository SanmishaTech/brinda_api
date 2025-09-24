const { Prisma } = require("@prisma/client");
const prisma = require("../config/db");
const {
  APPROVED,
  DEBIT,
  CREDIT,
  INACTIVE,
  MATCHING_INCOME_WALLET,
} = require("../config/data");
const calculateLoan = require("./calculateLoan");
const logger = require("./logger");
const distributePurchaseCashback = async (purchaseAmount, memberId) => {
  const parsedPurchaseAmount = new Prisma.Decimal(purchaseAmount || 0);
  // logger.info(`amount 1 = ${parsedPurchaseAmount}`);

  // member logic

  let member = await prisma.member.findUnique({
    where: { id: memberId },
    include: {
      parent: true,
      sponsor: true,
    },
  });

  member = await prisma.member.update({
    where: { id: member.id },
    data: {
      totalPurchaseAmount: {
        increment: new Prisma.Decimal(parsedPurchaseAmount),
      },
      pendingPurchaseAmount: {
        increment: new Prisma.Decimal(parsedPurchaseAmount),
      },
    },
    include: {
      parent: true,
      sponsor: true,
    },
  });
  // member logic

  if (!member?.sponsorId) {
    return member;
  }

  let sponsor = await prisma.member.findUnique({
    where: { id: member.sponsorId },
    include: {
      parent: true,
      sponsor: true,
    },
  });

  if (sponsor.status === INACTIVE) {
    return member;
  }

  const sponsorReferralCount = await prisma.member.count({
    where: {
      sponsorId: member.sponsorId,
      status: { not: INACTIVE }, // 👈 string literal
    },
  });

  if (sponsorReferralCount === 0) {
    return member;
  }

  let percentage = new Prisma.Decimal(0);

  if (sponsorReferralCount === 1) {
    percentage = new Prisma.Decimal(10);
  } else if (sponsorReferralCount === 2) {
    percentage = new Prisma.Decimal(20);
  } else if (sponsorReferralCount === 3) {
    percentage = new Prisma.Decimal(30);
  } else if (sponsorReferralCount >= 4) {
    percentage = new Prisma.Decimal(40);
  }

  // Skip if either commission or pending loan is zero
  if (parsedPurchaseAmount.isZero()) {
    return member;
  }

  let commissionToGive = parsedPurchaseAmount.mul(percentage).div(100);
  // logger.info(`amount 2 = ${commissionToGive}`);

  // Apply the sponsor's percentage cut
  commissionToGive = commissionToGive
    .mul(new Prisma.Decimal(sponsor.percentage))
    .div(100);
  // logger.info(`amount 3 = ${commissionToGive}`);

  commissionToGive = Math.min(
    commissionToGive.toNumber(), // Convert commissionToGive to a regular number
    sponsor.pendingPurchaseAmount.toNumber() // Convert pendingPurchaseAmount to a regular number
  );
  // logger.info(`amount 4 = ${commissionToGive}`);

  commissionToGive = new Prisma.Decimal(commissionToGive);
  // logger.info(`amount 5 = ${commissionToGive}`);

  // logger.info();
  if (parseFloat(commissionToGive) > 0) {
    sponsor = await prisma.member.update({
      where: { id: sponsor.id },
      data: {
        matchingIncomeWalletBalance: {
          increment: new Prisma.Decimal(commissionToGive),
        },
        collectedPurchaseAmount: {
          increment: new Prisma.Decimal(commissionToGive),
        },
        walletTransactions: {
          create: {
            amount: new Prisma.Decimal(commissionToGive),
            walletType: MATCHING_INCOME_WALLET,
            status: APPROVED,
            type: DEBIT,
            notes: `Cashback for sponsor's product purchase`,
            transactionDate: new Date(),
          },
        },
      },
      include: {
        parent: true,
        sponsor: true,
      },
    });

    sponsor = await calculateLoan(
      commissionToGive,
      sponsor,
      MATCHING_INCOME_WALLET,
      "PURCHASE_CASHBACK"
    );

    sponsor = await prisma.member.update({
      where: { id: sponsor.id },
      data: {
        pendingPurchaseAmount:
          parseFloat(sponsor.totalPurchaseAmount) -
          parseFloat(sponsor.collectedPurchaseAmount),
      },
    });
  }

  // end

  return member;
};

module.exports = distributePurchaseCashback;
