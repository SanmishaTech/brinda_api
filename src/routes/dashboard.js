const express = require("express");
const router = express.Router();
const { dashboardInformation } = require("../controllers/dashboardController");
const auth = require("../middleware/auth");

const acl = require("../middleware/acl");
/**
 * @swagger
 * /dashboard:
 *   get:
 *     summary: Get dashboard information for the logged-in member
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 walletBalance:
 *                   type: number
 *                   description: Current wallet balance of the member
 *                   example: 5000.75
 *                 pvBalance:
 *                   type: number
 *                   description: Current PV (Point Value) balance of the member
 *                   example: 120.5
 *                 status:
 *                   type: string
 *                   description: Membership status of the member
 *                   example: "Active"
 *                 totalPurchase:
 *                   type: number
 *                   description: Total purchase amount including GST
 *                   example: 15000.00
 *       404:
 *         description: Member not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errors:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: "Member not found"
 *       500:
 *         description: Failed to fetch dashboard information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errors:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: "Failed to fetch dashboard information"
 *                     details:
 *                       type: string
 *                       example: "Error details here"
 */

router.get("/", auth, acl("dashboards.read"), dashboardInformation);

module.exports = router;
