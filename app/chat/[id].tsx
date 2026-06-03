import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { EmptyState, InfoBanner, PrimaryButton, SectionHeader } from '@/components/ui';
import { useAuth } from '../../context/AuthContext';
import { ApiError, Conversacion, Mensaje, enviarMensaje, obtenerConversacion, obtenerMensajes } from '../../services/api';
import MainLayout from '../../layouts/MainLayout';

function formatMessageDate(value: string) {
  return new Date(value).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
}

export default function ChatDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const conversacionId = useMemo(() => Number(id), [id]);
  const { user, token, isAuthenticated, isRestoring } = useAuth();
  const [conversacion, setConversacion] = useState<Conversacion | null>(null);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [contenido, setContenido] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargarChat = async () => {
    if (!user || !token || !Number.isInteger(conversacionId) || conversacionId <= 0) return;
    try {
      setIsLoading(true);
      const [detalle, lista] = await Promise.all([
        obtenerConversacion(conversacionId, Number(user.id), token),
        obtenerMensajes(conversacionId, Number(user.id), token),
      ]);
      setConversacion(detalle);
      setMensajes(lista);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No fue posible cargar la conversación.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isRestoring && !isAuthenticated) {
      router.replace('/login');
      return;
    }
    if (isAuthenticated) cargarChat();
  }, [conversacionId, isAuthenticated, isRestoring]);

  const handleEnviar = async () => {
    if (!user || !token || !contenido.trim()) return;
    try {
      setIsSending(true);
      const nuevo = await enviarMensaje(conversacionId, {
        emisor_id: Number(user.id),
        contenido: contenido.trim(),
      }, token);
      setMensajes((prev) => [...prev, nuevo]);
      setContenido('');
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No fue posible enviar el mensaje.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <MainLayout>
      <KeyboardAvoidingView className="flex-1 bg-neutral-50" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
          <View className="px-5 pt-6 pb-4">
            <TouchableOpacity className="w-11 h-11 rounded-2xl bg-white border border-neutral-100 items-center justify-center mb-5" onPress={() => router.back()} activeOpacity={0.75}>
              <FontAwesome name="chevron-left" size={14} color="#404040" />
            </TouchableOpacity>

            <SectionHeader title={conversacion?.publ_titulo ?? 'Conversación'} eyebrow="Permuta" actionLabel="Actualizar" onActionPress={cargarChat} />

            {error ? <InfoBanner icon="exclamation-circle" title="No se pudo completar la acción" body={error} tone="red" /> : null}

            {isLoading ? (
              <View className="items-center py-16 bg-white border border-neutral-100 rounded-3xl">
                <ActivityIndicator color="#047857" />
                <Text className="text-neutral-500 text-sm mt-4">Cargando mensajes</Text>
              </View>
            ) : null}

            {!isLoading && mensajes.length === 0 ? (
              <EmptyState icon="comment-o" title="Sin mensajes" body="Envía el primer mensaje para coordinar esta permuta." />
            ) : null}

            <View className="mt-3">
              {mensajes.map((mensaje) => {
                const esMio = String(mensaje.emisor_id) === user?.id;
                return (
                  <View key={mensaje.mens_id} className={`mb-3 ${esMio ? 'items-end' : 'items-start'}`}>
                    <View className={`max-w-[84%] rounded-3xl px-4 py-3 ${esMio ? 'bg-brand-700' : 'bg-white border border-neutral-100'}`}>
                      <Text className={`${esMio ? 'text-white' : 'text-neutral-800'} text-sm leading-5`}>{mensaje.mens_contenido}</Text>
                      <Text className={`${esMio ? 'text-brand-100' : 'text-neutral-400'} text-[11px] mt-2 font-semibold`}>{formatMessageDate(mensaje.mens_fech_envio)}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        </ScrollView>

        <View className="px-5 pb-5 pt-3 bg-neutral-50 border-t border-neutral-100">
          <View className="flex-row items-end">
            <TextInput
              className="flex-1 bg-white border border-neutral-200 rounded-3xl px-4 py-3 min-h-12 max-h-28 text-neutral-900 text-sm"
              placeholder="Escribe un mensaje"
              placeholderTextColor="#a3a3a3"
              value={contenido}
              onChangeText={setContenido}
              multiline
              editable={!isSending}
            />
            <PrimaryButton icon="send" loading={isSending} disabled={!contenido.trim()} onPress={handleEnviar} className="w-14 ml-3 px-0">
              {''}
            </PrimaryButton>
          </View>
        </View>
      </KeyboardAvoidingView>
    </MainLayout>
  );
}
