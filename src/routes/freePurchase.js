const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const acl = require("../middleware/acl");
const {
  getFreePurchases,
  createFreePurchase,
  DownloadFreePurchaseInvoice,
  getFreePurchaseRecords,
} = require("../controllers/freePurchaseController");

/**
 * @swagger
 * tags:
 *   name: FreePurchases
 *   description: Free purchase management endpoints
 */

/**
 * @swagger
 * /free-purchases:
 *   get:
 *     summary: Get all free purchases with pagination, sorting, and search
 *     tags: [FreePurchases]
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
 *         description: Number of free purchases per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by invoice number or member name
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
 *         description: List of free purchases
 *       500:
 *         description: Failed to fetch free purchases
 */
router.get("/", auth, acl("free-purchases.read"), getFreePurchaseRecords);

/**
 * @swagger
 * /free-purchases/history:
 *   get:
 *     summary: Get free purchases history for a logged-in member
 *     tags: [FreePurchases]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search query
 *     responses:
 *       200:
 *         description: Free purchases for member
 *       500:
 *         description: Error fetching data
 */
router.get("/history", auth, acl("free-purchases.read"), getFreePurchases);

/**
 * @swagger
 * /free-purchases:
 *   post:
 *     summary: Create a new free purchase
 *     tags: [FreePurchases]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               freeProductDetails:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     freeProductId:
 *                       type: integer
 *                     quantity:
 *                       type: integer
 *     responses:
 *       202:
 *         description: Free Product Purchase Successfully.
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Failed to create free purchase
 */
router.post("/", auth, acl("free-purchases.write"), createFreePurchase);

/**
 * @swagger
 * /free-purchases/{uuid}/{filename}/{freePurchaseId}/generate-invoice:
 *   get:
 *     summary: Download the invoice for a free purchase
 *     tags: [FreePurchases]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: uuid
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID folder for invoice file
 *       - in: path
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *         description: PDF filename
 *       - in: path
 *         name: freePurchaseId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the free purchase
 *     responses:
 *       200:
 *         description: Invoice file downloaded
 *       403:
 *         description: Permission denied
 *       404:
 *         description: Invoice file not found
 *       500:
 *         description: Failed to download invoice
 */
router.get(
  "/:uuid/:filename/:freePurchaseId/generate-invoice",
  auth,
  acl("free-purchases.read"),
  DownloadFreePurchaseInvoice
);

module.exports = router;
