const express = require("express");
const router = express.Router();
const {
  getAllFranchise,
  makeFranchise,
  AddSecurityDepositAmount,
  FranchiseDashboard,
} = require("../controllers/franchiseController");
const auth = require("../middleware/auth");
const acl = require("../middleware/acl");

/**
 * @swagger
 * tags:
 *   name: Franchise
 *   description: Franchise (Member) management endpoints
 */

/**
 * @swagger
 * /api/franchise:
 *   get:
 *     summary: Get all franchise members without pagination
 *     tags: [Franchise]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all franchise members
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   memberName:
 *                     type: string
 *                   memberUsername:
 *                     type: string
 *       500:
 *         description: Failed to fetch franchise
 */
router.get("/all", auth, acl("franchise.read"), getAllFranchise);

/**
 * @swagger
 * /api/franchise/dashboard:
 *   get:
 *     summary: Get Franchise Dashboard data for the logged-in member
 *     tags: [Franchise]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Franchise dashboard data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 securityDepositAmount:
 *                   type: number
 *                   format: float
 *                   example: 10000
 *                 isFranchise:
 *                   type: boolean
 *                   example: true
 *                 securityDepositPending:
 *                   type: number
 *                   format: float
 *                   example: 3000
 *                 franchiseCommission:
 *                   type: number
 *                   format: float
 *                   example: 1500
 *                 securityDepositReturn:
 *                   type: number
 *                   format: float
 *                   example: 2000
 *                 franchiseWalletBalance:
 *                   type: number
 *                   format: float
 *                   example: 5000
 *       401:
 *         description: Unauthorized - user not authenticated
 *       500:
 *         description: Server error - failed to fetch dashboard data
 */
router.get("/dashboard", auth, acl("franchise.read"), FranchiseDashboard);

/**
 * @swagger
 * /api/franchise/add:
 *   post:
 *     summary: Convert a member into a franchise
 *     tags: [Franchise]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - memberId
 *               - influencerId
 *               - securityDepositAmount
 *             properties:
 *               memberId:
 *                 type: integer
 *                 example: 101
 *               influencerId:
 *                 type: integer
 *                 example: 202
 *               securityDepositAmount:
 *                 type: number
 *                 format: float
 *                 example: 5000
 *     responses:
 *       201:
 *         description: Member successfully converted to franchise
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Franchise created successfully
 *       400:
 *         description: Invalid input or member already a franchise
 *       500:
 *         description: Server error
 */

router.post("/add", auth, acl("franchise.write"), makeFranchise);

/**
 * @swagger
 * /api/franchise/security-deposit:
 *   post:
 *     summary: Add security deposit amount to a member
 *     tags: [Franchise]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - memberId
 *               - securityDepositAmount
 *             properties:
 *               memberId:
 *                 type: integer
 *                 example: 101
 *               securityDepositAmount:
 *                 type: number
 *                 format: float
 *                 example: 5000.0
 *     responses:
 *       201:
 *         description: Security Deposit amount incremented successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Security Deposit amount incremented successfully
 *       500:
 *         description: Failed to add deposit amount
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Failed to add deposit amount
 *                 details:
 *                   type: string
 *                   example: Member not found
 */
router.post(
  "/security-deposit",
  auth,
  acl("franchise.write"),
  AddSecurityDepositAmount
);

module.exports = router;
