const { PrismaClient, Prisma } = require("@prisma/client");
const prisma = new PrismaClient();
const { z } = require("zod");
const validateRequest = require("../utils/validateRequest");
const { numberToWords } = require("../utils/numberToWords");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs").promises; // Use promises API
const path = require("path");
const { CREDIT, APPROVED, INCREMENT, INACTIVE } = require("../config/data");
const {
  generateProductRepurchaseInvoice,
} = require("../utils/invoice/user/generateProductRepurchaseInvoice");
const {
  generateProductRepurchaseInvoiceNumber,
} = require("../utils/invoice/user/generateProductRepurchaseInvoiceNumber");

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
// Get all repurchases with pagination, sorting, and search
const getRepurchases = async (req, res) => {
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

    const repurchases = await prisma.repurchase.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        member: true, // Include member details
        repurchaseDetails: true, // Include purchase details
      },
    });

    const totalRepurchases = await prisma.repurchase.count({
      where: whereClause,
    });
    const totalPages = Math.ceil(totalRepurchases / limit);

    res.json({
      repurchases,
      page,
      totalPages,
      totalRepurchases,
    });
  } catch (error) {
    return res.status(500).json({
      errors: {
        message: "Failed to fetch repurchases",
        details: error.message,
      },
    });
  }
};

// Create a new purchase
const createRepurchase = async (req, res) => {
  const schema = z.object({
    totalAmountWithoutGst: decimalString("Total Amount Without GST", 10, 2),
    totalAmountWithGst: decimalString("Total Amount With GST", 10, 2),
    totalGstAmount: decimalString("Total GST Amount", 10, 2),
    totalProductBV: decimalString("Total BV", 10, 2),
  });

  const validationErrors = await validateRequest(schema, req.body, res);
  try {
    const {
      totalAmountWithoutGst,
      totalAmountWithGst,
      totalGstAmount,
      totalProductBV,
      repurchaseDetails,
    } = req.body;

    if (
      parseFloat(req.user.member.walletBalance) < parseFloat(totalAmountWithGst)
    ) {
      // console.log(
      //   "Wallet Balance = ",
      //   parseFloat(req.user.member.walletBalance).toFixed(2),
      //   "Total Amount With GST =",
      //   parseFloat(totalAmountWithGst).toFixed(2)
      // );
      return res.status(400).json({
        errors: {
          message: "Insufficient wallet balance",
        },
      });
    }

    const newRepurchase = await prisma.repurchase.create({
      data: {
        memberId: req.user.member.id,
        repurchaseDate: new Date(),
        totalAmountWithoutGst: new Prisma.Decimal(totalAmountWithoutGst),
        totalAmountWithGst: new Prisma.Decimal(totalAmountWithGst),
        totalGstAmount: new Prisma.Decimal(totalGstAmount),
        totalProductBV: new Prisma.Decimal(totalProductBV),
        state: req.user.member.memberState,
        repurchaseDetails: {
          create: repurchaseDetails.map((detail) => ({
            productId: parseInt(detail.productId),
            quantity: detail.quantity,
            rate: new Prisma.Decimal(detail.rate),
            netUnitRate: new Prisma.Decimal(detail.netUnitRate),
            cgstPercent: new Prisma.Decimal(detail.cgstPercent),
            sgstPercent: new Prisma.Decimal(detail.sgstPercent),
            igstPercent: new Prisma.Decimal(detail.igstPercent),
            cgstAmount: new Prisma.Decimal(detail.cgstAmount),
            sgstAmount: new Prisma.Decimal(detail.sgstAmount),
            igstAmount: new Prisma.Decimal(detail.igstAmount),
            amountWithoutGst: new Prisma.Decimal(detail.amountWithoutGst),
            amountWithGst: new Prisma.Decimal(detail.amountWithGst),
            bvPerUnit: new Prisma.Decimal(detail.bvPerUnit),
            totalBV: new Prisma.Decimal(detail.totalBV),
          })),
        },
      },
    });

    let member = await prisma.member.update({
      where: { id: req.user.member.id },
      data: {
        walletBalance: {
          decrement: new Prisma.Decimal(totalAmountWithGst),
        },
      },
    });

    const invoiceNumber = await generateUserProductRepurchaseInvoice(
      newRepurchase.id,
      res,
      req
    );

    const memberLog = await prisma.memberLog.create({
      data: {
        memberId: req.user.member.id,
        message: `Products  Repurchased (${invoiceNumber})`,
        bv: new Prisma.Decimal(totalProductBV),
        pv: "0.00",
      },
    });

    const transaction = await prisma.walletTransaction.create({
      data: {
        memberId: req.user.member.id,
        amount: new Prisma.Decimal(totalAmountWithGst),
        type: CREDIT,
        status: APPROVED,
        notes: `Products Repurchased (${invoiceNumber})`,
        transactionDate: new Date(),
      },
    });

    return res.status(201).json(newRepurchase);
  } catch (error) {
    return res.status(500).json({
      errors: {
        message: "Failed to create repurchase",
        details: error.message,
      },
    });
  }
};

// Get a purchase by ID
const getRepurchaseById = async (req, res) => {
  const { id } = req.params;

  try {
    const repurchase = await prisma.repurchase.findUnique({
      where: { id: parseInt(id, 10) },
      include: {
        member: true, // Include member details
        repurchaseDetails: true, // Include purchase details
      },
    });

    if (!repurchase) {
      return res
        .status(404)
        .json({ errors: { message: "Repurchase not found" } });
    }

    res.status(200).json(repurchase);
  } catch (error) {
    res.status(500).json({
      errors: {
        message: "Failed to fetch repurchase",
        details: error.message,
      },
    });
  }
};

const generateUserProductRepurchaseInvoice = async (repurchaseId, res, req) => {
  try {
    let repurchase = null;
    // Step 2: Check if invoice number already exists

    const invoiceNumber = await generateProductRepurchaseInvoiceNumber();

    repurchase = await prisma.repurchase.update({
      where: { id: parseInt(repurchaseId, 10) },
      data: {
        invoiceDate: new Date(),
        invoiceNumber: invoiceNumber,
      },
    });

    const repurchaseData = await prisma.repurchase.findUnique({
      where: { id: parseInt(repurchaseId, 10) },
      include: {
        repurchaseDetails: {
          include: {
            product: true, // Include product details
          },
        },
        member: true,
      },
    });

    if (!repurchaseData) {
      return res.status(404).json({ error: "Repurchase details not found" });
    }

    // ✅ Step 2: Format data for generateInvoicePdf
    const invoiceData = {
      invoiceNumber: repurchaseData.invoiceNumber,
      invoiceDate: repurchaseData.invoiceDate,
      member: {
        memberName: repurchaseData.member?.memberName,
        addressLines: [repurchaseData.member?.memberAddress || "", ""].filter(
          Boolean
        ),
        pincode: repurchaseData.member?.memberPincode || "",
        state: repurchaseData?.state,
      },
      memberDetails: {
        name: "Brinda Health Care",
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
      items: repurchaseData.repurchaseDetails.map((detail, index) => ({
        srNo: index + 1,
        description: detail.product.productName || "N/A",
        hsnSac: detail.product.hsnCode || "998551", // or from your DB
        quantity: detail.quantity,
        rate: parseFloat(detail.rate),
        amountWithoutGst: parseFloat(detail.amountWithoutGst),
        cgstPercent: parseFloat(detail.cgstPercent || 0),
        sgstPercent: parseFloat(detail.sgstPercent || 0),
        igstPercent: parseFloat(detail.igstPercent || 0),
        cgstAmount: parseFloat(detail.cgstAmount || 0),
        sgstAmount: parseFloat(detail.sgstAmount || 0),
        igstAmount: parseFloat(detail.igstAmount || 0),
        amountWithGst: parseFloat(detail.amountWithGst),
      })),
      totals: {
        totalAmountWithoutGst: parseFloat(repurchaseData.totalAmountWithoutGst),
        cgstAmount: parseFloat(repurchaseData.cgstAmount || 0),
        cgstPercent: repurchaseData.cgstPercent || 0,
        sgstAmount: parseFloat(repurchaseData.sgstAmount || 0),
        sgstPercent: repurchaseData.sgstPercent || 0,
        igstAmount: parseFloat(repurchaseData.igstAmount || 0),
        igstPercent: repurchaseData.igstPercent || 0,
        totalGstAmount: parseFloat(repurchaseData.totalGstAmount),
        totalAmountWithGst: parseFloat(repurchaseData.totalAmountWithGst),
        amountInWords: numberToWords(
          parseFloat(repurchaseData.totalAmountWithGst)
        ),
      },
    };

    // ✅ Step 3: Define file path

    const oldPath = repurchaseData.invoicePath;
    const sanitizedInvoiceNumber = repurchaseData.invoiceNumber.replace(
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
      "userRepurchase",
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
      console.error("Error deleting invoice or folder:", err);
    }
    // end
    // console.log("Writing PDF to:", filePath);

    // ✅ Step 4: Generate the PDF
    await generateProductRepurchaseInvoice(invoiceData, filePath);
    await prisma.repurchase.update({
      where: { id: parseInt(repurchaseId, 10) },
      data: {
        invoicePath: filePath, // Save relative or absolute path based on your use-case
      },
    });

    res.setHeader("Content-Type", "application/pdf");

    // ✅ Step 5: Send file to client
    // res.download(filePath, (err) => {
    //   if (err) {
    //     console.error("Download error:", err);
    //     res.status(500).send("Failed to download invoice");
    //   } else {
    //     // Optionally delete file after download
    //     // fs.unlink(filePath, () => {});
    //   }
    // });
    return invoiceNumber;
  } catch (error) {
    res.status(500).json({
      errors: {
        message: "Failed to generate invoice",
        details: error.message,
      },
    });
  }
};

const DownloadRepurchaseInvoice = async (req, res, next) => {
  const { uuid, filename, repurchaseId } = req.params;
  // console.log("working");
  try {
    // Construct the file path
    const filePath = path.join(
      __dirname,
      "..", // adjust based on file location
      "..",
      "uploads",
      "invoices",
      "userRepurchase",
      uuid,
      filename
    );

    const repurchase = await prisma.repurchase.findUnique({
      where: { id: parseInt(repurchaseId, 10) },
      select: {
        member: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!repurchase || req.user.member.id !== repurchase.member.id) {
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

module.exports = {
  getRepurchases,
  createRepurchase,
  getRepurchaseById,
  generateUserProductRepurchaseInvoice,
  DownloadRepurchaseInvoice,
};
