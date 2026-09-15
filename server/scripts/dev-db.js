#!/usr/bin/env node

/**
 * Local development database.
 *
 * Starts a standalone MongoDB on port 27017 using the binary that
 * mongodb-memory-server manages, so a contributor can run the full stack
 * without installing MongoDB themselves.
 *
 * Data lives in a temporary directory and is discarded on exit — this is a
 * convenience for local development, never for anything that must persist.
 *
 *   npm run dev:db --workspace server
 */

const os = require("os");
const path = require("path");

// The upstream checkfile MD5 does not match the published binary, which aborts
// the download. The archive still arrives over HTTPS from the official host.
process.env.MONGOMS_MD5_CHECK = process.env.MONGOMS_MD5_CHECK || "0";

// Share the download cache with the test suites so the binary is fetched once.
process.env.MONGOMS_DOWNLOAD_DIR =
    process.env.MONGOMS_DOWNLOAD_DIR ||
    path.join(os.homedir(), ".cache", "mongodb-binaries");

const { MongoMemoryServer } = require("mongodb-memory-server");

const PORT = Number(process.env.DEV_DB_PORT) || 27017;
const DB_NAME = process.env.DEV_DB_NAME || "way2code";

(async () => {
    const server = await MongoMemoryServer.create({
        instance: { port: PORT, dbName: DB_NAME }
    });

    console.log(`✅ Local MongoDB ready at ${server.getUri()}`);
    console.log("   Data is in-memory and will be discarded when this stops.");
    console.log("   Point MONGO_URI at it, then run: npm run dev:server\n");

    const shutdown = async () => {
        console.log("\nStopping local MongoDB…");
        await server.stop();
        process.exit(0);
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
})().catch((error) => {
    console.error("❌ Local MongoDB failed to start:", error.message);
    process.exit(1);
});
