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

import { EmptyState, InfoBanner, PrimaryButton } from '@/components/ui';
import MainLayout from '../../layouts/MainLayout';
import { useAuth } from '../../context/AuthContext';
import {
  ApiError,
  EstacionMetro,
  Producto,
  Publicacion,
  SugerenciaPuntoMedio,
  Usuario,
  eliminarConversacion,
  obtenerEstacionesMetro,
  obtenerProductos,
  obtenerPublicaciones,
  obtenerUsuarioPorId,
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

function nombreUsuario(usuario?: Usuario | null): string {
  if (!usuario) return 'Cargando persona';
  return `${usuario.usu_pri_nombre} ${usuario.usu_pri_apellido}`.trim() || 'Persona no disponible';
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

function formatMetroLine(line: string) {
  return line.toUpperCase().startsWith('L') ? `Línea ${line.replace(/^L/i, '')}` : line;
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
  const [participante, setParticipante] = useState<Usuario | null>(null);
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
  const [lineaMetroSeleccionada, setLineaMetroSeleccionada] = useState<string | null>(null);
  const [showLineasMetro, setShowLineasMetro] = useState(false);
  const [showEstacionesMetro, setShowEstacionesMetro] = useState(false);
  const [metroSearch, setMetroSearch] = useState('');
  const [sugerencia, setSugerencia] = useState<SugerenciaPuntoMedio | null>(null);
  const [locationBusy, setLocationBusy] = useState(false);

  const lineasMetro = useMemo(() => {
    const byLine = new Map<string, number>();
    estaciones.forEach((station) => {
      const line = station.linea || 'Otra línea';
      byLine.set(line, (byLine.get(line) ?? 0) + 1);
    });
    return [...byLine.entries()]
      .sort(([left], [right]) => left.localeCompare(right, 'es', { numeric: true }))
      .map(([line, count]) => ({ line, count }));
  }, [estaciones]);

  const estacionesLineaSeleccionada = useMemo(() => {
    if (!lineaMetroSeleccionada) return [];
    const query = normalizeSearch(metroSearch);
    return estaciones
      .filter((station) => (station.linea || 'Otra línea') === lineaMetroSeleccionada)
      .filter((station) => {
        if (!query) return true;
        return normalizeSearch(`${station.nombre} ${station.comuna ?? ''}`).includes(query);
      })
      .sort((left, right) => (
        (left.orden ?? Number.MAX_SAFE_INTEGER) - (right.orden ?? Number.MAX_SAFE_INTEGER)
        || left.nombre.localeCompare(right.nombre, 'es')
      ));
  }, [estaciones, lineaMetroSeleccionada, metroSearch]);

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
    if (!token || !conversacion?.otro_usuario_id) {
      setParticipante(null);
      return undefined;
    }

    let active = true;
    obtenerUsuarioPorId(conversacion.otro_usuario_id, token)
      .then((usuario) => {
        if (active) setParticipante(usuario);
      })
      .catch(() => {
        if (active) setParticipante(null);
      });

    return () => { active = false; };
  }, [conversacion?.otro_usuario_id, token]);

  useEffect(() => {
    if (mensajes.length === 0) return;
    const timeout = setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: !isLoading }), 0);
    return () => clearTimeout(timeout);
  }, [isLoading, mensajes.length]);

  const esInteresado = conversacion?.interesado_id === usuarioId;
  const esNegociando = conversacion?.conv_estado === 'NEGOCIANDO';
  const participanteReputacion = participante ? participante.usu_prom_rep.toFixed(1) : null;
  const participanteVerificado = Boolean(participante?.usu_identidad_verificada);

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
      setError(requestError instanceof ApiError ? requestError.message : 'No fue posible cargar tus publicaciones.');
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
    setError(null);
    setMetroSearch('');
    setLineaMetroSeleccionada(null);
    setShowLineasMetro(false);
    setShowEstacionesMetro(false);
    setEstacionElegida(null);
    setSugerencia(null);
    setProductoOriginal(null);
    setEstaciones([]);
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
    if (locationBusy) return;
    if (
      !productoOriginal
      || productoOriginal.prod_latitud_aprox == null
      || productoOriginal.prod_longitud_aprox == null
      || estacionElegida?.latitud == null
      || estacionElegida.longitud == null
    ) return;
    try {
      setError(null);
      setLocationBusy(true);
      const nuevaSugerencia = await sugerirMetroPuntoMedio({
        latitudOrigen: productoOriginal.prod_latitud_aprox,
        longitudOrigen: productoOriginal.prod_longitud_aprox,
        latitudDestino: estacionElegida.latitud,
        longitudDestino: estacionElegida.longitud,
      });
      setSugerencia(nuevaSugerencia);
    } catch {
      setError('No fue posible calcular la estación intermedia.');
    } finally {
      setLocationBusy(false);
    }
  };

  const compartirPuntoSeguro = () => {
    if (!sugerencia || !token) return;
    const station = sugerencia.estacionSugerida;
    const message = `Punto de encuentro seguro sugerido: Metro ${station.nombre} (${station.linea}).`;
    ejecutar(async () => {
      const sentMessage = await enviarMensajePermuta(conversacionId, usuarioId, message, token);
      setMensajes((current) => mergeMessages(current, [sentMessage]));
      setShowLineasMetro(false);
      setShowEstacionesMetro(false);
      setShowLocationPanel(false);
      setSugerencia(null);
      setEstacionElegida(null);
    });
  };

  const puedeProponerCierre = esNegociando && Boolean(conversacion?.puede_solicitar_finalizacion);
  const cargandoDatosPuntoSeguro = locationBusy && estaciones.length === 0;

  return (
    <MainLayout>
      <KeyboardAvoidingView className="flex-1 bg-neutral-50" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View className="px-4 pt-3 pb-3 bg-neutral-50 border-b border-neutral-100">
          <View className="flex-row items-center">
            <TouchableOpacity
              className="w-11 h-11 rounded-2xl bg-white border border-neutral-100 items-center justify-center mr-3"
              onPress={() => router.back()}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel="Volver a chats"
            >
              <FontAwesome name="chevron-left" size={14} color="#404040" />
            </TouchableOpacity>
            <View className="flex-1 pr-3">
              <View className="flex-row items-center">
                <Text className="text-neutral-950 text-base font-bold flex-1" numberOfLines={1}>{nombreUsuario(participante)}</Text>
                {participanteVerificado ? <FontAwesome name="check-circle" size={16} color="#047857" /> : null}
              </View>
              <View className="flex-row items-center mt-1">
                <FontAwesome name="star" size={12} color="#f59e0b" />
                <Text className="text-neutral-500 text-xs font-bold ml-1">{participanteReputacion ?? '0.0'}</Text>
                <Text className="text-neutral-400 text-xs mx-2">•</Text>
                <Text className="text-neutral-500 text-xs font-bold flex-1" numberOfLines={1}>{conversacion?.publ_titulo ?? 'Conversación'}</Text>
              </View>
            </View>
            <TouchableOpacity
              className="w-11 h-11 rounded-2xl bg-white border border-neutral-100 items-center justify-center"
              onPress={() => setShowMenu(true)}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel="Acciones del chat"
            >
              <FontAwesome name="ellipsis-v" size={17} color="#404040" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView ref={scrollViewRef} className="flex-1" contentContainerStyle={{ paddingBottom: 20 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View className="px-4 pt-3">
            {error ? <View className="mb-3"><InfoBanner icon="exclamation-circle" title="No se pudo completar" body={error} tone="red" /></View> : null}

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
                    <View className="w-[82%] bg-white border border-brand-100 rounded-2xl overflow-hidden">
                      {mensaje.oferta.imagen ? (
                        <Image source={{ uri: mensaje.oferta.imagen }} className="w-full h-32 bg-neutral-100" resizeMode="cover" />
                      ) : null}
                      <View className="p-3">
                        <Text className="text-brand-700 text-xs font-bold">Oferta de permuta</Text>
                        <Text className="text-neutral-950 text-base font-bold mt-1" numberOfLines={2}>{mensaje.oferta.nombre}</Text>
                        <Text className="text-neutral-500 text-xs mt-1">{mensaje.oferta.estado}</Text>
                        <View className="flex-row items-center justify-between mt-2">
                          <Text className="text-neutral-800 font-bold">{formatPrice(mensaje.oferta.precio)}</Text>
                          <Text className="text-neutral-400 text-[11px] font-semibold">{formatMessageDate(mensaje.mens_fech_envio)}</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                );
              }
              return (
                <View key={mensaje.mens_id} className={`mb-3 ${own ? 'items-end' : 'items-start'}`}>
                  <View className={`max-w-[82%] rounded-2xl px-4 py-3 ${own ? 'bg-brand-700' : 'bg-white border border-neutral-100'}`}>
                    <Text className={`${own ? 'text-white' : 'text-neutral-800'} text-[15px] leading-5`}>{mensaje.mens_contenido}</Text>
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
          <View className="px-4 py-3 bg-white border-t border-neutral-100">
            <View className="bg-amber-50 border border-amber-100 rounded-2xl p-3">
              <View className="flex-row items-start">
                <View className="w-9 h-9 rounded-xl bg-amber-100 items-center justify-center mr-3">
                  <FontAwesome name="clock-o" size={14} color="#d97706" />
                </View>
                <View className="flex-1">
                  <Text className="text-amber-950 text-sm font-bold">Confirmación pendiente</Text>
                  <Text className="text-amber-800 text-xs leading-4 mt-0.5">
                    {conversacion.puede_confirmar_finalizacion
                      ? 'La otra persona propuso finalizar. Confirma si el intercambio ya se realizó.'
                      : 'Tu propuesta fue enviada. Falta la confirmación de la otra persona.'}
                  </Text>
                </View>
              </View>
              {conversacion.puede_confirmar_finalizacion ? (
                <PrimaryButton icon="check-circle" loading={isWorking} onPress={handleConfirmar} className="mt-3 h-12">
                  Confirmar intercambio
                </PrimaryButton>
              ) : null}
            </View>
          </View>
        ) : null}

        {conversacion?.conv_estado === 'FINALIZADA' ? (
          <View className="px-4 py-3 bg-white border-t border-neutral-100">
            <View className="bg-brand-50 border border-brand-100 rounded-2xl p-3">
              <View className="flex-row items-start">
                <View className="w-9 h-9 rounded-xl bg-brand-100 items-center justify-center mr-3">
                  <FontAwesome name="check" size={14} color="#047857" />
                </View>
                <View className="flex-1">
                  <Text className="text-brand-900 text-sm font-bold">Intercambio finalizado</Text>
                  <Text className="text-brand-800 text-xs leading-4 mt-0.5">Ambas publicaciones fueron retiradas.</Text>
                </View>
              </View>
              {conversacion.puede_valorar ? (
                <PrimaryButton icon="star" onPress={() => setShowRatingModal(true)} className="mt-3 h-12">
                  Valorar a la otra persona
                </PrimaryButton>
              ) : null}
            </View>
          </View>
        ) : null}

        {puedeProponerCierre ? (
          <View className="px-4 pt-3 pb-2 bg-white border-t border-neutral-100">
            <View className="bg-brand-50 border border-brand-100 rounded-2xl p-3 flex-row items-center">
              <View className="w-9 h-9 rounded-xl bg-brand-100 items-center justify-center mr-3">
                <FontAwesome name="check" size={14} color="#047857" />
              </View>
              <View className="flex-1 pr-3">
                <Text className="text-brand-900 text-sm font-bold">Listo para cerrar</Text>
                <Text className="text-brand-800 text-xs leading-4 mt-0.5">Ya pueden proponer el cierre cuando estén de acuerdo.</Text>
              </View>
              <TouchableOpacity
                className={`h-10 px-4 rounded-2xl flex-row items-center justify-center ${isWorking ? 'bg-brand-400' : 'bg-brand-700'}`}
                onPress={handleSolicitar}
                disabled={isWorking}
                accessibilityRole="button"
                accessibilityLabel="Proponer cierre"
                activeOpacity={0.85}
              >
                {isWorking ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <FontAwesome name="check" size={13} color="#fff" />
                    <Text className="text-white text-sm font-bold ml-2">Proponer</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {esNegociando ? (
          <View className="px-4 pb-5 pt-3 bg-white border-t border-neutral-100">
            <View className="flex-row items-end">
              {conversacion?.puede_ofertar ? (
                <TouchableOpacity
                  className="h-12 px-3 rounded-2xl bg-brand-50 border border-brand-100 items-center justify-center mr-2"
                  onPress={abrirOfertas}
                  accessibilityRole="button"
                  accessibilityLabel="Compartir una publicación"
                  activeOpacity={0.8}
                >
                  <FontAwesome name="cube" size={14} color="#047857" />
                  <Text className="text-brand-700 text-[11px] font-bold mt-0.5">Oferta</Text>
                </TouchableOpacity>
              ) : null}
              <TextInput
                className="flex-1 bg-neutral-50 border border-neutral-200 rounded-2xl px-4 py-3 min-h-12 max-h-28 text-neutral-900 text-[15px]"
                value={contenido}
                onChangeText={setContenido}
                placeholder="Mensaje sobre la permuta"
                placeholderTextColor="#a3a3a3"
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
                className="w-12 h-12 ml-2 px-0 rounded-2xl"
              />
            </View>
          </View>
        ) : null}
      </KeyboardAvoidingView>

      <Modal visible={showLocationPanel} transparent animationType="slide" onRequestClose={() => setShowLocationPanel(false)}>
        <View className="flex-1 bg-black/30 justify-end">
          <View className="bg-white rounded-t-3xl px-5 pt-5 pb-8 max-h-[82%]">
            <View className="flex-row justify-between items-start mb-4">
              <View className="flex-1 pr-4">
                <Text className="text-neutral-950 text-xl font-bold">Punto seguro</Text>
                <Text className="text-neutral-500 text-sm leading-5 mt-1">Elige tu Metro cercano y calculamos una estación intermedia.</Text>
              </View>
              <TouchableOpacity
                className="w-10 h-10 rounded-2xl bg-neutral-100 items-center justify-center"
                onPress={() => setShowLocationPanel(false)}
                accessibilityLabel="Cerrar punto seguro"
              >
                <FontAwesome name="times" size={17} color="#525252" />
              </TouchableOpacity>
            </View>

            {error ? <InfoBanner icon="exclamation-circle" title="No se pudo completar" body={error} tone="red" /> : null}

            {cargandoDatosPuntoSeguro ? (
              <View className="items-center py-12">
                <ActivityIndicator color="#047857" />
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <View className="mb-3">
                  <Text className="text-neutral-800 text-sm font-bold mb-2">Línea de Metro</Text>
                  <TouchableOpacity
                    className="h-14 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 flex-row items-center justify-between"
                    onPress={() => {
                      setShowLineasMetro((current) => !current);
                      setShowEstacionesMetro(false);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Seleccionar línea de Metro"
                    accessibilityState={{ expanded: showLineasMetro }}
                  >
                    <View className="flex-row items-center flex-1 pr-3">
                      <View
                        className="w-3 h-3 rounded-full mr-3"
                        style={{ backgroundColor: lineaMetroSeleccionada ? metroLineColor(lineaMetroSeleccionada) : '#d4d4d4' }}
                      />
                      <Text className={`text-sm font-bold ${lineaMetroSeleccionada ? 'text-neutral-950' : 'text-neutral-400'}`} numberOfLines={1}>
                        {lineaMetroSeleccionada ? formatMetroLine(lineaMetroSeleccionada) : 'Elegir línea'}
                      </Text>
                    </View>
                    <FontAwesome name={showLineasMetro ? 'chevron-up' : 'chevron-down'} size={13} color="#737373" />
                  </TouchableOpacity>

                  {showLineasMetro ? (
                    <View className="mt-2 rounded-2xl border border-neutral-100 bg-white overflow-hidden">
                      <ScrollView style={{ maxHeight: 220 }} nestedScrollEnabled showsVerticalScrollIndicator keyboardShouldPersistTaps="handled">
                        {lineasMetro.map(({ line, count }) => {
                          const selected = line === lineaMetroSeleccionada;
                          return (
                            <TouchableOpacity
                              key={line}
                              className={`px-4 py-3 flex-row items-center border-b border-neutral-100 ${selected ? 'bg-brand-50' : 'bg-white'}`}
                              onPress={() => {
                                setLineaMetroSeleccionada(line);
                                setShowLineasMetro(false);
                                setShowEstacionesMetro(true);
                                setMetroSearch('');
                                setEstacionElegida(null);
                                setSugerencia(null);
                              }}
                              accessibilityRole="button"
                              accessibilityState={{ selected }}
                            >
                              <View className="w-3 h-3 rounded-full mr-3" style={{ backgroundColor: metroLineColor(line) }} />
                              <Text className={`flex-1 text-sm font-bold ${selected ? 'text-brand-800' : 'text-neutral-800'}`}>
                                {formatMetroLine(line)}
                              </Text>
                              <Text className="text-neutral-400 text-xs font-bold mr-3">{count}</Text>
                              {selected ? <FontAwesome name="check" size={13} color="#047857" /> : null}
                            </TouchableOpacity>
                          );
                        })}
                        {lineasMetro.length === 0 ? (
                          <Text className="text-neutral-500 text-sm text-center py-5">No hay líneas cargadas.</Text>
                        ) : null}
                      </ScrollView>
                    </View>
                  ) : null}
                </View>

                <View className="mb-3">
                  <Text className="text-neutral-800 text-sm font-bold mb-2">Tu estación cercana</Text>
                  <TouchableOpacity
                    className={`h-14 rounded-2xl border px-4 flex-row items-center justify-between ${lineaMetroSeleccionada ? 'bg-neutral-50 border-neutral-200' : 'bg-neutral-100 border-neutral-100'}`}
                    onPress={() => {
                      if (!lineaMetroSeleccionada) return;
                      setShowEstacionesMetro((current) => !current);
                      setShowLineasMetro(false);
                    }}
                    disabled={!lineaMetroSeleccionada}
                    accessibilityRole="button"
                    accessibilityLabel="Seleccionar estación de Metro"
                    accessibilityState={{ expanded: showEstacionesMetro, disabled: !lineaMetroSeleccionada }}
                  >
                    <Text className={`text-sm font-bold flex-1 pr-3 ${estacionElegida ? 'text-neutral-950' : 'text-neutral-400'}`} numberOfLines={1}>
                      {estacionElegida ? `Metro ${estacionElegida.nombre}` : lineaMetroSeleccionada ? 'Elegir estación' : 'Primero elige una línea'}
                    </Text>
                    <FontAwesome name={showEstacionesMetro ? 'chevron-up' : 'chevron-down'} size={13} color="#737373" />
                  </TouchableOpacity>

                  {showEstacionesMetro && lineaMetroSeleccionada ? (
                    <View className="mt-2 rounded-2xl border border-neutral-100 bg-white p-3">
                      <TextInput
                        className="bg-neutral-50 border border-neutral-200 rounded-2xl px-4 h-12"
                        value={metroSearch}
                        onChangeText={setMetroSearch}
                        placeholder="Buscar estación"
                        accessibilityLabel="Buscar estación de Metro"
                      />
                      <ScrollView
                        className="mt-3"
                        style={{ maxHeight: 240 }}
                        nestedScrollEnabled
                        showsVerticalScrollIndicator
                        keyboardShouldPersistTaps="handled"
                      >
                        {estacionesLineaSeleccionada.map((station) => {
                          const selected = estacionElegida?.id === station.id;
                          return (
                            <TouchableOpacity
                              key={station.id}
                              className={`flex-row items-center rounded-2xl border px-3 py-3 mb-2 ${selected ? 'bg-brand-50 border-brand-500' : 'bg-white border-neutral-100'}`}
                              onPress={() => {
                                setEstacionElegida(station);
                                setShowEstacionesMetro(false);
                                setSugerencia(null);
                              }}
                              accessibilityRole="button"
                              accessibilityState={{ selected }}
                            >
                              <View className="flex-1">
                                <Text className={`text-sm font-bold ${selected ? 'text-brand-800' : 'text-neutral-800'}`} numberOfLines={1}>
                                  {station.nombre}
                                </Text>
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
                        {estacionesLineaSeleccionada.length === 0 ? (
                          <Text className="text-neutral-500 text-sm text-center py-5">No encontramos estaciones.</Text>
                        ) : null}
                      </ScrollView>
                    </View>
                  ) : null}
                </View>

                {sugerencia ? (
                  <View className="bg-brand-50 border border-brand-100 rounded-2xl px-4 py-3 mt-1">
                    <Text className="text-brand-900 text-sm font-bold" numberOfLines={1}>Metro {sugerencia.estacionSugerida.nombre}</Text>
                    <Text className="text-brand-800 text-xs mt-1" numberOfLines={1}>
                      {sugerencia.estacionSugerida.linea}
                    </Text>
                  </View>
                ) : null}

                <PrimaryButton
                  disabled={!estacionElegida || locationBusy}
                  loading={locationBusy && estaciones.length > 0}
                  onPress={calcularPuntoSeguro}
                  className="mt-4"
                >
                  {sugerencia ? 'Recalcular estación' : 'Calcular estación'}
                </PrimaryButton>
                {sugerencia ? (
                  <PrimaryButton icon="send" loading={isWorking} disabled={isWorking} onPress={compartirPuntoSeguro} className="mt-3">
                    Compartir en el chat
                  </PrimaryButton>
                ) : null}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <Modal visible={showRatingModal} transparent animationType="slide" onRequestClose={() => setShowRatingModal(false)}>
        <View className="flex-1 bg-black/30 justify-end">
          <View className="bg-white rounded-t-3xl px-5 pt-5 pb-8">
            <View className="flex-row justify-between items-center">
              <View className="flex-1 pr-4">
                <Text className="text-neutral-950 text-xl font-bold">Valora a la otra persona</Text>
                <Text className="text-neutral-500 text-xs leading-5 mt-1">Tu opinión quedará asociada a este intercambio.</Text>
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
              placeholder="Cuenta brevemente cómo fue el intercambio"
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
                <Text className="text-neutral-950 text-xl font-bold">Compartir publicación</Text>
                <Text className="text-neutral-500 text-xs mt-1">La nueva selección reemplaza la oferta activa.</Text>
              </View>
              <TouchableOpacity onPress={() => setShowOfferSelector(false)}>
                <FontAwesome name="times" size={18} color="#525252" />
              </TouchableOpacity>
            </View>
            {isLoadingOffers ? <ActivityIndicator color="#047857" className="my-8" /> : null}
            {!isLoadingOffers && misPermutas.length === 0 ? (
              <EmptyState icon="inbox" title="No tienes publicaciones activas" body="Publica un producto para poder ofrecerlo." />
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

      <Modal visible={showMenu} transparent animationType="slide" onRequestClose={() => setShowMenu(false)}>
        <View className="flex-1 justify-end">
          <Pressable style={StyleSheet.absoluteFillObject} className="bg-black/25" onPress={() => setShowMenu(false)} />
          <View className="w-full max-w-md self-center bg-white rounded-t-3xl px-5 pt-4 pb-8">
            <View className="w-12 h-1.5 rounded-full bg-neutral-200 self-center mb-5" />
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-1 pr-4">
                <Text className="text-neutral-950 text-xl font-bold">Acciones del chat</Text>
                <Text className="text-neutral-500 text-xs mt-1" numberOfLines={1}>{conversacion?.publ_titulo ?? 'Permuta'}</Text>
              </View>
              <TouchableOpacity className="w-10 h-10 rounded-2xl bg-neutral-100 items-center justify-center" onPress={() => setShowMenu(false)} accessibilityRole="button" accessibilityLabel="Cerrar acciones del chat">
                <FontAwesome name="times" size={16} color="#525252" />
              </TouchableOpacity>
            </View>

            {esInteresado && esNegociando ? (
              <TouchableOpacity className="flex-row items-center py-4 border-b border-neutral-100" onPress={abrirPuntoSeguro} activeOpacity={0.8} accessibilityRole="button">
                <View className="w-10 h-10 rounded-2xl bg-brand-50 border border-brand-100 items-center justify-center mr-3">
                  <FontAwesome name="map-marker" size={17} color="#047857" />
                </View>
                <View className="flex-1">
                  <Text className="text-neutral-950 font-bold">Proponer punto seguro</Text>
                  <Text className="text-neutral-500 text-xs mt-0.5">Sugiere una estación intermedia.</Text>
                </View>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity className="flex-row items-center py-4 border-b border-neutral-100" onPress={() => { setShowMenu(false); cargarChat(); }} activeOpacity={0.8} accessibilityRole="button">
              <View className="w-10 h-10 rounded-2xl bg-neutral-100 items-center justify-center mr-3">
                <FontAwesome name="refresh" size={15} color="#525252" />
              </View>
              <View className="flex-1">
                <Text className="text-neutral-950 font-bold">Actualizar chat</Text>
                <Text className="text-neutral-500 text-xs mt-0.5">Trae los mensajes más recientes.</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity className="flex-row items-center py-4" onPress={() => { setShowMenu(false); setShowDeleteConfirmation(true); }} activeOpacity={0.8} accessibilityRole="button">
              <View className="w-10 h-10 rounded-2xl bg-red-50 border border-red-100 items-center justify-center mr-3">
                <FontAwesome name="trash" size={15} color="#dc2626" />
              </View>
              <View className="flex-1">
                <Text className="text-red-600 font-bold">Eliminar chat</Text>
                <Text className="text-neutral-500 text-xs mt-0.5">Lo ocultará solo de tu lista.</Text>
              </View>
            </TouchableOpacity>
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
