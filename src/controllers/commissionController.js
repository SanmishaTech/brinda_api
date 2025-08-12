const { PrismaClient } = require("@prisma/client");
const {
  CREDIT,
  HOLD_WALLET,
  APPROVED,
  MATCHING_INCOME_WALLET,
} = require("../config/data");
const prisma = new PrismaClient();

/**
 * Get all members with pagination, sorting, and search
 */
const matchingIncomePayoutList = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const search = req.query.search?.trim() || "";
  const sortBy = req.query.sortBy || "id";
  const sortOrder = req.query.sortOrder === "desc" ? "desc" : "asc";

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
            matchingIncomeCommission: {
              equals: isNaN(parseFloat(search))
                ? undefined
                : parseFloat(search),
            },
          },
        ],
      }),
    };

    const payoutList = await prisma.matchingIncomeCommission.findMany({
      where: whereClause,
      include: {
        member: true,
      },
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
    });

    const totalRecords = await prisma.matchingIncomeCommission.count({
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
// const payMatchingIncomeAmount = async (req, res) => {
//   const { commissionId } = req.params;

//   try {
//     const matchingIncomeCommission =
//       await prisma.matchingIncomeCommission.findUnique({
//         where: { id: parseInt(commissionId) },
//       });

//     if (!matchingIncomeCommission) {
//       return res.status(404).json({
//         errors: {
//           message: "Commission record does not exist",
//         },
//       });
//     }

//     if (matchingIncomeCommission.isPaid) {
//       return res.status(400).json({
//         errors: {
//           message: "Commission is already paid",
//         },
//       });
//     }

//     const updatedIncomeCommission =
//       await prisma.matchingIncomeCommission.update({
//         where: { id: parseInt(commissionId) },
//         data: {
//           isPaid: true,
//           paidAt: new Date(),
//           member: {
//             update: {
//               matchingIncomeEarned: {
//                 increment: matchingIncomeCommission.matchingIncomeCommission,
//               },
//             },
//           },
//         },
//       });

//     return res.status(200).json({
//       message: "Commission paid successfully",
//     });
//   } catch (error) {
//     console.error("Pay Commission Error:", error);
//     return res.status(500).json({
//       errors: {
//         message: "Failed to pay commission",
//         details: error.message,
//       },
//     });
//   }
// };
const payMatchingIncomeAmount = async (req, res) => {
  const { commissionId } = req.params;

  try {
    const matchingIncomeCommission =
      await prisma.matchingIncomeCommission.findUnique({
        where: { id: parseInt(commissionId) },
      });

    if (!matchingIncomeCommission) {
      return res.status(404).json({
        errors: {
          message: "Commission record does not exist",
        },
      });
    }

    if (matchingIncomeCommission.isPaid) {
      return res.status(400).json({
        errors: {
          message: "Commission is already paid",
        },
      });
    }

    const updatedIncomeCommission =
      await prisma.matchingIncomeCommission.update({
        where: { id: parseInt(commissionId) },
        data: {
          isPaid: true,
          paidAt: new Date(),
          member: {
            update: {
              matchingIncomeEarned: {
                increment: matchingIncomeCommission.matchingIncomeCommission,
              },
              matchingIncomeWalletBalance: {
                decrement: matchingIncomeCommission.matchingIncomeCommission,
              },
              walletTransactions: {
                create: {
                  amount: matchingIncomeCommission.matchingIncomeCommission,
                  status: APPROVED,
                  type: CREDIT,
                  transactionDate: new Date(),
                  walletType: MATCHING_INCOME_WALLET,
                  processedByAdminId: req.user.id,
                  notes: `₹${matchingIncomeCommission.matchingIncomeCommission.toFixed(
                    2
                  )} Matching Income payout transferred to your bank.`,
                },
              }, //was here last time
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

const getAdminPaidCommissions = async (req, res) => {
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
            matchingIncomeCommission: {
              equals: isNaN(parseFloat(search))
                ? undefined
                : parseFloat(search),
            },
          },
        ],
      }),
    };

    const adminPaidList = await prisma.matchingIncomeCommission.findMany({
      where: whereClause,
      include: {
        member: true,
      },
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
    });

    const totalRecords = await prisma.matchingIncomeCommission.count({
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
  matchingIncomePayoutList,
  payMatchingIncomeAmount,
  getAdminPaidCommissions,
};
