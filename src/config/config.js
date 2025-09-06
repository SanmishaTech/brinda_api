module.exports = {
  appName: process.env.APP_NAME || "My Brinda",
  defaultUserRole: process.env.DEFAULT_USER_ROLE || "member",
  allowRegistration: process.env.ALLOW_REGISTRATION || true,
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
};
