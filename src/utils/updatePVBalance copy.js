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
    include: {
      sponsor: true,
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
        include: {
          sponsor: true,
        },
      });
      member = await updateCount(member);
      console.log("working i");
      member = await incrementMemberStatusCount(member);
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
        include: {
          sponsor: true,
        },
      });
      console.log("working a");
      member = await incrementMemberStatusCount(member);

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
        include: {
          sponsor: true,
        },
      });
      console.log("working s");

      member = await incrementMemberStatusCount(member);

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
        include: {
          sponsor: true,
        },
      });
      console.log("working g");

      member = await incrementMemberStatusCount(member);

      await tx.memberLog.create({
        data: {
          memberId: member.id,
          pv: -10,
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
