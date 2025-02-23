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
        'blue-lahuerta':'#5d89c8',
        'little-blue-lahuerta':'#AFB9D4'

      }
    },
  },
  plugins: [],
}