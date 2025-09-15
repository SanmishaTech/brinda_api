const { PrismaClient, Prisma } = require("@prisma/client");
const prisma = new PrismaClient();
const { z } = require("zod");
const validateRequest = require("../utils/validateRequest");
const dayjs = require("dayjs"); // Import dayjs
const { numberToWords } = require("../utils/numberToWords");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs").promises; // Use promises API
const path = require("path");
const logger = require("../utils/logger");
const {
  DIAMOND,
  UPGRADE_WALLET,
  MATCHING_INCOME_WALLET,
  FUND_WALLET,
} = require("../config/data");
const parseDate = require("../utils/parseDate");
const { updateStock } = require("../utils/updateStock");

const decimalString = (fieldName, maxDigits, decimalPlaces) =>
  z
    .string()
    .nonempty(`${fieldName} is required.`)
    .refine(
      (val) => {
        const regex = new RegExp(
          `^\\d{1,${maxDigits - decimalPlaces}}(\\.\\d{1,${decimalPlaces}})?$`
        );
        return regex.test(val);
      },
      {
        message: `${fieldName} must be a valid number with up to ${decimalPlaces} decimal places.`,
      }
    );

// Get all purchases with pagination, sorting, and search
const getAdminPurchases = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const search = req.query.search || "";
  const sortBy = req.query.sortBy || "id";
  const sortOrder = req.query.sortOrder === "desc" ? "desc" : "asc";

  try {
    const whereClause = {
      invoiceNumber: { contains: search },
    };

    const adminPurchases = await prisma.adminPurchase.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        adminPurchaseDetails: true, // Include admin purchase details
      },
    });

    const totalAdminPurchases = await prisma.adminPurchase.count({
      where: whereClause,
    });
    const totalPages = Math.ceil(totalAdminPurchases / limit);

    res.json({
      adminPurchases,
      page,
      totalPages,
      totalAdminPurchases,
    });
  } catch (error) {
    return res.status(500).json({
      errors: {
        message: "Failed to fetch admin purchases",
        details: error.message,
      },
    });
  }
};

// Create a new admin purchase
const createAdminPurchase = async (req, res) => {
  const schema = z.object({
    totalAmountWithoutGst: decimalString("Total Amount Without GST", 10, 2),
    totalAmountWithGst: decimalString("Total Amount With GST", 10, 2),
    totalGstAmount: decimalString("Total GST Amount", 10, 2),
  });

  const validationErrors = await validateRequest(schema, req.body, res);
  try {
    const {
      totalAmountWithoutGst,
      totalAmountWithGst,
      totalGstAmount,
      adminPurchaseDetails,
      purchaseDate,
      invoiceDate,
      invoiceNumber,
      receivedDate,
    } = req.body;

    const newAdminPurchase = await prisma.adminPurchase.create({
      data: {
        invoiceNumber: invoiceNumber,
        invoiceDate: parseDate(invoiceDate),
        purchaseDate: parseDate(purchaseDate),
        receivedDate: parseDate(receivedDate),
        totalAmountWithoutGst: new Prisma.Decimal(totalAmountWithoutGst),
        totalAmountWithGst: new Prisma.Decimal(totalAmountWithGst),
        totalGstAmount: new Prisma.Decimal(totalGstAmount),
        adminPurchaseDetails: {
          create: adminPurchaseDetails.map((detail) => ({
            productId: parseInt(detail.productId),
            quantity: detail.quantity,
            rate: new Prisma.Decimal(detail.rate),
            batchNumber: detail.batchNumber,
            expiryDate: parseDate(detail.expiryDate),
            netUnitRate: new Prisma.Decimal(detail.netUnitRate),
            cgstPercent: new Prisma.Decimal(detail.cgstPercent),
            sgstPercent: new Prisma.Decimal(detail.sgstPercent),
            igstPercent: new Prisma.Decimal(detail.igstPercent),
            cgstAmount: new Prisma.Decimal(detail.cgstAmount),
            sgstAmount: new Prisma.Decimal(detail.sgstAmount),
            igstAmount: new Prisma.Decimal(detail.igstAmount),
            amountWithoutGst: new Prisma.Decimal(detail.amountWithoutGst),
            amountWithGst: new Prisma.Decimal(detail.amountWithGst),
          })),
        },
        stockLedgers: {
          create: adminPurchaseDetails.map((detail) => ({
            memberId: null,
            productId: parseInt(detail.productId),
            batchNumber: detail.batchNumber,
            invoiceNumber: invoiceNumber,
            expiryDate: parseDate(detail.expiryDate),
            module: `Purchase`,
            received: parseInt(detail.quantity),
            issued: 0,
          })),
        },
      },
      select: {
        id: true,
        stockLedgers: true,
      },
    });

    for (const detail of newAdminPurchase.stockLedgers) {
      const existingStock = await prisma.stock.findFirst({
        where: {
          memberId: null,
          productId: detail.productId,
          batchNumber: detail.batchNumber,
          expiryDate: detail.expiryDate,
        },
      });

      if (existingStock) {
        // Update the existing stock
        await prisma.stock.update({
          where: {
            id: existingStock.id,
          },
          data: {
            closing_quantity: {
              increment: detail.received,
            },
          },
        });
      } else {
        // Create new stock record
        await prisma.stock.create({
          data: {
            memberId: null,
            productId: detail.productId,
            batchNumber: detail.batchNumber,
            invoiceNumber: invoiceNumber,
            expiryDate: detail.expiryDate,
            closing_quantity: detail.received,
          },
        });
      }
    }

    return res
      .status(201)
      .json({ message: "Created Admin Purchase successfully." });
  } catch (error) {
    logger.info(error);
    return res.status(500).json({
      errors: {
        message: "Failed to create admin purchase",
        details: error.message,
      },
    });
  }
};

// Create a new admin purchase
const updateAdminPurchase = async (req, res) => {
  const schema = z.object({
    totalAmountWithoutGst: decimalString("Total Amount Without GST", 10, 2),
    totalAmountWithGst: decimalString("Total Amount With GST", 10, 2),
    totalGstAmount: decimalString("Total GST Amount", 10, 2),
  });
  const { adminPurchaseId } = req.params;

  const validationErrors = await validateRequest(schema, req.body, res);
  const {
    totalAmountWithoutGst,
    totalAmountWithGst,
    totalGstAmount,
    adminPurchaseDetails,
    purchaseDate,
    invoiceDate,
    invoiceNumber,
    receivedDate,
  } = req.body;

  try {
    const adminPurchase = await prisma.adminPurchase.findUnique({
      where: { id: parseInt(adminPurchaseId) },
      select: { id: true },
    });

    if (!adminPurchase.id) {
      return res
        .status(404)
        .json({ errors: { message: "Admin Purchase not found" } });
    }

    await prisma.adminPurchaseDetail.deleteMany({
      where: {
        adminPurchaseId: parseInt(adminPurchase.id, 10),
      },
    });

    await prisma.stockLedger.deleteMany({
      where: {
        adminPurchaseId: parseInt(adminPurchase.id, 10),
      },
    });

    const newAdminPurchase = await prisma.adminPurchase.update({
      where: { id: parseInt(adminPurchase.id) },
      data: {
        invoiceNumber: invoiceNumber,
        invoiceDate: parseDate(invoiceDate),
        purchaseDate: parseDate(purchaseDate),
        receivedDate: parseDate(receivedDate),
        totalAmountWithoutGst: new Prisma.Decimal(totalAmountWithoutGst),
        totalAmountWithGst: new Prisma.Decimal(totalAmountWithGst),
        totalGstAmount: new Prisma.Decimal(totalGstAmount),
        adminPurchaseDetails: {
          create: adminPurchaseDetails.map((detail) => ({
            productId: parseInt(detail.productId),
            quantity: detail.quantity,
            rate: new Prisma.Decimal(detail.rate),
            batchNumber: detail.batchNumber,
            expiryDate: parseDate(detail.expiryDate),
            netUnitRate: new Prisma.Decimal(detail.netUnitRate),
            cgstPercent: new Prisma.Decimal(detail.cgstPercent),
            sgstPercent: new Prisma.Decimal(detail.sgstPercent),
            igstPercent: new Prisma.Decimal(detail.igstPercent),
            cgstAmount: new Prisma.Decimal(detail.cgstAmount),
            sgstAmount: new Prisma.Decimal(detail.sgstAmount),
            igstAmount: new Prisma.Decimal(detail.igstAmount),
            amountWithoutGst: new Prisma.Decimal(detail.amountWithoutGst),
            amountWithGst: new Prisma.Decimal(detail.amountWithGst),
          })),
        },
        stockLedgers: {
          create: adminPurchaseDetails.map((detail) => ({
            memberId: null,
            productId: parseInt(detail.productId),
            batchNumber: detail.batchNumber,
            expiryDate: parseDate(detail.expiryDate),
            invoiceNumber: invoiceNumber,
            received: parseInt(detail.quantity),
            issued: 0,
            module: `Purchase`,
          })),
        },
      },
      select: {
        id: true,
        stockLedgers: true,
      },
    });

    for (const detail of newAdminPurchase.stockLedgers) {
      const existingStock = await prisma.stock.findFirst({
        where: {
          memberId: null,
          productId: detail.productId,
          batchNumber: detail.batchNumber,
          expiryDate: detail.expiryDate,
        },
      });

      if (!existingStock) {
        // Create new stock record
        await prisma.stock.create({
          data: {
            memberId: null,
            productId: detail.productId,
            batchNumber: detail.batchNumber,
            expiryDate: detail.expiryDate,
            closing_quantity: detail.received,
          },
        });
      }
    }

    await updateStock(adminPurchaseDetails);

    return res
      .status(201)
      .json({ message: "Updated Admin Purchase successfully." });
  } catch (error) {
    logger.info(error);
    return res.status(500).json({
      errors: {
        message: "Failed to update admin purchase",
        details: error.message,
      },
    });
  }
};

// Get a purchase by ID
const getAdminPurchaseById = async (req, res) => {
  const { adminPurchaseId } = req.params;

  try {
    const adminPurchase = await prisma.adminPurchase.findUnique({
      where: { id: parseInt(adminPurchaseId, 10) },
      include: {
        adminPurchaseDetails: true, // Include purchase details
      },
    });

    if (!adminPurchase) {
      return res
        .status(404)
        .json({ errors: { message: "Admin Purchase not found" } });
    }

    res.status(200).json(adminPurchase);
  } catch (error) {
    res.status(500).json({
      errors: {
        message: "Failed to fetch admin purchase",
        details: error.message,
      },
    });
  }
};

module.exports = {
  getAdminPurchases,
  createAdminPurchase,
  updateAdminPurchase,
  getAdminPurchaseById,
};
