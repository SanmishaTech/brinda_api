const { PrismaClient, Prisma } = require('@prisma/client');
const prisma = new PrismaClient();
const { z } = require('zod');
const validateRequest = require('../utils/validateRequest');
const createError = require('http-errors');
const { numberToWords } = require('../utils/numberToWords');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs').promises; // Use promises API
const path = require('path');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
dayjs.extend(utc);
const logger = require('../utils/logger'); // Assuming you have a logger utility
const today = dayjs().utc().startOf('day').toDate();
const {
  CREDIT,
  APPROVED,
  INCREMENT,
  SELF,
  ASSOCIATE,
  LEFT,
  RIGHT,
  SILVER,
  GOLD,
  DIAMOND,
  ASSOCIATE_COMMISSION,
  GOLD_COMMISSION,
  SILVER_COMMISSION,
  DIAMOND_COMMISSION,
  MAX_COMMISSIONS_PER_DAY,
  DEBIT,
  MATCHING_INCOME_WALLET,
  TOP,
  INACTIVE,
} = require('../config/data');
const purchaseTask = require('../../taskQueue/purchaseTask');

/**
 * Get all members with pagination, sorting, and search
 */
const getVirtualPowers = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const search = req.query.search?.trim() || '';
  const sortBy = req.query.sortBy || 'id';
  const sortOrder = req.query.sortOrder === 'desc' ? 'desc' : 'asc';
  let orderByClause = {};
  if (
    sortBy === 'memberUsername' ||
    sortBy === 'memberName' ||
    sortBy === 'bankAccountNumber'
  ) {
    orderByClause = {
      member: {
        [sortBy]: sortOrder,
      },
    };
  } else {
    orderByClause = {
      [sortBy]: sortOrder,
    };
  }
  try {
    const whereClause = {
      ...(search && {
        OR: [
          {
            member: {
              memberUsername: {
                contains: search,
              },
            },
          },
          {
            member: {
              memberName: {
                contains: search,
              },
            },
          },
        ],
      }),
    };

    const virtualPowers = await prisma.virtualPower.findMany({
      where: whereClause,
      include: {
        member: true,
      },
      skip,
      take: limit,
      orderBy: orderByClause,
    });

    const totalRecords = await prisma.virtualPower.count({
      where: whereClause,
    });

    const totalPages = Math.ceil(totalRecords / limit);

    res.json({
      virtualPowers,
      page,
      totalPages,
      totalRecords,
    });
  } catch (error) {
    logger.error(`Virtual Power List Error: ${error}`);
    return res.status(500).json({
      errors: {
        message: 'Failed to Fetch Virtual Power List',
        details: error.message,
      },
    });
  }
};

const addVirtualPower = async (req, res) => {
  const { memberId, statusType, powerPosition, powerCount, powerType } =
    req.body;

  logger.info(
    `Incoming request to addVirtualPower: ${memberId}, ${statusType}, ${powerPosition}, ${powerCount}, ${powerType}`
  );

  try {
    purchaseTask({
      type: 'virtualPower',
      memberId: memberId,
      statusType: statusType,
      powerPosition: powerPosition,
      powerCount: powerCount,
      powerType: powerType,
    });

    return res.status(202).json({ message: 'Virtual Power queued.' });
  } catch (error) {
    logger.error(`Error in addVirtualPower: ${error}`);
    res.status(500).json({
      errors: {
        message: 'Failed to Add Virtual Power',
        details: error.message,
      },
    });
  }
};

module.exports = {
  getVirtualPowers,
  addVirtualPower,
};
