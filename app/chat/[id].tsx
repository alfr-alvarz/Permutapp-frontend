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
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  const [showLocationPanel, setShowLocationPanel] = useState(false);
  const [productoOriginal, setProductoOriginal] = useState<Producto | null>(null);
  const [estaciones, setEstaciones] = useState<EstacionMetro[]>([]);
  const [estacionElegida, setEstacionElegida] = useState<EstacionMetro | null>(null);
  const [sugerencia, setSugerencia] = useState<SugerenciaPuntoMedio | null>(null);
  const [locationBusy, setLocationBusy] = useState(false);

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

            {conversacion ? (
              <View className="bg-white border border-neutral-100 rounded-3xl p-5 mb-4">
                {conversacion.conv_estado === 'NEGOCIANDO' ? (
                  <>
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
                  </>
                ) : null}

                {conversacion.conv_estado === 'FINALIZACION_PENDIENTE' ? (
                  <>
                    <Text className="text-neutral-950 text-lg font-bold">Confirmación pendiente</Text>
                    <Text className="text-neutral-500 text-sm leading-5 mt-2">
                      {conversacion.puede_confirmar_finalizacion
                        ? 'La otra persona confirmó la entrega. Confirma para retirar ambas publicaciones.'
                        : 'Esperando que la otra persona confirme la permuta.'}
                    </Text>
                    {conversacion.puede_confirmar_finalizacion ? (
                      <PrimaryButton icon="check-circle" loading={isWorking} onPress={handleConfirmar} className="mt-4">
                        Confirmar permuta
                      </PrimaryButton>
                    ) : null}
                  </>
                ) : null}

                {conversacion.conv_estado === 'FINALIZADA' ? (
                  <>
                    <Text className="text-brand-800 text-lg font-bold">Permuta finalizada</Text>
                    <Text className="text-neutral-500 text-sm leading-5 mt-2">
                      Las dos publicaciones fueron retiradas del catálogo y el historial se conserva.
                    </Text>
                    {conversacion.puede_valorar ? (
                      <View className="mt-4">
                        <Text className="text-neutral-900 font-bold">Valora a la otra persona</Text>
                        <View className="flex-row mt-3">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <TouchableOpacity key={star} onPress={() => setRating(star)} className="mr-3">
                              <FontAwesome name={star <= rating ? 'star' : 'star-o'} size={28} color="#f59e0b" />
                            </TouchableOpacity>
                          ))}
                        </View>
                        <TextInput
                          className="bg-neutral-50 border border-neutral-200 rounded-2xl px-4 py-3 min-h-24 mt-3"
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
                          className="mt-3"
                        >
                          Enviar valoración
                        </PrimaryButton>
                      </View>
                    ) : null}
                    {conversacion.usuario_ya_valoro ? (
                      <PrimaryButton
                        icon="trash"
                        loading={isWorking}
                        onPress={() => setShowDeleteConfirmation(true)}
                        className="mt-4 bg-red-600"
                      >
                        Eliminar chat
                      </PrimaryButton>
                    ) : null}
                  </>
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
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3">
                  {estaciones.map((station) => (
                    <TouchableOpacity
                      key={station.id}
                      className={`mr-2 px-3 h-10 rounded-2xl border items-center justify-center ${estacionElegida?.id === station.id ? 'bg-brand-700 border-brand-700' : 'border-neutral-200'}`}
                      onPress={() => { setEstacionElegida(station); setSugerencia(null); }}
                    >
                      <Text className={`text-xs font-bold ${estacionElegida?.id === station.id ? 'text-white' : 'text-neutral-700'}`}>
                        {station.nombre}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
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

        <View className="px-5 pb-5 pt-3 border-t border-neutral-100">
          {esNegociando ? (
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
          ) : (
            <Text className="text-neutral-500 text-sm text-center">La conversación está cerrada para nuevos mensajes.</Text>
          )}
        </View>
      </KeyboardAvoidingView>

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
