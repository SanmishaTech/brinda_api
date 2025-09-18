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
} = require("../config/data");
const parseDate = require("../utils/parseDate");

// Get all purchases with pagination, sorting, and search
const getAdminStock = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const search = req.query.search || "";
  const sortBy = req.query.sortBy || "id";
  const sortOrder = req.query.sortOrder === "desc" ? "desc" : "asc";

  try {
    const whereClause = {
      // invoiceNumber: { contains: search },
      NOT: {
        memberId: null,
      },
    };

    const adminStocks = await prisma.stock.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
    });

    const totalAdminStock = await prisma.stock.count({
      where: whereClause,
    });
    const totalPages = Math.ceil(totalAdminStock / limit);

    res.json({
      adminStocks,
      page,
      totalPages,
      totalAdminStock,
    });
  } catch (error) {
    return res.status(500).json({
      errors: {
        message: "Failed to fetch admin stock",
        details: error.message,
      },
    });
  }
};

const getFranchiseStock = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const search = req.query.search || "";
  const sortBy = req.query.sortBy || "id";
  const sortOrder = req.query.sortOrder === "desc" ? "desc" : "asc";

  try {
    const whereClause = {
      // invoiceNumber: { contains: search },
      memberId: req.user.member.memberId,
    };

    const adminStocks = await prisma.stock.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
    });

    const totalAdminStock = await prisma.stock.count({
      where: whereClause,
    });
    const totalPages = Math.ceil(totalAdminStock / limit);

    res.json({
      adminStocks,
      page,
      totalPages,
      totalAdminStock,
    });
  } catch (error) {
    return res.status(500).json({
      errors: {
        message: "Failed to fetch admin stock",
        details: error.message,
      },
    });
  }
};

// // Create a new admin purchase
// const addFranchiseStock = async (req, res) => {
//   try {
//     const { productId, memberId, quantity } = req.body;
//     let remainingQty = parseInt(quantity);
//     const parsedProductId = parseInt(productId);
//     const parsedMemberId = parseInt(memberId);

//     // Fetch available stock ledger entries (unissued stock)
//     const availableLedgers = await prisma.stockLedger.findMany({
//       where: {
//         memberId: null,
//         productId: parsedProductId,
//         received: { gt: 0 },
//         issued: 0,
//       },
//       orderBy: {
//         expiryDate: "asc", // Optional: FIFO approach
//       },
//     });

//     for (const ledger of availableLedgers) {
//       if (remainingQty <= 0) break;

//       const transferQty = Math.min(remainingQty, ledger.received);

//       // 1. Create issued ledger for Admin (memberId: null)
//       await prisma.stockLedger.create({
//         data: {
//           memberId: null,
//           productId: parsedProductId,
//           batchNumber: ledger.batchNumber,
//           expiryDate: ledger.expiryDate,
//           invoiceNumber: ledger.invoiceNumber,
//           issued: transferQty,
//           received: 0,
//         },
//       });

//       // 2. Update Admin stock
//       await prisma.stock.update({
//         where: {
//           memberId: null,
//           productId: parsedProductId,
//           batchNumber: ledger.batchNumber,
//           expiryDate: ledger.expiryDate,
//         },
//         data: {
//           closing_quantity: {
//             decrement: transferQty,
//           },
//         },
//       });

//       // 3. Create received ledger for franchise
//       await prisma.stockLedger.create({
//         data: {
//           memberId: parsedMemberId,
//           productId: parsedProductId,
//           batchNumber: ledger.batchNumber,
//           expiryDate: ledger.expiryDate,
//           invoiceNumber: ledger.invoiceNumber,
//           received: transferQty,
//           issued: 0,
//         },
//       });

//       // 4. Update or create franchise stock
//       const existingFranchiseStock = await prisma.stock.findFirst({
//         where: {
//           memberId: parsedMemberId,
//           productId: parsedProductId,
//           batchNumber: ledger.batchNumber,
//           expiryDate: ledger.expiryDate,
//         },
//       });

//       if (existingFranchiseStock) {
//         await prisma.stock.update({
//           where: { id: existingFranchiseStock.id },
//           data: {
//             closing_quantity: {
//               increment: transferQty,
//             },
//           },
//         });
//       } else {
//         await prisma.stock.create({
//           data: {
//             memberId: parsedMemberId,
//             productId: parsedProductId,
//             batchNumber: ledger.batchNumber,
//             invoiceNumber: ledger.invoiceNumber,
//             expiryDate: ledger.expiryDate,
//             closing_quantity: transferQty,
//           },
//         });
//       }

//       // Deduct transferred quantity
//       remainingQty -= transferQty;
//     }

//     return res
//       .status(201)
//       .json({ message: "Franchise stock transferred successfully." });
//   } catch (error) {
//     console.error("Franchise stock transfer error:", error);
//     return res.status(500).json({
//       errors: {
//         message: "Failed to transfer franchise stock",
//         details: error.message,
//       },
//     });
//   }
// };

// Create a new admin purchase
const addFranchiseStock = async (req, res) => {
  try {
    const { StockTransferDetails, memberId } = req.body;

    const newStockTransfer = await prisma.stockTransfer.create({
      data: {
        memberId: parseInt(memberId),
        stockTransferDetails: {
          create: StockTransferDetails.map((detail) => ({
            productId: parseInt(detail.productId),
            quantity: parseInt(detail.quantity),
            batchNumber: detail.batchNumber,
            expiryDate: parseDate(detail.expiryDate),
          })),
        },
      },
      select: {
        id: true,
      },
    });

    for (const detail of StockTransferDetails) {
      const { productId, quantity, batchNumber, expiryDate } = detail;

      await prisma.stockLedger.create({
        data: {
          // memberId: null,
          productId: parseInt(productId),
          batchNumber: batchNumber,
          expiryDate: parseDate(expiryDate),
          issued: parseInt(quantity),
          received: 0,
          module: "Stock Transferred to Franchise",
        },
      });

      await prisma.stockLedger.create({
        data: {
          memberId: parseInt(memberId),
          productId: parseInt(productId),
          batchNumber: batchNumber,
          expiryDate: parseDate(expiryDate),
          issued: 0,
          received: parseInt(quantity),
          module: "Stock Received from Admin",
        },
      });

      await prisma.stock.create({
        data: {
          memberId: parseInt(memberId),
          productId: parseInt(productId),
          batchNumber: batchNumber,
          expiryDate: parseDate(expiryDate),
          closing_quantity: parseInt(quantity),
        },
      });
    }

    await updateStock();

    return res
      .status(201)
      .json({ message: "Franchise stock transferred successfully." });
  } catch (error) {
    console.error("Franchise stock transfer error:", error);
    return res.status(500).json({
      errors: {
        message: "Failed to transfer franchise stock",
        details: error.message,
      },
    });
  }
};

const getAllBatchByProduct = async (req, res) => {
  const { productId } = req.params;
  try {
    const stockBatches = await prisma.stock.findMany({
      where: { productId: parseInt(productId), memberId: null },
    });

    res.status(200).json(stockBatches);
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch franchise",
      details: error.message,
    });
  }
};

module.exports = {
  getAdminStock,
  getFranchiseStock,
  addFranchiseStock,
  getAllBatchByProduct,
};
