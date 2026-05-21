import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { EmptyState, InfoBanner, PrimaryButton } from '@/components/ui';
import { obtenerProductoPorId, obtenerPublicacionPorId, Producto, Publicacion } from '../../services/api';
import RequireAuth from '../../components/RequireAuth';
import MainLayout from '../../layouts/MainLayout';

export default function ProductDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const idProducto = useMemo(() => Number(id), [id]);
  const [producto, setProducto] = useState<Producto | null>(null);
  const [publicacion, setPublicacion] = useState<Publicacion | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        const detallePublicacion = await obtenerPublicacionPorId(data.publ_id);
        if (mounted) {
          setProducto(data);
          setPublicacion(detallePublicacion);
          setError(null);
        }
      } catch {
        if (mounted) setError('No fue posible cargar el detalle del producto.');
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    cargarDetalle();
    return () => { mounted = false; };
  }, [idProducto]);

  const fechaPublicacion = publicacion?.publ_fech_creacion
    ? new Date(publicacion.publ_fech_creacion).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })
    : null;

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
              <View className="h-64 rounded-3xl bg-teal-50 items-center justify-center mb-6 border border-teal-100 overflow-hidden">
                <View className="absolute top-0 right-0 w-28 h-full bg-brand-100 opacity-70" />
                <View className="w-28 h-28 rounded-3xl bg-white border border-teal-100 items-center justify-center">
                  <FontAwesome name="cube" size={64} color="#0f766e" />
                </View>
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

              <InfoBanner icon="map-marker" title="Próximo paso" body="Cuando propongas una permuta, coordina siempre en un punto de encuentro seguro y conserva el registro de la conversación." tone="amber" />

              <RequireAuth className="w-full bg-brand-700 rounded-2xl h-14 flex-row items-center justify-center mt-5" onAuthenticated={() => console.log(`Contactar por producto ${producto.prod_id}`)}>
                <FontAwesome name="exchange" size={16} color="#fff" />
                <Text className="text-white text-base font-bold ml-3">Proponer permuta</Text>
              </RequireAuth>
            </>
          ) : null}

          {!isLoading && !error && !producto ? <EmptyState icon="cube" title="Producto no encontrado" body="Vuelve al catálogo para elegir otra publicación disponible." /> : null}
        </View>
      </ScrollView>
    </MainLayout>
  );
}
