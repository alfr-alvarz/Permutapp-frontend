import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFocusEffect } from '@react-navigation/native';
import { Href, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { EmptyState, InfoBanner, PrimaryButton, SectionHeader } from '@/components/ui';
import { useAuth } from '../../context/AuthContext';
import {
  ApiError,
  Conversacion,
  EstacionMetro,
  Mensaje,
  Producto,
  SugerenciaPuntoMedio,
  eliminarConversacion,
  enviarMensaje,
  obtenerConversacion,
  obtenerEstacionesMetro,
  obtenerMensajes,
  obtenerProductos,
  sugerirMetroPuntoMedio,
} from '../../services/api';
import MainLayout from '../../layouts/MainLayout';

function formatMessageDate(value: string) {
  return new Date(value).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
}

function formatKm(value: number): string {
  return new Intl.NumberFormat('es-CL', { maximumFractionDigits: 1 }).format(value);
}

function mergeMessages(current: Mensaje[], incoming: Mensaje[]) {
  const messagesById = new Map<number, Mensaje>();

  [...current, ...incoming].forEach((message) => {
    messagesById.set(message.mens_id, message);
  });

  return [...messagesById.values()].sort(
    (left, right) => new Date(left.mens_fech_envio).getTime() - new Date(right.mens_fech_envio).getTime(),
  );
}

export default function ChatDetailScreen() {
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);
  const { id } = useLocalSearchParams<{ id: string }>();
  const conversacionId = useMemo(() => Number(id), [id]);
  const { user, token, isAuthenticated, isRestoring } = useAuth();
  const [conversacion, setConversacion] = useState<Conversacion | null>(null);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [contenido, setContenido] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [producto, setProducto] = useState<Producto | null>(null);
  const [estacionesMetro, setEstacionesMetro] = useState<EstacionMetro[]>([]);
  const [lineaSeleccionada, setLineaSeleccionada] = useState('');
  const [estacionInteresado, setEstacionInteresado] = useState<EstacionMetro | null>(null);
  const [sugerencia, setSugerencia] = useState<SugerenciaPuntoMedio | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isSharingSuggestion, setIsSharingSuggestion] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [showLocationPanel, setShowLocationPanel] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const cargarChat = useCallback(async () => {
    if (!user || !token || !Number.isInteger(conversacionId) || conversacionId <= 0) return;
    try {
      setIsLoading(true);
      const [detalle, lista] = await Promise.all([
        obtenerConversacion(conversacionId, Number(user.id), token),
        obtenerMensajes(conversacionId, Number(user.id), token),
      ]);
      setConversacion(detalle);
      setMensajes((current) => mergeMessages(
        current.filter((message) => message.conv_id === conversacionId),
        lista,
      ));
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No fue posible cargar la conversación.');
    } finally {
      setIsLoading(false);
    }
  }, [conversacionId, token, user]);

  useEffect(() => {
    if (!isRestoring && !isAuthenticated) {
      router.replace('/login');
      return;
    }
    if (isAuthenticated) {
      setConversacion(null);
      setMensajes([]);
      cargarChat();
    }
  }, [cargarChat, isAuthenticated, isRestoring, router]);

  const esInteresado = Boolean(user && conversacion && Number(user.id) === conversacion.interesado_id);

  useEffect(() => {
    if (!conversacion || !esInteresado) {
      setProducto(null);
      setEstacionesMetro([]);
      setSugerencia(null);
      setLocationError(null);
      return;
    }
    if (!showLocationPanel) {
      return;
    }

    let mounted = true;

    async function cargarDatosEncuentro() {
      try {
        setIsLoadingLocation(true);
        const [productos, estaciones] = await Promise.all([obtenerProductos(), obtenerEstacionesMetro()]);
        if (!mounted) return;

        const productoConversacion = conversacion?.prod_id
          ? productos.find((item) => item.prod_id === conversacion.prod_id) ?? null
          : null;
        const estacionesValidas = estaciones
          .filter((estacion) => estacion.latitud != null && estacion.longitud != null)
          .sort((a, b) => a.linea.localeCompare(b.linea) || (a.orden ?? 999) - (b.orden ?? 999));

        setProducto(productoConversacion);
        setEstacionesMetro(estacionesValidas);
        setLineaSeleccionada(estacionesValidas[0]?.linea ?? '');
        setEstacionInteresado(null);
        setSugerencia(null);

        if (!productoConversacion) {
          setLocationError(conversacion?.prod_id
            ? 'No encontramos el producto asociado a esta conversación.'
            : 'Este chat es histórico y no tiene un producto asociado.');
        } else if (productoConversacion.prod_latitud_aprox == null || productoConversacion.prod_longitud_aprox == null) {
          setLocationError('Esta publicación no tiene una estación cercana registrada.');
        } else if (estacionesValidas.length === 0) {
          setLocationError('ServicioLocalizacion no devolvió estaciones con coordenadas.');
        } else {
          setLocationError(null);
        }
      } catch (err) {
        if (mounted) {
          setLocationError(err instanceof ApiError ? err.message : 'No fue posible cargar los datos para el punto seguro.');
        }
      } finally {
        if (mounted) setIsLoadingLocation(false);
      }
    }

    cargarDatosEncuentro();
    return () => { mounted = false; };
  }, [conversacion, esInteresado, showLocationPanel]);

  useFocusEffect(
    useCallback(() => {
      if (!isAuthenticated || !user || !token || !Number.isInteger(conversacionId) || conversacionId <= 0) {
        return undefined;
      }

      let isActive = true;
      let isPolling = false;

      const refreshMessages = async () => {
        if (isPolling) return;

        isPolling = true;
        try {
          const latestMessages = await obtenerMensajes(conversacionId, Number(user.id), token);
          if (isActive) {
            setMensajes((current) => mergeMessages(current, latestMessages));
          }
        } catch {
          // Keep the current messages when a background refresh fails.
        } finally {
          isPolling = false;
        }
      };

      const intervalId = setInterval(refreshMessages, 2000);

      return () => {
        isActive = false;
        clearInterval(intervalId);
      };
    }, [conversacionId, isAuthenticated, token, user]),
  );

  useEffect(() => {
    if (mensajes.length === 0) return;

    const timeoutId = setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: !isLoading });
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [isLoading, mensajes.length]);

  const lineasDisponibles = useMemo(
    () => [...new Set(estacionesMetro.map((estacion) => estacion.linea))],
    [estacionesMetro],
  );
  const estacionesPorLinea = useMemo(
    () => estacionesMetro.filter((estacion) => estacion.linea === lineaSeleccionada),
    [estacionesMetro, lineaSeleccionada],
  );

  const handleSugerirPuntoSeguro = async () => {
    if (!producto || estacionInteresado?.latitud == null || estacionInteresado.longitud == null) return;
    if (producto.prod_latitud_aprox == null || producto.prod_longitud_aprox == null) return;

    try {
      setIsSuggesting(true);
      setLocationError(null);
      const resultado = await sugerirMetroPuntoMedio({
        latitudOrigen: producto.prod_latitud_aprox,
        longitudOrigen: producto.prod_longitud_aprox,
        latitudDestino: estacionInteresado.latitud,
        longitudDestino: estacionInteresado.longitud,
      });
      setSugerencia(resultado);
    } catch (err) {
      setLocationError(err instanceof ApiError ? err.message : 'No fue posible calcular el punto de encuentro.');
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleCompartirSugerencia = async () => {
    if (!user || !token || !sugerencia) return;
    const estacion = sugerencia.estacionSugerida;
    const detalle = [estacion.direccion, estacion.comuna].filter(Boolean).join(', ');
    const mensaje = [
      `Punto de encuentro seguro sugerido: Metro ${estacion.nombre} (${estacion.linea}).`,
      detalle ? `Ubicación: ${detalle}.` : null,
      `Queda a aprox. ${formatKm(sugerencia.distanciaOrigenKm)} km del punto del producto y ${formatKm(sugerencia.distanciaDestinoKm)} km de mi Metro cercano.`,
      'Sugerencia calculada por Permutapp con ServicioLocalizacion.',
    ].filter(Boolean).join(' ');

    try {
      setIsSharingSuggestion(true);
      const nuevo = await enviarMensaje(conversacionId, {
        emisor_id: Number(user.id),
        contenido: mensaje,
      }, token);
      setMensajes((current) => mergeMessages(current, [nuevo]));
      setLocationError(null);
      setShowLocationPanel(false);
      setEstacionInteresado(null);
      setSugerencia(null);
    } catch (err) {
      setLocationError(err instanceof ApiError ? err.message : 'No fue posible compartir la sugerencia.');
    } finally {
      setIsSharingSuggestion(false);
    }
  };

  const handleEnviar = async () => {
    if (!user || !token || !contenido.trim()) return;
    try {
      setIsSending(true);
      const nuevo = await enviarMensaje(conversacionId, {
        emisor_id: Number(user.id),
        contenido: contenido.trim(),
      }, token);
      setMensajes((current) => mergeMessages(current, [nuevo]));
      setContenido('');
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No fue posible enviar el mensaje.');
    } finally {
      setIsSending(false);
    }
  };

  const handleEliminarChat = async () => {
    if (!user || !token) return;
    try {
      setIsDeleting(true);
      await eliminarConversacion(conversacionId, Number(user.id), token);
      setShowDeleteConfirmation(false);
      setShowChatMenu(false);
      router.replace('/(tabs)/chats' as Href);
    } catch (err) {
      setShowDeleteConfirmation(false);
      setError(err instanceof ApiError ? err.message : 'No fue posible eliminar el chat.');
    } finally {
      setIsDeleting(false);
    }
  };

  const abrirPuntoSeguro = () => {
    setShowChatMenu(false);
    setShowLocationPanel(true);
  };

  const esChatHistorico = conversacion != null && conversacion.prod_id == null;

  return (
    <MainLayout>
      <KeyboardAvoidingView className="flex-1 bg-neutral-50" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View className="px-5 pt-4 pb-3 bg-neutral-50 border-b border-neutral-100">
          <View className="flex-row items-center justify-between mb-3">
            <TouchableOpacity className="w-11 h-11 rounded-2xl bg-white border border-neutral-100 items-center justify-center" onPress={() => router.back()} activeOpacity={0.75}>
              <FontAwesome name="chevron-left" size={14} color="#404040" />
            </TouchableOpacity>
            <TouchableOpacity
              className="w-11 h-11 rounded-2xl bg-white border border-neutral-100 items-center justify-center"
              onPress={() => setShowChatMenu(true)}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel="Opciones del chat"
            >
              <FontAwesome name="ellipsis-v" size={18} color="#404040" />
            </TouchableOpacity>
          </View>

          <SectionHeader title={conversacion?.publ_titulo ?? 'Conversación'} eyebrow="Permuta" />
        </View>

        <ScrollView
          ref={scrollViewRef}
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        >
          <View className="px-5 pt-4 pb-4">
            {error ? <InfoBanner icon="exclamation-circle" title="No se pudo completar la acción" body={error} tone="red" /> : null}

            {esChatHistorico ? <InfoBanner icon="archive" title="Chat histórico" body="El producto original ya no está disponible. Puedes revisar los mensajes, pero no continuar esta negociación." tone="amber" /> : null}

            {esInteresado && showLocationPanel ? (
              <View className="bg-white border border-neutral-100 rounded-3xl p-5 mb-4">
                <View className="flex-row items-start mb-3">
                  <View className="w-11 h-11 rounded-2xl bg-brand-50 border border-brand-100 items-center justify-center mr-3">
                    <FontAwesome name="map-marker" size={18} color="#047857" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-neutral-950 text-base font-bold">Proponer punto seguro</Text>
                    <Text className="text-neutral-500 text-xs leading-5 mt-1">Elige tu Metro cercano. Lo combinaremos con la ubicación aproximada del producto para sugerir una estación intermedia.</Text>
                  </View>
                  <TouchableOpacity
                    className="w-9 h-9 rounded-xl bg-neutral-100 items-center justify-center ml-2"
                    onPress={() => setShowLocationPanel(false)}
                    accessibilityLabel="Cerrar punto seguro"
                  >
                    <FontAwesome name="times" size={15} color="#525252" />
                  </TouchableOpacity>
                </View>

                {isLoadingLocation ? (
                  <View className="items-center py-5">
                    <ActivityIndicator color="#047857" />
                    <Text className="text-neutral-500 text-xs mt-2">Cargando ServicioLocalizacion</Text>
                  </View>
                ) : null}

                {locationError ? <InfoBanner icon="exclamation-circle" title="Punto seguro no disponible" body={locationError} tone="amber" /> : null}

                {!isLoadingLocation && !locationError ? (
                  <>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 12 }}>
                      {lineasDisponibles.map((linea) => {
                        const selected = linea === lineaSeleccionada;
                        return (
                          <TouchableOpacity key={linea} className={`mr-2 px-4 h-10 rounded-2xl border items-center justify-center ${selected ? 'bg-brand-700 border-brand-700' : 'bg-neutral-50 border-neutral-200'}`} onPress={() => { setLineaSeleccionada(linea); setEstacionInteresado(null); setSugerencia(null); }} activeOpacity={0.75}>
                            <Text className={`text-xs font-bold ${selected ? 'text-white' : 'text-neutral-700'}`}>{linea}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>

                    <View className="flex-row flex-wrap mt-3">
                      {estacionesPorLinea.map((estacion) => {
                        const selected = estacionInteresado?.id === estacion.id;
                        return (
                          <TouchableOpacity key={estacion.id} className={`mr-2 mb-2 px-3 min-h-10 rounded-2xl border items-center justify-center ${selected ? 'bg-teal-100 border-teal-300' : 'bg-white border-neutral-200'}`} onPress={() => { setEstacionInteresado(estacion); setSugerencia(null); }} activeOpacity={0.75}>
                            <Text className="text-neutral-700 text-xs font-bold">{estacion.nombre}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    <PrimaryButton icon="map-marker" loading={isSuggesting} disabled={!estacionInteresado} onPress={handleSugerirPuntoSeguro} className="mt-2">
                      Calcular estación intermedia
                    </PrimaryButton>

                    {sugerencia ? (
                      <View className="bg-brand-50 border border-brand-100 rounded-2xl p-4 mt-4">
                        <Text className="text-brand-900 text-base font-bold">Metro {sugerencia.estacionSugerida.nombre}</Text>
                        <Text className="text-brand-700 text-xs font-bold mt-1">{sugerencia.estacionSugerida.linea} · {sugerencia.estacionSugerida.comuna ?? 'Santiago'}</Text>
                        {sugerencia.estacionSugerida.direccion ? <Text className="text-neutral-600 text-xs mt-2">{sugerencia.estacionSugerida.direccion}</Text> : null}
                        <Text className="text-neutral-600 text-xs leading-5 mt-2">A {formatKm(sugerencia.distanciaOrigenKm)} km del producto y {formatKm(sugerencia.distanciaDestinoKm)} km de tu Metro cercano.</Text>
                        <PrimaryButton icon="send" loading={isSharingSuggestion} onPress={handleCompartirSugerencia} className="mt-3">
                          Compartir en el chat
                        </PrimaryButton>
                      </View>
                    ) : null}
                  </>
                ) : null}
              </View>
            ) : null}

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
              placeholderTextColor="#a3a3a3"
              value={contenido}
              onChangeText={setContenido}
              placeholder={esChatHistorico ? 'Producto no disponible' : 'Escribe un mensaje'}
              multiline
              editable={!isSending && !esChatHistorico}
            />
            <PrimaryButton
              icon="send"
              iconOnly
              accessibilityLabel="Enviar mensaje"
              loading={isSending}
              disabled={!contenido.trim() || esChatHistorico}
              onPress={handleEnviar}
              className="w-14 ml-3 px-0"
            />
          </View>
        </View>
      </KeyboardAvoidingView>

      <Modal visible={showChatMenu} transparent animationType="fade" onRequestClose={() => setShowChatMenu(false)}>
        <View className="flex-1 items-center">
          <Pressable
            style={StyleSheet.absoluteFillObject}
            className="bg-black/20"
            onPress={() => setShowChatMenu(false)}
            accessibilityRole="button"
            accessibilityLabel="Cerrar opciones"
          />
          <View pointerEvents="box-none" className="w-full max-w-[480px] flex-1">
            <View className="absolute top-20 right-5 w-72 bg-white rounded-3xl border border-neutral-100 p-2">
              {esInteresado && !esChatHistorico ? (
                <TouchableOpacity className="flex-row items-center px-4 py-4 rounded-2xl" onPress={abrirPuntoSeguro} activeOpacity={0.7}>
                  <View className="w-10 h-10 rounded-2xl bg-brand-50 items-center justify-center mr-3">
                    <FontAwesome name="map-marker" size={17} color="#047857" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-neutral-900 font-bold text-sm">Proponer punto seguro</Text>
                    <Text className="text-neutral-500 text-xs mt-1">Buscar una estación intermedia</Text>
                  </View>
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity
                className="flex-row items-center px-4 py-4 rounded-2xl"
                onPress={() => { setShowChatMenu(false); cargarChat(); }}
                activeOpacity={0.7}
              >
                <View className="w-10 h-10 rounded-2xl bg-neutral-100 items-center justify-center mr-3">
                  <FontAwesome name="refresh" size={15} color="#525252" />
                </View>
                <Text className="text-neutral-900 font-bold text-sm">Actualizar chat</Text>
              </TouchableOpacity>

              <View className="h-px bg-neutral-100 mx-3" />

              <TouchableOpacity
                className="flex-row items-center px-4 py-4 rounded-2xl"
                onPress={() => { setShowChatMenu(false); setShowDeleteConfirmation(true); }}
                activeOpacity={0.7}
              >
                <View className="w-10 h-10 rounded-2xl bg-red-50 items-center justify-center mr-3">
                  <FontAwesome name="trash" size={15} color="#dc2626" />
                </View>
                <View className="flex-1">
                  <Text className="text-red-600 font-bold text-sm">Eliminar chat</Text>
                  <Text className="text-neutral-500 text-xs mt-1">Quitar de mis conversaciones</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showDeleteConfirmation} transparent animationType="fade" onRequestClose={() => !isDeleting && setShowDeleteConfirmation(false)}>
        <View className="flex-1 bg-black/30 items-center justify-center px-5">
          <View className="w-full max-w-md bg-white rounded-3xl p-5">
            <View className="w-12 h-12 rounded-2xl bg-red-50 items-center justify-center mb-4">
              <FontAwesome name="trash" size={18} color="#dc2626" />
            </View>
            <Text className="text-neutral-950 text-xl font-bold">¿Eliminar este chat?</Text>
            <Text className="text-neutral-500 text-sm leading-6 mt-2">Se quitará de tu lista de conversaciones. La otra persona conservará su copia y el historial no se borrará de la base de datos.</Text>
            <PrimaryButton
              icon="trash"
              loading={isDeleting}
              onPress={handleEliminarChat}
              className="mt-5 bg-red-600"
            >
              Eliminar chat
            </PrimaryButton>
            <PrimaryButton
              variant="ghost"
              disabled={isDeleting}
              onPress={() => setShowDeleteConfirmation(false)}
              className="mt-3"
            >
              Cancelar
            </PrimaryButton>
          </View>
        </View>
      </Modal>
    </MainLayout>
  );
}
