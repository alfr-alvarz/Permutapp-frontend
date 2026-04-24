/**
 * +html.tsx — Plantilla HTML raíz para la versión web de la aplicación.
 *
 * Este archivo solo se usa en la versión web y se ejecuta durante el renderizado
 * estático (SSR). Su contenido corre en un entorno Node.js, por lo que NO tiene
 * acceso al DOM ni a APIs del navegador.
 *
 * Aquí se configuran las etiquetas <head> globales (meta, estilos, etc.)
 * que aplican a todas las páginas web de la aplicación.
 */

import { ScrollViewStyleReset } from 'expo-router/html';

/**
 * Root — Componente que genera el HTML base de cada página web.
 * @param children - Contenido de la aplicación React que se inyecta en el <body>.
 */
export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />

        {/*
          Desactiva el scroll del body en la versión web.
          Esto hace que los componentes ScrollView se comporten de manera más
          similar a como funcionan en la versión nativa (móvil).
          Si deseas habilitar el scroll del body en web móvil, elimina esta línea.
        */}
        <ScrollViewStyleReset />

        {/*
          Estilos CSS en línea para evitar un parpadeo del color de fondo
          cuando el usuario tiene modo oscuro activado en su dispositivo.
        */}
        <style dangerouslySetInnerHTML={{ __html: fondoResponsivo }} />

        {/* Aquí puedes agregar más elementos <head> que necesites globalmente en web. */}
      </head>
      <body>{children}</body>
    </html>
  );
}

/**
 * CSS en línea que define el color de fondo según el esquema de color
 * del sistema operativo del usuario (claro u oscuro).
 */
const fondoResponsivo = `
body {
  background-color: #fff;
}
@media (prefers-color-scheme: dark) {
  body {
    background-color: #000;
  }
}`;
