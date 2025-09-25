const { PrismaClient } = require("@prisma/client");
const prisma = require("../config/db");

const processDeliveryAndLedger = async (
  details,
  memberId,
  today,
  isRepurchase
) => {
  for (const item of details) {
    let requiredQty = item.quantity;
    let batchLog = [];
    const isFree = !!item.freeProduct;
    const productId = isFree ? item.freeProduct.productId : item.productId;
    const stockBatches = await prisma.stock.findMany({
      where: {
        memberId,
        productId,
        expiryDate: { gte: today },
        closing_quantity: { gt: 0 },
      },
      orderBy: { expiryDate: "asc" },
    });

    for (const stock of stockBatches) {
      if (requiredQty <= 0) break;

      const deductQty = Math.min(requiredQty, stock.closing_quantity);

      await prisma.stockLedger.create({
        data: {
          productId: stock.productId,
          memberId,
          batchNumber: stock.batchNumber,
          expiryDate: stock.expiryDate,
          received: 0,
          issued: deductQty,
          module: "Product Delivery",
        },
      });

      batchLog.push({
        batchNumber: stock.batchNumber,
        expiryDate: stock.expiryDate,
        quantityUsed: deductQty,
      });

      requiredQty -= deductQty;
    }

    // Decide which model to update
    if (isFree) {
      await prisma.freePurchaseDetail.update({
        where: { id: item.id },
        data: {
          batchDetails: JSON.stringify(batchLog),
        },
      });
    } else {
      const detailModel = isRepurchase
        ? prisma.repurchaseDetail
        : prisma.purchaseDetail;

      await detailModel.update({
        where: { id: item.id },
        data: {
          batchDetails: JSON.stringify(batchLog),
        },
      });
    }
  }
};
module.exports = processDeliveryAndLedger;
