// server/src/config/database.js

const mongoose = require("mongoose");

const CONNECT_OPTIONS = {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    maxPoolSize: 10,
    minPoolSize: 0,
    // Fail fast instead of silently queueing operations while disconnected,
    // which otherwise turns an outage into a pile of hung requests.
    bufferCommands: false
};

/**
 * Global Mongoose configuration.
 *
 * Exported separately so tests apply exactly the same settings as production.
 * Configuring this only inside `connectDB` meant the suites ran against
 * different Mongoose behaviour than the deployed server, which hid real bugs.
 *
 * Note on injection: `sanitizeFilter` is deliberately NOT enabled. It wraps
 * every object-valued filter in `$eq`, which breaks legitimate operator
 * queries such as `{ startTime: { $gt: now } }` unless each one is marked with
 * `mongoose.trusted()`. Operator injection is instead prevented at the edge —
 * every request body goes through a strict Zod schema, and services type-check
 * any value they interpolate into a query.
 */
const configureMongoose = () => {
    // Silently dropping unknown query fields hides typos; reject them instead.
    mongoose.set("strictQuery", true);

    // Surface a missing index in development rather than a slow collection scan.
    mongoose.set("autoIndex", process.env.NODE_ENV !== "production");
};

const getMongoUri = () => {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;

    if (typeof mongoUri !== "string" || !mongoUri.trim()) {
        throw new Error(
            "MongoDB connection variable is missing. Set MONGO_URI in server/.env."
        );
    }

    const normalizedUri = mongoUri.trim();

    if (
        !normalizedUri.startsWith("mongodb://") &&
        !normalizedUri.startsWith("mongodb+srv://")
    ) {
        throw new Error(
            "MongoDB connection string must begin with mongodb:// or mongodb+srv://."
        );
    }

    return normalizedUri;
};

let listenersRegistered = false;

const registerConnectionListeners = () => {
    if (listenersRegistered) return;
    listenersRegistered = true;

    mongoose.connection.on("error", (error) => {
        console.error("MongoDB runtime error:", error.message);
    });

    mongoose.connection.on("disconnected", () => {
        console.warn("MongoDB connection was disconnected.");
    });

    mongoose.connection.on("reconnected", () => {
        console.log("✅ MongoDB connection re-established.");
    });
};

/**
 * Connect to MongoDB.
 *
 * Throws on failure rather than calling process.exit, so the caller decides how
 * to handle it. A module that terminates the process cannot be tested.
 */
const connectDB = async () => {
    configureMongoose();
    registerConnectionListeners();

    const connection = await mongoose.connect(getMongoUri(), CONNECT_OPTIONS);

    console.log(`✅ MongoDB connected: ${connection.connection.host}`);

    return connection;
};

module.exports = connectDB;
module.exports.connectDB = connectDB;
module.exports.configureMongoose = configureMongoose;
module.exports.getMongoUri = getMongoUri;
module.exports.CONNECT_OPTIONS = CONNECT_OPTIONS;
