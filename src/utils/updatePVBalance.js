const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const {
  INCREMENT,
  DECREMENT,
  INACTIVE,
  ASSOCIATE,
  SILVER,
  GOLD,
  DIAMOND,
} = require("../config/data");
const updatePVBalance = async (
  tx = prisma,
  type = INCREMENT,
  value,
  memberId
) => {
  let member = await tx.member.update({
    where: { id: memberId },
    data: {
      pvBalance: {
        [type.toLowerCase()]: value,
      },
    },
  });

  if (member.status === INACTIVE) {
    if (member.pvBalance >= 1) {
      member = await tx.member.update({
        where: { id: memberId },
        data: {
          status: ASSOCIATE,
          pvBalance: {
            decrement: 1,
          },
        },
      });
      await tx.memberLog.create({
        data: {
          memberId: member.id,
          pv: -1,
          message: "Member status updated to ASSOCIATE",
        },
      });
    }
  }
  if (member.status === ASSOCIATE) {
    if (member.pvBalance >= 2) {
      member = await tx.member.update({
        where: { id: memberId },
        data: {
          status: SILVER,
          pvBalance: {
            decrement: 2,
          },
        },
      });
      await tx.memberLog.create({
        data: {
          memberId: member.id,
          pv: -2,
          message: "Member status updated to SILVER",
        },
      });
    }
  }
  if (member.status === SILVER) {
    if (member.pvBalance >= 7) {
      member = await tx.member.update({
        where: { id: memberId },
        data: {
          status: GOLD,
          pvBalance: {
            decrement: 7,
          },
        },
      });
      await tx.memberLog.create({
        data: {
          memberId: member.id,
          pv: -7,
          message: "Member status updated to GOLD",
        },
      });
    }
  }
  if (member.status === GOLD) {
    if (member.pvBalance >= 10) {
      member = await tx.member.update({
        where: { id: memberId },
        data: {
          status: DIAMOND,
          pvBalance: {
            decrement: 10,
          },
        },
      });
      await tx.memberLog.create({
        data: {
          memberId: member.id,
          pv: -10,
          message: "Member status updated to DIAMOND",
        },
      });
    }
  }

  /*
  Inactive = 0
  Associate = 1
  Silver = 2
  Gold = 7
  Diamond = 10
  */
};

module.exports = { updatePVBalance };
