const cron = require("node-cron");
const logger = require("../utils/logger");
const {
  franchiseCommissionPayout,
} = require("../services/franchiseCommissionPayout");

// Schedule the task to run at 1:30 AM on the 1st day of every month
// cron.schedule("* * * * *", async () => {
  cron.schedule("30 1 1 * *", async () => {
  try {
    await franchiseCommissionPayout(); // Your custom function
    logger.info(
      "✅ Franchise Payout Completed successfully at 1:30 AM on the 1st."
    );
  } catch (err) {
    logger.error(`❌ Error in Franchise Payout Job: ${err}`);
  }
});

//deduct 10% platform fee and 2% tds from franchise introduction and 2% sponsor
