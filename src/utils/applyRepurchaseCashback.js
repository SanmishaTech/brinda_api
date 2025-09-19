const { PrismaClient, Prisma } = require("@prisma/client");
const {
  CASHBACK_PERCENT,
  DIAMOND,
  APPROVED,
  DEBIT,
  HOLD_WALLET,
} = require("../config/data");
const logger = require("./logger");
const prisma = require("../config/db");

const applyRepurchaseCashback = async (member, totalAmountWithGst) => {
  logger.info(`Starting cashback calculation for member ID: ${member.id}`);

  const updatedAmount =
    (parseFloat(totalAmountWithGst) * CASHBACK_PERCENT) / 100;
  logger.info(`Calculated updatedAmount: ${updatedAmount}`);

  // const cashbackAmount = (updatedAmount * parseFloat(member.percentage)) / 100;
  // logger.info(`Calculated cashbackAmount: ${cashbackAmount}`);

  const cashbackAmount = updatedAmount;
  // not using member.percentage on cashback on 10 sept 2025 as per new decision
  member = await prisma.member.update({
    where: { id: member.id },
    data: {
      repurchaseCashbackIncome: {
        increment: new Prisma.Decimal(cashbackAmount),
      },
      holdWalletBalance: { increment: new Prisma.Decimal(cashbackAmount) },
      walletTransactions: {
        create: {
          amount: new Prisma.Decimal(cashbackAmount),
          status: APPROVED,
          type: DEBIT,
          transactionDate: new Date(),
          walletType: HOLD_WALLET,
          notes: `${CASHBACK_PERCENT}% Repurchase Cashback Income (₹${cashbackAmount})`,
        },
      },
    },
  });

  logger.info(
    `Successfully updated member wallet balance for member ID: ${member.id}`
  );

  return member;
};

module.exports = { applyRepurchaseCashback };
