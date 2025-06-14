const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const dayjs = require("dayjs");
const { z } = require("zod");
const validateRequest = require("../utils/validateRequest");
const createError = require("http-errors"); // For consistent error handling

// Get all clients with pagination, sorting, and search
const getClients = async (req, res, next) => {
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
      agencyId: req.user.agencyId, // Add agency filter
      OR: [
        { clientName: { contains: search } },
        { mobile1: { contains: search } },
        { email: { contains: search } },
        { gender: { contains: search } },
      ],
    };

    const clients = await prisma.client.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
    });

    const totalClients = await prisma.client.count({
      where: whereClause,
    });
    const totalPages = Math.ceil(totalClients / limit);

    res.json({
      clients,
      page,
      totalPages,
      totalClients,
    });
  } catch (error) {
    return res.status(500).json({
      errors: {
        message: "Failed to fetch clients",
        details: error.message,
      },
    });
  }
};

// Create a new client
const createClient = async (req, res, next) => {
  const schema = z.object({
    clientName: z
      .string()
      .min(1, "Client name cannot be left blank.")
      .max(100, "Client name must not exceed 100 characters."),
    familyFriends: z
      .array(
        z.object({
          name: z.string().min(1, "Name cannot be blank."),
        })
      )
      .optional(),
  });

  const validationErrors = await validateRequest(schema, req.body, res);

  try {
    if (!req.user.agencyId) {
      return res
        .status(404)
        .json({ message: "User does not belong to any Agency" });
    }
    const parseDate = (value) => {
      if (typeof value !== "string" || value.trim() === "") return undefined;
      return dayjs(value).isValid() ? new Date(value) : undefined;
    };
    const {
      clientName,
      gender,
      email,
      dateOfBirth,
      marriageDate,
      referBy,
      address1,
      address2,
      stateId,
      cityId,
      pincode,
      mobile1,
      mobile2,
      passportNo,
      panNo,
      gstin,
      aadharNo,
      familyFriends,
    } = req.body;

    const newClient = await prisma.client.create({
      data: {
        clientName,
        agencyId: req.user.agencyId,
        gender: gender || null,
        email: email || null,
        dateOfBirth: parseDate(dateOfBirth),
        marriageDate: parseDate(marriageDate),
        referBy: referBy || null,
        address1: address1 || null,
        address2: address2 || null,
        stateId: parseInt(stateId, 10),
        cityId: parseInt(cityId, 10),
        pincode: pincode || null,
        mobile1: mobile1 || null,
        mobile2: mobile2 || null,
        gstin: gstin || null,
        passportNo: passportNo || null,
        panNo: panNo || null,
        aadharNo: aadharNo || null,
        familyFriends: {
          create: (familyFriends || []).map((friend) => ({
            name: friend.name || null,
            gender: friend.gender || null,
            relation: friend.relation || null,
            aadharNo: friend.aadharNo || null,
            dateOfBirth: parseDate(friend.dateOfBirth),
            anniversaryDate: parseDate(friend.anniversaryDate),
            foodType: friend.foodType || null,
            mobile: friend.mobile || null,
            email: friend.email || null,
          })),
        },
      },
    });

    res.status(201).json(newClient);
  } catch (error) {
    return res.status(500).json({
      errors: {
        message: "Failed to create client",
        details: error.message,
      },
    });
  }
};

// Get a client by ID
const getClientById = async (req, res, next) => {
  const { id } = req.params;

  try {
    const client = await prisma.client.findFirst({
      where: {
        AND: [
          { id: parseInt(id, 10) },
          { agencyId: parseInt(req.user.agencyId) },
        ],
      },
      include: {
        familyFriends: true, // Include familyFriends in the response
      },
    });

    if (!client) {
      return res.status(404).json({ errors: { message: "Client not found" } });
    }

    res.status(200).json(client);
  } catch (error) {
    res.status(500).json({
      errors: {
        message: "Failed to fetch client",
        details: error.message,
      },
    });
  }
};

// Update a client
const updateClient = async (req, res, next) => {
  const schema = z.object({
    clientName: z
      .string()
      .min(1, "Client name cannot be left blank.")
      .max(100, "Client name must not exceed 100 characters."),
    familyFriends: z
      .array(
        z.object({
          id: z.number().optional(), // Include ID for existing familyFriends
          name: z.string().min(1, "Name cannot be blank."),
          gender: z.string().optional(),
          relation: z.string().optional(),
          aadharNo: z.string().optional(),
          dateOfBirth: z.string().optional(),
          anniversaryDate: z.string().optional(),
          foodType: z.string().optional(),
          mobile: z.string().optional(),
        })
      )
      .optional(),
  });

  const validationErrors = await validateRequest(schema, req.body, res);
  const parseDate = (value) => {
    if (typeof value !== "string" || value.trim() === "") return undefined;
    return dayjs(value).isValid() ? new Date(value) : undefined;
  };
  const { id } = req.params;
  const {
    clientName,
    gender,
    email,
    dateOfBirth,
    marriageDate,
    referBy,
    address1,
    address2,
    stateId,
    cityId,
    pincode,
    mobile1,
    gstin,
    mobile2,
    passportNo,
    panNo,
    aadharNo,
    familyFriends = [],
  } = req.body;
  try {
    if (!req.user.agencyId) {
      return res
        .status(404)
        .json({ message: "User does not belong to any Agency" });
    }

    const result = await prisma.$transaction(async (tx) => {
      // First, delete familyFriends that are not in the new familyFriends array
      await tx.familyFriends.deleteMany({
        where: {
          clientId: parseInt(id, 10),
          id: {
            notIn: familyFriends
              .filter((f) => parseInt(f.friendId))
              .map((f) => parseInt(f.friendId)), // Only keep existing friends in the list
          },
        },
      });

      // Now, proceed to update the client and upsert familyFriends
      const updatedClient = await tx.client.update({
        where: { id: parseInt(id, 10) },
        data: {
          clientName,
          gender: gender || null,
          email: email || null,
          dateOfBirth: parseDate(dateOfBirth),
          marriageDate: parseDate(marriageDate),
          referBy: referBy || null,
          gstin: gstin || null,
          address1: address1 || null,
          address2: address2 || null,
          stateId: parseInt(stateId, 10),
          cityId: parseInt(cityId, 10),
          pincode: pincode || null,
          mobile1: mobile1 || null,
          mobile2: mobile2 || null,
          passportNo: passportNo || null,
          panNo: panNo || null,
          aadharNo: aadharNo || null,
          familyFriends: {
            upsert: familyFriends
              .filter((friend) => !!parseInt(friend.friendId)) // Only existing friends
              .map((friend) => ({
                where: { id: parseInt(friend.friendId) },
                update: {
                  name: friend.name,
                  gender: friend.gender || null,
                  relation: friend.relation || null,
                  aadharNo: friend.aadharNo || null,
                  dateOfBirth: parseDate(friend.dateOfBirth),
                  anniversaryDate: parseDate(friend.anniversaryDate),
                  foodType: friend.foodType || null,
                  mobile: friend.mobile || null,
                  email: friend.email || null,
                },
                create: {
                  name: friend.name,
                  gender: friend.gender || null,
                  relation: friend.relation || null,
                  aadharNo: friend.aadharNo || null,
                  dateOfBirth: parseDate(friend.dateOfBirth),
                  anniversaryDate: parseDate(friend.anniversaryDate),
                  foodType: friend.foodType || null,
                  mobile: friend.mobile || null,
                  email: friend.email || null,
                },
              })),
            create: familyFriends
              .filter((friend) => !parseInt(friend.friendId)) // Only new friends
              .map((friend) => ({
                name: friend.name,
                gender: friend.gender || null,
                relation: friend.relation || null,
                aadharNo: friend.aadharNo || null,
                dateOfBirth: parseDate(friend.dateOfBirth),
                anniversaryDate: parseDate(friend.anniversaryDate),
                foodType: friend.foodType || null,
                mobile: friend.mobile || null,
                email: friend.email || null,
              })),
          },
        },
      });

      return {
        updatedClient: updatedClient,
      };
    });

    res.status(200).json(result.updatedClient);
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ errors: { message: "Client not found" } });
    }
    return res.status(500).json({
      errors: {
        message: "Failed to update client",
        details: error.message,
      },
    });
  }
};

// Delete a client
const deleteClient = async (req, res, next) => {
  const { id } = req.params;

  try {
    await prisma.client.delete({
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
            "Cannot delete this Client because it is referenced in related data. Please remove the related references before deleting.",
        },
      });
    }
    if (error.code === "P2025") {
      return res.status(404).json({ errors: { message: "Client not found" } });
    }
    res.status(500).json({
      errors: {
        message: "Failed to delete client",
        details: error.message,
      },
    });
  }
};

const getAllClients = async (req, res, next) => {
  try {
    // Step 1: Get agencyId of the current user
    if (!req.user.agencyId) {
      return res
        .status(404)
        .json({ message: "User does not belongs to any Agency" });
    }

    const clients = await prisma.client.findMany({
      where: {
        agencyId: req.user.agencyId,
      },
      select: {
        id: true,
        clientName: true,
        familyFriends: true,
      },
    });

    res.status(200).json(clients);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getClients,
  createClient,
  getClientById,
  updateClient,
  deleteClient,
  getAllClients,
};
