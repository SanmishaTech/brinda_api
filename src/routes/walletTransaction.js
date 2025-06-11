const express = require("express");
const router = express.Router();
const {
  getMemberTransactions,
  addWalletAmountRequest,
  updateWalletAmountRequest,
  getWalletTransactionById,
  getWalletTransactionsByMemberId,
  getWalletAmount,
} = require("../controllers/walletTransactionController");
const auth = require("../middleware/auth");
const acl = require("../middleware/acl");

/**
 * @swagger
 * tags:
 *   name: WalletTransactions
 *   description: Wallet transaction management endpoints
 */

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

/**
 * @swagger
 * /api/wallet-transactions/wallet-amount:
 *   get:
 *     summary: Get wallet balance for the authenticated member
 *     tags: [WalletTransactions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Wallet balance retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 walletBalance:
 *                   type: number
 *                   description: Current wallet balance of the member
 *                   example: 1500.75
 *       404:
 *         description: Member not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Member not found"
 *       500:
 *         description: Failed to fetch wallet balance
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Failed to fetch wallet amount"
 *                 details:
 *                   type: string
 *                   example: "Error details here"
 */
router.get(
  "/wallet-amount",
  auth,
  acl("walletTransactions.read"),
  getWalletAmount
);
/**
 * @swagger
 * /api/wallet-transactions/member/{memberId}:
 *   get:
 *     summary: Get all wallet transactions for a member with pagination, sorting, and search
 *     tags: [WalletTransactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: memberId
 *         schema:
 *           type: integer
 *         required: true
 *         description: Member ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of transactions per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for transaction type, status, or reference number
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: id
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: asc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: List of wallet transactions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 walletTransactions:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       memberId:
 *                         type: integer
 *                       amount:
 *                         type: number
 *                       type:
 *                         type: string
 *                       status:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                 page:
 *                   type: integer
 *                 totalPages:
 *                   type: integer
 *                 totalTransactions:
 *                   type: integer
 *       500:
 *         description: Failed to fetch wallet transactions
 */
router.get(
  "/member/:memberId",
  auth,
  acl("walletTransactions.read"),
  getWalletTransactionsByMemberId
);

/**
 * @swagger
 * /api/wallet-transactions:
 *   post:
 *     summary: Add a wallet amount request (CREDIT or DEBIT)
 *     tags: [WalletTransactions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               memberId:
 *                 type: integer
 *                 description: Member ID
 *               amount:
 *                 type: number
 *                 description: Amount to be credited or debited
 *               type:
 *                 type: string
 *                 enum: [CREDIT, DEBIT]
 *                 description: Type of transaction
 *               paymentMethod:
 *                 type: string
 *                 description: Payment method
 *               referenceNumber:
 *                 type: string
 *                 description: Reference number for the transaction
 *               notes:
 *                 type: string
 *                 description: Additional notes
 *     responses:
 *       201:
 *         description: Wallet transaction request created successfully
 *       400:
 *         description: Bad request
 *       500:
 *         description: Failed to create wallet transaction request
 */
router.post("/", auth, acl("walletTransactions.write"), addWalletAmountRequest);

/**
 * @swagger
 * /api/wallet-transactions/{id}:
 *   get:
 *     summary: Get wallet transaction by ID
 *     tags: [WalletTransactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Wallet transaction ID
 *     responses:
 *       200:
 *         description: Wallet transaction details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 memberId:
 *                   type: integer
 *                 amount:
 *                   type: number
 *                 type:
 *                   type: string
 *                 status:
 *                   type: string
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *       404:
 *         description: Wallet transaction not found
 *       500:
 *         description: Failed to fetch wallet transaction
 */

router.get(
  "/:id",
  auth,
  acl("walletTransactions.read"),
  getWalletTransactionById
);

/**
 * @swagger
 * /api/wallet-transactions/{id}:
 *   put:
 *     summary: Update a wallet amount request (e.g., approve or reject)
 *     tags: [WalletTransactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Wallet transaction ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [APPROVED, REJECTED]
 *                 description: Status of the transaction
 *               processedByAdminId:
 *                 type: integer
 *                 description: Admin ID who processed the transaction
 *     responses:
 *       200:
 *         description: Wallet transaction request updated successfully
 *       400:
 *         description: Bad request
 *       404:
 *         description: Wallet transaction not found
 *       500:
 *         description: Failed to update wallet transaction request
 */
router.put(
  "/:id",
  auth,
  acl("walletTransactions.write"),
  updateWalletAmountRequest
);

module.exports = router;
