import { FlatCompat } from "@eslint/eslintrc";
import { fileURLToPath } from "node:url";
import path from "node:path";

const projectDirectory = path.dirname(fileURLToPath(import.meta.url));
const compat = new FlatCompat({
  baseDirectory: projectDirectory,
  resolvePluginsRelativeTo: path.join(
    projectDirectory,
    "node_modules/eslint-config-next",
  ),
});

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      ".next-*/**",
      "coverage/**",
      "node_modules/**",
      "next-env.d.ts",
      "out/**",
      "playwright-report/**",
      "test-results/**",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    linterOptions: {
      reportUnusedDisableDirectives: "off",
    },
    rules: {
      "no-console": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "react/no-unescaped-entities": "off",
      "@next/next/no-img-element": "off",
      "@next/next/no-page-custom-font": "off",
      "prefer-const": "off",
    },
  },
  {
    files: ["tailwind.config.ts"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
];

export default eslintConfig;
