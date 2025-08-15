const express = require('express');
const router = express.Router();
const { addVirtualPower } = require('../controllers/virtualPowerController');
const auth = require('../middleware/auth');
const acl = require('../middleware/acl');

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
router.post('/', auth, acl('virtualPower.write'), addVirtualPower);

module.exports = router;
