const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

/**
 * Get all members with pagination, sorting, and search
 */
const repurchasePayoutList = async (req, res) => {
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

    const payoutList = await prisma.repurchaseIncomeCommission.findMany({
      where: whereClause,
      include: {
        member: true,
      },
      skip,
      take: limit,
      orderBy: orderByClause,
    });

    const totalRecords = await prisma.repurchaseIncomeCommission.count({
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
const payRepurchaseAmount = async (req, res) => {
  const { commissionId } = req.params;

  try {
    const repurchaseIncomeCommission =
      await prisma.repurchaseIncomeCommission.findUnique({
        where: { id: parseInt(commissionId) },
      });

    if (!repurchaseIncomeCommission) {
      return res.status(404).json({
        errors: {
          message: "Repurchase Commission record does not exist",
        },
      });
    }

    if (repurchaseIncomeCommission.isPaid) {
      return res.status(400).json({
        errors: {
          message: "Repurchase Commission is already paid",
        },
      });
    }

    const updatedIncomeCommission =
      await prisma.repurchaseIncomeCommission.update({
        where: { id: parseInt(commissionId) },
        data: {
          isPaid: true,
          paidAt: new Date(),
          member: {
            update: {
              repurchaseIncomeEarned: {
                increment: repurchaseIncomeCommission.totalAmountToGive,
              },
            },
          },
        },
      });

    return res.status(200).json({
      message: "Repurchase Commission paid successfully",
    });
  } catch (error) {
    console.error(" Repurchase Pay Commission Error:", error);
    return res.status(500).json({
      errors: {
        message: "Failed to pay Repurchase commission",
        details: error.message,
      },
    });
  }
};

const getAdminPaidRepurchasePayout = async (req, res) => {
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

    const adminPaidList = await prisma.repurchaseIncomeCommission.findMany({
      where: whereClause,
      include: {
        member: true,
      },
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
    });

    const totalRecords = await prisma.repurchaseIncomeCommission.count({
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
  repurchasePayoutList,
  payRepurchaseAmount,
  getAdminPaidRepurchasePayout,
};
