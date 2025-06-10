const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { z } = require("zod");
const validateRequest = require("../utils/validateRequest");
const createError = require("http-errors"); // For consistent error handling

// Get all airlines with pagination, sorting, and search
const getAirlines = async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const search = req.query.search || "";
  const sortBy = req.query.sortBy || "id";
  const sortOrder = req.query.sortOrder === "desc" ? "desc" : "asc";

  try {
    if (!req.user.agencyId) {
      return res
        .status(404)
        .json({ message: "User does not belong to any Agency" });
    }

    const whereClause = {
      agencyId: req.user.agencyId,
      airlineName: { contains: search },
    };

    const airlines = await prisma.airline.findMany({
      where: whereClause,
      select: {
        id: true,
        airlineName: true,
        createdAt: true,
        updatedAt: true,
      },
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
    });

    const totalAirlines = await prisma.airline.count({
      where: whereClause,
    });
    const totalPages = Math.ceil(totalAirlines / limit);

    res.json({
      airlines,
      page,
      totalPages,
      totalAirlines,
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

// Create a new airline
const createAirline = async (req, res, next) => {
  const schema = z
    .object({
      airlineName: z
        .string()
        .min(1, "Airline name cannot be left blank.")
        .max(100, "Airline name must not exceed 100 characters."),
    })
    .superRefine(async (data, ctx) => {
      if (!req.user.agencyId) {
        return res
          .status(404)
          .json({ message: "User does not belong to any Agency" });
      }
      const existingAirline = await prisma.airline.findFirst({
        where: {
          AND: [
            { airlineName: data.airlineName },
            { agencyId: parseInt(req.user.agencyId) },
          ],
        },
      });

      if (existingAirline) {
        ctx.addIssue({
          path: ["airlineName"],
          message: `Airline with name ${data.airlineName} already exists.`,
        });
      }
    });

  const validationErrors = await validateRequest(schema, req.body, res);

  try {
    const { airlineName } = req.body;

    const newAirline = await prisma.airline.create({
      data: { airlineName, agencyId: req.user.agencyId },
    });

    res.status(201).json(newAirline);
  } catch (error) {
    return res.status(500).json({
      errors: {
        message: "Failed to create airline",
        details: error.message,
      },
    });
  }
};

// Get an airline by ID
const getAirlineById = async (req, res, next) => {
  const { id } = req.params;

  try {
    const airline = await prisma.airline.findFirst({
      where: {
        AND: [
          { id: parseInt(id, 10) },
          { agencyId: parseInt(req.user.agencyId) },
        ],
      },
    });

    if (!airline) {
      return res.status(404).json({ errors: { message: "Airline not found" } });
    }

    res.status(200).json(airline);
  } catch (error) {
    res.status(500).json({
      errors: {
        message: "Failed to fetch airline",
        details: error.message,
      },
    });
  }
};

// Update an airline
const updateAirline = async (req, res, next) => {
  const schema = z
    .object({
      airlineName: z
        .string()
        .min(1, "Airline name cannot be left blank.")
        .max(100, "Airline name must not exceed 100 characters."),
    })
    .superRefine(async (data, ctx) => {
      if (!req.user.agencyId) {
        return res
          .status(404)
          .json({ message: "User does not belong to any Agency" });
      }
      const { id } = req.params;

      const existingAirline = await prisma.airline.findFirst({
        where: {
          AND: [
            { airlineName: data.airlineName },
            { agencyId: parseInt(req.user.agencyId) },
          ],
        },
        select: { id: true },
      });

      if (existingAirline && existingAirline.id !== parseInt(id)) {
        ctx.addIssue({
          path: ["airlineName"],
          message: `Airline with name ${data.airlineName} already exists.`,
        });
      }
    });

  const validationErrors = await validateRequest(schema, req.body, res);

  const { id } = req.params;
  const { airlineName } = req.body;

  try {
    const updatedAirline = await prisma.airline.update({
      where: { id: parseInt(id, 10) },
      data: { airlineName },
    });

    res.status(200).json(updatedAirline);
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ errors: { message: "Airline not found" } });
    }
    return res.status(500).json({
      errors: {
        message: "Failed to update airline",
        details: error.message,
      },
    });
  }
};

// Delete an airline
const deleteAirline = async (req, res, next) => {
  const { id } = req.params;

  try {
    await prisma.airline.delete({
      where: { id: parseInt(id, 10) },
    });

    res.status(204).send();
  } catch (error) {
    if (
      error.code === "P2003" ||
      error.message.includes("Foreign key constraint failed")
    ) {
      return res.status(409).json({
        errors: {
          message:
            "Cannot delete this Airline because it is referenced in related data. Please remove the related references before deleting.",
        },
      });
    }
    if (error.code === "P2025") {
      return res.status(404).json({ errors: { message: "Airline not found" } });
    }
    res.status(500).json({
      errors: {
        message: "Failed to delete airline",
        details: error.message,
      },
    });
  }
};

// Get all airlines without pagination, sorting, and search
const getAllAirlines = async (req, res, next) => {
  try {
    if (!req.user.agencyId) {
      return res
        .status(404)
        .json({ message: "User does not belong to any Agency" });
    }

    const airlines = await prisma.airline.findMany({
      where: {
        agencyId: req.user.agencyId,
      },
      select: {
        id: true,
        airlineName: true,
      },
    });

    res.status(200).json(airlines);
  } catch (error) {
    
    return res.status(500).json({
      errors: {
        message: "Failed to fetch airlines",
        details: error.message,
      },
    });
  }
};

module.exports = {
  getAirlines,
  createAirline,
  getAirlineById,
  updateAirline,
  deleteAirline,
  getAllAirlines,
};
