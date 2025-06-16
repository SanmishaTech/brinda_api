const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { INCREMENT, DECREMENT } = require("../config/data");
const updatePVBalance = async (type = INCREMENT, value, memberId) => {
  const member = await prisma.member.upadte({
    where: { id: memberId },
    data: {
      pvBalance: {
        [type.toLowerCase()]: value,
      },
    },
  });
};

module.exports = { updatePVBalance };
