const { PrismaClient, Prisma } = require("@prisma/client");
const validateRequest = require("../utils/validateRequest");
const prisma = require("../config/db");
const { z } = require("zod");
// Get all products with pagination, sorting, and search
const getProducts = async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const search = req.query.search || "";
  const sortBy = req.query.sortBy || "id";
  const sortOrder = req.query.sortOrder === "desc" ? "desc" : "asc";

  try {
    const trimmedSearch = search?.trim();
    const isSearchNumber =
      trimmedSearch !== "" &&
      !isNaN(Number(trimmedSearch)) &&
      /^\d+(\.\d{1,2})?$/.test(trimmedSearch);

    const whereClause = {
      OR: [
        { productName: { contains: trimmedSearch } },
        { hsnCode: { contains: trimmedSearch } },
        ...(isSearchNumber
          ? [{ dspRate: new Prisma.Decimal(trimmedSearch) }]
          : []),
        ...(isSearchNumber ? [{ gst: new Prisma.Decimal(trimmedSearch) }] : []),
        ...(isSearchNumber ? [{ pv: new Prisma.Decimal(trimmedSearch) }] : []),
        ...(isSearchNumber ? [{ bv: new Prisma.Decimal(trimmedSearch) }] : []),
        ...(isSearchNumber
          ? [{ bvPrice: new Prisma.Decimal(trimmedSearch) }]
          : []),
        ...(isSearchNumber
          ? [{ mfgRate: new Prisma.Decimal(trimmedSearch) }]
          : []),
        ...(isSearchNumber ? [{ mrp: new Prisma.Decimal(trimmedSearch) }] : []),
      ],
    };

    const products = await prisma.product.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
    });

    const totalProducts = await prisma.product.count({
      where: whereClause,
    });
    const totalPages = Math.ceil(totalProducts / limit);

    res.json({
      products,
      page,
      totalPages,
      totalProducts,
    });
  } catch (error) {
    return res.status(500).json({
      errors: {
        message: "Failed to fetch airlines",
        details: error.message,
      },
    });
  }
};

const createProduct = async (req, res) => {
  const schema = z
    .object({
      productName: z
        .string()
        .min(1, "Product Name cannot be left blank.")
        .max(100, "Product Name must not exceed 100 characters."),
    })
    .superRefine(async (data, ctx) => {
      const existingProduct = await prisma.product.findFirst({
        where: {
          productName: data.productName,
        },
      });

      if (existingProduct) {
        ctx.addIssue({
          path: ["productName"],
          message: `Product with name ${data.productName} already exists.`,
        });
      }
    });

  const validationErrors = await validateRequest(schema, req.body, res);

  const { productName, hsnCode, mrp, mfgRate, gst, dspRate, pv, bv, bvPrice } =
    req.body;

  try {
    const newProduct = await prisma.product.create({
      data: {
        productName,
        hsnCode,
        mrp: new Prisma.Decimal(mrp),
        mfgRate: new Prisma.Decimal(mfgRate),
        gst: new Prisma.Decimal(gst),
        dspRate: new Prisma.Decimal(dspRate),
        pv: new Prisma.Decimal(pv),
        bv: new Prisma.Decimal(bv),
        bvPrice: new Prisma.Decimal(bvPrice),
      },
    });

    res.status(201).json(newProduct);
  } catch (error) {
    return res.status(500).json({
      message: "Failed to create product",
      details: error.message,
    });
  }
};

const getProductById = async (req, res) => {
  const { id } = req.params;

  try {
    const product = await prisma.product.findUnique({
      where: { id: parseInt(id) },
    });

    if (!product) {
      return res.status(500).json({
        message: "Product not found",
      });
    }

    res.status(200).json(product);
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch product",
      details: error.message,
    });
  }
};

const updateProduct = async (req, res) => {
  const schema = z
    .object({
      productName: z
        .string()
        .min(1, "Product Name cannot be left blank.")
        .max(100, "Product Name must not exceed 100 characters."),
    })
    .superRefine(async (data, ctx) => {
      const { id } = req.params;

      const existingProduct = await prisma.product.findFirst({
        where: {
          productName: data.productName,
        },
        select: { id: true },
      });

      if (existingProduct && existingProduct.id !== parseInt(id)) {
        ctx.addIssue({
          path: ["productName"],
          message: `Product with name ${data.productName} already exists.`,
        });
      }
    });
  const validationErrors = await validateRequest(schema, req.body, res);

  const { id } = req.params;
  const { productName, hsnCode, mrp, mfgRate, gst, dspRate, pv, bv, bvPrice } =
    req.body;

  try {
    const updatedProduct = await prisma.product.update({
      where: { id: parseInt(id) },
      data: {
        productName,
        hsnCode,
        mrp: new Prisma.Decimal(mrp),
        mfgRate: new Prisma.Decimal(mfgRate),
        gst: new Prisma.Decimal(gst),
        dspRate: new Prisma.Decimal(dspRate),
        pv: new Prisma.Decimal(pv),
        bv: new Prisma.Decimal(bv),
        bvPrice: new Prisma.Decimal(bvPrice),
      },
    });

    res.status(200).json(updatedProduct);
  } catch (error) {
    return res.status(500).json({
      message: "Failed to update product",
      details: error.message,
    });
  }
};

const deleteProduct = async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.product.delete({
      where: { id: parseInt(id) },
    });

    res.status(200).json({
      message: "Product deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to delete product",
      details: error.message,
    });
  }
};

const getAllProducts = async (req, res) => {
  try {
    const products = await prisma.product.findMany();
    res.status(200).json(products);
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch products",
      details: error.message,
    });
  }
};

module.exports = {
  getProducts,
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};
