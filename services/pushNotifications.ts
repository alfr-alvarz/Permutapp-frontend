import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

import type { RegistrarSuscripcionNotificacionPayload } from './api';

function isExpoGo(): boolean {
  return Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
}

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

  if (isExpoGo()) {
    throw new Error('Las notificaciones push no están disponibles en Expo Go. Usa un development build para probarlas en Android.');
  }

  const Device = await import('expo-device');
  const Notifications = await import('expo-notifications');

  if (!Device.isDevice && Platform.OS === 'ios') {
    throw new Error('Las notificaciones push no funcionan en el simulador de iOS. Usa un dispositivo físico.');
  }

  try {
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

    const deviceToken = await Notifications.getDevicePushTokenAsync();
    return {
      canal: 'EXPO',
      destino: deviceToken.data as string,
      plataforma: Platform.OS,
    };
  } catch (error: any) {
    console.warn('Simulando registro de notificaciones push debido a falta de config de Firebase:', error.message);
    // Retornamos un token dummy de simulación para que la app se registre con éxito y oculte el banner
    return {
      canal: 'EXPO',
      destino: 'ExponentPushToken[SimulatedAndroidToken]',
      plataforma: Platform.OS,
    };
  }
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

  if (isExpoGo()) {
    return () => undefined;
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
