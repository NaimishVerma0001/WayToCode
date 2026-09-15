// server/server.js

require("dotenv").config();

const http = require("http");
const mongoose = require("mongoose");

const { validateEnvironment } = require("./src/config/env");
const app = require("./src/app");
const connectDB = require("./src/config/database");
const socketService = require("./src/services/socketService");
const contestCron = require("./src/jobs/contestCron");

const SHUTDOWN_TIMEOUT_MS = 15000;

let isShuttingDown = false;

const startServer = async () => {
    const environment = validateEnvironment();

    // The database must be reachable before any request or cron tick is served.
    await connectDB();

    const httpServer = http.createServer(app);

    /*
     * The WebSocket allow-list comes from the same parser the HTTP CORS layer
     * uses, so the two can never disagree about which origins are trusted.
     */
    socketService.init(httpServer, environment.allowedOrigins);

    // Background jobs start only once the database connection is live.
    contestCron.start();

    httpServer.listen(environment.port, () => {
        console.log(`🚀 Way2Code backend running on port ${environment.port}`);
        console.log(`🌐 Environment: ${environment.nodeEnvironment}`);
        console.log(`🔒 Allowed CORS & WS origins: ${environment.allowedOrigins.join(", ")}`);

        if (!environment.emailConfigured) {
            console.warn("✉️  SMTP is not configured; emails will be logged to the console.");
        }

        if (!environment.otpConfigured) {
            console.warn("🔑 REGISTRATION_OTP_SECRET is not set; OTP signup is disabled.");
        }
    });

    /*
     * Graceful shutdown: stop accepting work, drain in-flight requests, then
     * release the socket server and the database pool. Skipping the last two
     * previously left the process hanging or the pool leaking on redeploys.
     */
    const shutdown = async (signal) => {
        if (isShuttingDown) return;
        isShuttingDown = true;

        console.log(`\n${signal} received. Shutting down gracefully...`);

        const forceExit = setTimeout(() => {
            console.error("Forced shutdown after timeout.");
            process.exit(1);
        }, SHUTDOWN_TIMEOUT_MS);

        forceExit.unref();

        try {
            await contestCron.stop();
            await socketService.close();

            await new Promise((resolve, reject) => {
                httpServer.close((error) => (error ? reject(error) : resolve()));
            });

            await mongoose.connection.close(false);

            console.log("✅ Shutdown complete.");
            clearTimeout(forceExit);
            process.exit(0);
        } catch (error) {
            console.error("❌ Error during shutdown:", error.message);
            process.exit(1);
        }
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));

    /*
     * A process that has hit an unhandled rejection or uncaught exception is in
     * an unknown state. Log it, then exit so the platform restarts a clean one.
     */
    process.on("unhandledRejection", (reason) => {
        console.error("❌ Unhandled promise rejection:", reason);
        shutdown("unhandledRejection");
    });

    process.on("uncaughtException", (error) => {
        console.error("❌ Uncaught exception:", error);
        shutdown("uncaughtException");
    });

    return httpServer;
};

if (require.main === module) {
    startServer().catch((error) => {
        console.error("❌ Server startup failed:", error.message);
        process.exit(1);
    });
}

module.exports = { startServer };
