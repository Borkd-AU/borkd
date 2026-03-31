import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        cream: '#FAF7F2',
        charcoal: '#2D2D2D',
        sage: '#8FA98B',
        'sage-light': '#B5C9B2',
        'sage-dark': '#6B8A67',
        terracotta: '#C67B5C',
        'terracotta-light': '#D9A08C',
        'terracotta-dark': '#A85F42',
        stone: '#A69B8D',
        'stone-light': '#C4BAB0',
        'stone-dark': '#8A7F72',
      },
    },
  },
  plugins: [],
};

export default config;
