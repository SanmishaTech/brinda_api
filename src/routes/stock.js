const express = require("express");
const router = express.Router();
const {
  getAdminStock,
  getFranchiseStock,
  addFranchiseStock,
  getAllBatchByProduct,
} = require("../controllers/stockController");
const auth = require("../middleware/auth");
const acl = require("../middleware/acl");

/**
 * @swagger
 * tags:
 *   name: Stock
 *   description: Stock management endpoints
 */

/**
 * @swagger
 * /api/stock/product-batches/{productId}:
 *   get:
 *     summary: Get all batches of a product from admin stock (no memberId)
 *     tags: [Stock]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         schema:
 *           type: integer
 *         required: true
 *         description: Product ID
 *     responses:
 *       200:
 *         description: List of batches for the product
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   productId:
 *                     type: integer
 *                   quantity:
 *                     type: integer
 *                   batchNumber:
 *                     type: string
 *                   expiryDate:
 *                     type: string
 *                     format: date
 *       500:
 *         description: Failed to fetch batches
 */
router.get(
  "/product-batches/:productId",
  auth,
  acl("stock.read"),
  getAllBatchByProduct
);

/**
 * @swagger
 * /api/stock/admin:
 *   get:
 *     summary: Get admin stock with pagination, sorting, and search
 *     tags: [Stock]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of records per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Invoice number search
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
 *         description: Admin stock list
 *       500:
 *         description: Failed to fetch admin stock
 */
router.get("/admin", auth, acl("stock.read"), getAdminStock);

/**
 * @swagger
 * /api/stock/franchise:
 *   get:
 *     summary: Get franchise stock for logged-in member
 *     tags: [Stock]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of records per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Invoice number search
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
 *         description: Franchise stock list
 *       500:
 *         description: Failed to fetch franchise stock
 */
router.get("/franchise", auth, acl("stock.read"), getFranchiseStock);

/**
 * @swagger
 * /api/stock/add-franchise-stock:
 *   post:
 *     summary: Transfer stock to franchise
 *     tags: [Stock]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *               - memberId
 *               - quantity
 *             properties:
 *               productId:
 *                 type: integer
 *               memberId:
 *                 type: integer
 *               quantity:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Franchise stock transferred successfully
 *       500:
 *         description: Failed to transfer franchise stock
 */
router.post(
  "/add-franchise-stock",
  auth,
  acl("stock.write"),
  addFranchiseStock
);

module.exports = router;
//add edit functionality
