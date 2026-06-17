import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFocusEffect } from '@react-navigation/native';
import { Href, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';

import { EmptyState, InfoBanner, PrimaryButton, SectionHeader } from '@/components/ui';
import { useAuth } from '../../context/AuthContext';
import { ApiError, Conversacion, listarConversaciones } from '../../services/api';

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function ChatsScreen() {
  const router = useRouter();
  const { user, token, isAuthenticated, isRestoring } = useAuth();
  const [conversaciones, setConversaciones] = useState<Conversacion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargarConversaciones = useCallback(async () => {
    if (!user || !token) return;
    try {
      setIsLoading(true);
      const data = await listarConversaciones(Number(user.id), token);
      setConversaciones(data);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No fue posible cargar tus conversaciones.');
    } finally {
      setIsLoading(false);
    }
  }, [token, user]);

  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated) cargarConversaciones();
    }, [cargarConversaciones, isAuthenticated]),
  );

  if (isRestoring) {
    return (
      <View className="flex-1 bg-neutral-50 items-center justify-center px-5">
        <ActivityIndicator color="#047857" />
        <Text className="text-neutral-500 text-sm mt-4">Cargando conversaciones</Text>
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <ScrollView className="flex-1 bg-neutral-50" contentContainerStyle={{ padding: 20, paddingBottom: 104 }}>
        <EmptyState icon="comments" title="Inicia sesión" body="Tus conversaciones aparecerán aquí." />
        <PrimaryButton icon="sign-in" onPress={() => router.push('/login')} className="mt-5">
          Ingresar
        </PrimaryButton>
      </ScrollView>
    );
  }

  return (
    <ScrollView className="flex-1 bg-neutral-50" contentContainerStyle={{ paddingBottom: 104 }} showsVerticalScrollIndicator={false}>
      <View className="px-5 pt-6 pb-6">
        <SectionHeader title="Chats" actionLabel="Actualizar" onActionPress={cargarConversaciones} />

        {error ? <InfoBanner icon="exclamation-circle" title="Chat no disponible" body={error} tone="red" /> : null}

        {isLoading ? (
          <View className="items-center py-12 bg-white border border-neutral-100 rounded-2xl">
            <ActivityIndicator color="#047857" />
            <Text className="text-neutral-500 text-base mt-4">Buscando conversaciones</Text>
          </View>
        ) : null}

        {!isLoading && !error && conversaciones.length === 0 ? (
          <EmptyState icon="comments-o" title="Aún no tienes chats" body="Propón una permuta desde un producto." />
        ) : null}

        {conversaciones.map((item) => {
          const rol = Number(user?.id) === item.publ_autor_id ? 'Tu publicación' : 'Te interesa';
          return (
            <TouchableOpacity
              key={item.conv_id}
              className="bg-white border border-neutral-100 rounded-2xl p-4 mb-3 flex-row items-center"
              activeOpacity={0.82}
              onPress={() => router.push(`/chat/${item.conv_id}` as Href)}
            >
              <View className="w-14 h-14 rounded-2xl bg-brand-50 border border-brand-100 items-center justify-center mr-4">
                <FontAwesome name="exchange" size={20} color="#047857" />
              </View>
              <View className="flex-1 mr-3">
                <View className="flex-row items-center mb-1">
                  <Text className="text-brand-700 text-sm font-bold">{rol}</Text>
                  <Text className="text-neutral-400 text-sm ml-2">{formatDate(item.conv_ultima_actividad)}</Text>
                </View>
                <Text className="text-neutral-950 font-bold text-lg leading-6" numberOfLines={1}>{item.publ_titulo}</Text>
                <Text className="text-neutral-500 text-base mt-1" numberOfLines={1}>{item.ultimo_mensaje ?? 'Sin mensajes todavía'}</Text>
              </View>
              <FontAwesome name="chevron-right" size={13} color="#a3a3a3" />
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}
