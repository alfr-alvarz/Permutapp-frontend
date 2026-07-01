import { router } from 'expo-router';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { AppState, Platform } from 'react-native';
import {
  LocalImageFile,
  RegisterPayload,
  VerificacionIdentidad,
  ApiError,
  login as apiLogin,
  obtenerEstadoIdentidad as apiObtenerEstadoIdentidad,
  obtenerUsuarioPorId as apiObtenerUsuarioPorId,
  register as apiRegister,
  setUnauthorizedSessionHandler,
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
  logout: () => Promise<void>;
  verifyIdentity: (carnet: LocalImageFile, selfie: LocalImageFile) => Promise<VerificacionIdentidad>;
  refreshIdentityStatus: () => Promise<VerificacionIdentidad | null>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const AUTH_TOKEN_KEY = 'permutapp.auth.token';
const AUTH_USER_KEY = 'permutapp.auth.user';
const SESSION_SYNC_INTERVAL_MS = 1500;
const BACKEND_SESSION_CHECK_INTERVAL_MS = 30000;
const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

interface JwtClaims {
  sub?: string;
  uid?: number | string;
  exp?: number;
}

function decodeBinaryString(value: string): string {
  try {
    return decodeURIComponent(
      Array.from(value, (char) => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`).join(''),
    );
  } catch {
    return value;
  }
}

function decodeBase64Url(value: string): string | null {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');

  if (typeof globalThis.atob === 'function') {
    return decodeBinaryString(globalThis.atob(padded));
  }

  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;

  for (const char of padded.replace(/=+$/, '')) {
    const valueIndex = BASE64_ALPHABET.indexOf(char);
    if (valueIndex < 0) {
      return null;
    }
    buffer = (buffer << 6) | valueIndex;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
    }
  }

  return decodeBinaryString(String.fromCharCode(...bytes));
}

function getJwtClaims(token: string): JwtClaims | null {
  const parts = token.split('.');
  if (parts.length !== 3 || parts.some((part) => !part)) {
    return null;
  }

  const payload = decodeBase64Url(parts[1]);
  if (!payload) {
    return null;
  }

  try {
    return JSON.parse(payload) as JwtClaims;
  } catch {
    return null;
  }
}

function isUsableJwt(token: string, user?: User): boolean {
  const claims = getJwtClaims(token);
  if (!claims || typeof claims.exp !== 'number' || claims.exp <= Math.floor(Date.now() / 1000)) {
    return false;
  }

  if (!user) {
    return true;
  }

  const tokenUserId = claims.uid == null ? null : String(claims.uid);
  const tokenEmail = typeof claims.sub === 'string' ? claims.sub.trim().toLowerCase() : null;

  return tokenUserId === user.id && tokenEmail === user.email.trim().toLowerCase();
}

function parseStoredUser(storedUser: string | null): User | null {
  if (!storedUser) {
    return null;
  }

  try {
    const user = JSON.parse(storedUser) as Partial<User>;
    if (typeof user.id !== 'string' || typeof user.email !== 'string' || typeof user.name !== 'string') {
      return null;
    }
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      biometricVerified: user.biometricVerified === true,
      identityStatus: user.identityStatus ?? null,
    };
  } catch {
    return null;
  }
}

async function isSessionAcceptedByBackend(token: string, user: User): Promise<boolean> {
  try {
    const usuario = await apiObtenerUsuarioPorId(Number(user.id), token);
    return usuario.usu_activo !== false && usuario.usu_email.trim().toLowerCase() === user.email.trim().toLowerCase();
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403 || error.status === 404)) {
      return false;
    }

    return true;
  }
}

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
  const isEndingSessionRef = useRef(false);

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

  const endSession = useCallback(async (redirectToLogin = false) => {
    if (isEndingSessionRef.current) {
      return;
    }

    isEndingSessionRef.current = true;
    try {
      await clearSession();
    } catch {
      // Even if storage cleanup fails, the in-memory session must be closed.
    } finally {
      setState({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        isRestoring: false,
      });
      if (redirectToLogin) {
        router.replace('/login');
      }
      isEndingSessionRef.current = false;
    }
  }, [clearSession]);

  useEffect(() => setUnauthorizedSessionHandler(() => endSession(true)), [endSession]);

  useEffect(() => {
    let mounted = true;

    async function restoreSession() {
      let shouldEndSession = false;
      try {
        const [token, storedUserValue] = await Promise.all([
          getSessionItem(AUTH_TOKEN_KEY),
          getSessionItem(AUTH_USER_KEY),
        ]);
        const user = parseStoredUser(storedUserValue);

        if (!mounted) return;

        if (token && user && isUsableJwt(token, user) && await isSessionAcceptedByBackend(token, user)) {
          if (!mounted) return;
          setState({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
            isRestoring: false,
          });
          return;
        }

        shouldEndSession = Boolean(token || storedUserValue);
      } catch {
        shouldEndSession = true;
      }

      if (mounted) {
        if (shouldEndSession) {
          await endSession(true);
        } else {
          setState((prev) => ({ ...prev, isRestoring: false }));
        }
      }
    }

    restoreSession();

    return () => {
      mounted = false;
    };
  }, [endSession]);

  useEffect(() => {
    if (!state.isAuthenticated || !state.token || !state.user) {
      return undefined;
    }

    const currentUser = state.user;
    const currentToken = state.token;

    let cancelled = false;

    async function validatePersistedSession(checkBackend = false) {
      const [storedToken, storedUserValue] = await Promise.all([
        getSessionItem(AUTH_TOKEN_KEY).catch(() => null),
        getSessionItem(AUTH_USER_KEY).catch(() => null),
      ]);

      if (cancelled) {
        return;
      }

      const storedUser = parseStoredUser(storedUserValue);
      const sameStoredUser = Boolean(storedUser
        && storedUser.id === currentUser.id
        && storedUser.email.trim().toLowerCase() === currentUser.email.trim().toLowerCase());
      const localSessionValid = Boolean(storedToken
        && storedToken === currentToken
        && storedUser
        && sameStoredUser
        && isUsableJwt(storedToken, storedUser));

      if (!localSessionValid) {
        await endSession(true);
        return;
      }

      if (checkBackend && !await isSessionAcceptedByBackend(currentToken, currentUser) && !cancelled) {
        await endSession(true);
      }
    }

    const interval = setInterval(validatePersistedSession, SESSION_SYNC_INTERVAL_MS);
    const backendInterval = setInterval(
      () => validatePersistedSession(true),
      BACKEND_SESSION_CHECK_INTERVAL_MS,
    );
    const appState = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        validatePersistedSession(true);
      }
    });

    let removeWebListeners: (() => void) | undefined;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const onFocus = () => validatePersistedSession(true);
      const onStorage = (event: StorageEvent) => {
        if (event.key === AUTH_TOKEN_KEY || event.key === AUTH_USER_KEY) {
          validatePersistedSession();
        }
      };
      const onVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          validatePersistedSession(true);
        }
      };

      window.addEventListener('focus', onFocus);
      window.addEventListener('storage', onStorage);
      document.addEventListener('visibilitychange', onVisibilityChange);
      removeWebListeners = () => {
        window.removeEventListener('focus', onFocus);
        window.removeEventListener('storage', onStorage);
        document.removeEventListener('visibilitychange', onVisibilityChange);
      };
    }

    return () => {
      cancelled = true;
      clearInterval(interval);
      clearInterval(backendInterval);
      appState.remove();
      removeWebListeners?.();
    };
  }, [endSession, state.isAuthenticated, state.token, state.user]);

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

  const logout = useCallback(() => endSession(true), [endSession]);


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
