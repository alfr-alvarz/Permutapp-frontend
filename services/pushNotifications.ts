import Constants from 'expo-constants';
import { Platform } from 'react-native';

import type { RegistrarSuscripcionNotificacionPayload } from './api';

function base64UrlToUint8Array(value: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  const decoded = globalThis.atob(base64);
  return Uint8Array.from(decoded, (character) => character.charCodeAt(0));
}

export async function obtenerSuscripcionPush(vapidPublicKey: string): Promise<RegistrarSuscripcionNotificacionPayload> {
  if (Platform.OS === 'web') {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      throw new Error('Este navegador no admite notificaciones push.');
    }
    if (!vapidPublicKey) {
      throw new Error('Web Push todavía no tiene configuradas sus claves VAPID.');
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      throw new Error('El permiso de notificaciones fue rechazado.');
    }

    const registration = await navigator.serviceWorker.register('/push-sw.js');
    const existing = await registration.pushManager.getSubscription();
    const subscription = existing ?? await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64UrlToUint8Array(vapidPublicKey),
    });
    const json = subscription.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) {
      throw new Error('El navegador no entregó una suscripción push válida.');
    }

    return {
      canal: 'WEB',
      destino: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
      plataforma: 'web',
    };
  }

  const Device = await import('expo-device');
  const Notifications = await import('expo-notifications');

  if (!Device.isDevice) {
    throw new Error('Las notificaciones push móviles requieren un dispositivo físico.');
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'PermutApp',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#047857',
    });
  }

  const currentPermissions = await Notifications.getPermissionsAsync();
  const permissions = currentPermissions.status === 'granted'
    ? currentPermissions
    : await Notifications.requestPermissionsAsync();
  if (permissions.status !== 'granted') {
    throw new Error('El permiso de notificaciones fue rechazado.');
  }

  const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID
    ?? Constants.easConfig?.projectId
    ?? Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) {
    throw new Error('Falta configurar EXPO_PUBLIC_EAS_PROJECT_ID para obtener el token móvil.');
  }

  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  return {
    canal: 'EXPO',
    destino: token.data,
    plataforma: Platform.OS,
  };
}

export async function configurarEscuchaPush(
  onReceived: () => void,
  onOpenRoute: (route: string) => void,
): Promise<() => void> {
  if (Platform.OS === 'web') {
    if (!('serviceWorker' in navigator)) return () => undefined;
    const listener = (event: MessageEvent<{ type?: string }>) => {
      if (event.data?.type === 'PERMUTAPP_PUSH_RECEIVED') onReceived();
    };
    navigator.serviceWorker.addEventListener('message', listener);
    return () => navigator.serviceWorker.removeEventListener('message', listener);
  }

  const Notifications = await import('expo-notifications');
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });

  const receivedSubscription = Notifications.addNotificationReceivedListener(onReceived);
  const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const route = response.notification.request.content.data?.ruta;
    if (typeof route === 'string') onOpenRoute(route);
  });

  return () => {
    receivedSubscription.remove();
    responseSubscription.remove();
  };
}
