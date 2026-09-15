/**
 * Per-suite database lifecycle for integration tests.
 *
 * `globalSetup` has already started one in-memory MongoDB and published its URI
 * on `process.env.MONGO_URI`; each worker simply connects to it.
 */

const mongoose = require("mongoose");

const { configureMongoose } = require("../src/config/database");

/*
 * Apply the exact Mongoose configuration the server uses. Connecting directly
 * without this made the suites run against different behaviour than production,
 * which let query-level bugs pass a green test run.
 */
configureMongoose();

/**
 * Each Jest worker gets its own database on the shared in-memory server.
 *
 * Without this, suites running in parallel share one database and the
 * `afterEach` cleanup below wipes another worker's fixtures mid-test, which
 * surfaces as sporadic 401s and missing documents.
 */
const getWorkerDatabaseUri = () => {
    const baseUri = process.env.MONGO_URI;

    if (!baseUri) {
        throw new Error(
            "MONGO_URI is not set. Integration tests must run through jest globalSetup."
        );
    }

    const workerId = process.env.JEST_WORKER_ID || "1";
    const url = new URL(baseUri);

    url.pathname = `/way2code-test-${workerId}`;

    return url.toString();
};

beforeAll(async () => {
    await mongoose.connect(getWorkerDatabaseUri(), {
        serverSelectionTimeoutMS: 20000
    });

    /*
     * Build indexes up front. Without this, the first test that relies on a
     * unique constraint can pass or fail depending on index build timing.
     */
    await Promise.all(
        Object.values(mongoose.models).map((model) => model.init())
    );
});

afterEach(async () => {
    const { collections } = mongoose.connection;

    await Promise.all(
        Object.values(collections).map((collection) => collection.deleteMany({}))
    );

    // In-process caches would otherwise leak state between tests.
    const platformCache = require("../src/utils/platformCache");
    const contestCache = require("../src/cache/contestCache");

    platformCache.clear();
    contestCache.clearCache();
});

afterAll(async () => {
    // Drop the worker's database so a rerun never inherits leftover state.
    await mongoose.connection.dropDatabase().catch(() => {});
    await mongoose.connection.close();
});

module.exports = { getWorkerDatabaseUri };
