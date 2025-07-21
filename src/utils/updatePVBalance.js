const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { updateCount } = require("./updateCount");
const {
  INCREMENT,
  DECREMENT,
  INACTIVE,
  ASSOCIATE,
  SILVER,
  GOLD,
  DIAMOND,
} = require("../config/data");
const { checkDirectMatch } = require("./checkDirectMatch");
const { check2_1Pass } = require("./check2_1Pass");
const { incrementMemberStatusCount } = require("./incrementMemberStatusCount");
const updatePVBalance = async (type = INCREMENT, value, memberId) => {
  let member = await prisma.member.update({
    where: { id: memberId },
    data: {
      pvBalance: {
        [type.toLowerCase()]: value,
      },
    },
    include: {
      sponsor: true,
    },
  });

  if (member.status === INACTIVE) {
    if (member.pvBalance >= 1) {
      member = await prisma.member.update({
        where: { id: memberId },
        data: {
          status: ASSOCIATE,
          pvBalance: {
            decrement: 1,
          },
        },
        include: {
          sponsor: true,
        },
      });
      member = await updateCount(member);

      member = await incrementMemberStatusCount(member);
      await prisma.memberLog.create({
        data: {
          memberId: member.id,
          pv: -1,
          bv: 0,
          message: "Member status updated to ASSOCIATE",
        },
      });
    }
  }
  if (member.status === ASSOCIATE) {
    if (member.pvBalance >= 2) {
      member = await prisma.member.update({
        where: { id: memberId },
        data: {
          status: SILVER,
          pvBalance: {
            decrement: 2,
          },
        },
        include: {
          sponsor: true,
        },
      });
      member = await incrementMemberStatusCount(member);

      await prisma.memberLog.create({
        data: {
          memberId: member.id,
          pv: -2,
          bv: 0,
          message: "Member status updated to SILVER",
        },
      });
    }
  }
  if (member.status === SILVER) {
    if (member.pvBalance >= 7) {
      member = await prisma.member.update({
        where: { id: memberId },
        data: {
          status: GOLD,
          pvBalance: {
            decrement: 7,
          },
        },
        include: {
          sponsor: true,
        },
      });

      member = await incrementMemberStatusCount(member);

      await prisma.memberLog.create({
        data: {
          memberId: member.id,
          pv: -7,
          bv: 0,
          message: "Member status updated to GOLD",
        },
      });
    }
  }
  if (member.status === GOLD) {
    if (member.pvBalance >= 10) {
      member = await prisma.member.update({
        where: { id: memberId },
        data: {
          status: DIAMOND,
          pvBalance: {
            decrement: 10,
          },
        },
        include: {
          sponsor: true,
        },
      });

      member = await incrementMemberStatusCount(member);

      await prisma.memberLog.create({
        data: {
          memberId: member.id,
          pv: -10,
          bv: 0,
          message: "Member status updated to DIAMOND",
        },
      });
    }
  }

  await checkDirectMatch(member);

  await check2_1Pass(member);

  return member;
  /*
  Inactive = 0
  Associate = 1
  Silver = 2
  Gold = 7
  Diamond = 10
  */
};

module.exports = { updatePVBalance };
