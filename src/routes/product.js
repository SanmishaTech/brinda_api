const express = require("express");
const router = express.Router();
const {
  getProducts,
  createProduct,
  getProductById,
  updateProduct,
  deleteProduct,
  getAllProducts,
} = require("../controllers/productController");
const auth = require("../middleware/auth");
const acl = require("../middleware/acl");

/**
 * @swagger
 * tags:
 *   name: Products
 *   description: Product management endpoints
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
 * /api/products:
 *   get:
 *     summary: Get all products with pagination, sorting, and search
 *     tags: [Products]
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
 *         description: Number of products per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for product name
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
 *         description: List of all products
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 products:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       productName:
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
 *                 totalProducts:
 *                   type: integer
 *       500:
 *         description: Failed to fetch products
 */
router.get("/", auth, acl("products.read"), getProducts);

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Create a new product
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               productName:
 *                 type: string
 *                 description: Name of the product
 *               hsnCode:
 *                 type: string
 *                 description: HSN code of the product
 *               mrp:
 *                 type: number
 *                 description: Maximum Retail Price
 *               mfgRate:
 *                 type: number
 *                 description: Manufacturing rate
 *               gst:
 *                 type: number
 *                 description: GST percentage
 *               dspRate:
 *                 type: number
 *                 description: Distributor Selling Price
 *               pv:
 *                 type: number
 *                 description: Point Value
 *               bv:
 *                 type: number
 *                 description: Business Volume
 *               bvPrice:
 *                 type: number
 *                 description: Business Volume Price
 *     responses:
 *       201:
 *         description: Product created successfully
 *       400:
 *         description: Bad request
 *       500:
 *         description: Failed to create product
 */
router.post("/", auth, acl("products.write"), createProduct);

/**
 * @swagger
 * /api/products/all:
 *   get:
 *     summary: Get all products without pagination, sorting, and search
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all products
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   productName:
 *                     type: string
 *       500:
 *         description: Failed to fetch products
 */
router.get("/all", auth, acl("products.read"), getAllProducts);

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Get product by ID
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 productName:
 *                   type: string
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *       404:
 *         description: Product not found
 *       500:
 *         description: Failed to fetch product
 */
router.get("/:id", auth, acl("products.read"), getProductById);

/**
 * @swagger
 * /api/products/{id}:
 *   put:
 *     summary: Update product by ID
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Product ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               productName:
 *                 type: string
 *                 description: Name of the product
 *               hsnCode:
 *                 type: string
 *                 description: HSN code of the product
 *               mrp:
 *                 type: number
 *                 description: Maximum Retail Price
 *               mfgRate:
 *                 type: number
 *                 description: Manufacturing rate
 *               gst:
 *                 type: number
 *                 description: GST percentage
 *               dspRate:
 *                 type: number
 *                 description: Distributor Selling Price
 *               pv:
 *                 type: number
 *                 description: Point Value
 *               bv:
 *                 type: number
 *                 description: Business Volume
 *               bvPrice:
 *                 type: number
 *                 description: Business Volume Price
 *     responses:
 *       200:
 *         description: Product updated successfully
 *       400:
 *         description: Bad request
 *       404:
 *         description: Product not found
 *       500:
 *         description: Failed to update product
 */
router.put("/:id", auth, acl("products.write"), updateProduct);

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     summary: Delete product by ID
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Product ID
 *     responses:
 *       204:
 *         description: Product deleted successfully
 *       404:
 *         description: Product not found
 *       500:
 *         description: Failed to delete product
 */
router.delete("/:id", auth, acl("products.delete"), deleteProduct);

module.exports = router;
