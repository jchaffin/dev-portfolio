import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: {},
  allConfig: {},
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals"),
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
    },
    rules: {
      // Allow console statements in development
      "no-console": process.env.NODE_ENV === "production" ? "error" : "warn",
      // Allow unused variables if they start with underscore
      "no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
      // Allow empty functions
      "no-empty-function": "warn"
    },
  },
];

export default eslintConfig;
