module.exports = async () => {
    const mongoServer = globalThis.__MONGO_SERVER__;

    if (mongoServer) {
        await mongoServer.stop();
        globalThis.__MONGO_SERVER__ = undefined;
    }
};
