const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const checkStockAvailability = async (details, memberId, today, res) => {
  for (const item of details) {
    const totalAvailableStock = await prisma.stock.aggregate({
      _sum: {
        closing_quantity: true,
      },
      where: {
        memberId,
        productId: item.productId,
        expiryDate: { gt: today },
        closing_quantity: { gt: 0 },
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
};

module.exports = checkStockAvailability;
