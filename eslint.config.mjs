import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // Pattern "load on mount" légitime dans les vues admin CRM :
      // useEffect(() => load(), [load]) est volontaire et documenté.
      // Le warning perf est noté mais le refactoring en React Query / SWR
      // est reporté (cf. audit tech P2).
      "react-hooks/set-state-in-effect": "warn",

      // Variables préfixées _ sont intentionnellement non utilisées
      // (params de route handlers Next.js par convention).
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
]);

export default eslintConfig;
