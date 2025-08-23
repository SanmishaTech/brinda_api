const jwt = require("jsonwebtoken");
const createError = require("http-errors");
const { secret } = require("../config/jwt");
const prisma = require("../config/db");

module.exports = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return next(createError(401, "Unauthorized"));
  }
  try {
    const decoded = jwt.verify(token, secret);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        member: true,
      },
    });
    if (!user) {
      return next(createError(401, "Unauthorized"));
    }
    // req.user = user;
    // Attach impersonation info if available
    req.user = {
      ...user,
      impersonating: decoded.impersonating || false,
      originalAdminId: decoded.originalAdminId || null,
    };
    next();
  } catch (error) {
    return next(createError(401, "Unauthorized"));
  }
};
