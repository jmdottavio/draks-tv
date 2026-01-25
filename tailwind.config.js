/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/client/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Brand colors
        twitch: {
          purple: '#9147ff',
          'purple-hover': '#772ce8',
          'purple-light': '#bf94ff',
        },

        // Status colors
        live: '#ff4444',
        'live-glow': '#ff6b6b',
        favorite: '#fbbf24',
        'favorite-hover': '#f59e0b',

        // Surface colors (lighter theme)
        surface: {
          page: '#18181b',
          card: '#1f1f23',
          elevated: '#26262c',
          border: '#3f3f46',
          'border-muted': '#2f2f35',
        },

        // Text colors (improved contrast)
        text: {
          primary: '#efeff1',
          secondary: '#c4c4cc',
          muted: '#a0a0a8',
          dim: '#8e8e99',
        },

        // Sidebar (updated to match new theme)
        sidebar: {
          bg: '#18181b',
          hover: '#26262c',
          border: '#3f3f46',
          text: '#efeff1',
          'text-muted': '#c4c4cc',
          'text-dim': '#8e8e99',
        },
      },
    },
  },
  plugins: [],
};
