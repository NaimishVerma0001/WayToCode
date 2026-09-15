import js from "@eslint/js";
import globals from "globals";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import jsxA11y from "eslint-plugin-jsx-a11y";

/**
 * One flat config for the whole workspace.
 *
 * The server is CommonJS on Node, the client is ESM in the browser, and the
 * two test runners expose different globals, so each gets its own block rather
 * than a lowest-common-denominator setup that silences real problems.
 */
export default [
    {
        ignores: [
            "**/node_modules/**",
            "**/build/**",
            "**/dist/**",
            "**/coverage/**",
            "client/public/**"
        ]
    },

    js.configs.recommended,

    /*
    |--------------------------------------------------------------------------
    | Server (CommonJS, Node)
    |--------------------------------------------------------------------------
    */
    {
        files: ["server/**/*.js"],
        languageOptions: {
            ecmaVersion: 2024,
            sourceType: "commonjs",
            globals: { ...globals.node }
        },
        rules: {
            "no-unused-vars": [
                "error",
                {
                    // Express identifies error handlers by arity, so a `next`
                    // it never calls must not be reported.
                    argsIgnorePattern: "^_|^next$",
                    varsIgnorePattern: "^_",
                    caughtErrors: "none"
                }
            ],
            "no-console": "off",
            "no-process-exit": "off",
            eqeqeq: ["error", "smart"],
            "no-return-await": "error",
            "prefer-const": "error",
            "no-var": "error",
            "require-atomic-updates": "warn"
        }
    },

    /*
    |--------------------------------------------------------------------------
    | Server tests (Jest)
    |--------------------------------------------------------------------------
    */
    {
        files: ["server/tests/**/*.js"],
        languageOptions: {
            globals: { ...globals.node, ...globals.jest }
        },
        rules: {
            "no-await-in-loop": "off"
        }
    },

    /*
    |--------------------------------------------------------------------------
    | Client (ESM, browser, React)
    |--------------------------------------------------------------------------
    */
    {
        files: ["client/**/*.{js,jsx}"],
        languageOptions: {
            ecmaVersion: 2024,
            sourceType: "module",
            globals: { ...globals.browser },
            parserOptions: {
                ecmaFeatures: { jsx: true }
            }
        },
        settings: { react: { version: "detect" } },
        plugins: {
            react,
            "react-hooks": reactHooks,
            "jsx-a11y": jsxA11y
        },
        rules: {
            ...react.configs.flat.recommended.rules,
            ...react.configs.flat["jsx-runtime"].rules,
            ...reactHooks.configs.recommended.rules,
            ...jsxA11y.flatConfigs.recommended.rules,

            // Prop types add little in a codebase this size and are not used.
            "react/prop-types": "off",

            /*
             * `import React` is redundant under the automatic JSX runtime but
             * remains the convention across these files, and several of them
             * genuinely need the namespace (React.StrictMode, React.Component).
             * Flagging it everywhere would be churn, not a fix.
             */
            "no-unused-vars": [
                "error",
                {
                    argsIgnorePattern: "^_",
                    varsIgnorePattern: "^(_|React$)",
                    caughtErrors: "none"
                }
            ],

            /*
             * eslint-plugin-react-hooks v7 ships React Compiler rules that
             * assume a compiler-ready codebase. They surface genuinely useful
             * signals, so they stay on as warnings rather than being disabled,
             * but they must not fail the build for patterns that are correct
             * under the current runtime.
             */
            "react-hooks/set-state-in-effect": "warn",
            "react-hooks/purity": "warn",
            "react-hooks/immutability": "warn",
            "react-hooks/refs": "warn",
            "no-console": ["warn", { allow: ["warn", "error"] }],
            eqeqeq: ["error", "smart"],
            "prefer-const": "error",
            "no-var": "error"
        }
    },

    /*
    |--------------------------------------------------------------------------
    | Client tests (Vitest)
    |--------------------------------------------------------------------------
    */
    {
        files: ["client/**/*.{test,spec}.{js,jsx}", "client/src/setupTests.js"],
        languageOptions: {
            globals: { ...globals.browser, ...globals.node, ...globals.vitest }
        },
        rules: {
            "no-console": "off"
        }
    },

    /*
    |--------------------------------------------------------------------------
    | Build & tooling config files
    |--------------------------------------------------------------------------
    */
    {
        files: ["*.config.js", "client/*.config.js", "server/*.config.js"],
        languageOptions: {
            globals: { ...globals.node }
        },
        rules: {
            "no-console": "off"
        }
    }
];
