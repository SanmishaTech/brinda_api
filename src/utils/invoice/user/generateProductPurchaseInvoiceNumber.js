const { PrismaClient } = require("@prisma/client");
const prisma = require("../../../config/db");
const dayjs = require("dayjs");

async function generateProductPurchaseInvoiceNumber() {
  const now = dayjs();
  const prefix = `I-${now.format("MMYY")}`; // e.g., I-0625

  // Find the latest username that starts with this prefix
  const latest = await prisma.purchase.findFirst({
    where: {
      invoiceNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      invoiceNumber: "desc", // so latest comes first
    },
  });

  let newNumber;

  if (!latest) {
    newNumber = 1;
  } else {
    const lastNumber = parseInt(latest.invoiceNumber.slice(6), 10); // Get the last 4 digits
    newNumber = lastNumber + 1;
  }

  const invoiceNumber = `${prefix}${String(newNumber).padStart(6, "0")}`;
  return invoiceNumber; // e.g., 01250001
}

module.exports = { generateProductPurchaseInvoiceNumber };
