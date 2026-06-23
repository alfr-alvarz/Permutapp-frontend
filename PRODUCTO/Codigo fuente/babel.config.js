/**
 * babel.config.js — Configuración de Babel para Permutapp.
 *
 * Babel es el compilador de JavaScript que transforma el código moderno
 * (JSX, TypeScript, etc.) a código compatible con React Native.
 *
 * Presets configurados:
 * - babel-preset-expo: preset oficial de Expo que incluye las transformaciones
 *   necesarias para React Native. La opción jsxImportSource: "nativewind"
 *   permite que NativeWind procese las props className de los componentes.
 * - nativewind/babel: preset de NativeWind que habilita el uso de clases
 *   de Tailwind CSS en componentes de React Native.
 */
module.exports = function (api) {
  // Habilita el caché de Babel para mejorar la velocidad de compilación.
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
  };
};
