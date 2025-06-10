const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

/**
 * Finds the last downline member in a chain based on sponsorId and position.
 *
 * @param {string} sponsorId - The sponsor's memberUsername.
 * @param {string} position - The positionToParent value ("Left", "Right", etc.).
 * @returns {Promise<Object|null>} - The last matched member object or null if not found.
 */
const findParent = async (sponsorId, position) => {
  const parent = await prisma.member.findUnique({
    where: { memberUsername: sponsorId },
    select: { id: true },
  });

  let latestParent = await prisma.member.findFirst({
    where: {
      parentId: parent.id,
      positionToParent: position,
    },
  });

  if (!latestParent) {
    return parent;
  }

  let current = latestParent;

  while (current) {
    const next = await prisma.member.findFirst({
      where: {
        parentId: current.id,
        positionToParent: position,
      },
    });

    if (!next) break;

    latestParent = next;
    current = next;
  }

  return latestParent || null;
};

module.exports = { findParent };
