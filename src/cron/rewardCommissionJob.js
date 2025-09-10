const cron = require("node-cron");
const logger = require("../utils/logger");
const {
  rewardCommissionPayout,
} = require("../services/rewardCommissionPayout");

// Schedule the task to run at 2:00 AM on the 1st day of every month
cron.schedule("* * * * *", async () => {
// cron.schedule("0 2 1 * *", async () => {
  try {
    await rewardCommissionPayout();
    logger.info(
      "✅ Reward Commission Payout Completed successfully at 2:00 AM on the 1st."
    );
  } catch (err) {
    logger.error(`❌ Error in Reward Commission Payout Job: ${err}`);
  }
});
