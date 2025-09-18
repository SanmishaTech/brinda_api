const { PrismaClient, Prisma } = require("@prisma/client");
const prisma = new PrismaClient();
const { z } = require("zod");
const validateRequest = require("../utils/validateRequest");
const dayjs = require("dayjs"); // Import dayjs
const { numberToWords } = require("../utils/numberToWords");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs").promises; // Use promises API
const path = require("path");
const { updateStock } = require("../utils/updateStock");
const logger = require("../utils/logger");
const {
  DIAMOND,
  UPGRADE_WALLET,
  MATCHING_INCOME_WALLET,
  FUND_WALLET,
  SECURITY_DEPOSIT_WALLET,
  DEBIT,
  FRANCHISE_WALLET,
  APPROVED,
  PENDING,
  DELIVERED,
  SECURITY_DEPOSIT_AMOUNT_RANGE_OPTIONS,
  PURCHASE_BILL_DELIVERY_PERCENT,
} = require("../config/data");
const parseDate = require("../utils/parseDate");

/**
 * Get all members without pagination
 */
const getAllFranchise = async (req, res) => {
  try {
    const members = await prisma.member.findMany({
      where: { isFranchise: true },
      select: {
        id: true,
        memberName: true,
        memberUsername: true,
      },
    });

    res.status(200).json(members);
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch franchise",
      details: error.message,
    });
  }
};

const makeFranchise = async (req, res) => {
  const { memberId, influencerId, securityDepositAmount } = req.body;

  try {
    const parsedMemberId = parseInt(memberId);
    const depositAmount = parseFloat(securityDepositAmount);

    // Validate inputs early
    if (isNaN(parsedMemberId) || isNaN(depositAmount)) {
      return res.status(400).json({ message: "Invalid input values" });
    }

    const member = await prisma.member.findUnique({
      where: { id: parsedMemberId },
    });

    const influencer = await prisma.member.findUnique({
      where: { memberUsername: influencerId },
    });

    if (!member) {
      return res.status(500).json({ message: "Member not found" });
    }

    if (member.isFranchise) {
      return res.status(500).json({ message: "Member is already a Franchise" });
    }

    if (!influencer) {
      return res
        .status(500)
        .json({ errors: { message: "Influencer not found" } });
    }

    const depositDecimal = new Prisma.Decimal(depositAmount);
    const depositPending = depositDecimal.minus(
      member.totalSecurityDepositReturn
    );

    const updatedMember = await prisma.member.update({
      where: { id: parsedMemberId },
      data: {
        isFranchise: true,
        securityDepositAmount: depositDecimal,
        securityDepositPending: depositPending,
      },
    });

    // Update influencer's wallet and log the transaction
    await prisma.member.update({
      where: { id: influencer.id },
      data: {
        franchiseWalletBalance: {
          increment: depositAmount * 0.05,
        },
        franchiseIntroductionAmount: {
          increment: depositAmount * 0.05,
        },
        walletTransactions: {
          create: {
            amount: new Prisma.Decimal(depositAmount * 0.05),
            walletType: FRANCHISE_WALLET,
            status: APPROVED,
            type: DEBIT, // FIXED: Was "DEBIT" — this is income to the influencer
            notes: `5% of Security Deposit from Franchise ${member.memberUsername}`,
            transactionDate: new Date(),
          },
        },
      },
    });

    return res.status(201).json({ message: "Franchise created successfully" });
  } catch (error) {
    console.error(error); // Always log the full error for debugging
    return res.status(500).json({
      message: "Failed to create franchise",
      details: error.message,
    });
  }
};
const AddSecurityDepositAmount = async (req, res) => {
  const { memberId, securityDepositAmount } = req.body;

  try {
    const parsedMemberId = parseInt(memberId);
    const depositAmount = parseFloat(securityDepositAmount);

    if (isNaN(parsedMemberId) || isNaN(depositAmount)) {
      return res.status(400).json({ message: "Invalid input" });
    }

    const member = await prisma.member.findUnique({
      where: { id: parsedMemberId },
      select: {
        securityDepositAmount: true,
        totalSecurityDepositReturn: true,
      },
    });

    if (!member) {
      return res.status(404).json({ message: "Member not found" });
    }

    const depositDecimal = new Prisma.Decimal(depositAmount);
    const totalDeposit = member.securityDepositAmount.plus(depositDecimal);
    const totalReturn =
      member.totalSecurityDepositReturn || new Prisma.Decimal(0);
    const depositPending = totalDeposit.minus(totalReturn);

    await prisma.member.update({
      where: { id: parsedMemberId },
      data: {
        securityDepositAmount: totalDeposit,
        securityDepositPending: depositPending,
      },
    });

    return res
      .status(201)
      .json({ message: "Security Deposit amount updated successfully" });
  } catch (error) {
    console.error("Error adding deposit:", error);
    return res.status(500).json({
      message: "Failed to add deposit amount",
      details: error.message,
    });
  }
};

const FranchiseDashboard = async (req, res) => {
  const member = req.user.member;

  try {
    return res.status(200).json({
      securityDepositAmount: member.securityDepositAmount,
      isFranchise: member.isFranchise,
      securityDepositPending: member.securityDepositPending,
      franchiseCommission: member.franchiseCommission,
      securityDepositReturn: member.securityDepositReturn,
      franchiseWalletBalance: member.franchiseWalletBalance,
      securityDepositPercentage: member.securityDepositPercentage,
      franchiseIntroductionAmount: member.franchiseIntroductionAmount,
      repurchaseBillAmount: member.repurchaseBillAmount,
      totalSecurityDepositReturn: member.totalSecurityDepositReturn,
    });
  } catch (error) {
    console.error(error); // Always log the full error for debugging
    return res.status(500).json({
      message: "Failed to get Franchise Dashboard data",
      details: error.message,
    });
  }
};
const deliverProductsToCustomer = async (req, res) => {
  const { invoiceNumber } = req.body;
  const memberId = req?.user?.member?.id;

  try {
    if (!invoiceNumber) {
      return res.status(400).json({
        errors: { message: "Invoice number is required." },
      });
    }

    if (invoiceNumber.startsWith("R")) {
      const repurchase = await prisma.repurchase.findUnique({
        where: { invoiceNumber },
        include: {
          repurchaseDetails: {
            include: { product: true },
          },
        },
      });

      if (!repurchase) {
        return res.status(400).json({
          errors: { message: "Invalid Invoice Number." },
        });
      }

      if (repurchase.status === DELIVERED) {
        return res.status(400).json({
          errors: { message: "Products are already Delivered." },
        });
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // ✅ Check stock availability
      for (const item of repurchase.repurchaseDetails) {
        const totalAvailableStock = await prisma.stock.aggregate({
          _sum: {
            closing_quantity: true,
          },
          where: {
            memberId,
            productId: item.productId,
            expiryDate: {
              gt: today,
            },
            closing_quantity: {
              gt: 0,
            },
          },
        });

        const availableQty = totalAvailableStock._sum.closing_quantity || 0;

        if (availableQty < item.quantity) {
          return res.status(400).json({
            errors: {
              message: `Insufficient stock for product ${item.product.productName}. Required: ${item.quantity}, Available: ${availableQty}`,
            },
          });
        }
      }

      // ✅ Delivery: update stock, record batch details
      for (const item of repurchase.repurchaseDetails) {
        let requiredQty = item.quantity;
        let batchLog = [];

        // Get non-expired stocks ordered by earliest expiry
        const stockBatches = await prisma.stock.findMany({
          where: {
            memberId,
            productId: item.productId,
            expiryDate: {
              gt: today,
            },
            closing_quantity: {
              gt: 0,
            },
          },
          orderBy: {
            expiryDate: "asc",
          },
        });

        for (const stock of stockBatches) {
          if (requiredQty <= 0) break;

          const deductQty = Math.min(requiredQty, stock.closing_quantity);

          // Create StockLedger entry
          await prisma.stockLedger.create({
            data: {
              productId: stock.productId,
              memberId: memberId,
              batchNumber: stock.batchNumber,
              expiryDate: stock.expiryDate,
              received: 0,
              issued: deductQty,
              module: "Product Delivery", // 🔥 Module name
            },
          });

          // Log the batch info
          batchLog.push({
            batchNumber: stock.batchNumber,
            expiryDate: stock.expiryDate,
            quantityUsed: deductQty,
          });

          requiredQty -= deductQty;
        }

        // Update batchDetails field (as JSON)
        await prisma.repurchaseDetail.update({
          where: { id: item.id },
          data: {
            batchDetails: JSON.stringify(batchLog),
          },
        });
      }

      // ✅ Update Purchase as Delivered
      const updatedRepurchase = await prisma.repurchase.update({
        where: { id: repurchase.id },
        data: {
          status: DELIVERED,
          deliveredAt: new Date(),
          deliveredBy: memberId,
        },
      });

      await updateStock();

      //  repurchase commission start.
    } else {
      const purchase = await prisma.purchase.findUnique({
        where: { invoiceNumber },
        include: {
          purchaseDetails: {
            include: { product: true },
          },
        },
      });

      if (!purchase) {
        return res.status(400).json({
          errors: { message: "Invalid Invoice Number." },
        });
      }

      if (purchase.status === DELIVERED) {
        return res.status(400).json({
          errors: { message: "Products are already Delivered." },
        });
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // ✅ Check stock availability
      for (const item of purchase.purchaseDetails) {
        const totalAvailableStock = await prisma.stock.aggregate({
          _sum: {
            closing_quantity: true,
          },
          where: {
            memberId,
            productId: item.productId,
            expiryDate: {
              gt: today,
            },
            closing_quantity: {
              gt: 0,
            },
          },
        });

        const availableQty = totalAvailableStock._sum.closing_quantity || 0;

        if (availableQty < item.quantity) {
          return res.status(400).json({
            errors: {
              message: `Insufficient stock for product ${item.product.productName}. Required: ${item.quantity}, Available: ${availableQty}`,
            },
          });
        }
      }

      // ✅ Delivery: update stock, record batch details
      for (const item of purchase.purchaseDetails) {
        let requiredQty = item.quantity;
        let batchLog = [];

        // Get non-expired stocks ordered by earliest expiry
        const stockBatches = await prisma.stock.findMany({
          where: {
            memberId,
            productId: item.productId,
            expiryDate: {
              gt: today,
            },
            closing_quantity: {
              gt: 0,
            },
          },
          orderBy: {
            expiryDate: "asc",
          },
        });

        for (const stock of stockBatches) {
          if (requiredQty <= 0) break;

          const deductQty = Math.min(requiredQty, stock.closing_quantity);

          // Create StockLedger entry
          await prisma.stockLedger.create({
            data: {
              productId: stock.productId,
              memberId: memberId,
              batchNumber: stock.batchNumber,
              expiryDate: stock.expiryDate,
              received: 0,
              issued: deductQty,
              module: "Product Delivery", // 🔥 Module name
            },
          });

          // Log the batch info
          batchLog.push({
            batchNumber: stock.batchNumber,
            expiryDate: stock.expiryDate,
            quantityUsed: deductQty,
          });

          requiredQty -= deductQty;
        }

        // Update batchDetails field (as JSON)
        await prisma.purchaseDetail.update({
          where: { id: item.id },
          data: {
            batchDetails: JSON.stringify(batchLog),
          },
        });
      }

      // ✅ Update Purchase as Delivered
      const updatedPurchase = await prisma.purchase.update({
        where: { id: purchase.id },
        data: {
          status: DELIVERED,
          deliveredAt: new Date(),
          deliveredBy: memberId,
        },
      });

      await updateStock();

      // commission start.

      const purchaseAmount = new Prisma.Decimal(
        updatedPurchase.totalAmountWithGst
      );
      const commissionToGive =
        purchaseAmount * (PURCHASE_BILL_DELIVERY_PERCENT / 100);

      const updatedMember = await prisma.member.update({
        where: { id: memberId },
        data: {
          franchiseCommission: { increment: commissionToGive },
          franchiseWalletBalance: { increment: commissionToGive },
          walletTransactions: {
            create: {
              amount: new Prisma.Decimal(commissionToGive),
              walletType: FRANCHISE_WALLET,
              status: APPROVED,
              type: DEBIT, // FIXED: Was "DEBIT" — this is income to the influencer
              notes: `Franchise Commission For Invoice ${updatedPurchase.invoiceNumber}`,
              transactionDate: new Date(),
            },
          },
        },
      });
    }

    return res.status(201).json({
      message: "Products Delivered Successfully.",
    });
  } catch (error) {
    console.error("Error delivering products:", error);
    return res.status(500).json({
      errors: {
        message: "Failed to Deliver Products",
        details: error.message,
      },
    });
  }
};

module.exports = {
  getAllFranchise,
  makeFranchise,
  AddSecurityDepositAmount,
  FranchiseDashboard,
  deliverProductsToCustomer,
};
