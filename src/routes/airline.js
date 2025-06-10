const express = require("express");
const router = express.Router();
const {
  getAirlines,
  createAirline,
  getAirlineById,
  updateAirline,
  deleteAirline,
  getAllAirlines,
} = require("../controllers/airlineController");
const auth = require("../middleware/auth");
const acl = require("../middleware/acl");

/**
 * @swagger
 * tags:
 *   name: Airlines
 *   description: Airline management endpoints
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
 * /airlines:
 *   get:
 *     summary: Get all airlines with pagination, sorting, and search
 *     tags: [Airlines]
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
 *         description: Number of airlines per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for airline name
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
 *         description: List of all airlines
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 airlines:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       airlineName:
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
 *                 totalAirlines:
 *                   type: integer
 *       500:
 *         description: Failed to fetch airlines
 */
router.get("/", auth, acl("airlines.read"), getAirlines);

/**
 * @swagger
 * /airlines:
 *   post:
 *     summary: Create a new airline
 *     tags: [Airlines]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               airlineName:
 *                 type: string
 *                 description: Name of the airline
 *     responses:
 *       201:
 *         description: Airline created successfully
 *       400:
 *         description: Bad request
 *       500:
 *         description: Failed to create airline
 */
router.post("/", auth, acl("airlines.write"), createAirline);

/**
 * @swagger
 * /airlines/all:
 *   get:
 *     summary: Get all airlines without pagination, sorting, and search
 *     tags: [Airlines]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all airlines
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   airlineName:
 *                     type: string
 *       500:
 *         description: Failed to fetch airlines
 */
router.get("/all", auth, acl("airlines.read"), getAllAirlines);

/**
 * @swagger
 * /airlines/{id}:
 *   get:
 *     summary: Get airline by ID
 *     tags: [Airlines]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Airline ID
 *     responses:
 *       200:
 *         description: Airline details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 airlineName:
 *                   type: string
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *       404:
 *         description: Airline not found
 *       500:
 *         description: Failed to fetch airline
 */
router.get("/:id", auth, acl("airlines.read"), getAirlineById);

/**
 * @swagger
 * /airlines/{id}:
 *   put:
 *     summary: Update airline by ID
 *     tags: [Airlines]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Airline ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               airlineName:
 *                 type: string
 *                 description: Name of the airline
 *     responses:
 *       200:
 *         description: Airline updated successfully
 *       400:
 *         description: Bad request
 *       404:
 *         description: Airline not found
 *       500:
 *         description: Failed to update airline
 */
router.put("/:id", auth, acl("airlines.write"), updateAirline);

/**
 * @swagger
 * /airlines/{id}:
 *   delete:
 *     summary: Delete airline by ID
 *     tags: [Airlines]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Airline ID
 *     responses:
 *       204:
 *         description: Airline deleted successfully
 *       404:
 *         description: Airline not found
 *       500:
 *         description: Failed to delete airline
 */
router.delete("/:id", auth, acl("airlines.delete"), deleteAirline);

module.exports = router;
