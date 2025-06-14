const express = require("express");
const morgan = require("morgan");
const helmet = require("helmet");
const cors = require("cors");
const createError = require("http-errors");
require("dotenv").config();
const roleRoutes = require("./routes/roles");
const userRoutes = require("./routes/users");
const authRoutes = require("./routes/auth");
const profileRoutes = require("./routes/profile");
const airlineRoutes = require("./routes/airline");
const stateRoutes = require("./routes/state");
const memberRoutes = require("./routes/member");
const productRoutes = require("./routes/product");
const walletTransactionRoutes = require("./routes/walletTransaction");
const purchaseRoutes = require("./routes/purchase");
const swaggerRouter = require("./swagger");
const path = require("path");
const config = require("./config/config");
const app = express();
app.use(morgan("dev"));
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow cross-origin resource loading
  })
);
app.use(
  cors({
    origin: config.frontendUrl || "http://localhost:5173", // Allow requests from this origin
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"], // Allowed HTTP methods
    allowedHeaders: ["Content-Type", "Authorization"], // Allowed headers
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // For application/x-www-form-urlencoded (optional, but common)
const uploadsPath = path.join(__dirname, "..", "uploads");
console.log(`Serving static files from: ${uploadsPath}`); // Verify this path on startup!
app.use("/uploads", express.static(uploadsPath));
app.use("/api/auth", authRoutes);
app.use("/api/roles", roleRoutes);
app.use("/api/users", userRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/airlines", airlineRoutes);
app.use("/api/states", stateRoutes);
app.use("/api/members", memberRoutes);
app.use("/api/products", productRoutes);
app.use("/api/wallet-transactions", walletTransactionRoutes); // Ensure this route is defined in walletTransactionRoutes
app.use("/api/purchases", purchaseRoutes);
app.use(swaggerRouter); // Add this line to include Swagger documentation

app.use((req, res, next) => {
  next(createError(404));
});

module.exports = app;
