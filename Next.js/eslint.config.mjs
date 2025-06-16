import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Suppress less critical rules for development
      "@typescript-eslint/no-explicit-any": "warn", // Change from error to warning
      "@typescript-eslint/no-unused-vars": ["error", { 
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_",
        "ignoreRestSiblings": true 
      }],
      "react/no-unescaped-entities": "warn", // Change from error to warning
      "prefer-const": "warn", // Change from error to warning
      
      // Keep important rules as errors
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn", // Too noisy as error
      
      // Disable overly strict rules for development
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
    }
  }
];

export default eslintConfig;
