const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const weeklyMatchingPayout = async () => {
  console.log("weeklyMatchingPayout Worked");
};

module.exports = { weeklyMatchingPayout };
