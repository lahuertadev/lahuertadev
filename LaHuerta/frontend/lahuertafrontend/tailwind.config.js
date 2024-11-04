/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./src/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors:{
        'green-lahuerta':'#7DB131',
        'orange-lahuerta':'#FF8800',
        'yellow-lahuerta':'#F7E354',
        'brown-lahuerta':'#8D6E63'
      }
    },
  },
  plugins: [],
}