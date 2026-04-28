/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: "src",
  testMatch: ["**/__tests__/**/*.test.ts"],
  moduleNameMapper: {
    "^@timewell/shared$": "<rootDir>/../../../packages/shared/src/index.ts",
    "^@timewell/shared/(.*)$": "<rootDir>/../../../packages/shared/src/$1",
  },
  globalSetup: "<rootDir>/__tests__/globalSetup.ts",
  globalTeardown: "<rootDir>/__tests__/globalTeardown.ts",
  setupFiles: ["<rootDir>/__tests__/env.ts"],
  testTimeout: 30000,
};
