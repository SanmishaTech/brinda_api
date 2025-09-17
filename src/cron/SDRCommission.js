const cron = require("node-cron");
const logger = require("../utils/logger");
const { generateSDRAmount } = require("../services/generateSDRAmount");

// Schedule the task to run at 2:00 AM on the 1st day of every month
// cron.schedule("* * * * *", async () => {
cron.schedule("0 2 1 * *", async () => {
  try {
    await generateSDRAmount();
    logger.info("✅ SRD Amount generated successfully at 2:00 AM on the 1st.");
  } catch (err) {
    logger.error(`❌ Error in SDR Job: ${err}`);
  }
});
