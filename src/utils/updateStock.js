const { PrismaClient } = require("@prisma/client");
const prisma = require("../config/db");
const logger = require("./logger");
const updateStock = async () => {
  const stockLedgersData = await prisma.stockLedger.findMany();

  for (const detail of stockLedgersData) {
    const memberId = detail?.memberId ?? null;
    const productId = parseInt(detail.productId);
    const batchNumber = detail.batchNumber;
    const expiryDate = detail.expiryDate;

    const stockLedgers = await prisma.stockLedger.findMany({
      where: {
        memberId,
        productId,
        batchNumber,
        expiryDate: expiryDate, // Ensure this is a Date object
      },
    });
    // for (const data of stockLedgers) {
    //   logger.info(`id = ${data.id}`);
    // }

    // Sum received and issued
    const totalReceived = stockLedgers.reduce(
      (sum, entry) => sum + entry.received,
      0
    );
    const totalIssued = stockLedgers.reduce(
      (sum, entry) => sum + entry.issued,
      0
    );

    const netStock = totalReceived - totalIssued;
    // logger.info(
    //   `totalReceived = ${totalReceived}. totalIssued = ${totalIssued}. netStock = ${netStock}`
    // );
    const existingStock = await prisma.stock.findFirst({
      where: {
        memberId: memberId,
        productId,
        batchNumber,
        expiryDate,
      },
    });

    if (existingStock) {
      await prisma.stock.update({
        where: {
          id: existingStock.id,
        },
        data: {
          closing_quantity: netStock,
        },
      });
    }
  }

  const allStocks = await prisma.stock.findMany();

  for (const stock of allStocks) {
    const { productId, batchNumber, expiryDate, id } = stock;
    const memberId = stock.memberId ?? null;

    // Step 2: Check if there's any matching stock ledger
    const matchingLedger = await prisma.stockLedger.findFirst({
      where: {
        memberId: memberId,
        productId: productId,
        batchNumber: batchNumber,
        expiryDate: expiryDate,
      },
    });

    // Step 3: If no matching ledger, set closing_quantity to 0
    if (!matchingLedger) {
      await prisma.stock.update({
        where: { id },
        data: { closing_quantity: 0 },
      });

      logger.info(
        `Updated Stock ID ${id} — No matching ledger found. Closing quantity set to 0.`
      );
    }
  }
};

module.exports = { updateStock };
