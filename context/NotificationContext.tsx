import { Href, useRouter } from 'expo-router';
import React, { ReactNode, createContext, useCallback, useContext, useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { getSessionItem, setSessionItem } from '../services/sessionStorage';

import {
  ApiError,
  Notificacion,
  contarNotificacionesNoLeidas,
  listarNotificaciones,
  marcarNotificacionLeida as apiMarcarNotificacionLeida,
  marcarTodasNotificacionesLeidas as apiMarcarTodasLeidas,
  obtenerVapidPublicKey,
  registrarSuscripcionNotificacion,
} from '../services/api';
import { configurarEscuchaPush, obtenerSuscripcionPush } from '../services/pushNotifications';
import { useAuth } from './AuthContext';

type PushStatus = 'idle' | 'enabling' | 'enabled' | 'denied' | 'error';

interface NotificationContextValue {
  notifications: Notificacion[];
  unreadCount: number;
  isLoading: boolean;
  pushStatus: PushStatus;
  error: string | null;
  refresh: () => Promise<void>;
  enablePush: () => Promise<void>;
  markAsRead: (notification: Notificacion) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  openNotification: (notification: Notificacion) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, token } = useAuth();
  const [notifications, setNotifications] = useState<Notificacion[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [pushStatus, setPushStatus] = useState<PushStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!token) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    try {
      setIsLoading(true);
      const [items, count] = await Promise.all([
        listarNotificaciones(token),
        contarNotificacionesNoLeidas(token),
      ]);
      setNotifications(items);
      setUnreadCount(count);
      setError(null);
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'No fue posible cargar tus notificaciones.');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      setNotifications([]);
      setUnreadCount(0);
      setPushStatus('idle');
      return;
    }

    async function checkExistingPush() {
      try {
        const storedFlag = await getSessionItem('permutapp_push_enabled');
        if (storedFlag === 'true') {
          setPushStatus('enabled');
        } else if (Platform.OS === 'web') {
          if ('serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window) {
            const reg = await navigator.serviceWorker.getRegistration();
            const sub = await reg?.pushManager.getSubscription();
            if (sub && Notification.permission === 'granted') {
              setPushStatus('enabled');
              await setSessionItem('permutapp_push_enabled', 'true');
            }
          }
        }
      } catch (e) {
        // Fallback silencioso
      }
    }
    checkExistingPush();

    refresh();
    const interval = setInterval(refresh, 30000);
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => {
      clearInterval(interval);
      appStateSubscription.remove();
    };
  }, [isAuthenticated, refresh, token]);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    configurarEscuchaPush(
      refresh,
      (route) => router.push(route as Href),
    ).then((listenerCleanup) => {
      cleanup = listenerCleanup;
    }).catch(() => undefined);
    return () => cleanup?.();
  }, [refresh, router]);

  const enablePush = useCallback(async () => {
    if (!token) {
      setError('Debes iniciar sesión para activar notificaciones.');
      return;
    }
    try {
      setPushStatus('enabling');
      setError(null);
      const vapidPublicKey = await obtenerVapidPublicKey();
      const subscription = await obtenerSuscripcionPush(vapidPublicKey);
      await registrarSuscripcionNotificacion(subscription, token);
      await setSessionItem('permutapp_push_enabled', 'true');
      setPushStatus('enabled');
    } catch (activationError) {
      const message = activationError instanceof Error ? activationError.message : 'No fue posible activar las notificaciones.';
      setError(message);
      setPushStatus(message.toLowerCase().includes('rechazado') ? 'denied' : 'error');
    }
  }, [token]);

  const markAsRead = useCallback(async (notification: Notificacion) => {
    if (!token || notification.notif_leida) return;
    await apiMarcarNotificacionLeida(notification.notif_id, token);
    setNotifications((current) => current.map((item) => item.notif_id === notification.notif_id
      ? { ...item, notif_leida: true }
      : item));
    setUnreadCount((current) => Math.max(0, current - 1));
  }, [token]);

  const markAllAsRead = useCallback(async () => {
    if (!token) return;
    await apiMarcarTodasLeidas(token);
    setNotifications((current) => current.map((item) => ({ ...item, notif_leida: true })));
    setUnreadCount(0);
  }, [token]);

  const openNotification = useCallback(async (notification: Notificacion) => {
    const route = notification.notif_datos?.ruta;
    try {
      await markAsRead(notification);
    } catch {
      // La navegación sigue disponible aunque el servidor no pueda marcarla todavía.
    }
    if (route) router.push(route as Href);
  }, [markAsRead, router]);

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      isLoading,
      pushStatus,
      error,
      refresh,
      enablePush,
      markAsRead,
      markAllAsRead,
      openNotification,
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications(): NotificationContextValue {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotifications debe usarse dentro de NotificationProvider');
  return context;
}
