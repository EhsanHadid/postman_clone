module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true,
    node: true
  },
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint", "react-hooks", "react-refresh"],
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  ignorePatterns: ["dist", "node_modules", "*.config.js"],
  overrides: [
    {
      files: ["apps/web/**/*.ts", "apps/web/**/*.tsx"],
      env: {
        browser: true
      },
      extends: ["plugin:react-hooks/recommended"],
      rules: {
        "react-refresh/only-export-components": "warn"
      }
    },
    {
      files: ["apps/api/**/*.ts", "packages/**/*.ts"],
      env: {
        node: true
      }
    }
  ]
};
