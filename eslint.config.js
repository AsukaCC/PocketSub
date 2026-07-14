const expoConfig = require("eslint-config-expo/flat");
const { defineConfig } = require("eslint/config");

module.exports = defineConfig([
  {
    ignores: [
      ".expo/**",
      "coverage/**",
      "dist/**",
      "node_modules/**",
      "output/**",
      "web-build/**",
    ],
  },
  ...expoConfig,
]);
