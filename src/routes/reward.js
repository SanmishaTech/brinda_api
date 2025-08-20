const express = require('express');
const router = express.Router();
const { getRewards } = require('../controllers/rewardController');
const auth = require('../middleware/auth');
const acl = require('../middleware/acl');

/**
 * @swagger
 * tags:
 *   name: Rewards
 *   description: Reward management endpoints
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
 * /api/rewards:
 *   get:
 *     summary: Get all rewards with pagination, sorting, and search
 *     tags: [Rewards]
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
 *         description: Number of rewards per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for reward name or type
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
 *         description: List of all rewards
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 rewards:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       rewardName:
 *                         type: string
 *                       rewardType:
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
 *                 totalRewards:
 *                   type: integer
 *       500:
 *         description: Failed to fetch rewards
 */

router.get('/', auth, acl('rewards.read'), getRewards);

module.exports = router;
