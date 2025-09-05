const cron = require("node-cron");
const logger = require("../utils/logger");
const backupDatabase = require("../services/backupDatabase");

// 1st Schedule: Run at 10:00 AM every day
cron.schedule("0 10 * * *", async () => {
  try {
    await backupDatabase();
    logger.info("✅ Backup ran at 10:00 AM");
  } catch (err) {
    logger.error(`❌ Error in 10 AM Backup: ${err}`);
  }
});

// 2nd Schedule: Run at 11:30 PM every day
cron.schedule("30 23 * * *", async () => {
  try {
    await backupDatabase();
    logger.info("✅ Backup ran at 6:00 PM");
  } catch (err) {
    logger.error(`❌ Error in 6 PM Backup: ${err}`);
  }
});
