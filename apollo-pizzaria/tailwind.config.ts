import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        apollo: {
          orange: '#E85D24',
          gold: '#D4941A',
          dark: '#0D0D0D',
        },
      },
      fontFamily: {
        playfair: ['var(--font-playfair)'],
        dm: ['var(--font-dm-sans)'],
      },
    },
  },
  plugins: [],
};
export default config;
