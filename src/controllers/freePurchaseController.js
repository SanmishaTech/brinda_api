const { PrismaClient, Prisma } = require("@prisma/client");
const prisma = require("../config/db");
const { z } = require("zod");
const validateRequest = require("../utils/validateRequest");
const createError = require("http-errors");
const dayjs = require("dayjs"); // Import dayjs
const { numberToWords } = require("../utils/numberToWords");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs").promises; // Use promises API
const ExcelJS = require("exceljs");
const path = require("path");
const logger = require("../utils/logger");
const {
  generateFreePurchaseInvoiceNumber,
} = require("../utils/invoice/user/generateFreePurchaseInvoiceNumber");
const {
  generateFreePurchaseInvoice,
} = require("../utils/invoice/user/generateFreePurchaseInvoice");
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
const getFreePurchases = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const search = req.query.search || "";
  const sortBy = req.query.sortBy || "id";
  const sortOrder = req.query.sortOrder === "desc" ? "desc" : "asc";

  try {
    const whereClause = {
      memberId: req.user.member.id, // Filter by logged-in member
      OR: [
        { invoiceNumber: { contains: search } },
        { member: { memberName: { contains: search } } },
      ],
    };

    const freePurchases = await prisma.freePurchase.findMany({
      where: whereClause, // your dynamic filters (e.g., date range, status, etc.)
      skip, // for pagination (e.g., (page - 1) * limit)
      take: limit, // number of items per page
      orderBy: {
        [sortBy]: sortOrder, // e.g., { createdAt: "desc" }
      },
      include: {
        member: true, // Include member relation
        freePurchaseDetails: true, // Include purchase details
      },
    });

    const totalFreePurchases = await prisma.freePurchase.count({
      where: whereClause,
    });
    const totalPages = Math.ceil(totalFreePurchases / limit);

    res.json({
      freePurchases,
      page,
      totalPages,
      totalFreePurchases,
    });
  } catch (error) {
    return res.status(500).json({
      errors: {
        message: "Failed to fetch Free purchases",
        details: error.message,
      },
    });
  }
};

const generateFreeProductPurchaseInvoice = async (freePurchaseId) => {
  const invoiceNumber = await generateFreePurchaseInvoiceNumber();

  const freePurchaseData = await prisma.freePurchase.update({
    where: { id: parseInt(freePurchaseId, 10) },
    data: {
      invoiceDate: new Date(),
      invoiceNumber: invoiceNumber,
    },
    include: {
      freePurchaseDetails: {
        include: {
          freeProduct: {
            include: { product: true },
          },
        },
      },
      member: true,
    },
  });

  // ✅ Step 2: Format data for generateInvoicePdf
  const invoiceData = {
    invoiceNumber: freePurchaseData.invoiceNumber,
    invoiceDate: freePurchaseData.invoiceDate,
    member: {
      memberName: freePurchaseData.member?.memberName,
      addressLines: [freePurchaseData.member?.memberAddress || "", ""].filter(
        Boolean
      ),
      pincode: freePurchaseData.member?.memberPincode || "",
      state: freePurchaseData.member?.memberState,
    },
    memberDetails: {
      name: "My Brinda",
      addressLines: [
        "B/03, Pinak CHS, Kelkar Rd, Near Vrindavan Hotel, Opp. Gurudev Hotel Aai Bunglow, Ram Nagar.",
        "Thane, Dombivli East - 421201, IN",
      ],
      city: "Dombivli",
      pincode: "421201",
      gstin: "27AACHL3089A2ZF",
      email: "brinda@gmail.com",
      logoPath: "",
    },
    items: freePurchaseData.freePurchaseDetails.map((detail, index) => ({
      srNo: index + 1,
      description: detail.freeProduct.product.productName || "N/A",
      hsnSac: detail.freeProduct.product.hsnCode || "", // or from your DB
      quantity: detail.quantity,
    })),
  };

  // ✅ Step 3: Define file path

  const oldPath = freePurchaseData.invoicePath;
  const sanitizedInvoiceNumber = freePurchaseData.invoiceNumber.replace(
    /[\/\\]/g,
    "-"
  );

  const uuidFolder = uuidv4();
  const invoiceDir = path.join(
    __dirname,
    "..",
    "..",
    "uploads",
    "invoices",
    "freePurchase",
    uuidFolder
  );
  const filePath = path.join(invoiceDir, `${sanitizedInvoiceNumber}.pdf`);
  try {
    if (oldPath) {
      await fs.unlink(oldPath);
      // console.log("Old invoice deleted:", oldPath);

      const folderToDelete = path.dirname(oldPath);
      const files = await fs.readdir(folderToDelete);

      if (files.length === 0) {
        await fs.rmdir(folderToDelete);
        // console.log("Empty folder deleted:", folderToDelete);
      }
    }
  } catch (err) {
    logger.info("Error deleting invoice or folder:", err);
  }
  // end
  // console.log("Writing PDF to:", filePath);

  // ✅ Step 4: Generate the PDF
  await generateFreePurchaseInvoice(invoiceData, filePath);

  await prisma.freePurchase.update({
    where: { id: parseInt(freePurchaseId, 10) },
    data: {
      invoicePath: filePath, // Save relative or absolute path based on your use-case
    },
  });

  return invoiceNumber;
};

// Create a new purchase
const createFreePurchase = async (req, res) => {
  try {
    const { freeProductDetails } = req.body;

    if (req.user.member.totalFreePurchaseCount < freeProductDetails.length) {
      return res.status(5000).json({
        errors: {
          message: "Cant Select More Products",
        },
      });
    }

    await prisma.member.update({
      where: { id: req.user.member.id },
      data: {
        totalFreePurchaseCount: {
          decrement: parseInt(freeProductDetails.length),
        },
      },
    });

    const newFreePurchase = await prisma.freePurchase.create({
      data: {
        memberId: req.user.member.id,
        purchaseDate: new Date(),
        invoiceNumber: "TEMP",
        freePurchaseDetails: {
          create: freeProductDetails.map((detail) => ({
            freeProductId: parseInt(detail.freeProductId),
            quantity: detail.quantity,
          })),
        },
      },
    });

    await generateFreeProductPurchaseInvoice(newFreePurchase.id);

    return res
      .status(202)
      .json({ message: "Free Product Purchase Successfully." });
  } catch (error) {
    logger.info(error);
    return res.status(500).json({
      errors: {
        message: "Failed to create free purchase",
        details: error.message,
      },
    });
  }
};

const DownloadFreePurchaseInvoice = async (req, res, next) => {
  const { uuid, filename, freePurchaseId } = req.params;
  // console.log("working");
  try {
    // Construct the file path
    const filePath = path.join(
      __dirname,
      "..", // adjust based on file location
      "..",
      "uploads",
      "invoices",
      "freePurchase",
      uuid,
      filename
    );

    const freePurchase = await prisma.freePurchase.findUnique({
      where: { id: parseInt(freePurchaseId, 10) },
      select: {
        deliveredBy: true,
        member: {
          select: {
            id: true,
          },
        },
      },
    });

    if (
      !freePurchase ||
      (req.user.member.id !== freePurchase.member.id &&
        req.user.member.id !== freePurchase.deliveredBy)
    ) {
      return res.status(403).json({
        errors: {
          message: "You do not have permission to access this invoice",
        },
      });
    }

    // Check if file exists
    try {
      await fs.access(filePath); // throws if file doesn't exist
    } catch {
      return res.status(404).json({
        errors: {
          message: "Invoice file not found",
        },
      });
    }

    // Download the file
    return res.download(filePath);
  } catch (err) {
    res.status(500).json({
      errors: {
        message: "Failed to download invoice",
        details: err.message,
      },
    });
  }
};

// === Helper: Format date as "DD/MM/YYYY"
const formatDate = (date) => {
  if (!date) return "N/A";
  const d = new Date(date);
  return d.toLocaleDateString("en-GB");
};

// === Helper: Format date with time
const formatDateTime = (date) => {
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

// ===========================================
// ✅ GET PURCHASES WITH EXPORT
// ===========================================
const getFreePurchaseRecords = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const search = req.query.search || "";
  const sortBy = req.query.sortBy || "id";
  const sortOrder = req.query.sortOrder === "desc" ? "desc" : "asc";
  const exportToExcel = req.query.export === "true";

  const whereClause = search
    ? {
        OR: [
          { invoiceNumber: { contains: search } },
          { status: { contains: search } },
          { member: { memberName: { contains: search } } },
          { deliveredByMember: { memberName: { contains: search } } },
        ],
      }
    : {};

  try {
    const freePurchases = await prisma.freePurchase.findMany({
      where: whereClause,
      skip: exportToExcel ? undefined : skip,
      take: exportToExcel ? undefined : limit,
      orderBy: exportToExcel ? undefined : { [sortBy]: sortOrder },
      include: {
        freePurchaseDetails: {
          include: {
            freeProduct: {
              include: { product: true },
            }, // include all fields of freeProduct if needed
          },
        },
        member: true,
        deliveredByMember: true,
      },
    });

    if (exportToExcel) {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("FreePurchases");

      worksheet.columns = [
        // FreePurchase fields
        { header: "ID", key: "id", width: 10 },
        { header: "Member ID", key: "memberId", width: 10 },
        { header: "Member Name", key: "memberName", width: 20 },
        { header: "Invoice Number", key: "invoiceNumber", width: 20 },
        { header: "Invoice Date", key: "invoiceDate", width: 20 },
        { header: "Purchase Date", key: "purchaseDate", width: 20 },
        { header: "Status", key: "status", width: 15 },
        { header: "Delivered By (ID)", key: "deliveredBy", width: 10 },
        { header: "Delivered By Name", key: "deliveredByName", width: 20 },
        { header: "Delivered At", key: "deliveredAt", width: 20 },
        { header: "Created At", key: "createdAt", width: 25 },
        { header: "Updated At", key: "updatedAt", width: 25 },

        // FreePurchaseDetail fields
        { header: "Detail ID", key: "detailId", width: 10 },
        {
          header: "Free Purchase ID (Detail)",
          key: "freePurchaseId",
          width: 15,
        },
        { header: "Free Product ID", key: "freeProductId", width: 15 },
        { header: "Free Product Name", key: "freeProductName", width: 25 },
        { header: "Quantity", key: "quantity", width: 10 },
        { header: "Batch Details", key: "batchDetails", width: 30 },
        { header: "Detail Created At", key: "detailCreatedAt", width: 25 },
        { header: "Detail Updated At", key: "detailUpdatedAt", width: 25 },
      ];

      worksheet.getRow(1).font = { bold: true };

      freePurchases.forEach((purchase) => {
        purchase.freePurchaseDetails.forEach((detail) => {
          worksheet.addRow({
            // FreePurchase fields
            id: purchase.id,
            memberId: purchase.memberId,
            memberName: purchase.member?.memberName || "",
            invoiceNumber: purchase.invoiceNumber,
            invoiceDate: purchase.invoiceDate
              ? formatDate(purchase.invoiceDate)
              : "",
            purchaseDate: purchase.purchaseDate
              ? formatDate(purchase.purchaseDate)
              : "",
            status: purchase.status,
            deliveredBy: purchase.deliveredBy || "",
            deliveredByName: purchase.deliveredByMember?.memberName || "",
            deliveredAt: purchase.deliveredAt
              ? formatDateTime(purchase.deliveredAt)
              : "",
            createdAt: purchase.createdAt
              ? formatDateTime(purchase.createdAt)
              : "",
            updatedAt: purchase.updatedAt
              ? formatDateTime(purchase.updatedAt)
              : "",

            // FreePurchaseDetail fields
            detailId: detail.id,
            freePurchaseId: detail.freePurchaseId,
            freeProductId: detail.freeProductId,
            freeProductName: detail.freeProduct?.product?.productName || "", // Assuming freeProduct has productName
            quantity: detail.quantity,
            batchDetails: detail.batchDetails || "",
            detailCreatedAt: detail.createdAt
              ? formatDateTime(detail.createdAt)
              : "",
            detailUpdatedAt: detail.updatedAt
              ? formatDateTime(detail.updatedAt)
              : "",
          });
        });
        worksheet.addRow({}); // Empty row for separation
      });

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=FreePurchase_${new Date().toISOString()}.xlsx`
      );

      await workbook.xlsx.write(res);
      return res.end();
    }

    // Count only if not exporting
    const totalFreePurchases = await prisma.freePurchase.count({
      where: whereClause,
    });
    const totalPages = Math.ceil(totalFreePurchases / limit);

    res.json({ freePurchases, page, totalPages, totalFreePurchases });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      errors: {
        message: "Failed to fetch free purchases",
        details: error.message,
      },
    });
  }
};

module.exports = {
  getFreePurchases,
  createFreePurchase,
  DownloadFreePurchaseInvoice,
  getFreePurchaseRecords,
};
