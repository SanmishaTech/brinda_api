const { PrismaClient, Prisma } = require("@prisma/client");
const validateRequest = require("../utils/validateRequest");
const prisma = new PrismaClient();
const { z } = require("zod");
const { LEFT, RIGHT, PENDING } = require("../config/data");

/**
 * Get all members with pagination, sorting, and search
 */
const getMembers = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const search = req.query.search || "";
  const sortBy = req.query.sortBy || "id";
  const sortOrder = req.query.sortOrder === "desc" ? "desc" : "asc";

  try {
    const trimmedSearch = search?.trim();
    const whereClause = {
      OR: [
        { memberName: { contains: trimmedSearch } },
        { memberUsername: { contains: trimmedSearch } },
        { memberEmail: { contains: trimmedSearch } },
        { memberMobile: { contains: trimmedSearch } },
        { positionToParent: { contains: trimmedSearch } },
        // { leftCount: { contains: trimmedSearch } },
        // { rightCount: { contains: trimmedSearch } },
        // { leftDirectCount: { contains: trimmedSearch } },
        // { rightDirectCount: { contains: trimmedSearch } },
      ],
    };

    const orderByClause =
      sortBy === "sponsor"
        ? { sponsor: { memberUsername: sortOrder } }
        : sortBy === "parent"
        ? { parent: { memberUsername: sortOrder } }
        : { [sortBy]: sortOrder };

    const members = await prisma.member.findMany({
      where: whereClause,
      include: {
        user: true,
        sponsor: { select: { memberUsername: true } },
        parent: { select: { memberUsername: true } },
      },
      skip,
      take: limit,
      orderBy: orderByClause,
    });

    const totalMembers = await prisma.member.count({
      where: whereClause,
    });
    const totalPages = Math.ceil(totalMembers / limit);

    res.json({
      members,
      page,
      totalPages,
      totalMembers,
    });
  } catch (error) {
    return res.status(500).json({
      errors: {
        message: "Failed to fetch members",
        details: error.message,
      },
    });
  }
};

/**
 * Get member by ID
 */
const getMemberById = async (req, res) => {
  const { id } = req.params;

  try {
    const member = await prisma.member.findUnique({
      where: { id: parseInt(id) },
      include: {
        user: true,
        parent: {
          select: {
            memberUsername: true,
          },
        },
        sponsor: {
          select: {
            memberUsername: true,
          },
        },
      },
    });

    if (!member) {
      return res.status(404).json({
        message: "Member not found",
      });
    }

    res.status(200).json(member);
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch member",
      details: error.message,
    });
  }
};

/**
 * Update member by ID
 */
const updateMember = async (req, res) => {
  const decimalString = (fieldName, maxDigits, decimalPlaces) =>
    z
      .string()
      .nonempty(`${fieldName} is required.`)
      .refine(
        (val) => {
          const regex = new RegExp(
            `^\\d{1,${maxDigits - decimalPlaces}}(\\.\\d{1,${decimalPlaces}})?$`
          );
          return regex.test(val);
        },
        {
          message: `${fieldName} must be a valid number with up to ${decimalPlaces} decimal places.`,
        }
      );

  const schema = z
    .object({
      name: z
        .string()
        .min(1, "Name cannot be left blank.") // Ensuring minimum length of 2
        .max(100, "Name must not exceed 100 characters.")
        .refine((val) => /^[A-Za-z\s\u0900-\u097F]+$/.test(val), {
          message: "Name can only contain letters.",
        }),
      email: z
        .string()
        .refine(
          (val) =>
            val === "" ||
            val === null ||
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
          {
            message: "Email must be a valid email address.",
          }
        )
        .optional(),
      mobile: z
        .string()
        .optional()
        .refine((val) => val === "" || /^\d{10}$/.test(val), {
          message: "Mobile number must be exactly 10 digits.",
        }),
      password: z
        .string()
        .min(6, "Password must be at least 6 characters.")
        .max(100, "Password must not exceed 100 characters."),
      percentage: decimalString("Percentage", 5, 2),
      securityDepositPercentage: decimalString(
        "securityDepositPercentage",
        5,
        2
      ),
    })
    .superRefine(async (data, ctx) => {
      const { id } = req.params;

      if (data.email) {
        const existingMemberEmail = await prisma.member.findFirst({
          where: {
            memberEmail: data.email,
          },
          select: { id: true },
        });

        if (existingMemberEmail && existingMemberEmail.id !== parseInt(id)) {
          ctx.addIssue({
            path: ["email"],
            message: `Email ${data.email} already exists.`,
          });
        }
      }

      if (data.mobile) {
        const existingMemberMobile = await prisma.member.findFirst({
          where: {
            memberMobile: data.mobile,
          },
          select: { id: true },
        });

        if (existingMemberMobile && existingMemberMobile.id !== parseInt(id)) {
          ctx.addIssue({
            path: ["mobile"],
            message: `Mobile ${data.mobile} already exists.`,
          });
        }
      }
    });

  const validationErrors = await validateRequest(schema, req.body, res);

  const { id } = req.params;
  const {
    name,
    email,
    mobile,
    password,
    percentage,
    securityDepositPercentage,
  } = req.body;

  try {
    const updatedMember = await prisma.member.update({
      where: { id: parseInt(id) },
      data: {
        memberName: name,
        memberEmail: email || null,
        memberMobile: mobile || null,
        percentage: new Prisma.Decimal(percentage),
        securityDepositPercentage: new Prisma.Decimal(
          securityDepositPercentage
        ),
        user: {
          update: {
            name,
            email: email || null,
            mobile: mobile || null,
            password,
          },
        },
      },
      include: { user: true },
    });

    res.status(200).json(updatedMember);
  } catch (error) {
    return res.status(500).json({
      message: "Failed to update member",
      details: error.message,
    });
  }
};

/**
 * Get all members without pagination
 */
const getAllMembers = async (req, res) => {
  try {
    const members = await prisma.member.findMany({
      select: {
        id: true,
        memberName: true,
      },
    });

    res.status(200).json(members);
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch members",
      details: error.message,
    });
  }
};

const getMemberLogs = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const search = req.query.search || "";
  const sortBy = req.query.sortBy || "id";
  const sortOrder = req.query.sortOrder === "desc" ? "desc" : "asc";

  try {
    const trimmedSearch = search?.trim();
    const whereClause = {
      memberId: req.user.member.id,
      OR: [{ message: { contains: trimmedSearch } }],
    };

    const orderByClause = { [sortBy]: sortOrder };

    const memberLogs = await prisma.memberLog.findMany({
      where: whereClause,
      include: {
        member: true,
      },
      skip,
      take: limit,
      orderBy: orderByClause,
    });

    const totalMemberLogs = await prisma.memberLog.count({
      where: whereClause,
    });
    const totalPages = Math.ceil(totalMemberLogs / limit);

    res.json({
      memberLogs,
      page,
      totalPages,
      totalMemberLogs,
    });
  } catch (error) {
    return res.status(500).json({
      errors: {
        message: "Failed to fetch members logs.",
        details: error.message,
      },
    });
  }
};
const myGenealogy = async (req, res, next) => {
  try {
    const { memberId } = req.params;
    let currentRightMemberId = parseInt(memberId); // starting point
    let rightMostMember = null;
    let leftMostMember = null;

    let currentLeftMemberId = parseInt(memberId); // starting point
    // Left start
    while (true) {
      const nextLeftMember = await prisma.member.findFirst({
        where: {
          parentId: currentLeftMemberId,
          positionToParent: LEFT, // assuming LEFT is a string constant or enum
        },
        select: {
          id: true,
          memberName: true,
          memberUsername: true,
        },
      });

      if (!nextLeftMember) {
        break; // no further left child found
      }

      leftMostMember = nextLeftMember;
      currentLeftMemberId = nextLeftMember.id;
    }
    // Left end

    // right start
    while (true) {
      const nextLeftMember = await prisma.member.findFirst({
        where: {
          parentId: currentRightMemberId,
          positionToParent: RIGHT, // assuming LEFT is a string constant or enum
        },
        select: {
          id: true,
          memberName: true,
          memberUsername: true,
        },
      });

      if (!nextLeftMember) {
        break; // no further left child found
      }

      rightMostMember = nextLeftMember;
      currentRightMemberId = nextLeftMember.id;
    }
    // right end

    const rootMember = await prisma.member.findUnique({
      where: { id: parseInt(memberId) },
      select: {
        id: true,
        memberName: true,
        memberUsername: true,
        positionToParent: true,
        status: true,
        leftAssociateBalance: true,
        leftSilverBalance: true,
        leftGoldBalance: true,
        leftDiamondBalance: true,
        rightAssociateBalance: true,
        rightSilverBalance: true,
        rightGoldBalance: true,
        rightDiamondBalance: true,
        totalLeftAssociateBalance: true,
        totalLeftSilverBalance: true,
        totalLeftGoldBalance: true,
        totalLeftDiamondBalance: true,
        totalRightAssociateBalance: true,
        totalRightSilverBalance: true,
        totalRightGoldBalance: true,
        totalRightDiamondBalance: true,
        totalAssociateMatched: true,
        totalSilverMatched: true,
        totalGoldMatched: true,
        totalDiamondMatched: true,
        associateCommissionCount: true,
        silverCommissionCount: true,
        goldCommissionCount: true,
        diamondCommissionCount: true,
        associateCommissionDate: true,
        silverCommissionDate: true,
        goldCommissionDate: true,
        diamondCommissionDate: true,
      },
    });

    const leftMember = await prisma.member.findFirst({
      where: {
        parentId: rootMember.id,
        positionToParent: LEFT,
      },
      select: {
        id: true,
        memberName: true,
        memberUsername: true,
        positionToParent: true,
        status: true,
      },
    });

    const leftsLeftMember = leftMember
      ? await prisma.member.findFirst({
          where: {
            parentId: leftMember.id,
            positionToParent: LEFT,
          },
          select: {
            id: true,
            memberName: true,
            memberUsername: true,
            positionToParent: true,
            status: true,
          },
        })
      : null;

    const leftsRightMember = leftMember
      ? await prisma.member.findFirst({
          where: {
            parentId: leftMember.id,
            positionToParent: RIGHT,
          },
          select: {
            id: true,
            memberName: true,
            memberUsername: true,
            positionToParent: true,
            status: true,
          },
        })
      : null;

    const rightMember = await prisma.member.findFirst({
      where: {
        parentId: rootMember.id,
        positionToParent: RIGHT,
      },
      select: {
        id: true,
        memberName: true,
        memberUsername: true,
        positionToParent: true,
        status: true,
      },
    });

    const rightsLeftMember = rightMember
      ? await prisma.member.findFirst({
          where: {
            parentId: rightMember.id,
            positionToParent: LEFT,
          },
          select: {
            id: true,
            memberName: true,
            memberUsername: true,
            positionToParent: true,
            status: true,
          },
        })
      : null;

    const rightsRightMember = rightMember
      ? await prisma.member.findFirst({
          where: {
            parentId: rightMember.id,
            positionToParent: RIGHT,
          },
          select: {
            id: true,
            memberName: true,
            memberUsername: true,
            positionToParent: true,
            status: true,
          },
        })
      : null;

    res.json({
      rootMember,
      leftMember,
      leftsLeftMember,
      leftsRightMember,
      rightMember,
      rightsLeftMember,
      rightsRightMember,
      leftMostMember: leftMostMember,
      rightMostMember: rightMostMember,
    });
  } catch (error) {
    return res.status(500).json({
      errors: {
        message: "Failed to fetch Genealogy.",
        details: error.message,
      },
    });
  }
};

// const myDirectReferralList = async (req, res, next) => {
//   try {
//     const memberId = req.user.member.id;

//     const rightReferrals = await prisma.member.findMany({
//       where: {
//         parentId: parseInt(memberId), // Ensure this parses the ID correctly
//         positionToParent: RIGHT, // Assuming RIGHT is a string enum or value
//       },
//       select: {
//         id: true,
//         memberName: true,
//         memberUsername: true,
//         positionToParent: true,
//         status: true,
//       },
//     });

//     const leftReferrals = await prisma.member.findMany({
//       where: {
//         parentId: parseInt(memberId), // Ensure this parses the ID correctly
//         positionToParent: LEFT, // Assuming RIGHT is a string enum or value
//       },
//       select: {
//         id: true,
//         memberName: true,
//         memberUsername: true,
//         positionToParent: true,
//         status: true,
//       },
//     });

//     res.json({
//       referrals: {
//         rightReferrals,
//         leftReferrals,
//       },
//     });
//   } catch (error) {
//     return res.status(500).json({
//       errors: {
//         message: "Failed to fetch Referrals.",
//         details: error.message,
//       },
//     });
//   }
// };

const myDirectReferralList = async (req, res, next) => {
  try {
    const memberId = req.query.currentMemberId || req.user.member.id; // 👈 Use query param if available

    // Pagination inputs
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Optional sorting
    const sortBy = req.query.sortBy || "id";
    const sortOrder = req.query.sortOrder === "desc" ? "desc" : "asc";

    // Optional search
    const search = req.query.search || "";

    // Build search condition
    const searchCondition = search
      ? {
          OR: [
            {
              memberName: {
                contains: search,
              },
            },
            {
              memberUsername: {
                contains: search,
              },
            },
            {
              positionToParent: {
                contains: search,
              },
            },
          ],
        }
      : {};

    // Combined referrals (LEFT or RIGHT)
    const referrals = await prisma.member.findMany({
      where: {
        sponsorId: parseInt(memberId),
        positionToParent: {
          in: [LEFT, RIGHT], // Assumes positionToParent is a string
        },
        ...searchCondition,
      },
      orderBy: {
        [sortBy]: sortOrder,
      },
      skip,
      take: limit,
      select: {
        id: true,
        memberName: true,
        memberUsername: true,
        positionToParent: true,
        status: true,
        pvBalance: true,
      },
    });

    // Count total referrals
    const totalReferrals = await prisma.member.count({
      where: {
        sponsorId: parseInt(memberId),
        positionToParent: {
          in: [LEFT, RIGHT],
        },
        ...searchCondition,
      },
    });

    const totalPages = Math.ceil(totalReferrals / limit);

    const currentMember = await prisma.member.findUnique({
      where: { id: parseInt(memberId) },
      select: {
        memberName: true,
      },
    });

    res.json({
      referrals,
      page,
      totalPages,
      totalReferrals,
      currentMemberName: currentMember.memberName,
    });
  } catch (error) {
    return res.status(500).json({
      errors: {
        message: "Failed to fetch referrals.",
        details: error.message,
      },
    });
  }
};

const getMembersWithPendingTransactions = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const search = req.query.search || "";
  const sortBy = req.query.sortBy || "id";
  const sortOrder = req.query.sortOrder || "desc";

  try {
    const whereClause = {
      walletTransactions: {
        some: {
          status: PENDING,
        },
      },
      OR: [
        { memberUsername: { contains: search } },
        { memberName: { contains: search } },
      ],
    };

    const members = await prisma.member.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: {
        [sortBy]: sortOrder,
      },
      include: {
        walletTransactions: {
          where: {
            status: PENDING,
          },
        },
      },
    });

    const totalMembers = await prisma.member.count({
      where: whereClause,
    });

    const totalPages = Math.ceil(totalMembers / limit);

    res.status(200).json({
      members,
      page,
      totalPages,
      totalMembers,
    });
  } catch (error) {
    console.error("Error fetching members with pending transactions:", error);
    res.status(500).json({
      message: "Failed to fetch members",
      details: error.message,
    });
  }
};

module.exports = {
  getMembers,
  getMemberById,
  updateMember,
  getAllMembers,
  getMemberLogs,
  myGenealogy,
  myDirectReferralList,
  getMembersWithPendingTransactions,
};
