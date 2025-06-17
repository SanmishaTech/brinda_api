// src/seeders/seeder.js
const { PrismaClient } = require("@prisma/client");
const { TOP, DIAMOND } = require("../config/data");
const { MEMBER, ADMIN } = require("../config/roles");
require("dotenv").config();
const prisma = new PrismaClient();

async function seed() {
  try {
    // Create user
    const admin = await prisma.user.create({
      data: {
        name: "Admin",
        username: "admin",
        email: "admin@gmail.com",
        mobile: "1234567890",
        password: "abcd123",
        role: ADMIN,
        active: true,
      },
    });

    const member = await prisma.user.create({
      data: {
        name: "Brinda",
        username: "0625000001",
        email: "brinda@gmail.com",
        mobile: "2222222222",
        password: "abcd123",
        role: MEMBER,
        active: true,
        member: {
          create: {
            memberName: "Brinda",
            memberUsername: "0625000001",
            memberEmail: "brinda@gmail.com",
            memberMobile: "2222222222",
            positionToParent: TOP,
            memberState: "Maharashtra",
            tPin: "6789",
            status: DIAMOND,
          },
        },
      },
    });

    console.log("✅ Seeding completed.");
  } catch (error) {
    console.error("❌ Seeding failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
