const { PrismaClient, Prisma } = require('@prisma/client');
const prisma = new PrismaClient();
const { z } = require('zod');
const { REWARDS_COMMISSIONS } = require('../config/data');
// Get all products with pagination, sorting, and search
const getRewards = async (req, res, next) => {
  try {
    res.status(200).json({
      member: req.user.member,
      REWARDS_COMMISSIONS: REWARDS_COMMISSIONS,
    });
  } catch (error) {
    return res.status(500).json({
      errors: {
        message: 'Failed to fetch Rewards',
        details: error.message,
      },
    });
  }
};

module.exports = {
  getRewards,
};
