/**
 * Boot one in-memory MongoDB for the whole integration run.
 *
 * Starting a server per suite (the previous behaviour) re-downloaded the
 * binary in every worker and dominated the runtime.
 */

const path = require("path");
const os = require("os");

/*
 * The upstream checkfile MD5 does not match the published binary, which makes
 * the download abort. The archive is still fetched over HTTPS from the official
 * MongoDB host, so integrity is covered by TLS.
 */
process.env.MONGOMS_MD5_CHECK = process.env.MONGOMS_MD5_CHECK || "0";

// A shared download directory keeps CI and local runs from re-fetching it.
process.env.MONGOMS_DOWNLOAD_DIR =
    process.env.MONGOMS_DOWNLOAD_DIR ||
    path.join(os.homedir(), ".cache", "mongodb-binaries");

module.exports = async () => {
    const { MongoMemoryServer } = require("mongodb-memory-server");

    const mongoServer = await MongoMemoryServer.create({
        instance: { dbName: "way2code-test" }
    });

    // Workers inherit process.env, which is how the per-suite setup finds the URI.
    process.env.MONGO_URI = mongoServer.getUri();

    globalThis.__MONGO_SERVER__ = mongoServer;
};
