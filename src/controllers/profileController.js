const bcrypt = require("bcrypt");
const prisma = require("../config/db");
const { z } = require("zod");
const createError = require("http-errors");
const validateRequest = require("../utils/validateRequest");
const parseDate = require("../utils/parseDate");
const getProfile = async (req, res, next) => {
  try {
    const userId = req.user.id; // Assuming `req.user` contains the authenticated user's data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
        member: {
          select: {
            id: true,
            memberUsername: true,
            memberName: true,
            memberEmail: true,
            memberMobile: true,
            memberState: true,
            tPin: true,
            memberDob: true,
            memberAddress: true,
            memberPincode: true,
            memberGender: true,
            panNumber: true,
            aadharNumber: true,
            bankName: true,
            bankAccountNumber: true,
            bankIfscCode: true,
            bankAccountType: true,
            positionToParent: true,
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
        },
      },
    });

    if (!user) {
      return res.status(404).json({ errors: { message: "User not found" } });
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
};

const updateProfile = async (req, res, next) => {
  // Define Zod schema for profile update validation
  const schema = z
    .object({
      name: z.string().optional(),
      email: z
        .string()
        .email("Email must be a valid email address.")
        .optional(),
    })
    .superRefine(async (data, ctx) => {
      const usrId = req.user.id; // Assuming `req.user` contains the authenticated user's data

      // Check if a user with the same email already exists, excluding the current user
      const existingUser = await prisma.user.findFirst({
        where: {
          email: data.email,
        },
        select: { id: true }, // We only need the id to compare
      });

      // If an existing user is found and it's not the current user
      if (existingUser && existingUser.id !== parseInt(usrId)) {
        ctx.addIssue({
          path: ["email"],
          message: `User with email ${data.email} already exists.`,
        });
      }
    });

  try {
    // Validate the request body using Zod
    const validationErrors = await validateRequest(schema, req.body, res);
    const userId = req.user.id; // Assuming `req.user` contains the authenticated user's data
    const { name, email } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(name && { name }),
        ...(email && { email }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json(updatedUser);
  } catch (error) {
    next(error);
  }
};

const updateUserProfile = async (req, res, next) => {
  // Define Zod schema for profile update validation
  const schema = z
    .object({
      name: z.string().optional(),
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
      panNumber: z
        .string()
        .refine((val) => val === "" || /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(val), {
          message: "Invalid PAN number format. Example: ABCDE1234F",
        })
        .optional(),
      aadharNumber: z
        .string()
        .max(12, "Aadhar number must be 12 digits.")
        .refine((val) => val === "" || /^[2-9]{1}[0-9]{11}$/.test(val), {
          message:
            "Aadhar number must be exactly 12 digits and cannot start with 0 or 1.",
        })
        .optional(),

      bankAccountNumber: z
        .string()
        .refine((val) => val === "" || /^[0-9]{9,18}$/.test(val), {
          message:
            "Invalid bank account number format. Must be between 9 and 18 digits.",
        })
        .optional(),
      bankIfscCode: z
        .string()
        .refine((val) => val === "" || /^[A-Z]{4}0[A-Z0-9]{6}$/.test(val), {
          message: "Invalid IFSC code format. Example: SBIN0001234",
        }),
    })
    .superRefine(async (data, ctx) => {
      const usrId = req.user.member.id; // Assuming `req.user` contains the authenticated user's data

      // Check if a user with the same email already exists, excluding the current user
      if (data.email) {
        const existingUser = await prisma.member.findFirst({
          where: {
            memberEmail: data.email,
          },
          select: { id: true }, // We only need the id to compare
        });

        // If an existing user is found and it's not the current user
        if (existingUser && existingUser.id !== parseInt(usrId)) {
          ctx.addIssue({
            path: ["email"],
            message: `User with email ${data.email} already exists.`,
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

        if (
          existingMemberMobile &&
          existingMemberMobile.id !== parseInt(usrId)
        ) {
          ctx.addIssue({
            path: ["mobile"],
            message: `Mobile ${data.mobile} already exists.`,
          });
        }
      }

      if (data.bankAccountNumber) {
        const existingMemberBank = await prisma.member.findFirst({
          where: {
            bankAccountNumber: data.bankAccountNumber,
          },
          select: { id: true },
        });

        if (existingMemberBank && existingMemberBank.id !== parseInt(usrId)) {
          ctx.addIssue({
            path: ["bankAccountNumber"],
            message: `Number ${data.bankAccountNumber} already exists.`,
          });
        }
      }

      // if (data.bankIfscCode) {
      //   const existingMemberIFSC = await prisma.member.findFirst({
      //     where: {
      //       bankIfscCode: data.bankIfscCode,
      //     },
      //     select: { id: true },
      //   });

      //   if (existingMemberIFSC && existingMemberIFSC.id !== parseInt(usrId)) {
      //     ctx.addIssue({
      //       path: ["bankIfscCode"],
      //       message: `IFSC ${data.bankIfscCode} already exists.`,
      //     });
      //   }
      // }

      if (data.panNumber) {
        const existingPanNumber = await prisma.member.findFirst({
          where: {
            panNumber: data.panNumber,
          },
          select: { id: true },
        });

        if (existingPanNumber && existingPanNumber.id !== parseInt(usrId)) {
          ctx.addIssue({
            path: ["panNumber"],
            message: `Pan Number ${data.panNumber} already exists.`,
          });
        }
      }
      if (data.aadharNumber) {
        const existingAadharNumber = await prisma.member.findFirst({
          where: {
            aadharNumber: data.aadharNumber,
          },
          select: { id: true },
        });

        if (
          existingAadharNumber &&
          existingAadharNumber.id !== parseInt(usrId)
        ) {
          ctx.addIssue({
            path: ["aadharNumber"],
            message: `Aadhar Number ${data.aadharNumber} already exists.`,
          });
        }
      }
    });

  try {
    // Validate the request body using Zod
    const validationErrors = await validateRequest(schema, req.body, res);
    const userId = req.user?.id; // Assuming `req.user` contains the authenticated user's data
    const {
      name,
      email,
      mobile,
      panNumber,
      aadharNumber,
      memberDob,
      memberAddress,
      memberPincode,
      bankName,
      bankAccountNumber,
      bankIfscCode,
      bankAccountType,
      tPin,
      memberGender,
      memberState,
    } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        name,
        email,
        mobile,
        member: {
          update: {
            memberName: name,
            memberEmail: email || null,
            memberMobile: mobile || null,
            panNumber: panNumber || null,
            aadharNumber: aadharNumber || null,
            memberDob: parseDate(memberDob),
            memberAddress: memberAddress || null,
            memberPincode: memberPincode ? parseInt(memberPincode) : null,
            bankName: bankName || null,
            bankAccountNumber: bankAccountNumber || null,
            bankIfscCode: bankIfscCode || null,
            bankAccountType: bankAccountType || null,
            tPin: tPin,
            memberGender: memberGender || null,
            memberState: memberState,
          },
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json(updatedUser);
  } catch (error) {
    next(error);
  }
};

const changePassword = async (req, res, next) => {
  // Define Zod schema for password change validation
  const schema = z.object({
    currentPassword: z.string().nonempty("Current password is required."),
    newPassword: z
      .string()
      .min(6, "New password must be at least 6 characters long.")
      .nonempty("New password is required."),
  });

  try {
    // Validate the request body using Zod
    const validationErrors = await validateRequest(schema, req.body, res);
    const userId = req.user.id; // Assuming `req.user` contains the authenticated user's data
    const { currentPassword, newPassword } = req.body;

    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      return res.status(404).json({ errors: { message: "User not found" } });
    }

    const isPasswordValid = currentPassword === user.password;

    if (!isPasswordValid) {
      return res
        .status(401)
        .json({ errors: { message: "Current password is incorrect" } });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { password: newPassword },
    });

    res.json({ message: "Password changed successfully" });
  } catch (error) {
    next(error);
  }
};

const getProfileStatus = async (req, res, next) => {
  try {
    res.json({
      status: req.user.member?.status,
      memberUsername: req.user.member?.memberUsername,
      isFranchise: req.user.member?.isFranchise,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProfile,
  updateProfile,
  changePassword,
  updateUserProfile,
  getProfileStatus,
};
