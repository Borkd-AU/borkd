import type { Config } from 'tailwindcss';

export default {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './features/**/*.{ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        cream: '#FAF6F1',
        'warm-sand': '#F0EBE3',
        charcoal: '#1C1C1C',
        stone: '#8C8279',
        sage: '#7A9E7E',
        terracotta: '#C17C5E',
        linen: '#E8E2DA',
        'pin-green': '#5B9A6B',
        'pin-red': '#C75D5D',
        'pin-blue': '#5B89A6',
        'pin-amber': '#C4944A',
      },
      fontFamily: {
        display: ['Nunito'],
        body: ['NunitoSans'],
      },
      borderRadius: {
        card: '16px',
        button: '12px',
        chip: '20px',
      },
    },
  },
  plugins: [],
} satisfies Config;
