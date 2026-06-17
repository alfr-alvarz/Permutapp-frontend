import { Href, useRouter } from 'expo-router';
import React, { ReactNode, createContext, useCallback, useContext, useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';

import {
  ApiError,
  Notificacion,
  contarNotificacionesNoLeidas,
  listarNotificaciones,
  eliminarNotificacion as apiEliminarNotificacion,
  marcarNotificacionLeida as apiMarcarNotificacionLeida,
  marcarTodasNotificacionesLeidas as apiMarcarTodasLeidas,
  obtenerVapidPublicKey,
  registrarSuscripcionNotificacion,
} from '../services/api';
import { configurarEscuchaPush, obtenerSuscripcionPush } from '../services/pushNotifications';
import { deleteSessionItem, getSessionItem, setSessionItem } from '../services/sessionStorage';
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
  deleteNotification: (notification: Notificacion) => Promise<void>;
  openNotification: (notification: Notificacion) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, token, logout } = useAuth();
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
    setIsLoading(true);
    const [itemsResult, countResult] = await Promise.allSettled([
      listarNotificaciones(token),
      contarNotificacionesNoLeidas(token),
    ]);
    const authError = [itemsResult, countResult]
      .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
      .map((result) => result.reason)
      .find((reason) => reason instanceof ApiError && (reason.status === 401 || reason.status === 403));
    if (authError) {
      await deleteSessionItem('permutapp_push_enabled');
      setPushStatus('idle');
      setError('Tu sesión venció. Inicia sesión nuevamente para consultar y activar las notificaciones.');
      setIsLoading(false);
      await logout();
      return;
    }

    if (itemsResult.status === 'fulfilled') setNotifications(itemsResult.value);
    if (countResult.status === 'fulfilled') {
      setUnreadCount(countResult.value);
    } else if (itemsResult.status === 'fulfilled') {
      setUnreadCount(itemsResult.value.filter((item) => !item.notif_leida).length);
    }
    if (itemsResult.status === 'rejected') {
      const reason = itemsResult.reason;
      setError(reason instanceof ApiError ? reason.message : 'No fue posible cargar tus notificaciones.');
    } else if (countResult.status === 'rejected') {
      setError('La bandeja se cargó, pero el conteo no está disponible temporalmente.');
    } else {
      setError(null);
    }
    setIsLoading(false);
  }, [logout, token]);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      setNotifications([]);
      setUnreadCount(0);
      setPushStatus('idle');
      setError(null);
      return;
    }
    let cancelled = false;
    async function checkExistingPush() {
      const storedFlag = await getSessionItem('permutapp_push_enabled').catch(() => null);
      if (cancelled) return;
      if (storedFlag === 'true') {
        setPushStatus('enabled');
      } else if (
        Platform.OS === 'web'
        && 'serviceWorker' in navigator
        && 'PushManager' in window
        && 'Notification' in window
      ) {
        const registration = await navigator.serviceWorker.getRegistration();
        const subscription = await registration?.pushManager.getSubscription();
        if (!cancelled && subscription && Notification.permission === 'granted') {
          setPushStatus('enabled');
          await setSessionItem('permutapp_push_enabled', 'true');
        }
      }
    }
    checkExistingPush();
    refresh();
    const interval = setInterval(refresh, 30000);
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => {
      cancelled = true;
      clearInterval(interval);
      appState.remove();
    };
  }, [isAuthenticated, refresh, token]);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    configurarEscuchaPush(refresh, (route) => router.push(route as Href))
      .then((listenerCleanup) => { cleanup = listenerCleanup; })
      .catch(() => undefined);
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
      const registered = await registrarSuscripcionNotificacion(subscription, token);
      if (!registered.activa) throw new Error('El servidor no pudo activar la suscripción.');
      await setSessionItem('permutapp_push_enabled', 'true');
      setPushStatus('enabled');
    } catch (activationError) {
      await deleteSessionItem('permutapp_push_enabled');
      const message = activationError instanceof Error
        ? activationError.message
        : 'No fue posible activar las notificaciones.';
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

  const deleteNotification = useCallback(async (notification: Notificacion) => {
    if (!token) return;
    await apiEliminarNotificacion(notification.notif_id, token);
    setNotifications((current) => current.filter((item) => item.notif_id !== notification.notif_id));
    if (!notification.notif_leida) setUnreadCount((current) => Math.max(0, current - 1));
  }, [token]);

  const openNotification = useCallback(async (notification: Notificacion) => {
    try {
      await markAsRead(notification);
    } catch {
      // Navigation remains available when marking fails.
    }
    const route = notification.notif_datos?.ruta;
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
      deleteNotification,
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
