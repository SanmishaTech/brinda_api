const express = require("express");
const router = express.Router();
const { getAllFranchise } = require("../controllers/franchiseController");
const auth = require("../middleware/auth");
const acl = require("../middleware/acl");

/**
 * @swagger
 * tags:
 *   name: Franchise
 *   description: Franchise (Member) management endpoints
 */

/**
 * @swagger
 * /api/franchise:
 *   get:
 *     summary: Get all franchise members without pagination
 *     tags: [Franchise]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all franchise members
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   memberName:
 *                     type: string
 *                   memberUsername:
 *                     type: string
 *       500:
 *         description: Failed to fetch franchise
 */
router.get("/all", auth, acl("franchise.read"), getAllFranchise);

module.exports = router;
