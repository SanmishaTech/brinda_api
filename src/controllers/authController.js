const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const { z } = require("zod");
const prisma = require("../config/db");
const emailService = require("../services/emailService");
const validateRequest = require("../utils/validateRequest");
const config = require("../config/config");
const createError = require("http-errors");
const jwtConfig = require("../config/jwt");
const { SUPER_ADMIN } = require("../config/roles");
const { generatePassword } = require("../utils/generatePassword");
const dayjs = require("dayjs");
const { findParent } = require("../utils/findParent");
const { LEFT, RIGHT } = require("../config/data");
const { updateCount } = require("../utils/updateCount");
const { generateTPin } = require("../utils/generateTPin");
// Register a new user
const MAX_RETRIES = 3;

const register = async (req, res, next) => {
  if (process.env.ALLOW_REGISTRATION !== "true") {
    return res
      .status(403)
      .json({ errors: { message: "Registration is disabled" } });
  }

  const schema = z
    .object({
      name: z
        .string()
        .min(1, "Name cannot be left blank.") // Ensuring minimum length of 2
        .max(100, "Name must not exceed 100 characters.")
        .refine((val) => /^[A-Za-z\s\u0900-\u097F]+$/.test(val), {
          message: "Name can only contain letters.",
        }),
      sponsorId: z
        .string()
        .length(10, "Sponsor ID must be exactly 10 characters."),
      position: z.string().min(1, "Position is required."),
      state: z.string().min(1, "State field is required."),
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
    })
    .superRefine(async (data, ctx) => {
      if (data.email) {
        const existingEmail = await prisma.member.findFirst({
          where: { memberEmail: data.email },
        });
        if (existingEmail) {
          ctx.addIssue({
            path: ["email"],
            message: `Email already exists.`,
            code: z.ZodIssueCode.custom,
          });
        }
      }

      if (data.mobile) {
        const existingMobile = await prisma.member.findFirst({
          where: { memberMobile: data.mobile },
        });
        if (existingMobile) {
          ctx.addIssue({
            path: ["mobile"],
            message: `Mobile number ${data.mobile} already exists.`,
            code: z.ZodIssueCode.custom,
          });
        }
      }
    });

  try {
    await validateRequest(schema, req.body, res);
    const { name, sponsorId, position, email, mobile, state } = req.body;
    const password = generatePassword(6);
    const tPin = generateTPin(4);
    let attempt = 0;
    let result = null;
    const sponsorData = await prisma.member.findUnique({
      where: { memberUsername: sponsorId },
      select: { id: true },
    });

    if (!sponsorData) {
      return res.status(500).json({
        errors: {
          message: "Invalid Sponsor ID",
        },
      });
    }

    const parentData = await findParent(sponsorId, position);

    while (attempt < MAX_RETRIES) {
      try {
        result = await prisma.$transaction(async (tx) => {
          const now = dayjs();
          const prefix = now.format("MMYY");

          const latest = await tx.member.findFirst({
            where: {
              memberUsername: {
                startsWith: prefix,
              },
            },
            orderBy: {
              memberUsername: "desc",
            },
          });

          let newNumber = 1;
          if (latest) {
            const lastNumber = parseInt(latest.memberUsername.slice(4), 10);
            newNumber = lastNumber + 1;
          }

          const username = `${prefix}${String(newNumber).padStart(6, "0")}`;

          const newUser = await tx.user.create({
            data: {
              name,
              username,
              email,
              mobile,
              password: "abcd123",
              role: config.defaultUserRole,
              member: {
                create: {
                  memberName: name,
                  memberUsername: username,
                  sponsorId: sponsorData.id,
                  parentId: parentData.id,
                  tPin,
                  memberEmail: email,
                  memberMobile: mobile,
                  memberState: state,
                  positionToParent: position,
                  // walletBalance: 99999999,
                },
              },
            },
            include: {
              member: true,
            },
          });

          // updateCount(newUser.member);

          return { newUser };
        });

        // Success: exit retry loop
        break;
      } catch (err) {
        if (
          err.code === "P2002" &&
          err.meta?.target?.includes("memberUsername")
        ) {
          // Duplicate username: retry
          attempt++;
          if (attempt >= MAX_RETRIES)
            throw new Error(
              "Failed to generate unique username after several attempts."
            );
        } else {
          throw err; // Unknown error: rethrow
        }
      }
    }

    res.status(201).json(result.newUser);
  } catch (error) {
    return res.status(500).json({
      errors: {
        message: "Internal Server Error",
        details: error.message,
      },
    });
  }
};

const login = async (req, res, next) => {
  const schema = z.object({
    username: z.string().min(1, "Username field is required."),
    password: z.string().min(6, "Password must be at least 6 characters long"),
  });

  try {
    const validationErrors = await validateRequest(schema, req.body, res);

    const { username, password } = req.body;
    const user = await prisma.user.findUnique({
      where: { username },
      include: { member: true },
    });

    if (!user || password !== user.password) {
      return res
        .status(401)
        .json({ errors: { message: "Invalid Username or Password" } });
    }

    if (!user.active) {
      return res
        .status(403)
        .json({ errors: { message: "Account is inactive" } });
    }
    const token = jwt.sign({ userId: user.id }, jwtConfig.secret, {
      expiresIn: jwtConfig.expiresIn,
    });

    // Check if the user is a super_admin
    // Update lastLogin timestamp
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    return res.json({
      token,
      user: {
        id: user.id,
        memberId: user.member?.id,
        name: user.name,
        email: user.email,
        role: user.role,
        lastLogin: user.lastLogin,
        username: username,
      },
    });
  } catch (error) {
    return res.status(500).json({
      errors: {
        message: "Internal Server Error",
        details: error.message,
      },
    });
  }
};
const forgotPassword = async (req, res, next) => {
  const schema = z.object({
    email: z
      .string()
      .email("Invalid Email format")
      .nonempty("Email is required"),
  });

  try {
    const validationErrors = await validateRequest(schema, req.body, res);
    const { email, resetUrl } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return setTimeout(() => {
        res.status(404).json({ errors: { message: "User not found" } });
      }, 3000);
    }

    const resetToken = uuidv4();
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpires: new Date(Date.now() + 3600000), // Token expires in 1 hour
      },
    });
    const resetLink = `${resetUrl}/${resetToken}`; // Replace with your actual domain
    const templateData = {
      name: user.name,
      resetLink,
      appName: config.appName,
    };
    await emailService.sendEmail(
      email,
      "Password Reset Request",
      "passwordReset",
      templateData
    );

    res.json({ message: "Password reset link sent" });
  } catch (error) {
    next(error);
  }
};

const resetPassword = async (req, res, next) => {
  const schema = z.object({
    password: z.string().min(6, "Password must be at least 6 characters long"),
  });

  try {
    // Use the reusable validation function
    const validationErrors = await validateRequest(schema, req.body, res);
    const { password } = req.body;
    const { token } = req.body;

    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpires: { gt: new Date() }, // Check if the token is not expired
      },
    });

    if (!user) {
      return res
        .status(400)
        .json({ errors: { message: "Invalid or expired token" } });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null, // Clear the token after use
        resetTokenExpires: null,
      },
    });
    res.json({ message: "Password reset successful" });
  } catch (error) {
    next(error);
  }
};

/**
 * Get sponsor name by username
 */
const getSponsorNameByUsername = async (req, res) => {
  const { username } = req.params;

  try {
    // Fetch the sponsor by username
    const sponsor = await prisma.member.findUnique({
      where: { memberUsername: username },
      select: { memberName: true, id: true },
    });

    if (!sponsor) {
      return res.status(500).json({
        message: "Sponsor not found",
      });
    }

    res.status(200).json({
      name: sponsor.memberName,
      id: sponsor.id,
    });
  } catch (error) {
    console.error("Error fetching sponsor:", error);
    res.status(500).json({
      message: "Failed to fetch sponsor",
      details: error.message,
    });
  }
};

module.exports = {
  register,
  login,
  forgotPassword,
  resetPassword,
  getSponsorNameByUsername,
};
