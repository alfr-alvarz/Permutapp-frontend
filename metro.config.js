/**
 * metro.config.js — Configuración de Metro Bundler para Permutapp.
 *
 * Metro es el empaquetador (bundler) que usa Expo/React Native para
 * compilar el código JavaScript y los estilos.
 *
 * Aquí se integra NativeWind (Tailwind CSS para React Native) mediante
 * el plugin withNativeWind, que permite usar clases de utilidad de Tailwind
 * (como className="bg-brand-700 p-4 rounded-xl") en los componentes.
 *
 * El archivo de entrada de estilos es ./global.css, donde se importan
 * las directivas base de Tailwind (@tailwind base, components, utilities).
 */

const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

// Obtiene la configuración por defecto de Expo para Metro.
const config = getDefaultConfig(__dirname);

// Aplica el plugin de NativeWind con el archivo CSS de entrada.
module.exports = withNativeWind(config, { input: "./global.css" });
