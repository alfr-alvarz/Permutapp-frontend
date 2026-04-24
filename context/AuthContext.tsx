/**
 * AuthContext.tsx — Contexto global de autenticación de Permutapp.
 *
 * Provee el estado de sesión (usuario, autenticado, cargando) a toda la app
 * mediante React Context. Incluye funciones para:
 * - Iniciar sesión con credenciales tradicionales (email + contraseña).
 * - Cerrar sesión y volver al modo invitado.
 * - Verificar la identidad biométrica del usuario (Amazon Rekognition).
 *
 * Los métodos de login, logout y verificación biométrica están preparados
 * con stubs (simulaciones) para ser reemplazados por llamadas reales
 * al backend de Spring Boot cuando los endpoints estén listos.
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

// ────────── Tipos ──────────

/** Representa la información de un usuario autenticado. */
export interface User {
  /** Identificador único del usuario (viene del backend). */
  id: string;
  /** Correo electrónico del usuario. */
  email: string;
  /** Nombre completo del usuario. */
  name: string;
  /** URL del avatar/foto de perfil (opcional). */
  avatarUrl?: string;
  /** Indica si el usuario completó la verificación biométrica (Amazon Rekognition). */
  biometricVerified: boolean;
}

/** Estado interno del contexto de autenticación. */
interface AuthState {
  /** Datos del usuario autenticado, o null si es invitado. */
  user: User | null;
  /** true si el usuario ha iniciado sesión correctamente. */
  isAuthenticated: boolean;
  /** true mientras se está procesando una petición de auth (login, verificación, etc.). */
  isLoading: boolean;
}

/** Valores que expone el contexto a los componentes que lo consumen. */
interface AuthContextValue extends AuthState {
  /** Iniciar sesión con credenciales tradicionales (email + contraseña). */
  login: (email: string, password: string) => Promise<void>;
  /** Cerrar sesión y volver al modo invitado. */
  logout: () => void;
  /** Marcar al usuario como verificado biométricamente (Amazon Rekognition). */
  verifyBiometric: () => Promise<void>;
}

// ────────── Contexto ──────────

/** Contexto de React que almacena el estado de autenticación. */
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ────────── Proveedor ──────────

/** Props del componente AuthProvider. */
interface AuthProviderProps {
  children: ReactNode;
}

/**
 * AuthProvider — Proveedor del contexto de autenticación.
 *
 * Debe envolver toda la aplicación (normalmente en _layout.tsx) para que
 * cualquier componente hijo pueda acceder al estado de sesión y a las
 * funciones de login/logout/verificación biométrica.
 *
 * El modo invitado es el estado por defecto: user = null, isAuthenticated = false.
 *
 * @example
 * ```tsx
 * <AuthProvider>
 *   <App />
 * </AuthProvider>
 * ```
 */
export function AuthProvider({ children }: AuthProviderProps) {
  // Estado inicial: modo invitado (sin sesión activa).
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: false,
  });

  /**
   * login — Inicia sesión con email y contraseña.
   *
   * Actualmente usa un usuario simulado (mock). Cuando el backend esté listo,
   * se debe reemplazar por una llamada real al endpoint POST /auth/login
   * del microservicio de Spring Boot.
   *
   * @param email - Correo electrónico del usuario.
   * @param password - Contraseña del usuario.
   */
  const login = useCallback(async (email: string, password: string) => {
    setState((prev) => ({ ...prev, isLoading: true }));
    try {
      // TODO: Reemplazar por la llamada real al backend de Spring Boot:
      // const respuesta = await fetch(`${API_BASE}/auth/login`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ email, password }),
      // });
      // const datos = await respuesta.json();

      // Simulación temporal de respuesta exitosa del backend.
      const usuarioMock: User = {
        id: '1',
        email,
        name: 'Usuario Demo',
        biometricVerified: false,
      };

      setState({
        user: usuarioMock,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      setState((prev) => ({ ...prev, isLoading: false }));
      throw error;
    }
  }, []);

  /**
   * logout — Cierra la sesión actual y devuelve al usuario al modo invitado.
   *
   * Limpia completamente el estado de autenticación.
   */
  const logout = useCallback(() => {
    setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
  }, []);

  /**
   * verifyBiometric — Ejecuta la verificación de identidad biométrica.
   *
   * Este flujo está diseñado para:
   * 1. Capturar la imagen del rostro del usuario (usando expo-camera).
   * 2. Enviar la imagen al microservicio de Spring Boot.
   * 3. El backend la procesa con Amazon Rekognition y responde si es válida.
   * 4. Si es válida, se marca biometricVerified = true en el estado del usuario.
   *
   * Actualmente usa una simulación. Reemplazar por la integración real.
   */
  const verifyBiometric = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true }));
    try {
      // TODO: Conectar con el endpoint de validación biométrica de Spring Boot:
      // 1. Capturar la imagen del rostro del usuario (expo-camera).
      // 2. Enviar la imagen al backend:
      //    const formData = new FormData();
      //    formData.append('foto', { uri, name, type });
      //    await fetch(`${API_BASE}/auth/verificar-biometrico`, {
      //      method: 'POST',
      //      body: formData,
      //    });

      // Simulación temporal: marcar como verificado.
      setState((prev) => ({
        ...prev,
        isLoading: false,
        user: prev.user ? { ...prev.user, biometricVerified: true } : null,
      }));
    } catch (error) {
      setState((prev) => ({ ...prev, isLoading: false }));
      throw error;
    }
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout, verifyBiometric }}>
      {children}
    </AuthContext.Provider>
  );
}

// ────────── Hook personalizado ──────────

/**
 * useAuth — Hook para acceder al contexto de autenticación.
 *
 * Debe usarse dentro de un componente envuelto por <AuthProvider>.
 * Retorna el estado de sesión y las funciones de autenticación.
 *
 * @example
 * ```tsx
 * const { isAuthenticated, user, login, logout } = useAuth();
 * ```
 *
 * @throws Error si se usa fuera de un <AuthProvider>.
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un <AuthProvider>');
  }
  return context;
}
