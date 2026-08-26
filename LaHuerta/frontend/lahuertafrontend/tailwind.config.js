/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
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
        // Design system tokens (definidos como variables CSS en index.css para soportar dark mode).
        // Usan rgb(var(...) / <alpha-value>) en vez de var(...) a secas para que los modificadores
        // de opacidad de Tailwind (bg-surface-low/30, etc.) funcionen correctamente.
        'surface':               'rgb(var(--color-surface-rgb) / <alpha-value>)',
        'surface-low':           'rgb(var(--color-surface-low-rgb) / <alpha-value>)',
        'surface-card':          'rgb(var(--color-surface-card-rgb) / <alpha-value>)',
        'on-surface':            'rgb(var(--color-on-surface-rgb) / <alpha-value>)',
        'on-surface-muted':      'rgb(var(--color-on-surface-muted-rgb) / <alpha-value>)',
        'border-subtle':         'rgb(var(--color-border-subtle-rgb) / <alpha-value>)',
        'field-locked':          'rgb(var(--color-field-locked-rgb) / <alpha-value>)',
        'field-locked-border':   'rgb(var(--color-field-locked-border-rgb) / <alpha-value>)',
        'accent':                'rgb(var(--color-accent-rgb) / <alpha-value>)',
      }
    },
  },
  plugins: [],
}
