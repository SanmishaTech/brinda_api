const { PrismaClient } = require("@prisma/client");
// const { late } = require("zod");
// const { transform } = require("zod/v4");
const prisma = require("../config/db");

/**
 * Finds the last downline member in a chain based on sponsorId and position.
 *
 * @param {string} sponsorId - The sponsor's memberUsername.
 * @param {string} position - The positionToParent value ("Left", "Right", etc.).
 * @returns {Promise<Object|null>} - The last matched member object or null if not found.
 */
const findParent = async (sponsorId, position) => {
  const sponsorer = await prisma.member.findUnique({
    where: { memberUsername: sponsorId },
    select: { id: true },
  });

  let parent = sponsorer;
  let latestParent = null;

  do {
    latestParent = await prisma.member.findFirst({
      where: {
        parentId: parent.id,
        positionToParent: position,
      },
    });

    if (latestParent) {
      parent = latestParent;
    }
  } while (latestParent);

  return parent || null;
};

module.exports = { findParent };
