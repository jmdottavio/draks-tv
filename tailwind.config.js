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
        live: '#eb0400',
        favorite: '#f5c518',
      },
    },
  },
  plugins: [],
};
