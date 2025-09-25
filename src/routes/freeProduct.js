const express = require("express");
const router = express.Router();
const {
  getFreeProducts,
  getFreeProductById,
  createFreeProduct,
  updateFreeProduct,
} = require("../controllers/freeProductController");
const auth = require("../middleware/auth");
const acl = require("../middleware/acl");

/**
 * @swagger
 * tags:
 *   name: FreeProducts
 *   description: Free Product management endpoints
 */

/**
 * @swagger
 * /api/free-products:
 *   get:
 *     summary: Get all free products with pagination, sorting, and search
 *     tags: [FreeProducts]
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
 *         description: Number of free products per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by product name or quantity
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: id
 *         description: Field to sort by (e.g., id, quantity, product.productName)
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: asc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: List of free products
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 freeProducts:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       productId:
 *                         type: integer
 *                       quantity:
 *                         type: integer
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                       product:
 *                         type: object
 *                         properties:
 *                           productName:
 *                             type: string
 *                 page:
 *                   type: integer
 *                 totalPages:
 *                   type: integer
 *                 totalFreeProducts:
 *                   type: integer
 *       500:
 *         description: Failed to fetch free products
 */
router.get("/", auth, acl("free-products.read"), getFreeProducts);

/**
 * @swagger
 * /api/free-products:
 *   post:
 *     summary: Create a new free product
 *     tags: [FreeProducts]
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
 *               - quantity
 *             properties:
 *               productId:
 *                 type: integer
 *               quantity:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Free product created successfully
 *       400:
 *         description: Validation error
 *       500:
 *         description: Failed to create free product
 */
router.post("/", auth, acl("free-products.write"), createFreeProduct);

/**
 * @swagger
 * /api/free-products/{id}:
 *   get:
 *     summary: Get a free product by ID
 *     tags: [FreeProducts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the free product
 *     responses:
 *       200:
 *         description: Free product details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 productId:
 *                   type: integer
 *                 quantity:
 *                   type: integer
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *       404:
 *         description: Free product not found
 *       500:
 *         description: Failed to fetch free product
 */
router.get("/:id", auth, acl("free-products.read"), getFreeProductById);

/**
 * @swagger
 * /api/free-products/{id}:
 *   put:
 *     summary: Update a free product by ID
 *     tags: [FreeProducts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the free product to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *               - quantity
 *             properties:
 *               productId:
 *                 type: integer
 *               quantity:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Free product updated successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Free product not found
 *       500:
 *         description: Failed to update free product
 */
router.put("/:id", auth, acl("free-products.write"), updateFreeProduct);

module.exports = router;
