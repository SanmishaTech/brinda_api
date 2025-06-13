const { PrismaClient, Prisma } = require("@prisma/client");
const validateRequest = require("../utils/validateRequest");
const prisma = new PrismaClient();
const { z } = require("zod");

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
  const { name, email, mobile, password } = req.body;

  try {
    const updatedMember = await prisma.member.update({
      where: { id: parseInt(id) },
      data: {
        memberName: name,
        memberEmail: email || null,
        memberMobile: mobile || null,
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
 * Delete member by ID
//  */
// const deleteMember = async (req, res) => {
//   const { id } = req.params;

//   try {
//     await prisma.member.delete({
//       where: { id: parseInt(id) },
//     });

//     res.status(200).json({
//       message: "Member deleted successfully",
//     });
//   } catch (error) {
//     if (
//       error.code === "P2003" ||
//       error.message.includes("Foreign key constraint failed")
//     ) {
//       return res.status(409).json({
//         errors: {
//           message:
//             "Cannot delete this Member because it is referenced in related data.",
//         },
//       });
//     }
//     if (error.code === "P2025") {
//       return res.status(404).json({ errors: { message: "Member not found" } });
//     }

//     return res.status(500).json({
//       message: "Failed to delete member",
//       details: error.message,
//     });
//   }
// };

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

module.exports = {
  getMembers,
  getMemberById,
  updateMember,
  // deleteMember,
  getAllMembers,
};
