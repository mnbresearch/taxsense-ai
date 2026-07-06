import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: { 50: "#eef7f2", 100: "#d6ede1", 500: "#0d5947", 600: "#0a4a3b", 700: "#083c30", 900: "#052720" },
      },
    },
  },
  plugins: [],
} satisfies Config;
