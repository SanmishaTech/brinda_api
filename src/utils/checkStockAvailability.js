const { PrismaClient } = require("@prisma/client");
const prisma = require("../config/db");

const checkStockAvailability = async (details, memberId, today) => {
  for (const item of details) {
    const totalAvailableStock = await prisma.stock.aggregate({
      _sum: {
        closing_quantity: true,
      },
      where: {
        memberId,
        productId: item.productId,
        expiryDate: { gte: today },
        closing_quantity: { gt: 0 },
      },
    });

    const availableQty = totalAvailableStock._sum.closing_quantity || 0;

    if (availableQty < item.quantity) {
      return {
        error: `Insufficient stock for product ${item.product.productName}. Required: ${item.quantity}, Available: ${availableQty}`,
      };
    }
  }
  return { success: true };
};

module.exports = checkStockAvailability;
