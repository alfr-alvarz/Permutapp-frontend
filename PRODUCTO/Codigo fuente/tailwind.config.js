/**
 * tailwind.config.js — Configuración de Tailwind CSS para Permutapp.
 *
 * Define las rutas de escaneo de contenido, la paleta de colores personalizada
 * y los plugins necesarios para que NativeWind funcione con React Native.
 *
 * Paleta "brand": tonos verde/esmeralda que representan la identidad visual
 * de Permutapp y transmiten sustentabilidad, confianza y economía circular.
 */

/** @type {import('tailwindcss').Config} */
module.exports = {
  // Rutas donde Tailwind buscará clases CSS utilizadas en el código.
  // Todas las carpetas que contengan componentes con className deben estar aquí.
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./layouts/**/*.{js,jsx,ts,tsx}",
    "./context/**/*.{js,jsx,ts,tsx}"
  ],

  // Preset de NativeWind necesario para que Tailwind funcione con React Native.
  presets: [require("nativewind/preset")],

  theme: {
    extend: {
      colors: {
        // Paleta personalizada "brand" de Permutapp.
        // Los números representan la intensidad: 50 (más claro) → 950 (más oscuro).
        brand: {
          50:  '#ecfdf5',   // Fondos muy sutiles (ej. bg-brand-50)
          100: '#d1fae5',   // Fondos suaves (ej. badges, alertas)
          200: '#a7f3d0',   // Bordes y acentos suaves
          300: '#6ee7b7',   // Texto secundario sobre fondos oscuros
          400: '#34d399',   // Elementos decorativos
          500: '#10b981',   // Color principal intermedio
          600: '#059669',   // Botones secundarios y enlaces
          700: '#047857',   // Botones principales (ej. "Continuar", "Publicar")
          800: '#065f46',   // Fondos oscuros (ej. panel de branding, banner hero)
          900: '#064e3b',   // Fondos muy oscuros
          950: '#022c22',   // El tono más oscuro de la paleta
        },
      },
    },
  },

  // Plugins adicionales de Tailwind (actualmente ninguno).
  plugins: [],
}
