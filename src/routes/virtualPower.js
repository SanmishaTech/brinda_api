const express = require("express");
const router = express.Router();
const {
  addVirtualPower,
  getVirtualPowers,
} = require("../controllers/virtualPowerController");
const auth = require("../middleware/auth");
const acl = require("../middleware/acl");

/**
 * @swagger
 * tags:
 *   name: VirtualPower
 *   description: Virtual Power management endpoints
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
 * /api/virtual-power:
 *   get:
 *     summary: Retrieve a paginated list of virtual powers
 *     tags: [VirtualPower]
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
 *         description: Number of items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by member username or name
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [id, memberUsername, memberName, bankAccountNumber]
 *           default: id
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: asc
 *         description: Sort order (ascending or descending)
 *     responses:
 *       200:
 *         description: List of virtual powers retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 virtualPowers:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       memberId:
 *                         type: integer
 *                       powerCount:
 *                         type: integer
 *                       powerPosition:
 *                         type: string
 *                       statusType:
 *                         type: string
 *                       powerType:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       member:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           memberUsername:
 *                             type: string
 *                           memberName:
 *                             type: string
 *                           bankAccountNumber:
 *                             type: string
 *                 page:
 *                   type: integer
 *                 totalPages:
 *                   type: integer
 *                 totalRecords:
 *                   type: integer
 *                 hasMore:
 *                   type: boolean
 *       500:
 *         description: Failed to retrieve virtual power list
 */
router.get("/", auth, acl("virtualPower.read"), getVirtualPowers);

/**
 * @swagger
 * /api/virtual-power:
 *   post:
 *     summary: Add virtual power to a member
 *     tags: [VirtualPower]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - memberId
 *               - statusType
 *               - powerPosition
 *               - powerCount
 *               - powerType
 *             properties:
 *               memberId:
 *                 type: integer
 *                 description: ID of the member
 *               statusType:
 *                 type: string
 *                 enum: [ASSOCIATE, SILVER, GOLD, DIAMOND]
 *                 description: Status type of the virtual power
 *               powerPosition:
 *                 type: string
 *                 enum: [LEFT, RIGHT]
 *                 description: Side where power is added
 *               powerCount:
 *                 type: integer
 *                 description: Amount of power to add
 *               powerType:
 *                 type: string
 *                 description: Type of power being added (e.g. SELF, TOP, etc.)
 *     responses:
 *       200:
 *         description: Virtual power added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid input data
 *       500:
 *         description: Failed to add virtual power
 */
router.post("/", auth, acl("virtualPower.write"), addVirtualPower);

module.exports = router;
