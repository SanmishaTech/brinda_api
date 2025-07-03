const { PrismaClient, Prisma } = require("@prisma/client");
const prisma = new PrismaClient();
const { z } = require("zod");
const validateRequest = require("../utils/validateRequest");
const createError = require("http-errors");
const dayjs = require("dayjs"); // Import dayjs
const { numberToWords } = require("../utils/numberToWords");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs").promises; // Use promises API
const path = require("path");
const { CREDIT, APPROVED, INCREMENT, INACTIVE } = require("../config/data");
const { updatePVBalance } = require("../utils/updatePVBalance");
const { updateCount } = require("../utils/updateCount");
const {
  generateProductPurchaseInvoice,
} = require("../utils/invoice/user/generateProductPurchaseInvoice");
const {
  generateProductPurchaseInvoiceNumber,
} = require("../utils/invoice/user/generateProductPurchaseInvoiceNumber");

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
const getPurchases = async (req, res) => {
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

    const purchases = await prisma.purchase.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        member: true, // Include member details
        purchaseDetails: true, // Include purchase details
      },
    });

    const totalPurchases = await prisma.purchase.count({
      where: whereClause,
    });
    const totalPages = Math.ceil(totalPurchases / limit);

    res.json({
      purchases,
      page,
      totalPages,
      totalPurchases,
    });
  } catch (error) {
    return res.status(500).json({
      errors: {
        message: "Failed to fetch purchases",
        details: error.message,
      },
    });
  }
};

// Create a new purchase
const createPurchase = async (req, res) => {
  const schema = z.object({
    totalAmountWithoutGst: decimalString("Total Amount Without GST", 10, 2),
    totalAmountWithGst: decimalString("Total Amount With GST", 10, 2),
    totalGstAmount: decimalString("Total GST Amount", 10, 2),
    totalProductPV: decimalString("Total PV", 10, 2),
  });

  const validationErrors = await validateRequest(schema, req.body, res);
  try {
    const {
      totalAmountWithoutGst,
      totalAmountWithGst,
      totalGstAmount,
      totalProductPV,
      purchaseDetails,
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

    const result = await prisma.$transaction(async (tx) => {
      const newPurchase = await tx.purchase.create({
        data: {
          memberId: req.user.member.id,
          purchaseDate: new Date(),
          totalAmountWithoutGst: new Prisma.Decimal(totalAmountWithoutGst),
          totalAmountWithGst: new Prisma.Decimal(totalAmountWithGst),
          totalGstAmount: new Prisma.Decimal(totalGstAmount),
          totalProductPV: new Prisma.Decimal(totalProductPV),
          state: req.user.member.memberState,
          purchaseDetails: {
            create: purchaseDetails.map((detail) => ({
              productId: parseInt(detail.productId),
              quantity: detail.quantity,
              rate: new Prisma.Decimal(detail.rate),
              cgstPercent: new Prisma.Decimal(detail.cgstPercent),
              sgstPercent: new Prisma.Decimal(detail.sgstPercent),
              igstPercent: new Prisma.Decimal(detail.igstPercent),
              cgstAmount: new Prisma.Decimal(detail.cgstAmount),
              sgstAmount: new Prisma.Decimal(detail.sgstAmount),
              igstAmount: new Prisma.Decimal(detail.igstAmount),
              amountWithoutGst: new Prisma.Decimal(detail.amountWithoutGst),
              amountWithGst: new Prisma.Decimal(detail.amountWithGst),
              pvPerUnit: new Prisma.Decimal(detail.pvPerUnit),
              totalPV: new Prisma.Decimal(detail.totalPV),
            })),
          },
        },
      });

      let member = await tx.member.update({
        where: { id: req.user.member.id },
        data: {
          walletBalance: {
            decrement: new Prisma.Decimal(totalAmountWithGst),
          },
        },
      });

      const invoiceNumber = await generateUserProductPurchaseInvoice(
        tx,
        newPurchase.id,
        res,
        req
      );

      const memberLog = await tx.memberLog.create({
        data: {
          memberId: req.user.member.id,
          message: `Products  Purchased (${invoiceNumber})`,
          pv: new Prisma.Decimal(totalProductPV),
        },
      });

      member = await updatePVBalance(
        tx,
        INCREMENT,
        totalProductPV,
        req.user.member.id
      );
    

      const transaction = await tx.walletTransaction.create({
        data: {
          memberId: req.user.member.id,
          amount: new Prisma.Decimal(totalAmountWithGst),
          type: CREDIT,
          status: APPROVED,
          notes: `Products Purchased (${invoiceNumber})`,
          transactionDate: new Date(),
        },
      });

      return { newPurchase, member };
    });

    return res.status(201).json(result.newPurchase);
  } catch (error) {
    return res.status(500).json({
      errors: {
        message: "Failed to create purchase",
        details: error.message,
      },
    });
  }
};

// Get a purchase by ID
const getPurchaseById = async (req, res) => {
  const { id } = req.params;

  try {
    const purchase = await prisma.purchase.findUnique({
      where: { id: parseInt(id, 10) },
      include: {
        member: true, // Include member details
        purchaseDetails: true, // Include purchase details
      },
    });

    if (!purchase) {
      return res
        .status(404)
        .json({ errors: { message: "Purchase not found" } });
    }

    res.status(200).json(purchase);
  } catch (error) {
    res.status(500).json({
      errors: {
        message: "Failed to fetch purchase",
        details: error.message,
      },
    });
  }
};

const generateUserProductPurchaseInvoice = async (tx, purchaseId, res, req) => {
  try {
    let purchase = null;
    // Step 2: Check if invoice number already exists

    const invoiceNumber = await generateProductPurchaseInvoiceNumber(tx);

    purchase = await tx.purchase.update({
      where: { id: parseInt(purchaseId, 10) },
      data: {
        invoiceDate: new Date(),
        invoiceNumber: invoiceNumber,
      },
    });

    const purchaseData = await tx.purchase.findUnique({
      where: { id: parseInt(purchaseId, 10) },
      include: {
        purchaseDetails: {
          include: {
            product: true, // Include product details
          },
        },
        member: true,
      },
    });

    if (!purchaseData) {
      return res.status(404).json({ error: "Purchase details not found" });
    }

    // ✅ Step 2: Format data for generateInvoicePdf
    const invoiceData = {
      invoiceNumber: purchaseData.invoiceNumber,
      invoiceDate: purchaseData.invoiceDate,
      member: {
        memberName: purchaseData.member?.memberName,
        addressLines: [purchaseData.member?.memberAddress || "", ""].filter(
          Boolean
        ),
        pincode: purchaseData.member?.memberPincode || "",
        state: purchaseData?.state,
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
      items: purchaseData.purchaseDetails.map((detail, index) => ({
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
        totalAmountWithoutGst: parseFloat(purchaseData.totalAmountWithoutGst),
        cgstAmount: parseFloat(purchaseData.cgstAmount || 0),
        cgstPercent: purchaseData.cgstPercent || 0,
        sgstAmount: parseFloat(purchaseData.sgstAmount || 0),
        sgstPercent: purchaseData.sgstPercent || 0,
        igstAmount: parseFloat(purchaseData.igstAmount || 0),
        igstPercent: purchaseData.igstPercent || 0,
        totalGstAmount: parseFloat(purchaseData.totalGstAmount),
        totalAmountWithGst: parseFloat(purchaseData.totalAmountWithGst),
        amountInWords: numberToWords(
          parseFloat(purchaseData.totalAmountWithGst)
        ),
      },
    };

    // ✅ Step 3: Define file path

    const oldPath = purchaseData.invoicePath;
    const sanitizedInvoiceNumber = purchaseData.invoiceNumber.replace(
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
      "userPurchase",
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
    await generateProductPurchaseInvoice(invoiceData, filePath);
    await tx.purchase.update({
      where: { id: parseInt(purchaseId, 10) },
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

const DownloadPurchaseInvoice = async (req, res, next) => {
  const { uuid, filename, purchaseId } = req.params;
  // console.log("working");
  try {
    // Construct the file path
    const filePath = path.join(
      __dirname,
      "..", // adjust based on file location
      "..",
      "uploads",
      "invoices",
      "userPurchase",
      uuid,
      filename
    );

    const purchase = await prisma.purchase.findUnique({
      where: { id: parseInt(purchaseId, 10) },
      select: {
        member: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!purchase || req.user.member.id !== purchase.member.id) {
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
  getPurchases,
  createPurchase,
  getPurchaseById,
  generateUserProductPurchaseInvoice,
  DownloadPurchaseInvoice,
};
