const { PrismaClient, Prisma } = require("@prisma/client");
const validateRequest = require("../utils/validateRequest");
const prisma = require("../config/db");
const { z } = require("zod");
// Get all products with pagination, sorting, and search
const getFreeProducts = async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const search = req.query.search?.trim() || "";
  const sortBy = req.query.sortBy || "id"; // Can be "id", "quantity", or "product.name"
  const sortOrder = req.query.sortOrder === "desc" ? "desc" : "asc";

  try {
    const isSearchNumber =
      search !== "" &&
      !isNaN(Number(search)) &&
      /^\d+(\.\d{1,2})?$/.test(search);

    // Search condition
    const whereClause = {
      AND: [
        search
          ? {
              OR: [
                {
                  product: {
                    productName: { contains: search },
                  },
                },
                ...(isSearchNumber ? [{ quantity: Number(search) }] : []),
              ],
            }
          : {},
      ],
    };

    // Dynamic sorting — support sorting by nested product.name
    const orderByClause =
      sortBy === "productName"
        ? { product: { productName: sortOrder } }
        : { [sortBy]: sortOrder };

    // Fetch data
    const freeProducts = await prisma.freeProduct.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: orderByClause,
      include: {
        product: {
          select: { id: true, productName: true }, // include product name
        },
      },
    });

    // Get total count
    const totalFreeProducts = await prisma.freeProduct.count({
      where: whereClause,
    });

    const totalPages = Math.ceil(totalFreeProducts / limit);

    res.json({
      selectLimit: req?.user?.member?.totalFreePurchaseCount ?? 0,
      freeProducts,
      page,
      totalPages,
      totalFreeProducts,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      errors: {
        message: "Failed to fetch Free Products",
        details: error.message,
      },
    });
  }
};

const createFreeProduct = async (req, res) => {
  const { productId, quantity } = req.body;

  try {
    const newFreeProduct = await prisma.freeProduct.create({
      data: {
        productId: parseInt(productId),
        quantity: parseInt(quantity),
      },
    });

    res.status(201).json(newFreeProduct);
  } catch (error) {
    return res.status(500).json({
      message: "Failed to create free product",
      details: error.message,
    });
  }
};

const getFreeProductById = async (req, res) => {
  const { id } = req.params;

  try {
    const freeProduct = await prisma.freeProduct.findUnique({
      where: { id: parseInt(id) },
      include: {
        product: {
          select: { id: true, productName: true }, // or "name", based on your model
        },
      },
    });

    if (!freeProduct) {
      return res.status(500).json({
        message: "Free Product not found",
      });
    }

    res.status(200).json(freeProduct);
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch free product",
      details: error.message,
    });
  }
};

const updateFreeProduct = async (req, res) => {
  const { id } = req.params;
  const { productId, quantity } = req.body;

  try {
    const updatedFreeProduct = await prisma.freeProduct.update({
      where: { id: parseInt(id) },
      data: {
        productId: parseInt(productId),
        quantity: parseInt(quantity),
      },
    });

    res.status(200).json(updatedFreeProduct);
  } catch (error) {
    return res.status(500).json({
      message: "Failed to update free product",
      details: error.message,
    });
  }
};

module.exports = {
  getFreeProducts,
  getFreeProductById,
  createFreeProduct,
  updateFreeProduct,
};
