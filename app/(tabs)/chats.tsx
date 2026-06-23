import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFocusEffect } from '@react-navigation/native';
import { Href, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';

import { EmptyState, InfoBanner, PrimaryButton, ScreenContent } from '@/components/ui';
import { useAuth } from '../../context/AuthContext';
import { ApiError, Conversacion, Usuario, listarConversaciones, obtenerUsuarioPorId } from '../../services/api';

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function getParticipantId(conversacion: Conversacion, currentUserId: number): number {
  return currentUserId === conversacion.publ_autor_id ? conversacion.interesado_id : conversacion.publ_autor_id;
}

function nombreUsuario(usuario?: Usuario): string {
  if (!usuario) return 'Cargando persona';
  return `${usuario.usu_pri_nombre} ${usuario.usu_pri_apellido}`.trim() || 'Persona no disponible';
}

function initialsFromName(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || '?';
}

export default function ChatsScreen() {
  const router = useRouter();
  const { user, token, isAuthenticated, isRestoring } = useAuth();
  const [conversaciones, setConversaciones] = useState<Conversacion[]>([]);
  const [usuariosPorId, setUsuariosPorId] = useState<Map<number, Usuario>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargarConversaciones = useCallback(async () => {
    if (!user || !token) return;
    try {
      setIsLoading(true);
      const usuarioId = Number(user.id);
      const data = await listarConversaciones(usuarioId, token);
      const participantesIds = [...new Set(data.map((item) => getParticipantId(item, usuarioId)))];
      const participantes = await Promise.all(
        participantesIds.map(async (participanteId) => {
          try {
            return [participanteId, await obtenerUsuarioPorId(participanteId, token)] as const;
          } catch {
            return null;
          }
        }),
      );
      setUsuariosPorId((current) => {
        const next = new Map(current);
        participantes.forEach((entry) => {
          if (entry) next.set(entry[0], entry[1]);
        });
        return next;
      });
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

  const conversacionesOrdenadas = useMemo(
    () => [...conversaciones].sort(
      (left, right) => new Date(right.conv_ultima_actividad).getTime() - new Date(left.conv_ultima_actividad).getTime(),
    ),
    [conversaciones],
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
    <ScrollView className="flex-1 bg-neutral-50" contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ paddingBottom: 96 }} showsVerticalScrollIndicator={false}>
      <ScreenContent className="px-4 pt-5 pb-5">
        <View className="flex-row items-center justify-between mb-4">
          <View className="flex-1 pr-4">
            <Text className="text-brand-700 text-sm font-bold">Mensajes</Text>
            <Text className="text-neutral-950 text-2xl font-bold leading-8">Chats</Text>
          </View>
          <TouchableOpacity
            className={`w-11 h-11 rounded-2xl bg-white border border-neutral-100 items-center justify-center ${isLoading ? 'opacity-60' : ''}`}
            onPress={cargarConversaciones}
            disabled={isLoading}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Actualizar chats"
          >
            <FontAwesome name="refresh" size={15} color="#047857" />
          </TouchableOpacity>
        </View>

        {error ? <InfoBanner icon="exclamation-circle" title="Chat no disponible" body={error} tone="red" /> : null}

        {isLoading && conversacionesOrdenadas.length === 0 ? (
          <View className="items-center py-12 bg-white border border-neutral-100 rounded-2xl mt-1">
            <ActivityIndicator color="#047857" />
            <Text className="text-neutral-500 text-base mt-4">Buscando conversaciones</Text>
          </View>
        ) : null}

        {isLoading && conversacionesOrdenadas.length > 0 ? (
          <View className="flex-row items-center mb-3">
            <ActivityIndicator color="#047857" size="small" />
            <Text className="text-neutral-500 text-sm font-semibold ml-2">Actualizando chats</Text>
          </View>
        ) : null}

        {!isLoading && !error && conversacionesOrdenadas.length === 0 ? (
          <EmptyState icon="comments-o" title="Aún no tienes chats" body="Propón una permuta desde un producto." />
        ) : null}

        {conversacionesOrdenadas.map((item) => {
          const currentUserId = Number(user?.id);
          const rol = currentUserId === item.publ_autor_id ? 'Tu publicación' : 'Te interesa';
          const participanteId = getParticipantId(item, currentUserId);
          const participante = usuariosPorId.get(participanteId);
          const reputacion = participante ? participante.usu_prom_rep.toFixed(1) : null;
          const nombre = nombreUsuario(participante);
          const ultimoMensaje = item.ultimo_mensaje?.trim() || 'Sin mensajes todavía';
          return (
            <TouchableOpacity
              key={item.conv_id}
              className="bg-white border border-neutral-100 rounded-2xl px-4 py-3 mb-2.5"
              activeOpacity={0.82}
              onPress={() => router.push(`/chat/${item.conv_id}` as Href)}
              accessibilityRole="button"
              accessibilityLabel={`Abrir chat con ${nombre}`}
            >
              <View className="flex-row items-center">
                <View className="w-11 h-11 rounded-2xl bg-brand-50 border border-brand-100 items-center justify-center mr-3">
                  <Text className="text-brand-800 text-sm font-bold">{initialsFromName(nombre)}</Text>
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center">
                    <Text className="text-neutral-950 font-bold text-base leading-5 flex-1" numberOfLines={1}>{nombre}</Text>
                    {participante?.usu_identidad_verificada ? <FontAwesome name="check-circle" size={14} color="#047857" /> : null}
                    <Text className="text-neutral-400 text-xs font-semibold ml-2">{formatDate(item.conv_ultima_actividad)}</Text>
                  </View>
                  <Text className="text-neutral-600 text-sm leading-5 mt-1" numberOfLines={1}>{ultimoMensaje}</Text>
                </View>
              </View>
              <View className="flex-row items-center mt-3">
                <View className="bg-brand-50 border border-brand-100 rounded-full px-2.5 py-1">
                  <Text className="text-brand-700 text-xs font-bold">{rol}</Text>
                </View>
                <View className="flex-row items-center ml-2">
                  <FontAwesome name="star" size={11} color="#f59e0b" />
                  <Text className="text-neutral-500 text-xs font-bold ml-1">{reputacion ?? '0.0'}</Text>
                </View>
                <Text className="text-neutral-400 text-xs mx-2">•</Text>
                <Text className="text-neutral-500 text-xs font-bold flex-1" numberOfLines={1}>{item.publ_titulo}</Text>
                <FontAwesome name="chevron-right" size={12} color="#a3a3a3" />
              </View>
            </TouchableOpacity>
          );
        })}
      </ScreenContent>
    </ScrollView>
  );
}
