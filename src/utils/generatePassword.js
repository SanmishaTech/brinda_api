// generateRandomCode.js

/**
 * Generates a random alphanumeric string.
 * Default length: 6 characters.
 * Characters used: A-Z, a-z, 0-9
 */
function generatePassword(length = 6) {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    result += chars[randomIndex];
  }

  return result;
}

module.exports = { generatePassword };
