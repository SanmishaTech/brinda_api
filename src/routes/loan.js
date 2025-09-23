const express = require("express");
const router = express.Router();
const { AddLoanAmount } = require("../controllers/loanController"); // Adjust path if needed
const auth = require("../middleware/auth");
const acl = require("../middleware/acl");

/**
 * @swagger
 * tags:
 *   name: Loan
 *   description: Member loan management endpoints
 */

/**
 * @swagger
 * /api/loan/add:
 *   post:
 *     summary: Give a loan amount to a member
 *     tags: [Loan]
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
 *               - loanAmount
 *               - loanPercentage
 *             properties:
 *               memberId:
 *                 type: integer
 *                 example: 101
 *               loanAmount:
 *                 type: number
 *                 format: float
 *                 example: 5000.0
 *               loanPercentage:
 *                 type: number
 *                 format: float
 *                 example: 10
 *     responses:
 *       201:
 *         description: Loan Given Successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Loan Given Successfully.
 *       404:
 *         description: Member not found
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
 *                   example: Prisma error message
 */
router.post("/add", auth, acl("loan.write"), AddLoanAmount);

module.exports = router;
