const cron = require("node-cron");
const logger = require("../utils/logger");
const { repurchasePayout } = require("../services/repurchasePayout");

// Schedule the task to run at 1:00 AM on the 1st day of every month
cron.schedule("* * * * *", async () => {
  // cron.schedule("0 1 1 * *", async () => {
  try {
    await repurchasePayout(); // Your custom function
    logger.info(
      "✅ Repurchase Payout Completed successfully at 1:00 AM on the 1st."
    );
  } catch (err) {
    logger.error(`❌ Error in Repurchase Payout Job: ${err}`);
  }
});
