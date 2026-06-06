import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';

import { EmptyState, InfoBanner, PrimaryButton, SectionHeader } from '@/components/ui';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import type { Notificacion, TipoNotificacion } from '../services/api';

const ICONS: Record<TipoNotificacion, React.ComponentProps<typeof FontAwesome>['name']> = {
  MENSAJE_NUEVO: 'comment',
  PROPUESTA_PERMUTA: 'exchange',
  IDENTIDAD_APROBADA: 'check-circle',
  IDENTIDAD_RECHAZADA: 'exclamation-circle',
  IDENTIDAD_REVISION: 'clock-o',
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function NotificationItem({ item, onPress }: { item: Notificacion; onPress: () => void }) {
  return (
    <TouchableOpacity
      className={`rounded-3xl border p-4 mb-3 flex-row ${item.notif_leida ? 'bg-white border-neutral-100' : 'bg-brand-50 border-brand-100'}`}
      onPress={onPress}
      activeOpacity={0.78}
    >
      <View className={`w-11 h-11 rounded-2xl items-center justify-center mr-3 ${item.notif_leida ? 'bg-neutral-100' : 'bg-brand-100'}`}>
        <FontAwesome name={ICONS[item.notif_tipo]} size={17} color={item.notif_leida ? '#737373' : '#047857'} />
      </View>
      <View className="flex-1">
        <View className="flex-row items-start justify-between">
          <Text className="text-neutral-950 font-bold text-sm flex-1 pr-3">{item.notif_titulo}</Text>
          {!item.notif_leida ? <View className="w-2.5 h-2.5 rounded-full bg-brand-600 mt-1" /> : null}
        </View>
        <Text className="text-neutral-600 text-xs leading-5 mt-1">{item.notif_cuerpo}</Text>
        <Text className="text-neutral-400 text-[11px] font-semibold mt-2">{formatDate(item.notif_fecha)}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const {
    notifications,
    unreadCount,
    isLoading,
    pushStatus,
    error,
    refresh,
    enablePush,
    markAllAsRead,
    openNotification,
  } = useNotifications();

  useFocusEffect(useCallback(() => {
    if (isAuthenticated) refresh();
  }, [isAuthenticated, refresh]));

  return (
    <ScrollView className="flex-1 bg-neutral-50" contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 }}>
      <TouchableOpacity className="w-11 h-11 rounded-2xl bg-white border border-neutral-100 items-center justify-center mb-6" onPress={() => router.back()}>
        <FontAwesome name="chevron-left" size={15} color="#404040" />
      </TouchableOpacity>
      <SectionHeader
        title="Notificaciones"
        eyebrow={unreadCount > 0 ? `${unreadCount} sin leer` : 'Todo al día'}
        actionLabel={unreadCount > 0 ? 'Marcar todas' : undefined}
        onActionPress={unreadCount > 0 ? markAllAsRead : undefined}
      />

      {!isAuthenticated ? (
        <InfoBanner icon="sign-in" title="Inicia sesión" body="Necesitas una cuenta para recibir y consultar notificaciones." tone="amber" />
      ) : null}

      {isAuthenticated && pushStatus !== 'enabled' ? (
        <View className="bg-white border border-neutral-100 rounded-3xl p-5 mb-5">
          <Text className="text-neutral-950 font-bold text-base">Activa los avisos push</Text>
          <Text className="text-neutral-500 text-sm leading-5 mt-2 mb-4">
            Recibe mensajes, propuestas de permuta y resultados de verificación aunque no tengas esta pantalla abierta.
          </Text>
          <PrimaryButton icon="bell" loading={pushStatus === 'enabling'} onPress={enablePush}>
            Activar notificaciones
          </PrimaryButton>
        </View>
      ) : null}

      {pushStatus === 'enabled' ? (
        <InfoBanner icon="check-circle" title="Notificaciones activadas" body="Este dispositivo ya puede recibir avisos de PermutApp." />
      ) : null}
      {error ? <View className="mt-3"><InfoBanner icon="exclamation-circle" title="Notificaciones no disponibles" body={error} tone="amber" /></View> : null}

      <View className="mt-5">
        {isLoading && notifications.length === 0 ? (
          <View className="py-12 items-center"><ActivityIndicator color="#047857" /></View>
        ) : null}
        {!isLoading && isAuthenticated && notifications.length === 0 ? (
          <EmptyState icon="bell-o" title="Todavía no hay avisos" body="Tus mensajes, propuestas y cambios importantes aparecerán aquí." />
        ) : null}
        {notifications.map((notification) => (
          <NotificationItem key={notification.notif_id} item={notification} onPress={() => openNotification(notification)} />
        ))}
      </View>
    </ScrollView>
  );
}
