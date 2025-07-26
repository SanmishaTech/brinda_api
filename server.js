const app = require("./src/app");
// const abcd = require("./src/cron/weeklyMatchingIncomeCommissionJob"); // 👈 Import the cron job
const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
