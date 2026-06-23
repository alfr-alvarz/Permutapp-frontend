import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';

import { EmptyState, InfoBanner, PrimaryButton, ScreenContent, SectionHeader } from '@/components/ui';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import type { Notificacion, TipoNotificacion } from '../services/api';

const ICONS: Record<TipoNotificacion, React.ComponentProps<typeof FontAwesome>['name']> = {
  MENSAJE_NUEVO: 'comment',
  PROPUESTA_PERMUTA: 'exchange',
  OFERTA_COMPARTIDA: 'gift',
  FINALIZACION_SOLICITADA: 'hourglass-half',
  PERMUTA_FINALIZADA: 'check-circle',
  VALORACION_RECIBIDA: 'star',
  IDENTIDAD_APROBADA: 'check-circle',
  IDENTIDAD_RECHAZADA: 'exclamation-circle',
  IDENTIDAD_REVISION: 'clock-o',
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function NotificationItem({
  item,
  onPress,
  onDelete,
  deleting,
}: {
  item: Notificacion;
  onPress: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  return (
    <View className={`rounded-2xl border p-3 mb-3 flex-row items-center ${item.notif_leida ? 'bg-white border-neutral-100' : 'bg-brand-50 border-brand-100'}`}>
      <TouchableOpacity className="flex-1 flex-row" onPress={onPress} activeOpacity={0.78}>
        <View className={`w-10 h-10 rounded-2xl items-center justify-center mr-3 ${item.notif_leida ? 'bg-neutral-100' : 'bg-brand-100'}`}>
          <FontAwesome name={ICONS[item.notif_tipo]} size={17} color={item.notif_leida ? '#737373' : '#047857'} />
        </View>
        <View className="flex-1">
          <View className="flex-row items-start justify-between">
            <Text className="text-neutral-950 font-bold text-base leading-5 flex-1 pr-2">{item.notif_titulo}</Text>
            {!item.notif_leida ? <View className="w-2.5 h-2.5 rounded-full bg-brand-600 mt-1" /> : null}
          </View>
          <Text className="text-neutral-600 text-sm leading-5 mt-1" numberOfLines={1}>{item.notif_cuerpo}</Text>
          <Text className="text-neutral-400 text-xs font-semibold mt-2">{formatDate(item.notif_fecha)}</Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        className="w-10 h-10 rounded-full bg-neutral-50 border border-neutral-100 items-center justify-center ml-2"
        onPress={onDelete}
        activeOpacity={0.75}
        disabled={deleting}
        accessibilityRole="button"
        accessibilityLabel="Eliminar notificación"
      >
        {deleting ? <ActivityIndicator size="small" color="#dc2626" /> : <FontAwesome name="trash" size={16} color="#dc2626" />}
      </TouchableOpacity>
    </View>
  );
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
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
    deleteNotification,
  } = useNotifications();

  useFocusEffect(useCallback(() => {
    if (isAuthenticated) refresh();
  }, [isAuthenticated, refresh]));

  const handleDelete = async (notification: Notificacion) => {
    try {
      setDeletingId(notification.notif_id);
      setDeleteError(null);
      await deleteNotification(notification);
    } catch (deleteRequestError) {
      setDeleteError(deleteRequestError instanceof Error
        ? deleteRequestError.message
        : 'No fue posible eliminar la notificación.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <ScrollView className="flex-1 bg-neutral-50" contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
      <ScreenContent>
      <TouchableOpacity className="w-11 h-11 rounded-2xl bg-white border border-neutral-100 items-center justify-center mb-4" onPress={() => router.back()}>
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
        <View className="bg-white border border-neutral-100 rounded-2xl p-5 mb-5">
          <Text className="text-neutral-950 font-bold text-base">Activa las notificaciones</Text>
          <Text className="text-neutral-500 text-sm leading-5 mt-2 mb-4">
            Te avisaremos sobre mensajes, propuestas y cambios importantes.
          </Text>
          <PrimaryButton icon="bell" loading={pushStatus === 'enabling'} onPress={enablePush}>
            Activar notificaciones
          </PrimaryButton>
        </View>
      ) : null}

      {pushStatus === 'enabled' ? (
        <InfoBanner icon="check-circle" title="Notificaciones activadas" body="Este dispositivo ya puede recibir notificaciones de PermutApp." />
      ) : null}
      {error ? <View className="mt-3"><InfoBanner icon="exclamation-circle" title="Notificaciones no disponibles" body={error} tone="amber" /></View> : null}
      {deleteError ? <View className="mt-3"><InfoBanner icon="exclamation-circle" title="No se pudo eliminar" body={deleteError} tone="red" /></View> : null}

      <View className="mt-4">
        {isLoading && notifications.length === 0 ? (
          <View className="py-12 items-center"><ActivityIndicator color="#047857" /></View>
        ) : null}
        {!isLoading && isAuthenticated && notifications.length === 0 ? (
          <EmptyState icon="bell-o" title="Todavía no hay notificaciones" body="Tus mensajes, propuestas y cambios importantes aparecerán aquí." />
        ) : null}
        {notifications.map((notification) => (
          <NotificationItem
            key={notification.notif_id}
            item={notification}
            onPress={() => openNotification(notification)}
            onDelete={() => handleDelete(notification)}
            deleting={deletingId === notification.notif_id}
          />
        ))}
      </View>
      </ScreenContent>
    </ScrollView>
  );
}
