/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./src/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors:{
        'green-lahuerta':'#536271',
        'orange-lahuerta':'#FF8800',
        'yellow-lahuerta':'#F7E354',
        'brown-lahuerta':'#8D6E63',
        'blue-lahuerta':'#4a7bc4',
        'little-blue-lahuerta':'#AFB9D4',
        // Design system tokens
        'surface':               '#f7f9fb',
        'surface-low':           '#f0f4f7',
        'surface-card':          '#ffffff',
        'on-surface':            '#2c3437',
        'on-surface-muted':      '#596064',
        'border-subtle':         '#e3e9ed',
      }
    },
  },
  plugins: [],
}