const express = require("express");
const router = express.Router();
const {
  getRepurchases,
  createRepurchase,
  getRepurchaseById,
  DownloadRepurchaseInvoice,
} = require("../controllers/repurchaseController");
const { getRepurchaseRecords } = require("../controllers/purchaseController");
const auth = require("../middleware/auth");
const acl = require("../middleware/acl");

/**
 * @swagger
 * tags:
 *   name: Repurchases
 *   description: Repurchase management endpoints
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
 * /repurchases/history:
 *   get:
 *     summary: Get all repurchases with pagination, sorting, and search
 *     tags: [Repurchases]
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
 *         description: Number of repurchases per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for invoice number or member name
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
 *         description: List of all repurchases
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 repurchases:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       memberId:
 *                         type: integer
 *                       invoiceNumber:
 *                         type: string
 *                       repurchaseDate:
 *                         type: string
 *                         format: date-time
 *                       totalAmountWithoutGst:
 *                         type: number
 *                       totalAmountWithGst:
 *                         type: number
 *                       totalGstAmount:
 *                         type: number
 *                       totalPV:
 *                         type: number
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
 *                 totalRepurchases:
 *                   type: integer
 *       500:
 *         description: Failed to fetch repurchases
 */
router.get("/history", auth, acl("repurchases.read"), getRepurchases);

/**
 * @swagger
 * /repurchases:
 *   get:
 *     summary: Get all repurchases with pagination, sorting, and search
 *     tags: [Repurchases]
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
 *         description: Number of repurchases per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for invoice number or member name
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
 *         description: List of all repurchases
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 repurchases:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       memberId:
 *                         type: integer
 *                       invoiceNumber:
 *                         type: string
 *                       repurchaseDate:
 *                         type: string
 *                         format: date-time
 *                       totalAmountWithoutGst:
 *                         type: number
 *                       totalAmountWithGst:
 *                         type: number
 *                       totalGstAmount:
 *                         type: number
 *                       totalPV:
 *                         type: number
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
 *                 totalRepurchases:
 *                   type: integer
 *       500:
 *         description: Failed to fetch repurchases
 */
router.get("/", auth, acl("repurchases.read"), getRepurchaseRecords);

/**
 * @swagger
 * /repurchases:
 *   post:
 *     summary: Create a new repurchase
 *     tags: [Repurchases]
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
 *               invoiceNumber:
 *                 type: string
 *               repurchaseDate:
 *                 type: string
 *                 format: date-time
 *               totalAmountWithoutGst:
 *                 type: number
 *               totalAmountWithGst:
 *                 type: number
 *               totalGstAmount:
 *                 type: number
 *               totalPV:
 *                 type: number
 *               repurchaseDetails:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     productId:
 *                       type: integer
 *                     quantity:
 *                       type: integer
 *                     rate:
 *                       type: number
 *                     gstPercent:
 *                       type: number
 *                     gstAmount:
 *                       type: number
 *                     amountWithoutGst:
 *                       type: number
 *                     amountWithGst:
 *                       type: number
 *                     pvPerUnit:
 *                       type: number
 *                     totalPV:
 *                       type: number
 *     responses:
 *       201:
 *         description: Repurchase created successfully
 *       400:
 *         description: Bad request
 *       500:
 *         description: Failed to create repurchase
 */
router.post("/", auth, acl("repurchases.write"), createRepurchase);

/**
 * @swagger
 * /repurchases/{id}:
 *   get:
 *     summary: Get repurchase by ID
 *     tags: [Repurchases]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Repurchase ID
 *     responses:
 *       200:
 *         description: Repurchase details
 *       404:
 *         description: Repurchase not found
 *       500:
 *         description: Failed to fetch repurchase
 */
router.get("/:id", auth, acl("repurchases.read"), getRepurchaseById);

/**
 * @swagger
 * /repurchases/{uuid}/{filename}/{repurchaseId}/generate-invoice:
 *   get:
 *     summary: Generate and download the invoice for a repurchase
 *     tags: [Repurchases]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: uuid
 *         schema:
 *           type: string
 *         required: true
 *       - in: path
 *         name: filename
 *         schema:
 *           type: string
 *         required: true
 *       - in: path
 *         name: repurchaseId
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the repurchase
 *     responses:
 *       200:
 *         description: Invoice downloaded successfully
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Repurchase not found
 *       500:
 *         description: Failed to generate invoice
 */
router.get(
  "/:uuid/:filename/:repurchaseId/generate-invoice",
  auth,
  acl("repurchases.read"),
  DownloadRepurchaseInvoice
);

module.exports = router;
