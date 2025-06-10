// src/seeders/seeder.js
const { PrismaClient } = require("@prisma/client");
const { TOP, ACTIVE } = require("../config/data");
const { MEMBER, ADMIN } = require("../config/roles");
require("dotenv").config();

const prisma = new PrismaClient();

async function seed() {
  try {
    // Create user
    const admin = await prisma.user.create({
      data: {
        name: "brinda",
        username: "brinda",
        email: "admin@gmail.com",
        mobile: "1234567890",
        password: "abcd123",
        role: ADMIN,
        active: true,
      },
    });

    const member = await prisma.user.create({
      data: {
        name: "member",
        username: "06250001",
        email: "member@gmail.com",
        mobile: "2222222222",
        password: "abcd123",
        role: MEMBER,
        active: true,
        member: {
          create: {
            memberName: "member",
            memberUsername: "06250001",
            memberEmail: "member@gmail.com",
            memberMobile: "2222222222",
            positionToParent: TOP,
            memberState: "Maharashtra",
            tPin: "abcd123",
            status: ACTIVE,
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
