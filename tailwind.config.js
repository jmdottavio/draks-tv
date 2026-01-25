/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/client/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        twitch: {
          purple: '#9147ff',
          'purple-hover': '#772ce8',
          'purple-light': '#bf94ff',
        },
        live: '#ff4444',
        'live-glow': '#ff6b6b',
        favorite: '#fbbf24',
        'favorite-hover': '#f59e0b',
        sidebar: {
          bg: '#0e0e10',
          hover: '#1f1f23',
          border: '#2f2f35',
          text: '#efeff1',
          'text-muted': '#adadb8',
          'text-dim': '#7a7a85',
        },
      },
    },
  },
  plugins: [],
};
