const cron = require("node-cron");
const logger = require("../utils/logger");
const backupDatabase = require("../services/backupDatabase");
// Schedule the task to run every day at 02:00 AM
cron.schedule("0 2 * * *", async () => {
// cron.schedule("* * * * *", async () => {
  //runs every minute
  try {
    await backupDatabase(); // Your custom function
  } catch (err) {
    logger.error(`❌ Error in Getting Backup: ${err}`);
  }
});
