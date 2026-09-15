/**
 * Two projects so unit tests never pay for a database.
 *
 * Previously every suite booted an in-memory MongoDB in `beforeAll`, which
 * downloaded the server binary once per worker, made pure unit tests take
 * minutes, and failed the entire run whenever the download was unavailable.
 */

const sharedConfig = {
    testEnvironment: "node",
    clearMocks: true,
    restoreMocks: true,
    setupFiles: ["<rootDir>/tests/env.setup.js"]
};

module.exports = {
    collectCoverageFrom: [
        "src/**/*.js",
        "!src/jobs/**",
        "!src/emails/**",
        "!src/services/platforms/**"
    ],
    coverageDirectory: "coverage",
    coverageReporters: ["text-summary", "lcov", "json-summary"],
    // Floors, not targets: CI fails if coverage regresses below what is
    // currently achieved (statements 65%, branches 44%, functions 64%).
    coverageThreshold: {
        global: {
            statements: 60,
            branches: 40,
            functions: 58,
            lines: 60
        }
    },
    verbose: true,

    projects: [
        {
            ...sharedConfig,
            displayName: "unit",
            testMatch: ["<rootDir>/tests/unit/**/*.test.js"],
            testTimeout: 15000
        },
        {
            ...sharedConfig,
            displayName: "integration",
            testMatch: ["<rootDir>/tests/integration/**/*.test.js"],
            globalSetup: "<rootDir>/tests/globalSetup.js",
            globalTeardown: "<rootDir>/tests/globalTeardown.js",
            setupFilesAfterEnv: ["<rootDir>/tests/database.setup.js"],
            testTimeout: 60000
        }
    ]
};
