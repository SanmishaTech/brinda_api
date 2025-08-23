const express = require("express");

const router = express.Router();
const authController = require("../controllers/authController");
const auth = require("../middleware/auth");
const acl = require("../middleware/acl");
/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication and user management endpoints
 */

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Full name of the user
 *               email:
 *                 type: string
 *                 description: Email address of the user
 *               password:
 *                 type: string
 *                 description: Password for the user account
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Bad request (e.g., email already exists)
 *       403:
 *         description: Registration is disabled
 */
router.post("/register", authController.register);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login a user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 description: Email address of the user
 *               password:
 *                 type: string
 *                 description: Password for the user account
 *     responses:
 *       200:
 *         description: Successful login
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   description: JWT token for authentication
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     email:
 *                       type: string
 *                     role:
 *                       type: string
 *                     active:
 *                       type: boolean
 *                     lastLogin:
 *                       type: string
 *       400:
 *         description: Bad request
 *       401:
 *         description: Invalid email or password
 *       403:
 *         description: Account is inactive
 */
router.post("/login", authController.login);

/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     summary: Request a password reset link
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 description: Email address of the user
 *     responses:
 *       200:
 *         description: Password reset link sent successfully
 *       400:
 *         description: Bad request
 *       404:
 *         description: User not found
 */
router.post("/forgot-password", authController.forgotPassword);

/**
 * @swagger
 * /auth/reset-password/{token}:
 *   post:
 *     summary: Reset the password using the reset token
 *     tags: [Auth]
 *     parameters:
 *       - in: path
 *         name: token
 *         schema:
 *           type: string
 *         required: true
 *         description: Password reset token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               password:
 *                 type: string
 *                 description: New password for the user account
 *     responses:
 *       200:
 *         description: Password reset successful
 *       400:
 *         description: Invalid or expired token
 */
router.post("/reset-password/:token", authController.resetPassword);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout a user
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Logged out successfully
 */
router.post("/logout", (req, res) => {
  res.json({ message: "Logged out" });
});

/**
 * @swagger
 * /auth/{username}:
 *   get:
 *     summary: Get sponsor name by username
 *     tags: [auth]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: username
 *         schema:
 *           type: string
 *         required: true
 *         description: Username of the sponsor
 *     responses:
 *       200:
 *         description: Sponsor name retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sponsor:
 *                   type: object
 *                   properties:
 *                     memberName:
 *                       type: string
 *                       example: "John Doe"
 *       404:
 *         description: Sponsor not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Sponsor not found"
 *       500:
 *         description: Failed to fetch sponsor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Failed to fetch sponsor"
 *                 details:
 *                   type: string
 *                   example: "Error details here"
 */
router.get("/:username", authController.getSponsorNameByUsername);

/**
 * @swagger
 * /auth/impersonate:
 *   post:
 *     summary: Admin impersonates a user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *             properties:
 *               userId:
 *                 type: string
 *                 description: ID of the user to impersonate
 *     responses:
 *       200:
 *         description: Impersonation successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   description: JWT token as impersonated user
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     memberId:
 *                       type: string
 *                     name:
 *                       type: string
 *                     email:
 *                       type: string
 *                     role:
 *                       type: string
 *                     username:
 *                       type: string
 *                     impersonating:
 *                       type: boolean
 *                     lastLogin:
 *                       type: string
 *                     status:
 *                       type: string
 *       403:
 *         description: Only admins can impersonate users
 *       404:
 *         description: User not found
 *       500:
 *         description: Failed to impersonate user
 */
router.post(
  "/impersonate/:userId",
  auth,
  acl("auth.impersonate"),
  authController.impersonateUser
);

/**
 * @swagger
 * /auth/back-to-admin:
 *   post:
 *     summary: Revert back to admin from impersonated session
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully reverted to admin
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   description: New JWT token as admin
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     memberId:
 *                       type: string
 *                     name:
 *                       type: string
 *                     email:
 *                       type: string
 *                     role:
 *                       type: string
 *                     username:
 *                       type: string
 *                     impersonating:
 *                       type: boolean
 *                     lastLogin:
 *                       type: string
 *                     status:
 *                       type: string
 *       403:
 *         description: Not impersonating any user or original admin not found
 *       500:
 *         description: Error reverting to admin
 */
router.post(
  "/back-to-admin",
  auth,
  // acl("auth.backToAdmin"),
  authController.backToAdmin
);

module.exports = router;
