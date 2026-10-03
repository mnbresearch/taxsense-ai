import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const config = [
  ...nextVitals,
  ...nextTs,
  { ignores: [".next/**", "node_modules/**", "next-env.d.ts", "public/**"] },
  {
    rules: {
      // React already escapes text children; apostrophes in copy are not a bug.
      "react/no-unescaped-entities": "off",
    },
  },
  {
    // UI components hold loosely-shaped API JSON in state; server code below is strict.
    files: ["src/app/**/*.tsx"],
    rules: { "@typescript-eslint/no-explicit-any": "warn" },
  },
  {
    files: ["tests/**", "scripts/**"],
    rules: { "@typescript-eslint/no-explicit-any": "off" },
  },
];
export default config;
