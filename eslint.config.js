import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  {
    // shadcn-ui primitives are generated and re-export variants and hooks
    // alongside their components by design. Linting them for fast-refresh
    // purity or empty prop interfaces only produces noise nobody acts on.
    files: ["src/components/ui/**/*.{ts,tsx}"],
    rules: {
      "react-refresh/only-export-components": "off",
      "@typescript-eslint/no-empty-object-type": "off",
    },
  },
  {
    // Context modules legitimately export a provider component next to its
    // hook and types.
    files: ["src/context/*.tsx"],
    rules: { "react-refresh/only-export-components": "off" },
  },
  {
    // Tailwind config and Deno edge functions are not part of the browser
    // bundle and do not share its module or typing constraints.
    files: ["tailwind.config.ts"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
  {
    files: ["supabase/functions/**/*.ts"],
    languageOptions: { globals: { Deno: "readonly" } },
    rules: { "@typescript-eslint/no-explicit-any": "off" },
  },
);
