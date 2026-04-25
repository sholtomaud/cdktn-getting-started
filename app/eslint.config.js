import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import security from "eslint-plugin-security";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  security.configs.recommended,
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Add any project-specific overrides here
    },
  },
  {
    // Disable type-checked rules for non-TS files if any
    ignores: ["dist/**", "node_modules/**", "cdktf.out/**"],
  }
);
