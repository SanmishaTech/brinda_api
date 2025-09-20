const { PrismaClient, Prisma } = require("@prisma/client");
const prisma = require("../config/db");
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
const ExcelJS = require("exceljs");

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
// const getAdminPurchases = async (req, res) => {
//   const page = parseInt(req.query.page) || 1;
//   const limit = parseInt(req.query.limit) || 10;
//   const skip = (page - 1) * limit;
//   const search = req.query.search || "";
//   const sortBy = req.query.sortBy || "id";
//   const sortOrder = req.query.sortOrder === "desc" ? "desc" : "asc";

//   try {
//     const whereClause = {
//       // invoiceNumber: { contains: search },
//     };

//     const adminPurchases = await prisma.adminPurchase.findMany({
//       where: whereClause,
//       skip,
//       take: limit,
//       orderBy: { [sortBy]: sortOrder },
//       include: {
//         adminPurchaseDetails: true, // Include admin purchase details
//       },
//     });

//     const totalAdminPurchases = await prisma.adminPurchase.count({
//       where: whereClause,
//     });
//     const totalPages = Math.ceil(totalAdminPurchases / limit);

//     res.json({
//       adminPurchases,
//       page,
//       totalPages,
//       totalAdminPurchases,
//     });
//   } catch (error) {
//     return res.status(500).json({
//       errors: {
//         message: "Failed to fetch admin purchases",
//         details: error.message,
//       },
//     });
//   }
// };

const getAdminPurchases = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const sortBy = req.query.sortBy || "id";
  const sortOrder = req.query.sortOrder === "desc" ? "desc" : "asc";
  const exportToExcel = req.query.export === "true";
  const search = req.query.search || "";

  const whereClause = {
    // Add filters if needed
    invoiceNumber: { contains: search },
  };

  try {
    const adminPurchases = await prisma.adminPurchase.findMany({
      where: whereClause,
      skip: exportToExcel ? undefined : skip,
      take: exportToExcel ? undefined : limit,
      orderBy: exportToExcel ? undefined : { [sortBy]: sortOrder },
      include: {
        adminPurchaseDetails: {
          include: {
            product: true, // Get productName
          },
        },
      },
    });

    if (exportToExcel) {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Admin Purchases");

      // Headers for every field from both models
      worksheet.columns = [
        { header: "Purchase ID", key: "purchaseId", width: 10 },
        { header: "Invoice Number", key: "invoiceNumber", width: 20 },
        { header: "Invoice Date", key: "invoiceDate", width: 20 },
        { header: "Purchase Date", key: "purchaseDate", width: 20 },
        { header: "Received Date", key: "receivedDate", width: 20 },
        {
          header: "Total Amount Without GST",
          key: "totalAmountWithoutGst",
          width: 20,
        },
        { header: "Total GST Amount", key: "totalGstAmount", width: 20 },
        {
          header: "Total Amount With GST",
          key: "totalAmountWithGst",
          width: 20,
        },
        { header: "Purchase Created At", key: "purchaseCreatedAt", width: 25 },
        { header: "Purchase Updated At", key: "purchaseUpdatedAt", width: 25 },

        { header: "Detail ID", key: "detailId", width: 10 },
        { header: "Product Name", key: "productName", width: 20 },
        { header: "Batch Number", key: "batchNumber", width: 15 },
        { header: "Quantity", key: "quantity", width: 10 },
        { header: "Rate", key: "rate", width: 10 },
        { header: "Net Unit Rate", key: "netUnitRate", width: 15 },
        { header: "CGST %", key: "cgstPercent", width: 10 },
        { header: "SGST %", key: "sgstPercent", width: 10 },
        { header: "IGST %", key: "igstPercent", width: 10 },
        { header: "CGST Amount", key: "cgstAmount", width: 15 },
        { header: "SGST Amount", key: "sgstAmount", width: 15 },
        { header: "IGST Amount", key: "igstAmount", width: 15 },
        { header: "Amount Without GST", key: "amountWithoutGst", width: 20 },
        { header: "Amount With GST", key: "amountWithGst", width: 20 },
        { header: "Expiry Date (MM/YYYY)", key: "expiryDate", width: 18 },
        { header: "Detail Created At", key: "detailCreatedAt", width: 25 },
        { header: "Detail Updated At", key: "detailUpdatedAt", width: 25 },
      ];

      // Style header
      worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
      worksheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF305496" }, // dark blue
      };

      // Data rows
      adminPurchases.forEach((purchase) => {
        purchase.adminPurchaseDetails.forEach((detail) => {
          worksheet.addRow({
            purchaseId: purchase.id,
            invoiceNumber: purchase.invoiceNumber,
            invoiceDate: formatFullDate(purchase.invoiceDate),
            purchaseDate: formatFullDate(purchase.purchaseDate),
            receivedDate: formatFullDate(purchase.receivedDate),
            totalAmountWithoutGst: parseFloat(
              purchase.totalAmountWithoutGst
            ).toFixed(2),
            totalGstAmount: parseFloat(purchase.totalGstAmount).toFixed(2),
            totalAmountWithGst: parseFloat(purchase.totalAmountWithGst).toFixed(
              2
            ),
            purchaseCreatedAt: formatFullDateTime(purchase.createdAt),
            purchaseUpdatedAt: formatFullDateTime(purchase.updatedAt),

            detailId: detail.id,
            productName: detail.product?.productName || "N/A",
            batchNumber: detail.batchNumber,
            quantity: detail.quantity,
            rate: parseFloat(detail.rate).toFixed(2),
            netUnitRate: parseFloat(detail.netUnitRate).toFixed(2),
            cgstPercent: parseFloat(detail.cgstPercent).toFixed(2),
            sgstPercent: parseFloat(detail.sgstPercent).toFixed(2),
            igstPercent: parseFloat(detail.igstPercent).toFixed(2),
            cgstAmount: parseFloat(detail.cgstAmount).toFixed(2),
            sgstAmount: parseFloat(detail.sgstAmount).toFixed(2),
            igstAmount: parseFloat(detail.igstAmount).toFixed(2),
            amountWithoutGst: parseFloat(detail.amountWithoutGst).toFixed(2),
            amountWithGst: parseFloat(detail.amountWithGst).toFixed(2),
            expiryDate: formatMonthYear(detail.expiryDate),
            detailCreatedAt: formatFullDateTime(detail.createdAt),
            detailUpdatedAt: formatFullDateTime(detail.updatedAt),
          });
        });

        worksheet.addRow({}); // Add spacing row
      });

      // Send file
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=admin_purchases.xlsx"
      );

      await workbook.xlsx.write(res);
      return res.end();
    }

    // Normal JSON for frontend
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

// === 📅 Helpers ===

// Formats as "DD/MM/YYYY"
const formatFullDate = (date) => {
  if (!date) return "N/A";
  const d = new Date(date);
  return d.toLocaleDateString("en-GB");
};

// Formats as "DD/MM/YYYY hh:mm:ss AM/PM"
const formatFullDateTime = (date) => {
  if (!date) return "N/A";
  return new Date(date).toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
};

// Formats as "MM/YYYY"
const formatMonthYear = (date) => {
  if (!date) return "N/A";
  const d = new Date(date);
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
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

    await updateStock();

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
