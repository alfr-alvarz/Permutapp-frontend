/**
 * MainLayout.tsx — Layout principal para las vistas con pestañas (tabs).
 *
 * Implementa la regla de arquitectura visual de Permutapp:
 * - En celular: el contenido ocupa el 100% del ancho de la pantalla.
 * - En PC: el contenido se restringe a un ancho máximo (max-w-lg = 512px)
 *   y se centra horizontalmente, creando una experiencia de "columna central"
 *   similar a una app móvil.
 *
 * En pantallas grandes se agrega una sombra sutil y bordes laterales
 * para dar la sensación de un "marco" alrededor del contenido.
 *
 * @example
 * ```tsx
 * <MainLayout>
 *   <Tabs>...</Tabs>
 * </MainLayout>
 * ```
 */

import { View } from 'react-native';
import { ReactNode } from 'react';

/** Props del componente MainLayout. */
interface MainLayoutProps {
  /** Contenido de la aplicación (normalmente el componente de pestañas). */
  children: ReactNode;
}

/**
 * MainLayout — Contenedor principal que centraliza el contenido.
 *
 * @param children - Componentes hijos que se renderizan dentro del contenedor.
 */
export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <View className="flex-1 bg-neutral-100 items-center w-full">
      {/* Contenedor central con ancho máximo y estilos de "marco" en PC */}
      <View className="w-full flex-1 max-w-lg bg-white md:shadow-lg md:border-x md:border-neutral-200">
        {children}
      </View>
    </View>
  );
}
