import React, { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import {
  LocalImageFile,
  RegisterPayload,
  VerificacionIdentidad,
  ApiError,
  login as apiLogin,
  obtenerEstadoIdentidad as apiObtenerEstadoIdentidad,
  register as apiRegister,
  verificarIdentidad as apiVerificarIdentidad,
} from '../services/api';
import { deleteSessionItem, getSessionItem, setSessionItem } from '../services/sessionStorage';

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  biometricVerified: boolean;
  identityStatus?: VerificacionIdentidad['ver_estado'] | null;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isRestoring: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
  verifyIdentity: (carnet: LocalImageFile, selfie: LocalImageFile) => Promise<VerificacionIdentidad>;
  refreshIdentityStatus: () => Promise<VerificacionIdentidad | null>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const AUTH_TOKEN_KEY = 'permutapp.auth.token';
const AUTH_USER_KEY = 'permutapp.auth.user';

interface AuthProviderProps {
  children: ReactNode;
}

function mapUsuarioToUser(usuario: import('../services/api').Usuario): User {
  return {
    id: String(usuario.usu_id),
    email: usuario.usu_email,
    name: `${usuario.usu_pri_nombre} ${usuario.usu_pri_apellido}`.trim(),
    biometricVerified: usuario.usu_identidad_verificada,
    identityStatus: usuario.usu_identidad_verificada ? 'APROBADA' : null,
  };
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: false,
    isRestoring: true,
  });

  const persistSession = useCallback(async (token: string, user: User) => {
    await Promise.all([
      setSessionItem(AUTH_TOKEN_KEY, token),
      setSessionItem(AUTH_USER_KEY, JSON.stringify(user)),
    ]);
  }, []);

  const clearSession = useCallback(async () => {
    await Promise.all([
      deleteSessionItem(AUTH_TOKEN_KEY),
      deleteSessionItem(AUTH_USER_KEY),
    ]);
  }, []);

  useEffect(() => {
    let mounted = true;

    async function restoreSession() {
      try {
        const [token, storedUser] = await Promise.all([
          getSessionItem(AUTH_TOKEN_KEY),
          getSessionItem(AUTH_USER_KEY),
        ]);

        if (!mounted) return;

        if (token && storedUser) {
          const user = JSON.parse(storedUser) as User;
          setState({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
            isRestoring: false,
          });
          return;
        }
      } catch {
        await clearSession();
      }

      if (mounted) {
        setState((prev) => ({ ...prev, isRestoring: false }));
      }
    }

    restoreSession();

    return () => {
      mounted = false;
    };
  }, [clearSession]);

  const login = useCallback(async (email: string, password: string) => {
    setState((prev) => ({ ...prev, isLoading: true }));
    try {
      const response = await apiLogin({ email: email.trim().toLowerCase(), password });
      const user = mapUsuarioToUser(response.usuario);
      await persistSession(response.token, user);
      setState({
        user,
        token: response.token,
        isAuthenticated: true,
        isLoading: false,
        isRestoring: false,
      });
    } catch (error) {
      setState((prev) => ({ ...prev, isLoading: false }));
      throw error;
    }
  }, [persistSession]);

  const register = useCallback(async (payload: RegisterPayload) => {
    setState((prev) => ({ ...prev, isLoading: true }));
    try {
      const response = await apiRegister({
        ...payload,
        usu_dvrun: payload.usu_dvrun.trim().toUpperCase(),
        usu_email: payload.usu_email.trim().toLowerCase(),
      });
      const user = mapUsuarioToUser(response.usuario);
      await persistSession(response.token, user);
      setState({
        user,
        token: response.token,
        isAuthenticated: true,
        isLoading: false,
        isRestoring: false,
      });
    } catch (error) {
      setState((prev) => ({ ...prev, isLoading: false }));
      throw error;
    }
  }, [persistSession]);

  const logout = useCallback(async () => {
    await clearSession();
    setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      isRestoring: false,
    });
  }, [clearSession]);


  const refreshIdentityStatus = useCallback(async () => {
    const usuarioId = state.user?.id;
    const token = state.token;
    if (!usuarioId || !token) {
      return null;
    }

    try {
      const result = await apiObtenerEstadoIdentidad(Number(usuarioId), token);
      let updatedUser: User | null = null;
      setState((prev) => {
        if (!prev.user || prev.user.id !== usuarioId) {
          return prev;
        }
        updatedUser = {
          ...prev.user,
          biometricVerified: result.ver_estado === 'APROBADA',
          identityStatus: result.ver_estado,
        };
        return {
          ...prev,
          user: updatedUser,
        };
      });
      if (updatedUser) {
        await persistSession(token, updatedUser);
      }
      return result;
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        return null;
      }
      throw error;
    }
  }, [persistSession, state.token, state.user?.id]);

  const verifyIdentity = useCallback(async (carnet: LocalImageFile, selfie: LocalImageFile) => {
    if (!state.user || !state.token) {
      throw new Error('Debes iniciar sesión para verificar tu identidad.');
    }

    setState((prev) => ({ ...prev, isLoading: true }));
    try {
      const result = await apiVerificarIdentidad({
        usuarioId: Number(state.user.id),
        carnet,
        selfie,
        token: state.token,
      });
      const updatedUser = {
        ...state.user,
        biometricVerified: result.ver_estado === 'APROBADA',
        identityStatus: result.ver_estado,
      };
      await persistSession(state.token, updatedUser);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        user: updatedUser,
      }));
      return result;
    } catch (error) {
      setState((prev) => ({ ...prev, isLoading: false }));
      throw error;
    }
  }, [persistSession, state.token, state.user]);

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, verifyIdentity, refreshIdentityStatus }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un <AuthProvider>');
  }
  return context;
}
