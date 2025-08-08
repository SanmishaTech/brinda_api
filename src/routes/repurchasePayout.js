const express = require("express");
const router = express.Router();
const {
  repurchasePayoutList,
  payRepurchaseAmount,
  getAdminPaidRepurchasePayout,
} = require("../controllers/repurchasePayoutController");
const auth = require("../middleware/auth");
const acl = require("../middleware/acl");

/**
 * @swagger
 * tags:
 *   name: RepurchasePayout
 *   description: Repurchase payout endpoints
 */

/**
 * @swagger
 * /api/repurchase-payouts/admin-paid-repurchase-payouts:
 *   get:
 *     summary: Get list of admin-paid repurchase payouts
 *     tags: [RepurchasePayout]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of admin-paid repurchase payouts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 payouts:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       amount:
 *                         type: number
 *                       isPaid:
 *                         type: boolean
 *                       paidAt:
 *                         type: string
 *                         format: date-time
 *                       member:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           name:
 *                             type: string
 *                           email:
 *                             type: string
 *       500:
 *         description: Failed to fetch repurchase payouts
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
 *                     details:
 *                       type: string
 */
router.get(
  "/admin-paid-repurchase-payouts",
  auth,
  acl("commissions.read"),
  getAdminPaidRepurchasePayout
);

/**
 * @swagger
 * /api/repurchase-payouts/list:
 *   get:
 *     summary: Get list of unpaid repurchase payouts with pagination, sorting, and search
 *     tags: [RepurchasePayout]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: id
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: asc
 *     responses:
 *       200:
 *         description: List of unpaid repurchase payouts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 payoutList:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       amount:
 *                         type: number
 *                       isPaid:
 *                         type: boolean
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                       member:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           name:
 *                             type: string
 *                           email:
 *                             type: string
 *                 page:
 *                   type: integer
 *                 totalPages:
 *                   type: integer
 *                 totalRecords:
 *                   type: integer
 *       500:
 *         description: Failed to fetch repurchase payout list
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
 *                     details:
 *                       type: string
 */
router.get("/list", auth, acl("commissions.read"), repurchasePayoutList);

/**
 * @swagger
 * /api/repurchase-payouts/{payoutId}/pay:
 *   post:
 *     summary: Mark a repurchase payout as paid
 *     tags: [RepurchasePayout]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: payoutId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Repurchase payout marked as paid
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     isPaid:
 *                       type: boolean
 *                     paidAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Already paid or invalid request
 *       404:
 *         description: Payout not found
 *       500:
 *         description: Internal server error
 */
router.post(
  "/:commissionId/pay",
  auth,
  acl("commissions.write"),
  payRepurchaseAmount
);

module.exports = router;
