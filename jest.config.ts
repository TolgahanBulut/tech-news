import type { Config } from "jest";
import nextJest from "next/jest.js";

// next/jest auto-loads next.config + .env files and configures SWC
// to transpile TS/TSX exactly the way Next does at build time.
// Hand-rolling Babel here would drift from production behavior.
const createJestConfig = nextJest({ dir: "./" });

const config: Config = {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  testPathIgnorePatterns: ["/node_modules/", "/.next/"],
  collectCoverageFrom: [
    "components/**/*.{ts,tsx}",
    "lib/**/*.{ts,tsx}",
    "!**/*.d.ts",
  ],
  coverageProvider: "v8",
  testTimeout: 10_000,
};

// createJestConfig is exported as a function so next/jest can resolve
// the async Next.js config before Jest reads it.
export default createJestConfig(config);