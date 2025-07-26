const express = require("express");
const router = express.Router();
const {
  matchingIncomePayoutList,
  payMatchingIncomeAmount,
  getAdminPaidCommissions,
} = require("../controllers/commissionController");
const auth = require("../middleware/auth");
const acl = require("../middleware/acl");

/**
 * @swagger
 * tags:
 *   name: Commission
 *   description: Commission payout endpoints
 */

/**
 * @swagger
 * /api/commissions/matching-income-payout-list:
 *   get:
 *     summary: Get list of unpaid matching income payouts with pagination, sorting, and search
 *     tags: [Commission]
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
 *         description: Number of records per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term (currently not applied in the controller logic)
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
 *         description: List of unpaid matching income payouts
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
 *         description: Failed to fetch commission list
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
  "/admin-paid-commissions",
  auth,
  acl("commissions.read"),
  getAdminPaidCommissions
);

/**
 * @swagger
 * /api/commissions/matching-income-payout-list:
 *   get:
 *     summary: Get list of unpaid matching income payouts with pagination, sorting, and search
 *     tags: [Commission]
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
 *         description: Number of records per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term (currently not applied in the controller logic)
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
 *         description: List of unpaid matching income payouts
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
 *         description: Failed to fetch commission list
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
  "/matching-income-payout",
  auth,
  acl("commissions.read"),
  matchingIncomePayoutList
);

/**
 * @swagger
 * /api/commissions/{commissionId}/pay:
 *   post:
 *     summary: Mark a matching income commission as paid
 *     description: Updates the specified matching income commission, setting `isPaid` to true and recording the payment timestamp.
 *     tags: [Commission]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: commissionId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the commission to be marked as paid
 *     responses:
 *       200:
 *         description: Commission paid successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Commission paid successfully
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
 *         description: Commission already paid or invalid request
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
 *                       example: Commission is already paid
 *       404:
 *         description: Commission record not found
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
 *                       example: Commission record does not exist
 *       500:
 *         description: Internal server error
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
 *                       example: Failed to pay commission
 *                     details:
 *                       type: string
 */
router.post(
  "/matching-income-payout/:commissionId",
  auth,
  acl("commissions.write"),
  payMatchingIncomeAmount
);

module.exports = router;
