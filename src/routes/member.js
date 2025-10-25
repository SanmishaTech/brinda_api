const express = require("express");
const router = express.Router();
const {
  getMembers,
  getMemberById,
  updateMember,
  getAllMembers,
  getMemberLogs,
  myGenealogy,
  myDirectReferralList,
  getMembersWithPendingTransactions,
  getMemberWalletList,
} = require("../controllers/memberController");
const auth = require("../middleware/auth");
const acl = require("../middleware/acl");

/**
 * @swagger
 * tags:
 *   name: Members
 *   description: Member management endpoints
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
 * /api/members:
 *   get:
 *     summary: Get all members with pagination, sorting, and search
 *     tags: [Members]
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
 *         description: Number of members per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for member name or username
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
 *         description: List of all members
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 members:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       memberName:
 *                         type: string
 *                       memberUsername:
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
 *                 totalMembers:
 *                   type: integer
 *       500:
 *         description: Failed to fetch members
 */
router.get("/", auth, acl("members.read"), getMembers);
/**
 * @swagger
 * /api/members/pending-wallet-transactions:
 *   get:
 *     summary: Get members who have at least one pending wallet transaction
 *     tags: [Members]
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
 *         description: Number of members per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for member name or username
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: id
 *         description: Field to sort by (e.g., id, memberName, memberUsername)
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: asc
 *         description: Sort order (ascending or descending)
 *     responses:
 *       200:
 *         description: List of members with at least one pending transaction
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 members:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       memberName:
 *                         type: string
 *                       memberUsername:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                       walletTransactions:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: integer
 *                             amount:
 *                               type: number
 *                             type:
 *                               type: string
 *                             status:
 *                               type: string
 *                             transactionDate:
 *                               type: string
 *                               format: date-time
 *                             createdAt:
 *                               type: string
 *                               format: date-time
 *                 page:
 *                   type: integer
 *                 totalPages:
 *                   type: integer
 *                 totalMembers:
 *                   type: integer
 *       500:
 *         description: Failed to fetch members with pending transactions
 */
router.get(
  "/pending-wallet-transactions",
  auth,
  acl("members.read"),
  getMembersWithPendingTransactions
);

/**
 * @swagger
 * /api/members/direct-referrals:
 *   get:
 *     summary: Get direct referral list of a member
 *     tags: [Members]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: memberId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Member ID to get direct referrals for
 *     responses:
 *       200:
 *         description: List of direct referrals
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 memberId:
 *                   type: integer
 *                   description: ID of the member whose referrals are being returned
 *                 directReferrals:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Member'
 *       404:
 *         description: Member not found or no direct referrals
 *       500:
 *         description: Failed to fetch direct referral list
 */
router.get(
  "/direct-referrals",
  auth,
  acl("members.read"),
  myDirectReferralList
);

/**
 * @swagger
 * /api/members/all:
 *   get:
 *     summary: Get all members without pagination, sorting, and search
 *     tags: [Members]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all members
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
 *         description: Failed to fetch members
 */
router.get("/all", auth, acl("members.read"), getAllMembers);

/**
 * @swagger
 * /api/members/walletList:
 *   get:
 *     summary: Get all members without pagination, sorting, and search
 *     tags: [Members]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all members
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
 *         description: Failed to fetch members
 */
router.get("/walletList", auth, acl("members.read"), getMemberWalletList);

/**
 * @swagger
 * /api/members/logs:
 *   get:
 *     summary: Get member logs with pagination, sorting, and search
 *     tags: [Members]
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
 *         description: Number of logs per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for log messages
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
 *         description: List of member logs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 memberLogs:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       memberId:
 *                         type: integer
 *                       message:
 *                         type: string
 *                         description: Log message
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
 *                 totalMemberLogs:
 *                   type: integer
 *       500:
 *         description: Failed to fetch member logs
 */
router.get("/logs", auth, acl("members.read"), getMemberLogs);

/**
 * @swagger
 * /api/members/{id}:
 *   get:
 *     summary: Get member by ID
 *     tags: [Members]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Member ID
 *     responses:
 *       200:
 *         description: Member details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 memberName:
 *                   type: string
 *                 memberUsername:
 *                   type: string
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *       404:
 *         description: Member not found
 *       500:
 *         description: Failed to fetch member
 */
router.get("/:id", auth, acl("members.read"), getMemberById);

/**
 * @swagger
 * /api/members/{id}:
 *   put:
 *     summary: Update member by ID
 *     tags: [Members]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Member ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               memberName:
 *                 type: string
 *                 description: Name of the member
 *               memberUsername:
 *                 type: string
 *                 description: Username of the member
 *               memberEmail:
 *                 type: string
 *                 description: Email of the member
 *               memberMobile:
 *                 type: string
 *                 description: Mobile number of the member
 *               memberState:
 *                 type: string
 *                 description: State of the member
 *               tPin:
 *                 type: string
 *                 description: Transaction PIN
 *               positionToParent:
 *                 type: string
 *                 description: Position relative to parent
 *               status:
 *                 type: string
 *                 description: Status of the member
 *               walletBalance:
 *                 type: number
 *                 description: Wallet balance of the member
 *     responses:
 *       200:
 *         description: Member updated successfully
 *       400:
 *         description: Bad request
 *       404:
 *         description: Member not found
 *       500:
 *         description: Failed to update member
 */
router.put("/:id", auth, acl("members.write"), updateMember);

/**
 * @swagger
 * /api/members/{id}:
 *   delete:
 *     summary: Delete member by ID
 *     tags: [Members]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Member ID
 *     responses:
 *       204:
 *         description: Member deleted successfully
 *       404:
 *         description: Member not found
 *       500:
 *         description: Failed to delete member
 */
// router.delete("/:id", auth, acl("members.delete"), deleteMember);

/**
 * @swagger
 * /api/members/genealogy/{memberId}:
 *   get:
 *     summary: Get binary tree (genealogy) structure for a member
 *     tags: [Members]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: memberId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Member ID to get genealogy for
 *     responses:
 *       200:
 *         description: Binary tree of member genealogy (3 levels)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 rootMember:
 *                   $ref: '#/components/schemas/Member'
 *                 leftMember:
 *                   $ref: '#/components/schemas/Member'
 *                 leftsLeftMember:
 *                   $ref: '#/components/schemas/Member'
 *                 leftsRightMember:
 *                   $ref: '#/components/schemas/Member'
 *                 rightMember:
 *                   $ref: '#/components/schemas/Member'
 *                 rightsLeftMember:
 *                   $ref: '#/components/schemas/Member'
 *                 rightsRightMember:
 *                   $ref: '#/components/schemas/Member'
 *       404:
 *         description: Member not found
 *       500:
 *         description: Failed to fetch genealogy
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Member:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         memberName:
 *           type: string
 *         memberUsername:
 *           type: string
 *         positionToParent:
 *           type: string
 *         parentId:
 *           type: integer
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */
router.get("/genealogy/:memberId", auth, acl("members.read"), myGenealogy);

module.exports = router;
