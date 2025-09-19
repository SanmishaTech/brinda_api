// background/updatePVWorker.js
const { PrismaClient, Prisma } = require('@prisma/client');
const prisma = require("../src/config/db");
const { updatePVBalance } = require('../src/utils/updatePVBalance');
const {
  CREDIT,
  APPROVED,
  INCREMENT,
  INACTIVE,
  FUND_WALLET,
} = require('../src/config/data');

const logger = require('../src/utils/logger');
const { addVirtualPower } = require('../src/utils/addVirtualPower');
const { handlePurchase } = require('../src/utils/handlePurchase');
process.on('message', async (data) => {
  try {
    const { type } = data;

    switch (type) {
      case 'purchase':
        await handlePurchase(data);
        break;

      case 'virtualPower':
        await addVirtualPower(data);
        break;

      default:
        logger.warn(`Unknown data type: ${type}`);
    }

    process.send(`data of type ${type} completed successfully.`);
    process.exit(0); // Done
  } catch (error) {
    logger.error(`Error in worker for data type ${data.type}: ${error}`);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
});
