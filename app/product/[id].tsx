import { ActivityIndicator, Image, ScrollView, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import type { DimensionValue, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { Href, useLocalSearchParams, useRouter } from 'expo-router';
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { EmptyState, InfoBanner, PrimaryButton } from '@/components/ui';
import {
  ApiError,
  EstacionMetro,
  Producto,
  Publicacion,
  Usuario,
  encontrarEstacionMetroPorCoordenadas,
  iniciarConversacion,
  obtenerEstacionesMetro,
  obtenerProductoPorId,
  obtenerPublicacionPorId,
  obtenerUsuarioPorId,
} from '../../services/api';
import RequireAuth from '../../components/RequireAuth';
import { useAuth } from '../../context/AuthContext';
import MainLayout from '../../layouts/MainLayout';

function LoadingLine({ width = '100%', height = 16 }: { width?: DimensionValue; height?: number }) {
  return (
    <View
      className="rounded-full bg-neutral-100"
      style={{ width, height }}
    />
  );
}

function LoadingCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="bg-white border border-neutral-100 rounded-2xl p-5 mb-4">
      <Text className="text-neutral-950 text-xl font-bold mb-4">{title}</Text>
      {children}
    </View>
  );
}

function ProductDetailLoading() {
  return (
    <>
      <View className="h-72 rounded-2xl bg-neutral-100 border border-neutral-100 overflow-hidden mb-4" />

      <View className="bg-white border border-neutral-100 rounded-2xl p-5 mb-4">
        <LoadingLine width="68%" height={34} />
        <View className="mt-4">
          <LoadingLine width="82%" />
        </View>
        <View className="flex-row gap-2 mt-5">
          <LoadingLine width={112} height={34} />
          <LoadingLine width={84} height={34} />
        </View>
      </View>

      <View className="bg-white border border-neutral-100 rounded-2xl p-4 mb-4">
        <Text className="text-neutral-500 text-sm font-bold mb-3">Valor referencial</Text>
        <LoadingLine width="58%" height={28} />
      </View>

      <LoadingCard title="Descripción">
        <LoadingLine width="92%" />
        <View className="mt-3"><LoadingLine width="74%" /></View>
      </LoadingCard>

      <LoadingCard title="Ubicación">
        <LoadingLine width="54%" height={24} />
        <View className="mt-3"><LoadingLine width="44%" height={34} /></View>
        <View className="mt-3"><LoadingLine width="70%" /></View>
      </LoadingCard>

    </>
  );
}

function nombreVendedor(vendedor: Usuario): string {
  return `${vendedor.usu_pri_nombre} ${vendedor.usu_pri_apellido}`.trim();
}

function formatearNombreMetro(nombre: string): string {
  return nombre.replace(/\bNunoa\b/g, 'Ñuñoa').replace(/\bnunoa\b/g, 'ñuñoa');
}

function esReferenciaMetroAutomatica(referencia?: string | null): boolean {
  return Boolean(referencia?.trim().match(/^cerca de metro .+ \([^)]+\)$/i));
}

export default function ProductDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const idProducto = useMemo(() => Number(id), [id]);
  const { user, token } = useAuth();
  const [producto, setProducto] = useState<Producto | null>(null);
  const [publicacion, setPublicacion] = useState<Publicacion | null>(null);
  const [vendedor, setVendedor] = useState<Usuario | null>(null);
  const [estacionMetro, setEstacionMetro] = useState<EstacionMetro | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [publicacionError, setPublicacionError] = useState<string | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [galleryWidth, setGalleryWidth] = useState(0);
  const { width: windowWidth } = useWindowDimensions();
  const galleryScrollRef = useRef<ScrollView | null>(null);
  const productImages = useMemo(
    () => (producto?.prod_imagenes ?? []).filter((imagen) => Boolean(imagen)),
    [producto?.prod_imagenes],
  );
  const fallbackGalleryWidth = Math.max(Math.min(windowWidth, 448) - 40, 1);
  const activeGalleryWidth = galleryWidth || fallbackGalleryWidth;

  useEffect(() => {
    let mounted = true;

    async function cargarDetalle() {
      if (!Number.isInteger(idProducto) || idProducto <= 0) {
        setError('Producto inválido.');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setProducto(null);
        setPublicacion(null);
        setVendedor(null);
        setEstacionMetro(null);
        setError(null);
        setPublicacionError(null);
        setChatError(null);
        const [data, estaciones] = await Promise.all([
          obtenerProductoPorId(idProducto),
          obtenerEstacionesMetro().catch(() => []),
        ]);
        if (mounted) {
          setProducto(data);
          setEstacionMetro(encontrarEstacionMetroPorCoordenadas(
            estaciones,
            data.prod_latitud_aprox,
            data.prod_longitud_aprox,
          ));
          setError(null);
          setPublicacionError(null);
        }

        try {
          const detallePublicacion = await obtenerPublicacionPorId(data.publ_id);
          if (mounted) setPublicacion(detallePublicacion);

          try {
            const detalleVendedor = await obtenerUsuarioPorId(detallePublicacion.publ_autor_id, token ?? undefined);
            if (mounted) setVendedor(detalleVendedor);
          } catch {
            if (mounted) setVendedor(null);
          }
        } catch {
          if (mounted) {
            setPublicacion(null);
            setVendedor(null);
            setPublicacionError('La publicación asociada no está disponible.');
          }
        }
      } catch {
        if (mounted) {
          setProducto(null);
          setPublicacion(null);
          setVendedor(null);
          setEstacionMetro(null);
          setPublicacionError(null);
          setError('No fue posible cargar el detalle del producto.');
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    cargarDetalle();
    return () => { mounted = false; };
  }, [idProducto, token]);

  useEffect(() => {
    setSelectedImageIndex(0);
    galleryScrollRef.current?.scrollTo({ x: 0, animated: false });
  }, [producto?.prod_id]);

  const handleProponerPermuta = async () => {
    if (!producto) return;

    if (!publicacion) {
      setChatError('No se puede iniciar una permuta sin la publicación asociada.');
      return;
    }

    if (!user || !token) {
      router.push('/login');
      return;
    }

    try {
      setIsCreatingChat(true);
      setChatError(null);
      const conversacion = await iniciarConversacion({
        publ_id: producto.publ_id,
        prod_id: producto.prod_id,
        interesado_id: Number(user.id),
        mensaje_inicial: `Hola, me interesa ${producto.prod_nombre}. ¿Te gustaría coordinar una permuta?`,
      }, token);
      router.push(`/chat/${conversacion.conv_id}` as Href);
    } catch (err) {
      setChatError(err instanceof ApiError ? err.message : 'No fue posible iniciar la conversación.');
    } finally {
      setIsCreatingChat(false);
    }
  };

  const fechaPublicacion = publicacion?.publ_fech_creacion
    ? new Date(publicacion.publ_fech_creacion).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })
    : null;

  const esMiPublicacion = Boolean(user && publicacion && Number(user.id) === publicacion.publ_autor_id);
  const vendedorNoVerificado = Boolean(vendedor && !vendedor.usu_identidad_verificada && !esMiPublicacion);
  const vendedorVerificado = Boolean(vendedor?.usu_identidad_verificada);
  const isResolviendoPublicacion = Boolean(producto && isLoading && !publicacionError);
  const sellerName = vendedor
    ? nombreVendedor(vendedor)
    : isResolviendoPublicacion || isLoading
      ? 'Cargando vendedor'
      : 'Vendedor no disponible';
  const vendedorReputacion = vendedor ? vendedor.usu_prom_rep.toFixed(1) : null;
  const estacionMetroNombre = estacionMetro ? formatearNombreMetro(estacionMetro.nombre) : null;
  const ubicacionReferenciaVisible = producto?.prod_ubicacion_referencia && !esReferenciaMetroAutomatica(producto.prod_ubicacion_referencia)
    ? producto.prod_ubicacion_referencia
    : null;

  const handleSelectImage = (index: number) => {
    setSelectedImageIndex(index);
    galleryScrollRef.current?.scrollTo({
      x: activeGalleryWidth * index,
      animated: true,
    });
  };

  const handleGalleryScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / activeGalleryWidth);
    const boundedIndex = Math.max(0, Math.min(nextIndex, productImages.length - 1));
    setSelectedImageIndex((currentIndex) => (currentIndex === boundedIndex ? currentIndex : boundedIndex));
  };

  return (
    <MainLayout>
      <ScrollView className="flex-1 bg-neutral-50" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 36 }} stickyHeaderIndices={[0]}>
        <View className="px-5 pt-5 pb-4 bg-neutral-50 flex-row items-center">
          <TouchableOpacity className="w-11 h-11 rounded-2xl bg-white border border-neutral-100 items-center justify-center mr-3" onPress={() => router.back()} activeOpacity={0.75}>
            <FontAwesome name="chevron-left" size={14} color="#404040" />
          </TouchableOpacity>
          <View className="flex-1 bg-white border border-neutral-100 rounded-2xl px-4 h-14 justify-center">
            {producto ? (
              <>
                <View className="flex-row items-center">
                  <Text className="text-neutral-950 text-base font-bold flex-1" numberOfLines={1}>{sellerName}</Text>
                  {vendedorVerificado ? <FontAwesome name="check-circle" size={16} color="#047857" /> : null}
                </View>
                <View className="flex-row items-center mt-0.5">
                  <FontAwesome name="star" size={12} color="#f59e0b" />
                  <Text className="text-neutral-500 text-xs font-bold ml-1">{vendedorReputacion ?? 'Cargando reputación'}</Text>
                </View>
              </>
            ) : (
              <>
                <LoadingLine width="62%" height={18} />
                <View className="mt-2"><LoadingLine width="34%" height={12} /></View>
              </>
            )}
          </View>
        </View>

        <View className="px-5 pb-4">
          {isLoading && !producto ? <ProductDetailLoading /> : null}

          {error ? <InfoBanner icon="exclamation-circle" title="Detalle no disponible" body={error} tone="red" /> : null}

          {producto ? (
            <>
              <View
                className="h-72 rounded-2xl bg-teal-50 items-center justify-center border border-teal-100 overflow-hidden mb-4"
                onLayout={(event) => {
                  const nextWidth = Math.round(event.nativeEvent.layout.width);
                  setGalleryWidth((currentWidth) => (currentWidth === nextWidth ? currentWidth : nextWidth));
                }}
              >
                {productImages.length > 0 ? (
                  <ScrollView
                    ref={galleryScrollRef}
                    horizontal
                    pagingEnabled
                    scrollEnabled={productImages.length > 1}
                    showsHorizontalScrollIndicator={false}
                    onScroll={handleGalleryScrollEnd}
                    onMomentumScrollEnd={handleGalleryScrollEnd}
                    scrollEventThrottle={16}
                    className="w-full h-full"
                  >
                    {productImages.map((imagen, index) => (
                      <View key={`${imagen}-${index}`} className="h-full bg-neutral-100" style={{ width: activeGalleryWidth }}>
                        <Image source={{ uri: imagen }} className="w-full h-full" resizeMode="cover" />
                      </View>
                    ))}
                  </ScrollView>
                ) : (
                  <View className="w-28 h-28 rounded-2xl bg-white border border-teal-100 items-center justify-center">
                    <FontAwesome name="cube" size={64} color="#0f766e" />
                  </View>
                )}
                {productImages.length > 1 ? (
                  <View className="absolute right-3 bottom-3 rounded-full bg-black/60 px-2.5 py-1">
                    <Text className="text-white text-xs font-bold">{selectedImageIndex + 1}/{productImages.length}</Text>
                  </View>
                ) : null}
              </View>

              {productImages.length > 1 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4" contentContainerStyle={{ paddingRight: 12 }}>
                  {productImages.map((imagen, index) => {
                    const isSelected = selectedImageIndex === index;
                    return (
                      <TouchableOpacity
                        key={`${imagen}-${index}`}
                        className={`w-20 h-20 rounded-2xl overflow-hidden mr-3 bg-neutral-100 ${isSelected ? 'border-2 border-brand-700' : 'border border-neutral-100'}`}
                        onPress={() => handleSelectImage(index)}
                        activeOpacity={0.82}
                        accessibilityRole="button"
                        accessibilityLabel={`Ver foto ${index + 1} de ${productImages.length}`}
                      >
                        <Image source={{ uri: imagen }} className="w-full h-full" resizeMode="cover" />
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              ) : null}

              <View className="bg-white border border-neutral-100 rounded-2xl p-5 mb-4">
                <Text className="text-3xl font-bold text-neutral-950 leading-10">{producto.prod_nombre}</Text>
                {publicacion ? <Text className="text-neutral-500 text-base leading-6 mt-2" numberOfLines={2}>{publicacion.publ_titulo}</Text> : null}
                {!publicacion && isResolviendoPublicacion ? <View className="mt-3"><LoadingLine width="76%" /></View> : null}
                <View className="flex-row items-center flex-wrap mt-4 gap-2">
                  <View className="bg-brand-50 border border-brand-100 rounded-full px-3 py-1.5">
                    <Text className="text-brand-700 text-sm font-bold">{producto.prod_est}</Text>
                  </View>
                  {fechaPublicacion ? (
                    <View className="bg-neutral-100 rounded-full px-3 py-1.5">
                      <Text className="text-neutral-600 text-sm font-bold">{fechaPublicacion}</Text>
                    </View>
                  ) : null}
                </View>
              </View>

              <View className="bg-white border border-neutral-100 rounded-2xl p-4 mb-4">
                <Text className="text-neutral-950 text-xl font-bold mb-2">Valor referencial</Text>
                <Text className="text-neutral-950 text-2xl font-bold">${producto.prod_precio.toLocaleString('es-CL')}</Text>
              </View>

              {publicacion || isResolviendoPublicacion ? (
                <View className="bg-white border border-neutral-100 rounded-2xl p-5 mb-4">
                  <Text className="text-neutral-950 text-xl font-bold mb-2">Descripción</Text>
                  {publicacion ? (
                    <Text className="text-neutral-700 text-base leading-6" numberOfLines={5}>
                      {publicacion.publ_descripcion || 'Este producto no tiene descripción disponible.'}
                    </Text>
                  ) : (
                    <>
                      <LoadingLine width="92%" />
                      <View className="mt-3"><LoadingLine width="74%" /></View>
                    </>
                  )}
                </View>
              ) : null}

              {producto.prod_ubicacion_comuna || ubicacionReferenciaVisible || estacionMetro ? (
                <View className="bg-white border border-neutral-100 rounded-2xl p-5 mb-4">
                  <Text className="text-neutral-950 text-xl font-bold mb-3">Ubicación</Text>
                  <View className="flex-row items-start">
                    <FontAwesome name="map-marker" size={18} color="#047857" />
                    <View className="flex-1 ml-3">
                      {producto.prod_ubicacion_comuna ? <Text className="text-neutral-950 text-lg font-bold">{producto.prod_ubicacion_comuna}</Text> : null}
                      {estacionMetro ? (
                        <View className="bg-brand-50 border border-brand-100 rounded-2xl px-3 py-2 mt-2 self-start">
                          <Text className="text-brand-800 text-sm font-bold">Metro {estacionMetroNombre} · {estacionMetro.linea}</Text>
                        </View>
                      ) : null}
                      {ubicacionReferenciaVisible ? (
                        <Text className="text-neutral-600 text-base leading-6 mt-2" numberOfLines={2}>{ubicacionReferenciaVisible}</Text>
                      ) : null}
                    </View>
                  </View>
                </View>
              ) : null}

              {vendedorNoVerificado ? (
                <InfoBanner icon="exclamation-triangle" title="Perfil pendiente" body="Coordina en un punto seguro y conserva el chat." tone="amber" />
              ) : null}
              {publicacionError ? <View className="mt-4"><InfoBanner icon="exclamation-circle" title="Publicación no disponible" body={publicacionError} tone="amber" /></View> : null}
              {chatError ? <View className="mt-4"><InfoBanner icon="exclamation-circle" title="No se pudo iniciar el chat" body={chatError} tone="red" /></View> : null}

              {esMiPublicacion ? (
                <PrimaryButton icon="user" disabled onPress={() => {}} className="mt-5">
                  Esta es tu publicación
                </PrimaryButton>
              ) : !publicacion ? (
                <PrimaryButton icon={isResolviendoPublicacion ? 'clock-o' : 'exclamation-circle'} disabled onPress={() => {}} className="mt-5">
                  {isResolviendoPublicacion ? 'Preparando publicación' : 'Publicación no disponible'}
                </PrimaryButton>
              ) : (
                <RequireAuth className="w-full bg-brand-700 rounded-2xl h-14 flex-row items-center justify-center mt-5" onAuthenticated={handleProponerPermuta}>
                  {isCreatingChat ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <FontAwesome name="exchange" size={16} color="#fff" />
                      <Text className="text-white text-[17px] font-bold ml-3">Proponer permuta</Text>
                    </>
                  )}
                </RequireAuth>
              )}
            </>
          ) : null}

          {!isLoading && !error && !producto ? <EmptyState icon="cube" title="Producto no encontrado" body="Vuelve al catálogo para elegir otra publicación." /> : null}
        </View>
      </ScrollView>
    </MainLayout>
  );
}
