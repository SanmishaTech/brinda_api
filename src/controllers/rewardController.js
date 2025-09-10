const { PrismaClient, Prisma } = require("@prisma/client");
const prisma = new PrismaClient();
const { z } = require("zod");
const { REWARDS_COMMISSIONS, APPROVED } = require("../config/data");
// Get all products with pagination, sorting, and search
const getRewards = async (req, res, next) => {
  try {
    res.status(200).json({
      member: req.user.member,
      REWARDS_COMMISSIONS: REWARDS_COMMISSIONS,
    });
  } catch (error) {
    return res.status(500).json({
      errors: {
        message: "Failed to fetch Rewards",
        details: error.message,
      },
    });
  }
};

/**
 * Get all members with pagination, sorting, and search
 */
const rewardPayoutList = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const search = req.query.search?.trim() || "";
  const sortBy = req.query.sortBy || "id";
  const sortOrder = req.query.sortOrder === "desc" ? "desc" : "asc";
  let orderByClause = {};
  if (
    sortBy === "memberUsername" ||
    sortBy === "memberName" ||
    sortBy === "bankAccountNumber"
  ) {
    orderByClause = {
      member: {
        [sortBy]: sortOrder,
      },
    };
  } else {
    orderByClause = {
      [sortBy]: sortOrder,
    };
  }
  try {
    const whereClause = {
      isPaid: false,
      ...(search && {
        OR: [
          {
            member: {
              memberUsername: {
                contains: search,
              },
            },
          },
          {
            member: {
              memberName: {
                contains: search,
              },
            },
          },
          {
            member: {
              bankAccountNumber: {
                contains: search,
              },
            },
          },
          {
            totalAmountToGive: {
              equals: isNaN(parseFloat(search))
                ? undefined
                : parseFloat(search),
            },
          },
        ],
      }),
    };

    const payoutList = await prisma.rewardCommission.findMany({
      where: whereClause,
      include: {
        member: true,
      },
      skip,
      take: limit,
      orderBy: orderByClause,
    });

    const totalRecords = await prisma.rewardCommission.count({
      where: whereClause,
    });

    const totalPages = Math.ceil(totalRecords / limit);

    res.json({
      payoutList,
      page,
      totalPages,
      totalRecords,
    });
  } catch (error) {
    console.error("Fetch Commission List Error:", error);
    return res.status(500).json({
      errors: {
        message: "Failed to Fetch Commission List",
        details: error.message,
      },
    });
  }
};

const payRewardAmount = async (req, res) => {
  const { commissionId } = req.params;

  try {
    const rewardCommission = await prisma.rewardCommission.findUnique({
      where: { id: parseInt(commissionId) },
    });

    if (!rewardCommission) {
      return res.status(404).json({
        errors: {
          message: "Commission record does not exist",
        },
      });
    }

    if (rewardCommission.isPaid) {
      return res.status(400).json({
        errors: {
          message: "Commission is already paid",
        },
      });
    }

    const updatedIncomeCommission = await prisma.rewardCommission.update({
      where: { id: parseInt(commissionId) },
      data: {
        isPaid: true,
        paidAt: new Date(),
        member: {
          update: {
            rewardIncomeEarned: {
              increment: rewardCommission.totalAmountToGive,
            },
          },
        },
        walletTransaction: {
          update: {
            status: APPROVED,
          },
        },
      },
    });

    return res.status(200).json({
      message: "Commission paid successfully",
    });
  } catch (error) {
    console.error("Pay Commission Error:", error);
    return res.status(500).json({
      errors: {
        message: "Failed to pay commission",
        details: error.message,
      },
    });
  }
};

const getAdminPaidRewardPayout = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const search = req.query.search?.trim() || "";
  const sortBy = req.query.sortBy || "id";
  const sortOrder = req.query.sortOrder === "desc" ? "desc" : "asc";

  try {
    const whereClause = {
      isPaid: true,
      ...(search && {
        OR: [
          {
            member: {
              memberUsername: {
                contains: search,
              },
            },
          },
          {
            member: {
              memberName: {
                contains: search,
              },
            },
          },
          {
            member: {
              bankAccountNumber: {
                contains: search,
              },
            },
          },
          {
            totalAmountToGive: {
              equals: isNaN(parseFloat(search))
                ? undefined
                : parseFloat(search),
            },
          },
        ],
      }),
    };

    const adminPaidList = await prisma.rewardCommission.findMany({
      where: whereClause,
      include: {
        member: true,
      },
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
    });

    const totalRecords = await prisma.rewardCommission.count({
      where: whereClause,
    });

    const totalPages = Math.ceil(totalRecords / limit);

    res.json({
      adminPaidList,
      page,
      totalPages,
      totalRecords,
    });
  } catch (error) {
    return res.status(500).json({
      errors: {
        message: "Failed to Fetch Admin Paid List",
        details: error.message,
      },
    });
  }
};

module.exports = {
  getRewards,
  rewardPayoutList,
  payRewardAmount,
  getAdminPaidRewardPayout,
};
