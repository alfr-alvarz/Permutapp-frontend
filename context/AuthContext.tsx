import React, { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { login as apiLogin, register as apiRegister, RegisterPayload } from '../services/api';

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  biometricVerified: boolean;
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
  verifyBiometric: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const AUTH_TOKEN_KEY = 'permutapp.auth.token';
const AUTH_USER_KEY = 'permutapp.auth.user';

interface AuthProviderProps {
  children: ReactNode;
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
      SecureStore.setItemAsync(AUTH_TOKEN_KEY, token),
      SecureStore.setItemAsync(AUTH_USER_KEY, JSON.stringify(user)),
    ]);
  }, []);

  const clearSession = useCallback(async () => {
    await Promise.all([
      SecureStore.deleteItemAsync(AUTH_TOKEN_KEY),
      SecureStore.deleteItemAsync(AUTH_USER_KEY),
    ]);
  }, []);

  useEffect(() => {
    let mounted = true;

    async function restoreSession() {
      try {
        const [token, storedUser] = await Promise.all([
          SecureStore.getItemAsync(AUTH_TOKEN_KEY),
          SecureStore.getItemAsync(AUTH_USER_KEY),
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
      const user: User = {
        id: String(response.usuario.usu_id),
        email: response.usuario.usu_email,
        name: `${response.usuario.usu_pri_nombre} ${response.usuario.usu_pri_apellido}`.trim(),
        biometricVerified: false,
      };
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
      const user: User = {
        id: String(response.usuario.usu_id),
        email: response.usuario.usu_email,
        name: `${response.usuario.usu_pri_nombre} ${response.usuario.usu_pri_apellido}`.trim(),
        biometricVerified: false,
      };
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

  const verifyBiometric = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true }));
    try {
      const updatedUser = state.user ? { ...state.user, biometricVerified: true } : null;
      if (updatedUser && state.token) {
        await persistSession(state.token, updatedUser);
      }
      setState((prev) => ({
        ...prev,
        isLoading: false,
        user: updatedUser,
      }));
    } catch (error) {
      setState((prev) => ({ ...prev, isLoading: false }));
      throw error;
    }
  }, [persistSession, state.token, state.user]);

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, verifyBiometric }}>
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
