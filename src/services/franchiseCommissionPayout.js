const { PrismaClient, Prisma } = require("@prisma/client");
const prisma = require("../config/db");
const {
  TDS_PERCENT,
  PLATFORM_CHARGE_PERCENT,
  CREDIT,
  APPROVED,
  PENDING,
  FRANCHISE_WALLET,
} = require("../config/data");
const logger = require("../utils/logger");

const franchiseCommissionPayout = async () => {
  try {
    const calculateTDS = process.env.CALCULATE_TDS === "true";

    const members = await prisma.member.findMany({
      select: {
        id: true,
        isFranchise: true,
        securityDepositAmount: true,
        securityDepositPending: true,
        franchiseCommission: true,
        securityDepositReturn: true,
        franchiseWalletBalance: true,
        securityDepositPercentage: true,
        franchiseIntroductionAmount: true,
        repurchaseBillAmount: true,
        totalSecurityDepositReturn: true,
        franchiseIncomeEarned: true,
      },
      where: {
        franchiseWalletBalance: {
          gt: new Prisma.Decimal(0),
        },
      },
    });

    if (members.length === 0) {
      logger.info("No eligible members.");
      return;
    }

    for (const member of members) {
      const franchiseCommission = new Prisma.Decimal(
        member.franchiseCommission
      );

      const securityDepositReturn = new Prisma.Decimal(
        member.securityDepositReturn
      );

      const franchiseIntroductionAmount = new Prisma.Decimal(
        member.franchiseIntroductionAmount
      );

      const repurchaseBillAmountToSponsor = new Prisma.Decimal(
        member.repurchaseBillAmount
      );

      const totalTaxableAmount = franchiseIntroductionAmount.add(
        repurchaseBillAmountToSponsor
      );

      const TDS_PERCENT_USED = new Prisma.Decimal(
        calculateTDS ? TDS_PERCENT : 0
      );
      const platformChargePercentDecimal = new Prisma.Decimal(
        PLATFORM_CHARGE_PERCENT
      );

      const TDSAmount = totalTaxableAmount
        .mul(TDS_PERCENT_USED)
        .div(new Prisma.Decimal(100));
      const platformChargeAmount = totalTaxableAmount
        .mul(platformChargePercentDecimal)
        .div(new Prisma.Decimal(100));

      const taxableAmountToGive = totalTaxableAmount
        .sub(TDSAmount)
        .sub(platformChargeAmount);

      const totalAmountBeforeDeduction = franchiseIntroductionAmount
        .add(repurchaseBillAmountToSponsor)
        .add(franchiseCommission)
        .add(securityDepositReturn);

      const totalAmountToGive = taxableAmountToGive
        .add(franchiseCommission)
        .add(securityDepositReturn);

      await prisma.walletTransaction.createMany({
        data: [
          ...(parseFloat(TDSAmount) > 0
            ? [
                {
                  memberId: member.id,
                  amount: new Prisma.Decimal(TDSAmount),
                  type: CREDIT,
                  transactionDate: new Date(),
                  status: APPROVED,
                  walletType: FRANCHISE_WALLET,
                  notes: `${TDS_PERCENT_USED}% TDS Amount Deducted From Franchise Wallet.`,
                },
              ]
            : []),
          ...(parseFloat(platformChargeAmount) > 0
            ? [
                {
                  memberId: member.id,
                  amount: new Prisma.Decimal(platformChargeAmount),
                  type: CREDIT,
                  transactionDate: new Date(),
                  status: APPROVED,
                  walletType: FRANCHISE_WALLET,
                  notes: `${PLATFORM_CHARGE_PERCENT}% Platform Change Deducted From Franchise Wallet.`,
                },
              ]
            : []),
        ],
      });

      await prisma.member.update({
        where: { id: member.id },
        data: {
          franchiseCommission: new Prisma.Decimal(0),
          securityDepositReturn: new Prisma.Decimal(0),
          franchiseIntroductionAmount: new Prisma.Decimal(0),
          repurchaseBillAmount: new Prisma.Decimal(0),

          franchiseWalletBalance: {
            decrement: new Prisma.Decimal(totalAmountBeforeDeduction),
          },
          franchiseIncomeCommissions: {
            create: {
              franchiseCommission: new Prisma.Decimal(franchiseCommission),
              securityDepositReturn: new Prisma.Decimal(securityDepositReturn),
              franchiseIntroductionAmount: new Prisma.Decimal(
                franchiseIntroductionAmount
              ),
              repurchaseBillAmountToSponsor: new Prisma.Decimal(
                repurchaseBillAmountToSponsor
              ),

              TDSPercent: TDS_PERCENT_USED,
              TDSAmount: new Prisma.Decimal(TDSAmount),
              platformChargePercent: PLATFORM_CHARGE_PERCENT,
              platformChargeAmount: new Prisma.Decimal(platformChargeAmount),
              totalAmountBeforeDeduction: new Prisma.Decimal(
                totalAmountBeforeDeduction
              ),
              totalAmountToGive: new Prisma.Decimal(totalAmountToGive),
              isPaid: false,
              createdAt: new Date(),
              walletTransaction: {
                create: {
                  memberId: member.id,
                  amount: new Prisma.Decimal(totalAmountToGive),
                  type: CREDIT,
                  transactionDate: new Date(),
                  status: PENDING,
                  walletType: FRANCHISE_WALLET,
                  notes: "Transferring Franchise Wallet Amount To your Bank.",
                },
              },
            },
          },
        },
      });

      // loop end
    }
    logger.info(
      `Total members to process for franchise payout: ${members.length}`
    );
  } catch (error) {
    console.error("Error in franchiseCommissionPayout:", error);
  }
};

module.exports = { franchiseCommissionPayout };
