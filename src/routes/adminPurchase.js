const express = require("express");
const router = express.Router();
const {
  getAdminPurchases,
  createAdminPurchase,
  getAdminPurchaseById,
  updateAdminPurchase,
} = require("../controllers/adminPurchaseController");
const auth = require("../middleware/auth");
const acl = require("../middleware/acl");

/**
 * @swagger
 * tags:
 *   name: Admin Purchases
 *   description: Admin Purchase management endpoints
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
 * /admin-purchases:
 *   get:
 *     summary: Get all admin purchases with pagination, sorting, and search
 *     tags: [Admin Purchases]
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
 *         description: Number of admin purchases per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for invoice number
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
 *         description: List of all admin purchases
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 adminPurchases:
 *                   type: array
 *                   items:
 *                     type: object
 *                 page:
 *                   type: integer
 *                 totalPages:
 *                   type: integer
 *                 totalAdminPurchases:
 *                   type: integer
 *       500:
 *         description: Failed to fetch admin purchases
 */
router.get("/", auth, acl("adminPurchases.read"), getAdminPurchases);

/**
 * @swagger
 * /admin-purchases:
 *   post:
 *     summary: Create a new admin purchase
 *     tags: [Admin Purchases]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               totalAmountWithoutGst:
 *                 type: string
 *                 example: "1000.00"
 *               totalAmountWithGst:
 *                 type: string
 *                 example: "1180.00"
 *               totalGstAmount:
 *                 type: string
 *                 example: "180.00"
 *               purchaseDate:
 *                 type: string
 *                 format: date-time
 *                 example: "2023-10-01T00:00:00Z"
 *               invoiceDate:
 *                 type: string
 *                 format: date-time
 *                 example: "2023-10-01T00:00:00Z"
 *               receivedDate:
 *                 type: string
 *                 format: date-time
 *                 example: "2023-10-01T00:00:00Z"
 *               adminPurchaseDetails:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     productId:
 *                       type: integer
 *                       example: 1
 *                     quantity:
 *                       type: integer
 *                       example: 10
 *                     rate:
 *                       type: string
 *                       example: "100.00"
 *                     batchNumber:
 *                       type: string
 *                       example: "BATCH123"
 *                     expiryDate:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-12-31T00:00:00Z"
 *                     netUnitRate:
 *                       type: string
 *                       example: "90.00"
 *                     cgstPercent:
 *                       type: string
 *                       example: "9.00"
 *                     sgstPercent:
 *                       type: string
 *                       example: "9.00"
 *                     igstPercent:
 *                       type: string
 *                       example: "0.00"
 *                     cgstAmount:
 *                       type: string
 *                       example: "90.00"
 *                     sgstAmount:
 *                       type: string
 *                       example: "90.00"
 *                     igstAmount:
 *                       type: string
 *                       example: "0.00"
 *                     amountWithoutGst:
 *                       type: string
 *                       example: "1000.00"
 *                     amountWithGst:
 *                       type: string
 *                       example: "1180.00"
 *     responses:
 *       201:
 *         description: Admin purchase created successfully
 *       400:
 *         description: Bad request
 *       500:
 *         description: Failed to create admin purchase
 */
router.post("/", auth, acl("adminPurchases.write"), createAdminPurchase);

/**
 * @swagger
 * /admin-purchases/{id}:
 *   get:
 *     summary: Get admin purchase by ID
 *     tags: [Admin Purchases]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the admin purchase
 *     responses:
 *       200:
 *         description: Admin purchase details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       404:
 *         description: Admin purchase not found
 *       500:
 *         description: Failed to fetch admin purchase
 */
router.get(
  "/:adminPurchaseId",
  auth,
  acl("adminPurchases.read"),
  getAdminPurchaseById
);

/**
 * @swagger
 * /admin-purchases/{id}:
 *   put:
 *     summary: Update an existing admin purchase
 *     tags: [Admin Purchases]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the admin purchase to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               totalAmountWithoutGst:
 *                 type: string
 *                 example: "1000.00"
 *               totalAmountWithGst:
 *                 type: string
 *                 example: "1180.00"
 *               totalGstAmount:
 *                 type: string
 *                 example: "180.00"
 *               purchaseDate:
 *                 type: string
 *                 format: date-time
 *                 example: "2023-10-01T00:00:00Z"
 *               invoiceDate:
 *                 type: string
 *                 format: date-time
 *                 example: "2023-10-01T00:00:00Z"
 *               receivedDate:
 *                 type: string
 *                 format: date-time
 *                 example: "2023-10-01T00:00:00Z"
 *               invoiceNumber:
 *                 type: string
 *                 example: "INV-1001"
 *               adminPurchaseDetails:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     productId:
 *                       type: integer
 *                       example: 1
 *                     quantity:
 *                       type: integer
 *                       example: 10
 *                     rate:
 *                       type: string
 *                       example: "100.00"
 *                     batchNumber:
 *                       type: string
 *                       example: "BATCH123"
 *                     expiryDate:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-12-31T00:00:00Z"
 *                     netUnitRate:
 *                       type: string
 *                       example: "90.00"
 *                     cgstPercent:
 *                       type: string
 *                       example: "9.00"
 *                     sgstPercent:
 *                       type: string
 *                       example: "9.00"
 *                     igstPercent:
 *                       type: string
 *                       example: "0.00"
 *                     cgstAmount:
 *                       type: string
 *                       example: "90.00"
 *                     sgstAmount:
 *                       type: string
 *                       example: "90.00"
 *                     igstAmount:
 *                       type: string
 *                       example: "0.00"
 *                     amountWithoutGst:
 *                       type: string
 *                       example: "1000.00"
 *                     amountWithGst:
 *                       type: string
 *                       example: "1180.00"
 *     responses:
 *       201:
 *         description: Admin purchase updated successfully
 *       400:
 *         description: Bad request
 *       404:
 *         description: Admin purchase not found
 *       500:
 *         description: Failed to update admin purchase
 */
router.put(
  "/:adminPurchaseId",
  auth,
  acl("adminPurchases.write"),
  updateAdminPurchase
);

module.exports = router;
