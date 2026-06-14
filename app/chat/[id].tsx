import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFocusEffect } from '@react-navigation/native';
import { Href, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { EmptyState, InfoBanner, PrimaryButton, SectionHeader } from '@/components/ui';
import MainLayout from '../../layouts/MainLayout';
import { useAuth } from '../../context/AuthContext';
import {
  ApiError,
  EstacionMetro,
  Producto,
  Publicacion,
  SugerenciaPuntoMedio,
  eliminarConversacion,
  obtenerEstacionesMetro,
  obtenerProductos,
  obtenerPublicaciones,
  sugerirMetroPuntoMedio,
} from '../../services/api';
import {
  ConversacionPermuta,
  MensajePermuta,
  confirmarFinalizacion,
  crearValoracion,
  enviarMensajePermuta,
  obtenerDetallePermuta,
  obtenerMensajesPermuta,
  seleccionarOferta,
  solicitarFinalizacion,
} from '../../services/tradeApi';

interface MiPermuta {
  producto: Producto;
  publicacion: Publicacion;
}

function formatMessageDate(value: string) {
  return new Date(value).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
}

function formatPrice(value: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(value);
}

function normalizeSearch(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function metroLineColor(line: string) {
  const colors: Record<string, string> = {
    L1: '#dc2626',
    L2: '#f59e0b',
    L3: '#7c3aed',
    L4: '#2563eb',
    'L4A': '#38bdf8',
    L5: '#16a34a',
    L6: '#9ca3af',
  };
  return colors[line.toUpperCase()] ?? '#047857';
}

function mergeMessages(current: MensajePermuta[], incoming: MensajePermuta[]) {
  const byId = new Map<number, MensajePermuta>();
  [...current, ...incoming].forEach((message) => byId.set(message.mens_id, message));
  return [...byId.values()].sort(
    (left, right) => new Date(left.mens_fech_envio).getTime() - new Date(right.mens_fech_envio).getTime(),
  );
}

export default function ChatDetailScreen() {
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);
  const { id } = useLocalSearchParams<{ id: string }>();
  const conversacionId = useMemo(() => Number(id), [id]);
  const { user, token, isAuthenticated, isRestoring } = useAuth();
  const usuarioId = Number(user?.id);

  const [conversacion, setConversacion] = useState<ConversacionPermuta | null>(null);
  const [mensajes, setMensajes] = useState<MensajePermuta[]>([]);
  const [contenido, setContenido] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showOfferSelector, setShowOfferSelector] = useState(false);
  const [misPermutas, setMisPermutas] = useState<MiPermuta[]>([]);
  const [isLoadingOffers, setIsLoadingOffers] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  const [showLocationPanel, setShowLocationPanel] = useState(false);
  const [productoOriginal, setProductoOriginal] = useState<Producto | null>(null);
  const [estaciones, setEstaciones] = useState<EstacionMetro[]>([]);
  const [estacionElegida, setEstacionElegida] = useState<EstacionMetro | null>(null);
  const [metroSearch, setMetroSearch] = useState('');
  const [sugerencia, setSugerencia] = useState<SugerenciaPuntoMedio | null>(null);
  const [locationBusy, setLocationBusy] = useState(false);

  const estacionesAgrupadas = useMemo(() => {
    const query = normalizeSearch(metroSearch);
    const filtered = query
      ? estaciones.filter((station) => normalizeSearch(
        `${station.nombre} ${station.linea} ${station.comuna ?? ''}`,
      ).includes(query))
      : estaciones;
    const byLine = new Map<string, EstacionMetro[]>();

    filtered.forEach((station) => {
      const line = station.linea || 'Otra línea';
      const current = byLine.get(line) ?? [];
      current.push(station);
      byLine.set(line, current);
    });

    return [...byLine.entries()]
      .sort(([left], [right]) => left.localeCompare(right, 'es', { numeric: true }))
      .map(([line, stations]) => [
        line,
        stations.sort((left, right) => (
          (left.orden ?? Number.MAX_SAFE_INTEGER) - (right.orden ?? Number.MAX_SAFE_INTEGER)
          || left.nombre.localeCompare(right.nombre, 'es')
        )),
      ] as const);
  }, [estaciones, metroSearch]);

  const cargarChat = useCallback(async (showLoader = true) => {
    if (!token || !Number.isInteger(usuarioId) || !Number.isInteger(conversacionId)) return;
    try {
      if (showLoader) setIsLoading(true);
      const [detalle, lista] = await Promise.all([
        obtenerDetallePermuta(conversacionId, usuarioId, token),
        obtenerMensajesPermuta(conversacionId, usuarioId, token),
      ]);
      setConversacion(detalle);
      setMensajes((current) => mergeMessages(current, lista));
      setError(null);
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'No fue posible cargar la conversación.');
    } finally {
      if (showLoader) setIsLoading(false);
    }
  }, [conversacionId, token, usuarioId]);

  useEffect(() => {
    if (!isRestoring && !isAuthenticated) {
      router.replace('/login');
    } else if (isAuthenticated) {
      cargarChat();
    }
  }, [cargarChat, isAuthenticated, isRestoring, router]);

  useFocusEffect(useCallback(() => {
    if (!isAuthenticated || !token) return undefined;
    const interval = setInterval(() => cargarChat(false), 2500);
    return () => clearInterval(interval);
  }, [cargarChat, isAuthenticated, token]));

  useEffect(() => {
    if (mensajes.length === 0) return;
    const timeout = setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: !isLoading }), 0);
    return () => clearTimeout(timeout);
  }, [isLoading, mensajes.length]);

  const esInteresado = conversacion?.interesado_id === usuarioId;
  const esNegociando = conversacion?.conv_estado === 'NEGOCIANDO';

  const ejecutar = async (action: () => Promise<unknown>) => {
    try {
      setIsWorking(true);
      setError(null);
      await action();
      await cargarChat(false);
    } catch (actionError) {
      setError(actionError instanceof ApiError ? actionError.message : 'No fue posible completar la acción.');
    } finally {
      setIsWorking(false);
    }
  };

  const abrirOfertas = async () => {
    if (!user) return;
    setShowOfferSelector(true);
    setIsLoadingOffers(true);
    try {
      const [productos, publicaciones] = await Promise.all([obtenerProductos(), obtenerPublicaciones()]);
      const own = publicaciones.filter(
        (publication) => publication.publ_activo && publication.publ_autor_id === usuarioId,
      );
      const byId = new Map(own.map((publication) => [publication.publ_id, publication]));
      setMisPermutas(
        productos
          .filter((product) => byId.has(product.publ_id))
          .map((product) => ({ producto: product, publicacion: byId.get(product.publ_id)! })),
      );
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'No fue posible cargar tus permutas.');
    } finally {
      setIsLoadingOffers(false);
    }
  };

  const elegirOferta = (productoId: number) => ejecutar(async () => {
    if (!token) return;
    await seleccionarOferta(conversacionId, usuarioId, productoId, token);
    setShowOfferSelector(false);
  });

  const handleEnviar = () => ejecutar(async () => {
    if (!token || !contenido.trim()) return;
    const message = await enviarMensajePermuta(conversacionId, usuarioId, contenido.trim(), token);
    setMensajes((current) => mergeMessages(current, [message]));
    setContenido('');
  });

  const handleSolicitar = () => ejecutar(async () => {
    if (token) await solicitarFinalizacion(conversacionId, usuarioId, token);
  });

  const handleConfirmar = () => ejecutar(async () => {
    if (token) await confirmarFinalizacion(conversacionId, usuarioId, token);
  });

  const handleValorar = () => {
    if (!comment.trim()) {
      setError('Escribe un comentario breve para enviar la valoración.');
      return;
    }
    ejecutar(async () => {
      if (!token) return;
      await crearValoracion(conversacionId, usuarioId, rating, comment.trim(), token);
      setComment('');
      setRating(0);
      setShowRatingModal(false);
    });
  };

  const handleEliminar = () => ejecutar(async () => {
    if (!token) return;
    await eliminarConversacion(conversacionId, usuarioId, token);
    setShowDeleteConfirmation(false);
    router.replace('/(tabs)/chats' as Href);
  });

  const abrirPuntoSeguro = async () => {
    setShowMenu(false);
    setShowLocationPanel(true);
    setMetroSearch('');
    if (!conversacion?.prod_id) return;
    try {
      setLocationBusy(true);
      const [products, stations] = await Promise.all([obtenerProductos(), obtenerEstacionesMetro()]);
      setProductoOriginal(products.find((product) => product.prod_id === conversacion.prod_id) ?? null);
      setEstaciones(stations.filter((station) => station.latitud != null && station.longitud != null));
    } catch {
      setError('No fue posible cargar los datos del punto seguro.');
    } finally {
      setLocationBusy(false);
    }
  };

  const calcularPuntoSeguro = async () => {
    if (
      !productoOriginal
      || productoOriginal.prod_latitud_aprox == null
      || productoOriginal.prod_longitud_aprox == null
      || estacionElegida?.latitud == null
      || estacionElegida.longitud == null
    ) return;
    try {
      setLocationBusy(true);
      setSugerencia(await sugerirMetroPuntoMedio({
        latitudOrigen: productoOriginal.prod_latitud_aprox,
        longitudOrigen: productoOriginal.prod_longitud_aprox,
        latitudDestino: estacionElegida.latitud,
        longitudDestino: estacionElegida.longitud,
      }));
    } catch {
      setError('No fue posible calcular la estación intermedia.');
    } finally {
      setLocationBusy(false);
    }
  };

  const compartirPuntoSeguro = () => {
    if (!sugerencia) return;
    const station = sugerencia.estacionSugerida;
    setContenido(`Punto de encuentro seguro sugerido: Metro ${station.nombre} (${station.linea}), ${station.comuna ?? 'Santiago'}.`);
    setShowLocationPanel(false);
  };

  const progress = Math.min(100, ((conversacion?.cantidad_mensajes ?? 0) / 10) * 100);

  return (
    <MainLayout>
      <KeyboardAvoidingView className="flex-1 bg-neutral-50" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View className="px-5 pt-4 pb-3 border-b border-neutral-100">
          <View className="flex-row items-center justify-between mb-3">
            <TouchableOpacity className="w-11 h-11 rounded-2xl bg-white items-center justify-center" onPress={() => router.back()}>
              <FontAwesome name="chevron-left" size={14} color="#404040" />
            </TouchableOpacity>
            <TouchableOpacity className="w-11 h-11 rounded-2xl bg-white items-center justify-center" onPress={() => setShowMenu(true)}>
              <FontAwesome name="ellipsis-v" size={18} color="#404040" />
            </TouchableOpacity>
          </View>
          <SectionHeader title={conversacion?.publ_titulo ?? 'Conversación'} eyebrow="Permuta" />
        </View>

        <ScrollView ref={scrollViewRef} className="flex-1" contentContainerStyle={{ paddingBottom: 24 }}>
          <View className="px-5 pt-4">
            {error ? <InfoBanner icon="exclamation-circle" title="No se pudo completar" body={error} tone="red" /> : null}

            {conversacion?.conv_estado === 'NEGOCIANDO' ? (
              <View className="bg-white border border-neutral-100 rounded-3xl p-5 mb-4">
                <View className="flex-row justify-between">
                  <Text className="text-neutral-950 font-bold">Progreso para finalizar</Text>
                  <Text className="text-brand-700 font-bold">{conversacion.cantidad_mensajes}/10</Text>
                </View>
                <View className="h-2 bg-neutral-100 rounded-full mt-3 overflow-hidden">
                  <View className="h-full bg-brand-600 rounded-full" style={{ width: `${progress}%` }} />
                </View>
                <Text className="text-neutral-500 text-xs leading-5 mt-2">
                  {conversacion.mensajes_para_finalizar > 0
                    ? `Faltan ${conversacion.mensajes_para_finalizar} mensajes entre ambos. La oferta también cuenta.`
                    : conversacion.oferta
                      ? 'Ya pueden proponer el cierre de esta permuta.'
                      : 'Ya llegaron a 10 mensajes. Falta compartir una oferta.'}
                </Text>
                {conversacion.puede_solicitar_finalizacion ? (
                  <PrimaryButton icon="check" loading={isWorking} onPress={handleSolicitar} className="mt-4">
                    Proponer finalizar permuta
                  </PrimaryButton>
                ) : null}
              </View>
            ) : null}

            {showLocationPanel ? (
              <View className="bg-white border border-neutral-100 rounded-3xl p-5 mb-4">
                <View className="flex-row justify-between">
                  <Text className="text-neutral-950 text-base font-bold">Proponer punto seguro</Text>
                  <TouchableOpacity onPress={() => setShowLocationPanel(false)}>
                    <FontAwesome name="times" size={17} color="#525252" />
                  </TouchableOpacity>
                </View>
                {locationBusy ? <ActivityIndicator color="#047857" className="my-5" /> : null}
                {!locationBusy ? (
                  <>
                    <TextInput
                      className="bg-neutral-50 border border-neutral-200 rounded-2xl px-4 h-12 mt-3"
                      value={metroSearch}
                      onChangeText={setMetroSearch}
                      placeholder="Buscar estación, comuna o línea"
                      accessibilityLabel="Buscar estación de Metro"
                    />
                    <ScrollView
                      className="mt-3 border border-neutral-100 rounded-2xl"
                      contentContainerStyle={{ padding: 12 }}
                      style={{ maxHeight: 300 }}
                      nestedScrollEnabled
                      showsVerticalScrollIndicator
                    >
                      {estacionesAgrupadas.map(([line, stations]) => (
                        <View key={line} className="mb-4 last:mb-0">
                          <View className="flex-row items-center mb-2">
                            <View className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: metroLineColor(line) }} />
                            <Text className="text-neutral-950 text-sm font-bold">Línea {line.replace(/^L/i, '')}</Text>
                            <Text className="text-neutral-400 text-xs ml-2">{stations.length} estaciones</Text>
                          </View>
                          {stations.map((station) => {
                            const selected = estacionElegida?.id === station.id;
                            return (
                              <TouchableOpacity
                                key={station.id}
                                className={`flex-row items-center rounded-2xl border px-3 py-3 mb-2 ${selected ? 'bg-brand-50 border-brand-500' : 'bg-white border-neutral-100'}`}
                                onPress={() => { setEstacionElegida(station); setSugerencia(null); }}
                                accessibilityRole="button"
                                accessibilityState={{ selected }}
                              >
                                <View className="flex-1">
                                  <Text className={`text-sm font-bold ${selected ? 'text-brand-800' : 'text-neutral-800'}`}>
                                    {station.nombre}
                                  </Text>
                                  {station.comuna ? (
                                    <Text className="text-neutral-500 text-xs mt-1">{station.comuna}</Text>
                                  ) : null}
                                </View>
                                {station.esCombinacion ? (
                                  <Text className="text-neutral-400 text-[10px] font-bold mr-2">COMBINACIÓN</Text>
                                ) : null}
                                <FontAwesome
                                  name={selected ? 'check-circle' : 'circle-o'}
                                  size={18}
                                  color={selected ? '#047857' : '#a3a3a3'}
                                />
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      ))}
                      {estacionesAgrupadas.length === 0 ? (
                        <Text className="text-neutral-500 text-sm text-center py-5">No encontramos estaciones con esa búsqueda.</Text>
                      ) : null}
                    </ScrollView>
                    {estacionElegida ? (
                      <Text className="text-brand-700 text-xs font-bold mt-3">
                        Seleccionada: Metro {estacionElegida.nombre} · {estacionElegida.linea}
                      </Text>
                    ) : null}
                  </>
                ) : null}
                <PrimaryButton disabled={!estacionElegida} loading={locationBusy} onPress={calcularPuntoSeguro} className="mt-4">
                  Calcular estación intermedia
                </PrimaryButton>
                {sugerencia ? (
                  <PrimaryButton icon="send" onPress={compartirPuntoSeguro} className="mt-3">
                    Usar Metro {sugerencia.estacionSugerida.nombre}
                  </PrimaryButton>
                ) : null}
              </View>
            ) : null}

            {isLoading ? (
              <View className="items-center py-16"><ActivityIndicator color="#047857" /></View>
            ) : null}
            {!isLoading && mensajes.length === 0 ? (
              <EmptyState icon="comment-o" title="Sin mensajes" body="Envía el primer mensaje para coordinar." />
            ) : null}

            {mensajes.map((mensaje) => {
              const own = mensaje.emisor_id === usuarioId;
              if (mensaje.mens_tipo === 'SISTEMA') {
                return (
                  <View key={mensaje.mens_id} className="items-center my-3">
                    <Text className="bg-neutral-200 text-neutral-600 text-xs font-semibold px-4 py-2 rounded-full">
                      {mensaje.mens_contenido}
                    </Text>
                  </View>
                );
              }
              if (mensaje.mens_tipo === 'OFERTA' && mensaje.oferta) {
                return (
                  <View key={mensaje.mens_id} className={`mb-3 ${own ? 'items-end' : 'items-start'}`}>
                    <View className="w-[84%] bg-white border border-brand-100 rounded-3xl overflow-hidden">
                      {mensaje.oferta.imagen ? (
                        <Image source={{ uri: mensaje.oferta.imagen }} className="w-full h-36 bg-neutral-100" resizeMode="cover" />
                      ) : null}
                      <View className="p-4">
                        <Text className="text-brand-700 text-xs font-bold uppercase">Oferta de permuta</Text>
                        <Text className="text-neutral-950 text-base font-bold mt-1">{mensaje.oferta.nombre}</Text>
                        <Text className="text-neutral-500 text-xs mt-1">{mensaje.oferta.estado}</Text>
                        <Text className="text-neutral-800 font-bold mt-2">{formatPrice(mensaje.oferta.precio)}</Text>
                        <Text className="text-neutral-400 text-[11px] mt-2">{formatMessageDate(mensaje.mens_fech_envio)}</Text>
                      </View>
                    </View>
                  </View>
                );
              }
              return (
                <View key={mensaje.mens_id} className={`mb-3 ${own ? 'items-end' : 'items-start'}`}>
                  <View className={`max-w-[84%] rounded-3xl px-4 py-3 ${own ? 'bg-brand-700' : 'bg-white border border-neutral-100'}`}>
                    <Text className={`${own ? 'text-white' : 'text-neutral-800'} text-sm leading-5`}>{mensaje.mens_contenido}</Text>
                    <Text className={`${own ? 'text-brand-100' : 'text-neutral-400'} text-[11px] mt-2 font-semibold`}>
                      {formatMessageDate(mensaje.mens_fech_envio)}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>

        {conversacion?.conv_estado === 'FINALIZACION_PENDIENTE' ? (
          <View className="px-5 py-4 bg-amber-50 border-t border-amber-100">
            <Text className="text-neutral-950 font-bold">Confirmación de la permuta</Text>
            <Text className="text-neutral-600 text-xs leading-5 mt-1">
              {conversacion.puede_confirmar_finalizacion
                ? 'La otra persona propuso finalizar. Confirma que realizaron el intercambio.'
                : 'Tu propuesta fue enviada. Esperando la confirmación de la otra persona.'}
            </Text>
            {conversacion.puede_confirmar_finalizacion ? (
              <PrimaryButton icon="check-circle" loading={isWorking} onPress={handleConfirmar} className="mt-3">
                Confirmar permuta realizada
              </PrimaryButton>
            ) : null}
          </View>
        ) : null}

        {conversacion?.conv_estado === 'FINALIZADA' ? (
          <View className="px-5 py-4 bg-brand-50 border-t border-brand-100">
            <Text className="text-brand-900 font-bold">Permuta finalizada</Text>
            <Text className="text-neutral-600 text-xs leading-5 mt-1">
              Ambas publicaciones fueron retiradas. Ahora pueden valorar cómo resultó el intercambio.
            </Text>
            {conversacion.puede_valorar ? (
              <PrimaryButton icon="star" onPress={() => setShowRatingModal(true)} className="mt-3">
                Valorar a la otra persona
              </PrimaryButton>
            ) : null}
            {conversacion.usuario_ya_valoro ? (
              <PrimaryButton
                icon="trash"
                loading={isWorking}
                onPress={() => setShowDeleteConfirmation(true)}
                className="mt-3 bg-red-600"
              >
                Eliminar chat
              </PrimaryButton>
            ) : null}
          </View>
        ) : null}

        {esNegociando ? (
          <View className="px-5 pb-5 pt-3 border-t border-neutral-100">
            <View className="flex-row items-end">
              {conversacion?.puede_ofertar ? (
                <TouchableOpacity
                  className="w-12 h-12 rounded-2xl bg-brand-700 items-center justify-center mr-2"
                  onPress={abrirOfertas}
                  accessibilityLabel="Compartir una de mis permutas"
                >
                  <FontAwesome name="plus" size={17} color="white" />
                </TouchableOpacity>
              ) : null}
              <TextInput
                className="flex-1 bg-white border border-neutral-200 rounded-3xl px-4 py-3 min-h-12 max-h-28"
                value={contenido}
                onChangeText={setContenido}
                placeholder="Escribe un mensaje"
                multiline
                editable={!isWorking}
              />
              <PrimaryButton
                icon="send"
                iconOnly
                accessibilityLabel="Enviar mensaje"
                loading={isWorking}
                disabled={!contenido.trim()}
                onPress={handleEnviar}
                className="w-14 ml-2 px-0"
              />
            </View>
          </View>
        ) : null}
      </KeyboardAvoidingView>

      <Modal visible={showRatingModal} transparent animationType="slide" onRequestClose={() => setShowRatingModal(false)}>
        <View className="flex-1 bg-black/30 justify-end">
          <View className="bg-white rounded-t-3xl px-5 pt-5 pb-8">
            <View className="flex-row justify-between items-center">
              <View className="flex-1 pr-4">
                <Text className="text-neutral-950 text-xl font-bold">Valora a la otra persona</Text>
                <Text className="text-neutral-500 text-xs leading-5 mt-1">Tu opinión quedará asociada a esta permuta finalizada.</Text>
              </View>
              <TouchableOpacity onPress={() => setShowRatingModal(false)} accessibilityLabel="Cerrar valoración">
                <FontAwesome name="times" size={18} color="#525252" />
              </TouchableOpacity>
            </View>
            <View className="flex-row justify-center mt-6">
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setRating(star)}
                  className="px-2"
                  accessibilityLabel={`${star} ${star === 1 ? 'estrella' : 'estrellas'}`}
                >
                  <FontAwesome name={star <= rating ? 'star' : 'star-o'} size={34} color="#f59e0b" />
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              className="bg-neutral-50 border border-neutral-200 rounded-2xl px-4 py-3 min-h-28 mt-5"
              value={comment}
              onChangeText={setComment}
              placeholder="Cuenta brevemente cómo fue la permuta"
              maxLength={300}
              multiline
              textAlignVertical="top"
            />
            <Text className="text-neutral-400 text-xs text-right mt-1">{comment.length}/300</Text>
            <PrimaryButton
              icon="star"
              loading={isWorking}
              disabled={rating === 0 || !comment.trim()}
              onPress={handleValorar}
              className="mt-4"
            >
              Enviar valoración
            </PrimaryButton>
          </View>
        </View>
      </Modal>

      <Modal visible={showOfferSelector} transparent animationType="slide" onRequestClose={() => setShowOfferSelector(false)}>
        <View className="flex-1 bg-black/30 justify-end">
          <View className="bg-white rounded-t-3xl px-5 pt-5 pb-8 max-h-[75%]">
            <View className="flex-row justify-between items-center mb-4">
              <View>
                <Text className="text-neutral-950 text-xl font-bold">Compartir mi permuta</Text>
                <Text className="text-neutral-500 text-xs mt-1">La nueva selección reemplaza la oferta activa.</Text>
              </View>
              <TouchableOpacity onPress={() => setShowOfferSelector(false)}>
                <FontAwesome name="times" size={18} color="#525252" />
              </TouchableOpacity>
            </View>
            {isLoadingOffers ? <ActivityIndicator color="#047857" className="my-8" /> : null}
            {!isLoadingOffers && misPermutas.length === 0 ? (
              <EmptyState icon="inbox" title="No tienes permutas activas" body="Publica un producto para poder ofrecerlo." />
            ) : null}
            <ScrollView showsVerticalScrollIndicator={false}>
              {misPermutas.map(({ producto, publicacion }) => (
                <TouchableOpacity
                  key={producto.prod_id}
                  className="flex-row bg-neutral-50 border border-neutral-100 rounded-3xl p-3 mb-3"
                  onPress={() => elegirOferta(producto.prod_id)}
                  disabled={isWorking}
                >
                  {producto.prod_imagenes?.[0] ? (
                    <Image source={{ uri: producto.prod_imagenes[0] }} className="w-20 h-20 rounded-2xl bg-neutral-200" />
                  ) : (
                    <View className="w-20 h-20 rounded-2xl bg-neutral-200 items-center justify-center">
                      <FontAwesome name="image" size={18} color="#737373" />
                    </View>
                  )}
                  <View className="flex-1 ml-3 justify-center">
                    <Text className="text-neutral-950 font-bold">{producto.prod_nombre}</Text>
                    <Text className="text-neutral-500 text-xs mt-1">{publicacion.publ_titulo}</Text>
                    <Text className="text-brand-700 font-bold text-sm mt-2">{formatPrice(producto.prod_precio)}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showMenu} transparent animationType="fade" onRequestClose={() => setShowMenu(false)}>
        <View className="flex-1 items-center">
          <Pressable style={StyleSheet.absoluteFillObject} className="bg-black/20" onPress={() => setShowMenu(false)} />
          <View pointerEvents="box-none" className="w-full max-w-[480px] flex-1">
            <View className="absolute top-20 right-5 w-72 bg-white rounded-3xl p-2">
              {esInteresado && esNegociando ? (
                <TouchableOpacity className="flex-row items-center px-4 py-4" onPress={abrirPuntoSeguro}>
                  <FontAwesome name="map-marker" size={17} color="#047857" />
                  <Text className="text-neutral-900 font-bold ml-3">Proponer punto seguro</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity className="flex-row items-center px-4 py-4" onPress={() => { setShowMenu(false); cargarChat(); }}>
                <FontAwesome name="refresh" size={15} color="#525252" />
                <Text className="text-neutral-900 font-bold ml-3">Actualizar chat</Text>
              </TouchableOpacity>
              <TouchableOpacity className="flex-row items-center px-4 py-4" onPress={() => { setShowMenu(false); setShowDeleteConfirmation(true); }}>
                <FontAwesome name="trash" size={15} color="#dc2626" />
                <Text className="text-red-600 font-bold ml-3">Eliminar chat</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showDeleteConfirmation} transparent animationType="fade" onRequestClose={() => setShowDeleteConfirmation(false)}>
        <View className="flex-1 bg-black/30 items-center justify-center px-5">
          <View className="w-full max-w-md bg-white rounded-3xl p-5">
            <Text className="text-neutral-950 text-xl font-bold">¿Eliminar este chat?</Text>
            <Text className="text-neutral-500 text-sm leading-6 mt-2">
              Solo se ocultará para ti. La otra persona y el historial conservarán su copia.
            </Text>
            <PrimaryButton icon="trash" loading={isWorking} onPress={handleEliminar} className="mt-5 bg-red-600">
              Eliminar chat
            </PrimaryButton>
            <PrimaryButton variant="ghost" disabled={isWorking} onPress={() => setShowDeleteConfirmation(false)} className="mt-3">
              Cancelar
            </PrimaryButton>
          </View>
        </View>
      </Modal>
    </MainLayout>
  );
}
