const express = require("express");
const router = express.Router();
const {
  getMembers,
  getMemberById,
  updateMember,
  deleteMember,
  getAllMembers,
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
router.delete("/:id", auth, acl("members.delete"), deleteMember);

module.exports = router;
