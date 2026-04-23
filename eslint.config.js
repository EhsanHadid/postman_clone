const tsParser = require("@typescript-eslint/parser");
const tsPlugin = require("@typescript-eslint/eslint-plugin");
const reactHooks = require("eslint-plugin-react-hooks");
const reactRefresh = require("eslint-plugin-react-refresh");

module.exports = [
  {
    ignores: ["**/dist/**", "**/node_modules/**"],
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        Blob: "readonly",
        Buffer: "readonly",
        File: "readonly",
        FormData: "readonly",
        Headers: "readonly",
        URL: "readonly",
        console: "readonly",
        crypto: "readonly",
        document: "readonly",
        fetch: "readonly",
        process: "readonly",
        window: "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
    },
  },
  {
    files: ["apps/web/**/*.ts", "apps/web/**/*.tsx"],
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": "warn",
    },
  },
];
