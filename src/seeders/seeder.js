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
        username: "0725000001",
        email: "brinda@gmail.com",
        mobile: "2222222222",
        password: "abcd123",
        role: MEMBER,
        active: true,
        member: {
          create: {
            memberName: "Brinda",
            memberUsername: "0725000001",
            memberEmail: "brinda@gmail.com",
            memberMobile: "2222222222",
            positionToParent: TOP,
            memberState: "Maharashtra",
            tPin: "6789",
            status: DIAMOND,
            isDirectMatch: true,
            is2_1Pass: true,
            isDoubleMatch: true,
          },
        },
      },
    });

    await prisma.product.createMany({
      data: [
        {
          productName: "Aloe Vera Juice",
          hsnCode: "30049011",
          mrp: 450.0,
          mfgRate: 380.0,
          gst: 12.0,
          dspRate: 400.0,
          pv: 1.0,
          bv: 3.0,
          bvPrice: 350.0,
        },
        {
          productName: "Protein Powder",
          hsnCode: "21069099",
          mrp: 950.0,
          mfgRate: 800.0,
          gst: 18.0,
          dspRate: 880.0,
          pv: 0.5,
          bv: 6.0,
          bvPrice: 780.0,
        },
      ],
    });

    console.log("✅ Seeding completed.");
  } catch (error) {
    console.error("❌ Seeding failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
