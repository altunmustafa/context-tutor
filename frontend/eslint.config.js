import js from "@eslint/js";
import stylistic from "@stylistic/eslint-plugin";
import { defineConfig } from "eslint/config";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default defineConfig(
  {
    ignores: ["dist", "coverage"],
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommendedTypeChecked,
      tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      "@stylistic": stylistic,
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.flat.recommended.rules,
      "@stylistic/lines-between-class-members": ["error", "always", { exceptAfterOverload: true }],
      "@stylistic/padding-line-between-statements": [
        "error",
        {
          blankLine: "always",
          prev: "*",
          next: [
            "function",
            {
              selector: "ExportNamedDeclaration[declaration.type='FunctionDeclaration']",
            },
            {
              selector: "ExportDefaultDeclaration[declaration.type='FunctionDeclaration']",
            },
          ],
        },
        {
          blankLine: "always",
          prev: [
            "function",
            {
              selector: "ExportNamedDeclaration[declaration.type='FunctionDeclaration']",
            },
            {
              selector: "ExportDefaultDeclaration[declaration.type='FunctionDeclaration']",
            },
          ],
          next: "*",
        },
      ],
      "@typescript-eslint/no-deprecated": "warn",
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
    },
  },
  {
    files: ["*.config.{js,ts}"],
    extends: [js.configs.recommended, tseslint.configs.disableTypeChecked],
  },
);
