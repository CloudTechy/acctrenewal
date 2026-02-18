import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          DEFAULT: '#ffd534',
          light: '#ffba26',
          dark: '#efab18',
          darker: '#d7ab04',
        },
      },
      fontFamily: {
        outfit: ['var(--font-outfit)'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      backdropBlur: {
        xl: '20px',
        md: '12px',
      },
    },
  },
  plugins: [],
};

export default config;
