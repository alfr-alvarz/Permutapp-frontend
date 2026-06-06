import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Href, useRouter } from 'expo-router';
import { Text, TouchableOpacity, View } from 'react-native';

import { useNotifications } from '../context/NotificationContext';

export function NotificationBell() {
  const router = useRouter();
  const { unreadCount } = useNotifications();

  return (
    <TouchableOpacity
      className="w-11 h-11 rounded-2xl bg-white border border-neutral-100 items-center justify-center"
      onPress={() => router.push('/notifications' as Href)}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={unreadCount > 0 ? `${unreadCount} notificaciones sin leer` : 'Notificaciones'}
    >
      <FontAwesome name="bell" size={17} color="#047857" />
      {unreadCount > 0 ? (
        <View className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-red-500 items-center justify-center border-2 border-white">
          <Text className="text-white text-[10px] font-bold">{unreadCount > 99 ? '99+' : unreadCount}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}
