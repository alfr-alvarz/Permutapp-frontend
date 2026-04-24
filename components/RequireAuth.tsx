/**
 * RequireAuth.tsx — Componente contenedor para proteger acciones que requieren autenticación.
 *
 * Envuelve cualquier botón o elemento interactivo. Al presionarlo:
 * - Si el usuario ESTÁ autenticado → ejecuta la acción normalmente (onAuthenticated).
 * - Si el usuario es INVITADO → lo redirige a la pantalla de Login.
 *
 * Esto permite que los invitados naveguen libremente por el catálogo,
 * pero las acciones clave (publicar, permutar, chatear) requieran sesión.
 *
 * @example
 * ```tsx
 * <RequireAuth onAuthenticated={() => router.push('/publicar')}>
 *   <Text>Publicar Producto</Text>
 * </RequireAuth>
 * ```
 */

import React, { ReactNode } from 'react';
import { TouchableOpacity, TouchableOpacityProps } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';

// ────────── Tipos ──────────

interface RequireAuthProps extends TouchableOpacityProps {
  /** Contenido visual del botón (texto, íconos, etc.). */
  children: ReactNode;
  /** Función que se ejecuta cuando el usuario SÍ está autenticado. */
  onAuthenticated?: () => void;
}

/**
 * RequireAuth — Componente wrapper que intercepta el onPress de un botón de acción.
 *
 * Verifica el estado de autenticación del contexto (useAuth) y decide
 * si ejecutar la acción o redirigir al login.
 *
 * @param children - Contenido visual del botón.
 * @param onAuthenticated - Callback que se ejecuta solo si el usuario está logueado.
 * @param touchableProps - Props adicionales del TouchableOpacity (className, style, etc.).
 */
export default function RequireAuth({
  children,
  onAuthenticated,
  ...touchableProps
}: RequireAuthProps) {
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  /**
   * handlePress — Maneja el evento de presionar el botón.
   *
   * Si el usuario está autenticado, ejecuta onAuthenticated().
   * Si no lo está, lo redirige a la pantalla de login (/login).
   */
  const handlePress = () => {
    if (isAuthenticated) {
      onAuthenticated?.();
    } else {
      router.push('/login');
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      {...touchableProps}
      onPress={handlePress}
    >
      {children}
    </TouchableOpacity>
  );
}
