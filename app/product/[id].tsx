import { ActivityIndicator, Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Href, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { EmptyState, InfoBanner, PrimaryButton } from '@/components/ui';
import { ApiError, iniciarConversacion, obtenerProductoPorId, obtenerPublicacionPorId, Producto, Publicacion } from '../../services/api';
import RequireAuth from '../../components/RequireAuth';
import { useAuth } from '../../context/AuthContext';
import MainLayout from '../../layouts/MainLayout';

export default function ProductDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const idProducto = useMemo(() => Number(id), [id]);
  const { user, token } = useAuth();
  const [producto, setProducto] = useState<Producto | null>(null);
  const [publicacion, setPublicacion] = useState<Publicacion | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [publicacionError, setPublicacionError] = useState<string | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);

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
        const data = await obtenerProductoPorId(idProducto);
        if (mounted) {
          setProducto(data);
          setError(null);
          setPublicacionError(null);
        }

        try {
          const detallePublicacion = await obtenerPublicacionPorId(data.publ_id);
          if (mounted) {
            setPublicacion(detallePublicacion);
          }
        } catch {
          if (mounted) {
            setPublicacion(null);
            setPublicacionError('La publicación asociada a este producto no está disponible. Publica un producto nuevo o revisa que exista la publicación relacionada.');
          }
        }
      } catch {
        if (mounted) {
          setProducto(null);
          setPublicacion(null);
          setPublicacionError(null);
          setError('No fue posible cargar el detalle del producto.');
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    cargarDetalle();
    return () => { mounted = false; };
  }, [idProducto]);

  const handleProponerPermuta = async () => {
    if (!producto) {
      return;
    }

    if (!publicacion) {
      setChatError('No se puede iniciar una permuta porque la publicación asociada no está disponible.');
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
        publ_id: publicacion.publ_id,
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
    ? new Date(publicacion.publ_fech_creacion).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })
    : null;

  const esMiPublicacion = Boolean(user && publicacion && Number(user.id) === publicacion.publ_autor_id);

  return (
    <MainLayout>
      <ScrollView className="flex-1 bg-neutral-50" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 36 }}>
        <View className="px-5 pt-6 pb-4">
          <TouchableOpacity className="w-11 h-11 rounded-2xl bg-white border border-neutral-100 items-center justify-center mb-5" onPress={() => router.back()} activeOpacity={0.75}>
            <FontAwesome name="chevron-left" size={14} color="#404040" />
          </TouchableOpacity>

          {isLoading ? (
            <View className="items-center py-20 bg-white border border-neutral-100 rounded-3xl">
              <ActivityIndicator color="#047857" />
              <Text className="text-neutral-500 text-sm mt-4">Cargando producto</Text>
            </View>
          ) : null}

          {error ? <InfoBanner icon="exclamation-circle" title="Detalle no disponible" body={error} tone="red" /> : null}

          {producto ? (
            <>
              <View className="mb-6">
                <View className="h-64 rounded-3xl bg-teal-50 items-center justify-center border border-teal-100 overflow-hidden">
                  {producto.prod_imagenes?.[0] ? (
                    <Image source={{ uri: producto.prod_imagenes[0] }} className="w-full h-full" resizeMode="cover" />
                  ) : (
                    <>
                      <View className="absolute top-0 right-0 w-28 h-full bg-brand-100 opacity-70" />
                      <View className="w-28 h-28 rounded-3xl bg-white border border-teal-100 items-center justify-center">
                        <FontAwesome name="cube" size={64} color="#0f766e" />
                      </View>
                    </>
                  )}
                </View>

                {producto.prod_imagenes && producto.prod_imagenes.length > 1 ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3" contentContainerStyle={{ paddingRight: 12 }}>
                    {producto.prod_imagenes.map((imagen, index) => (
                      <View key={`${imagen}-${index}`} className="w-20 h-20 rounded-2xl overflow-hidden border border-neutral-100 mr-3 bg-neutral-100">
                        <Image source={{ uri: imagen }} className="w-full h-full" resizeMode="cover" />
                      </View>
                    ))}
                  </ScrollView>
                ) : null}
              </View>

              <View className="bg-white border border-neutral-100 rounded-3xl p-5 mb-4">
                <Text className="text-brand-700 text-xs uppercase tracking-widest font-bold mb-2">Producto</Text>
                <Text className="text-3xl font-bold text-neutral-950 mb-2">{producto.prod_nombre}</Text>
                {publicacion ? <Text className="text-neutral-500 text-base leading-6 mb-4">{publicacion.publ_titulo}</Text> : null}

                <View className="flex-row items-center flex-wrap">
                  <View className="bg-brand-50 border border-brand-100 rounded-full px-3 py-1.5 mr-2 mb-2">
                    <Text className="text-brand-700 text-xs font-bold">{producto.prod_est}</Text>
                  </View>
                  <View className="bg-neutral-100 rounded-full px-3 py-1.5 mb-2">
                    <Text className="text-neutral-600 text-xs font-bold">{fechaPublicacion ?? `Publicación #${producto.publ_id}`}</Text>
                  </View>
                </View>
              </View>

              <View className="flex-row gap-3 mb-4">
                <View className="flex-1 bg-white border border-neutral-100 rounded-3xl p-5">
                  <Text className="text-neutral-400 text-xs uppercase tracking-widest font-bold mb-2">Valor</Text>
                  <Text className="text-neutral-950 text-2xl font-bold">${producto.prod_precio.toLocaleString('es-CL')}</Text>
                </View>
                <View className="flex-1 bg-white border border-neutral-100 rounded-3xl p-5">
                  <Text className="text-neutral-400 text-xs uppercase tracking-widest font-bold mb-2">Seguridad</Text>
                  <View className="flex-row items-center">
                    <FontAwesome name="shield" size={15} color="#047857" />
                    <Text className="text-brand-700 text-sm font-bold ml-2">Revisar perfil</Text>
                  </View>
                </View>
              </View>

              <View className="bg-white border border-neutral-100 rounded-3xl p-5 mb-5">
                <Text className="text-neutral-400 text-xs uppercase tracking-widest font-bold mb-3">Descripción</Text>
                <Text className="text-neutral-700 text-sm leading-6">
                  {publicacion?.publ_descripcion ?? 'Este producto no tiene descripción disponible.'}
                </Text>
              </View>

              {publicacionError ? <InfoBanner icon="exclamation-circle" title="Publicación no disponible" body={publicacionError} tone="amber" /> : null}
              <InfoBanner icon="map-marker" title="Próximo paso" body="Cuando propongas una permuta, coordina siempre en un punto de encuentro seguro y conserva el registro de la conversación." tone="amber" />
              {chatError ? <View className="mt-4"><InfoBanner icon="exclamation-circle" title="No se pudo iniciar el chat" body={chatError} tone="red" /></View> : null}

              {esMiPublicacion ? (
                <PrimaryButton icon="user" disabled onPress={() => {}} className="mt-5">
                  Esta es tu publicación
                </PrimaryButton>
              ) : !publicacion ? (
                <PrimaryButton icon="exclamation-circle" disabled onPress={() => {}} className="mt-5">
                  Publicación no disponible
                </PrimaryButton>
              ) : (
                <RequireAuth className="w-full bg-brand-700 rounded-2xl h-14 flex-row items-center justify-center mt-5" onAuthenticated={handleProponerPermuta}>
                  {isCreatingChat ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <FontAwesome name="exchange" size={16} color="#fff" />
                      <Text className="text-white text-base font-bold ml-3">Proponer permuta</Text>
                    </>
                  )}
                </RequireAuth>
              )}
            </>
          ) : null}

          {!isLoading && !error && !producto ? <EmptyState icon="cube" title="Producto no encontrado" body="Vuelve al catálogo para elegir otra publicación disponible." /> : null}
        </View>
      </ScrollView>
    </MainLayout>
  );
}
