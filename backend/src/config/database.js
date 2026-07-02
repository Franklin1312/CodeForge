import mongoose from "mongoose";
import logger from "../utils/logger.js";

const MONGO_OPTIONS = {
  // Connection pool
  maxPoolSize: 10,
  minPoolSize: 2,
  // Timeouts
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 10000,
  // Heartbeat
  heartbeatFrequencyMS: 10000,
};

export async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set in environment variables");
  }

  try {
    await mongoose.connect(uri, MONGO_OPTIONS);
    logger.info(`✅ MongoDB connected: ${mongoose.connection.host}`);
  } catch (err) {
    logger.error("MongoDB connection error:", err.message);
    throw err;
  }

  // Connection event listeners
  mongoose.connection.on("disconnected", () => {
    logger.warn("MongoDB disconnected — attempting reconnect...");
  });

  mongoose.connection.on("reconnected", () => {
    logger.info("MongoDB reconnected");
  });

  mongoose.connection.on("error", (err) => {
    logger.error("MongoDB error:", err.message);
  });
}

export async function disconnectDB() {
  await mongoose.connection.close();
  logger.info("MongoDB connection closed");
}

export default mongoose;
