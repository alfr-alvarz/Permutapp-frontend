/**
 * AuthLayout.tsx — Layout para las pantallas de autenticación (Login y Registro).
 *
 * Implementa un diseño responsivo que se adapta según la plataforma:
 *
 * ● Móvil: El formulario ocupa el 100% de la pantalla.
 * ● Web/PC (≥ md): La pantalla se divide en dos columnas:
 *   - Izquierda: Panel de branding con logo, eslogan y estadísticas decorativas.
 *   - Derecha: Panel del formulario centrado con ancho máximo de 384px.
 *
 * Las formas decorativas (círculos con opacidad) en el panel de branding
 * crean un efecto visual moderno y profesional sin necesidad de imágenes.
 *
 * @example
 * ```tsx
 * <AuthLayout>
 *   <LoginForm />
 * </AuthLayout>
 * ```
 */

import { View, Text } from 'react-native';
import { ReactNode } from 'react';

/** Props del componente AuthLayout. */
interface AuthLayoutProps {
  /** Contenido del formulario que se renderiza en el panel derecho. */
  children: ReactNode;
}

/**
 * AuthLayout — Layout de autenticación con diseño dividido para web.
 *
 * @param children - Formulario de login o registro que se muestra en el panel derecho.
 */
export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <View className="flex-1 flex-row w-full bg-white">

      {/* ═══════════ Panel de Branding — solo visible en web/PC (≥ md) ═══════════ */}
      <View className="hidden md:flex flex-1 bg-brand-800 justify-center items-center p-16 overflow-hidden">

        {/* Formas decorativas de fondo (círculos con distintas opacidades) */}
        <View className="absolute -top-20 -left-20 w-72 h-72 rounded-full bg-brand-700 opacity-50" />
        <View className="absolute top-40 right-10  w-40 h-40 rounded-full bg-brand-600 opacity-30" />
        <View className="absolute bottom-10 left-20  w-56 h-56 rounded-full bg-brand-900 opacity-40" />
        <View className="absolute bottom-40 right-32 w-24 h-24 rounded-full bg-brand-400 opacity-20" />

        {/* Contenido central del branding */}
        <View className="z-10 items-center max-w-sm">
          {/* Logo icónico de Permutapp */}
          <View className="w-24 h-24 rounded-3xl bg-white/15 items-center justify-center mb-8 border border-white/20">
            <Text className="text-white text-5xl font-bold">♻</Text>
          </View>

          {/* Nombre de la aplicación */}
          <Text className="text-white text-5xl font-bold mb-4 tracking-tight text-center">
            Permutapp
          </Text>

          {/* Línea decorativa separadora */}
          <View className="w-16 h-1 bg-brand-400 rounded-full mb-6" />

          {/* Eslogan de la plataforma */}
          <Text className="text-brand-200 text-lg text-center leading-7">
            Intercambia lo que ya no usas por lo que necesitas. Economía circular al alcance de todos.
          </Text>

          {/* Estadísticas decorativas (datos de ejemplo) */}
          <View className="flex-row mt-10 gap-8">
            <View className="items-center">
              <Text className="text-white text-2xl font-bold">2.4k+</Text>
              <Text className="text-brand-300 text-sm mt-1">Permutas</Text>
            </View>
            <View className="w-px bg-brand-600" />
            <View className="items-center">
              <Text className="text-white text-2xl font-bold">1.8k+</Text>
              <Text className="text-brand-300 text-sm mt-1">Usuarios</Text>
            </View>
            <View className="w-px bg-brand-600" />
            <View className="items-center">
              <Text className="text-white text-2xl font-bold">98%</Text>
              <Text className="text-brand-300 text-sm mt-1">Satisfacción</Text>
            </View>
          </View>
        </View>
      </View>

      {/* ═══════════ Panel del Formulario ═══════════ */}
      {/* En móvil ocupa el 100%, en PC ocupa la mitad derecha */}
      <View className="flex-1 bg-white">
        <View className="w-full max-w-md px-6 flex-1 self-center">
          {children}
        </View>
      </View>
    </View>
  );
}
