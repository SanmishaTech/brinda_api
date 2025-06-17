const express = require("express");
const router = express.Router();
const {
  getPurchases,
  createPurchase,
  getPurchaseById,
  DownloadPurchaseInvoice,
} = require("../controllers/purchaseController");
const auth = require("../middleware/auth");
const acl = require("../middleware/acl");

/**
 * @swagger
 * tags:
 *   name: Purchases
 *   description: Purchase management endpoints
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
 * /purchases:
 *   get:
 *     summary: Get all purchases with pagination, sorting, and search
 *     tags: [Purchases]
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
 *         description: Number of purchases per page
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
 *         description: List of all purchases
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 purchases:
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
 *                       purchaseDate:
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
 *                 totalPurchases:
 *                   type: integer
 *       500:
 *         description: Failed to fetch purchases
 */
router.get("/", auth, acl("purchases.read"), getPurchases);

/**
 * @swagger
 * /purchases:
 *   post:
 *     summary: Create a new purchase
 *     tags: [Purchases]
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
 *                 description: ID of the member making the purchase
 *                 example: 123
 *               invoiceNumber:
 *                 type: string
 *                 description: Invoice number for the purchase
 *                 example: "INV-001"
 *               purchaseDate:
 *                 type: string
 *                 format: date-time
 *                 description: Date of the purchase
 *                 example: "2023-10-01T12:00:00Z"
 *               totalAmountWithoutGst:
 *                 type: number
 *                 description: Total amount excluding GST
 *                 example: 1000.00
 *               totalAmountWithGst:
 *                 type: number
 *                 description: Total amount including GST
 *                 example: 1180.00
 *               totalGstAmount:
 *                 type: number
 *                 description: Total GST amount
 *                 example: 180.00
 *               totalPV:
 *                 type: number
 *                 description: Total PV (Point Value) for the purchase
 *                 example: 50.00
 *               purchaseDetails:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     productId:
 *                       type: integer
 *                       description: ID of the product
 *                       example: 10
 *                     quantity:
 *                       type: integer
 *                       description: Quantity of the product
 *                       example: 2
 *                     rate:
 *                       type: number
 *                       description: Rate per unit of the product
 *                       example: 500.00
 *                     gstPercent:
 *                       type: number
 *                       description: GST percentage applied to the product
 *                       example: 18.00
 *                     gstAmount:
 *                       type: number
 *                       description: GST amount for the product
 *                       example: 90.00
 *                     amountWithoutGst:
 *                       type: number
 *                       description: Total amount for the product excluding GST
 *                       example: 1000.00
 *                     amountWithGst:
 *                       type: number
 *                       description: Total amount for the product including GST
 *                       example: 1180.00
 *                     pvPerUnit:
 *                       type: number
 *                       description: PV (Point Value) per unit of the product
 *                       example: 25.00
 *                     totalPV:
 *                       type: number
 *                       description: Total PV for the product
 *                       example: 50.00
 *     responses:
 *       201:
 *         description: Purchase created successfully
 *       400:
 *         description: Bad request
 *       500:
 *         description: Failed to create purchase
 */
router.post("/", auth, acl("purchases.write"), createPurchase);

/**
 * @swagger
 * /purchases/{id}:
 *   get:
 *     summary: Get purchase by ID
 *     tags: [Purchases]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Purchase ID
 *     responses:
 *       200:
 *         description: Purchase details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 memberId:
 *                   type: integer
 *                 invoiceNumber:
 *                   type: string
 *                 purchaseDate:
 *                   type: string
 *                   format: date-time
 *                 totalAmountWithoutGst:
 *                   type: number
 *                 totalAmountWithGst:
 *                   type: number
 *                 totalGstAmount:
 *                   type: number
 *                 totalPV:
 *                   type: number
 *                 purchaseDetails:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       productId:
 *                         type: integer
 *                       quantity:
 *                         type: integer
 *                       rate:
 *                         type: number
 *                       gstPercent:
 *                         type: number
 *                       gstAmount:
 *                         type: number
 *                       amountWithoutGst:
 *                         type: number
 *                       amountWithGst:
 *                         type: number
 *                       pvPerUnit:
 *                         type: number
 *                       totalPV:
 *                         type: number
 *       404:
 *         description: Purchase not found
 *       500:
 *         description: Failed to fetch purchase
 */
router.get("/:id", auth, acl("purchases.read"), getPurchaseById);

/**
 * @swagger
 * /purchases/{id}/generate-invoice:
 *   get:
 *     summary: Generate and download the invoice for a purchase
 *     tags: [Purchases]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the purchase for which the invoice will be generated
 *     responses:
 *       200:
 *         description: Invoice generated and downloaded successfully
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Purchase not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Purchase details not found"
 *       500:
 *         description: Failed to generate invoice
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Failed to generate invoice"
 *                 details:
 *                   type: string
 *                   example: "Error details here"
 */
router.get(
  "/:uuid/:filename/:purchaseId/generate-invoice",
  auth,
  acl("purchases.read"),
  DownloadPurchaseInvoice
);
module.exports = router;
