const {
    validateEnvironment
} = require(
    "../../src/config/env"
);

const ORIGINAL_ENV = {
    ...process.env
};

const setValidEnvironment = () => {
    process.env.NODE_ENV =
        "development";

    process.env.MONGO_URI =
        "mongodb://127.0.0.1:27017/way2code";

    delete process.env.MONGODB_URI;

    process.env.JWT_SECRET =
        "a_secure_test_secret_that_is_longer_than_32_characters";

    process.env.JWT_EXPIRES_IN =
        "7d";

    process.env.PORT = "5001";

    process.env.CLIENT_URL =
        "http://localhost:3000";
};

describe(
    "Environment validation",
    () => {
        beforeEach(() => {
            setValidEnvironment();
        });

        afterAll(() => {
            process.env =
                ORIGINAL_ENV;
        });

        test(
            "returns normalized valid configuration",
            () => {
                const environment =
                    validateEnvironment();

                expect(
                    environment
                ).toMatchObject({
                    nodeEnvironment:
                        "development",
                    port: 5001,
                    jwtExpiresIn: "7d",
                    clientUrl:
                        "http://localhost:3000"
                });
            }
        );

        test(
            "accepts the legacy MONGODB_URI key",
            () => {
                delete process.env
                    .MONGO_URI;

                process.env
                    .MONGODB_URI =
                    "mongodb://127.0.0.1:27017/legacy";

                expect(
                    validateEnvironment()
                        .mongoUri
                ).toContain(
                    "/legacy"
                );
            }
        );

        test(
            "rejects a missing MongoDB URI",
            () => {
                delete process.env
                    .MONGO_URI;

                delete process.env
                    .MONGODB_URI;

                expect(
                    validateEnvironment
                ).toThrow(
                    "Missing required environment variable: MONGO_URI"
                );
            }
        );

        test(
            "rejects an invalid MongoDB URI",
            () => {
                process.env.MONGO_URI =
                    "not-a-mongodb-url";

                expect(
                    validateEnvironment
                ).toThrow(
                    /must begin with mongodb/i
                );
            }
        );

        test(
            "rejects a weak JWT secret",
            () => {
                process.env.JWT_SECRET =
                    "weak-secret";

                expect(
                    validateEnvironment
                ).toThrow(
                    /at least 32 characters/i
                );
            }
        );

        test(
            "rejects an invalid port",
            () => {
                process.env.PORT =
                    "99999";

                expect(
                    validateEnvironment
                ).toThrow(
                    /valid number between 1 and 65535/i
                );
            }
        );

        test(
            "requires CLIENT_URL in production",
            () => {
                process.env.NODE_ENV =
                    "production";

                delete process.env
                    .CLIENT_URL;

                expect(
                    validateEnvironment
                ).toThrow(
                    "CLIENT_URL is required in production."
                );
            }
        );
    }
);