const express = require("express");
const router = express.Router();
const {
  getMemberTransactions,
  addWalletAmountRequest,
  updateWalletAmountRequest,
  getWalletTransactionById,
  getWalletTransactionsByMemberId,
  getWalletAmount,
  transferAmount,
  withdrawAmount,
  depositAmount,
  getMemberByUsername,
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
 * /api/wallet-transactions/member:
 *   get:
 *     summary: Get wallet transactions for the authenticated member
 *     tags: [WalletTransactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *         description: Search term for transaction type, status, payment method, or reference number
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
 *         description: List of wallet transactions for the authenticated member
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
 *                       paymentMethod:
 *                         type: string
 *                       referenceNumber:
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Failed to fetch wallet transactions"
 *                 details:
 *                   type: string
 *                   example: "Error details here"
 */
router.get(
  "/member",
  auth,
  acl("walletTransactions.read"),
  getMemberTransactions
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

/**
 * @swagger
 * /api/wallet-transactions/transfer:
 *   post:
 *     summary: Transfer amount from one member to another
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
 *               amount:
 *                 type: number
 *                 description: Amount to transfer
 *                 example: 500
 *               memberId:
 *                 type: integer
 *                 description: Recipient member ID
 *                 example: 123
 *     responses:
 *       200:
 *         description: Amount transferred successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Amount transferred successfully"
 *                 transactions:
 *                   type: object
 *                   properties:
 *                     senderTransaction:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                         memberId:
 *                           type: integer
 *                         amount:
 *                           type: number
 *                         type:
 *                           type: string
 *                           example: "DEBIT"
 *                         status:
 *                           type: string
 *                           example: "APPROVED"
 *                         notes:
 *                           type: string
 *                           example: "Transferred ₹500 to member ID 123"
 *                     recipientTransaction:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                         memberId:
 *                           type: integer
 *                         amount:
 *                           type: number
 *                         type:
 *                           type: string
 *                           example: "CREDIT"
 *                         status:
 *                           type: string
 *                           example: "APPROVED"
 *                         notes:
 *                           type: string
 *                           example: "Received ₹500 from member ID 456"
 *       400:
 *         description: Insufficient wallet balance or invalid input
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Insufficient wallet balance"
 *       404:
 *         description: Recipient member not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Recipient member not found"
 *       500:
 *         description: Failed to transfer amount
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Failed to transfer amount"
 *                 details:
 *                   type: string
 *                   example: "Error details here"
 */
router.post("/transfer", auth, acl("walletTransactions.write"), transferAmount);

/**
 * @swagger
 * /api/wallet-transactions/deposit/{memberId}:
 *   post:
 *     summary: Deposit amount to a member's wallet
 *     tags: [WalletTransactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: memberId
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the member to deposit funds
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: number
 *                 description: Amount to deposit
 *                 example: 1000
 *               paymentMode:
 *                 type: string
 *                 description: Payment method used for the deposit
 *                 example: "Bank Transfer"
 *               referenceNumber:
 *                 type: string
 *                 description: Reference number for the transaction
 *                 example: "ABC123"
 *               notes:
 *                 type: string
 *                 description: Additional notes for the transaction
 *                 example: "Deposited by admin"
 *     responses:
 *       200:
 *         description: Amount deposited successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Amount deposited successfully"
 *                 result:
 *                   type: object
 *                   properties:
 *                     updatedMember:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                         memberName:
 *                           type: string
 *                         walletBalance:
 *                           type: number
 *                     depositTransaction:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                         memberId:
 *                           type: integer
 *                         amount:
 *                           type: number
 *                         type:
 *                           type: string
 *                           example: "CREDIT"
 *                         transactionDate:
 *                           type: string
 *                           format: date-time
 *                         status:
 *                           type: string
 *                           example: "APPROVED"
 *                         paymentMethod:
 *                           type: string
 *                         referenceNumber:
 *                           type: string
 *                         notes:
 *                           type: string
 *                         processedByAdminId:
 *                           type: integer
 *       404:
 *         description: Member not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Recipient member not found"
 *       500:
 *         description: Failed to deposit amount
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Failed to deposit amount"
 *                 details:
 *                   type: string
 *                   example: "Error details here"
 */
router.post(
  "/deposit/:memberId",
  auth,
  acl("walletTransactions.write"),
  depositAmount
);

/**
 * @swagger
 * /api/wallet-transactions/withdraw/{memberId}:
 *   post:
 *     summary: Withdraw amount from a member's wallet
 *     tags: [WalletTransactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: memberId
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the member to withdraw funds
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: number
 *                 description: Amount to withdraw
 *                 example: 500
 *               paymentMode:
 *                 type: string
 *                 description: Payment method used for the withdrawal
 *                 example: "Bank Transfer"
 *               referenceNumber:
 *                 type: string
 *                 description: Reference number for the transaction
 *                 example: "XYZ456"
 *               notes:
 *                 type: string
 *                 description: Additional notes for the transaction
 *                 example: "Withdrawn by admin"
 *     responses:
 *       200:
 *         description: Amount withdrawn successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Amount withdrawn successfully"
 *                 result:
 *                   type: object
 *                   properties:
 *                     updatedMember:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                         memberName:
 *                           type: string
 *                         walletBalance:
 *                           type: number
 *                     withdrawalTransaction:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                         memberId:
 *                           type: integer
 *                         amount:
 *                           type: number
 *                         type:
 *                           type: string
 *                           example: "DEBIT"
 *                         transactionDate:
 *                           type: string
 *                           format: date-time
 *                         status:
 *                           type: string
 *                           example: "APPROVED"
 *                         paymentMethod:
 *                           type: string
 *                         referenceNumber:
 *                           type: string
 *                         notes:
 *                           type: string
 *                         processedByAdminId:
 *                           type: integer
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
 *       400:
 *         description: Insufficient wallet balance
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Insufficient wallet balance"
 *       500:
 *         description: Failed to withdraw amount
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Failed to withdraw amount"
 *                 details:
 *                   type: string
 *                   example: "Error details here"
 */
router.post(
  "/withdraw/:memberId",
  auth,
  acl("walletTransactions.write"),
  withdrawAmount
);

/**
 * @swagger
 * /api/wallet-transactions/member/{username}:
 *   get:
 *     summary: Get member details by username
 *     tags: [Members]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: username
 *         schema:
 *           type: string
 *         required: true
 *         description: Username of the member
 *     responses:
 *       200:
 *         description: Member details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                   description: Member ID
 *                   example: 123
 *                 username:
 *                   type: string
 *                   description: Username of the member
 *                   example: "john_doe"
 *                 memberName:
 *                   type: string
 *                   description: Full name of the member
 *                   example: "John Doe"
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
 *         description: Failed to fetch member details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Failed to fetch member details"
 *                 details:
 *                   type: string
 *                   example: "Error details here"
 */
router.get(
  "/member-username/:username",
  auth,
  acl("walletTransactions.write"),
  getMemberByUsername
);
module.exports = router;
