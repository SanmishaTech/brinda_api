// generateRandomCode.js

function generateTPin(length = 4) {
  const chars = "0123456789";
  let result = "";

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    result += chars[randomIndex];
  }

  return result;
}

module.exports = { generateTPin };
