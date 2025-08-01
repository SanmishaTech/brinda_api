const { PrismaClient, Prisma } = require("@prisma/client");
const { CASHBACK_PERCENT, DIAMOND } = require("../config/data");
const logger = require("./logger");
const prisma = new PrismaClient();

const applyRepurchaseCashback = async (member, totalAmountWithGst) => {
  logger.info(`Starting cashback calculation for member ID: ${member.id}`);

  const updatedAmount =
    (parseFloat(totalAmountWithGst) * CASHBACK_PERCENT) / 100;
  logger.info(`Calculated updatedAmount: ${updatedAmount}`);

  const cashbackAmount = (updatedAmount * parseFloat(member.percentage)) / 100;
  logger.info(`Calculated cashbackAmount: ${cashbackAmount}`);

  const query = {};
  if (member.status === DIAMOND) {
    query.repurchaseWalletBalance = {
      increment: new Prisma.Decimal(cashbackAmount),
    };
    logger.info(`Member is DIAMOND, incrementing repurchaseWalletBalance`);
  } else {
    query.upgradeWalletBalance = {
      increment: new Prisma.Decimal(cashbackAmount),
    };
    logger.info(`Member is not DIAMOND, incrementing upgradeWalletBalance`);
  }

  member = await prisma.member.update({
    where: { id: member.id },
    data: {
      ...query,
    },
  });
  logger.info(
    `Successfully updated member wallet balance for member ID: ${member.id}`
  );

  return member;
};

module.exports = { applyRepurchaseCashback };
