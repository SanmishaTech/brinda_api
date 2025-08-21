const cron = require('node-cron');
const { weeklyMatchingPayout } = require('../services/weeklyMatchingPayout');
const logger = require('../utils/logger');
// Schedule the task to run every Tuesday at 00:00 AM
cron.schedule("0 0 * * 2", async () => {
// cron.schedule('* * * * *', async () => {
  //runs every minute
  console.log('📅 Running Tuesday midnight task...');
  try {
    await weeklyMatchingPayout(); // Your custom function
    console.log('✅ Task completed.');
  } catch (err) {
    console.error('❌ Error running weekly task:', err);
    logger.info(err);
  }
});
