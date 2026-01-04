import express from "express";
import mongoose from "mongoose";
import morgan from "morgan";
import dotenv from "dotenv";
import cors from "cors";

import productRoutes from "./routers/Product.routes.js";
import userRoutes from "./routers/User.routes.js";
import orderRoutes from "./routers/Order.routes.js";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB URL with correct database name
const MONGODB_URL =
  "mongodb+srv://iangabrielcalica_db_user:5MeHQWIUnjmJtaK7@myprojectcluster.68fn28o.mongodb.net/vendingMachine?retryWrites=true&w=majority&appName=MyProjectCluster";

app.use(express.json());
app.use(morgan("dev"));
app.use(cors());

// MongoDB Connection
const connectDB = async () => {
  try {
    console.log("🔄 Connecting to MongoDB...");

    // Simple connection without deprecated options
    await mongoose.connect(MONGODB_URL);

    console.log("✅ MongoDB Connected Successfully!");
    console.log(`📊 Database: ${mongoose.connection.name}`);
    console.log(`📍 Host: ${mongoose.connection.host}`);

    // Test connection by listing collections
    const collections = await mongoose.connection.db
      .listCollections()
      .toArray();
    console.log(
      "📁 Collections:",
      collections.map((c) => c.name)
    );
  } catch (error) {
    console.error("❌ MongoDB Connection Error:", error.message);
    console.log("\n🔍 Troubleshooting Tips:");
    console.log("1. Check internet connection");
    console.log("2. Verify MongoDB Atlas cluster is running");
    console.log("3. Check IP whitelist in Atlas (Network Access)");
    console.log("4. Verify username/password");
    console.log("5. Make sure database 'vendingMachine' exists");
    process.exit(1);
  }
};

// Connect to MongoDB
connectDB();

// Routes
app.use("/api/users", userRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);

// Health check endpoint
app.get("/health", (req, res) => {
  const dbStatus = mongoose.connection.readyState;
  const status = dbStatus === 1 ? "healthy" : "unhealthy";

  res.json({
    status: status,
    timestamp: new Date(),
    database: {
      name: mongoose.connection.name,
      state: getConnectionState(dbStatus),
      readyState: dbStatus,
    },
    endpoints: {
      users: "/api/users",
      products: "/api/products",
    },
  });
});

// Helper function to get connection state
function getConnectionState(state) {
  const states = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };
  return states[state] || "unknown";
}

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    message: "🚀 Vending Machine API",
    version: "1.0.0",
    database: mongoose.connection.name,
    status: mongoose.connection.readyState === 1 ? "connected" : "connecting",
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🔥 Server running on http://localhost:${PORT}`);
  console.log(
    `📡 MongoDB: ${
      mongoose.connection.readyState === 1 ? "✅ Connected" : "🔄 Connecting..."
    }`
  );
});
