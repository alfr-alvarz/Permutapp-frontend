import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { obtenerProductoPorId, obtenerPublicacionPorId, Producto, Publicacion } from '../../services/api';
import RequireAuth from '../../components/RequireAuth';

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
        if (mounted) {
          setError('No fue posible cargar el detalle del producto.');
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    cargarDetalle();

    return () => {
      mounted = false;
    };
  }, [idProducto]);

  const fechaPublicacion = publicacion?.publ_fech_creacion
    ? new Date(publicacion.publ_fech_creacion).toLocaleDateString('es-CL', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : null;

  return (
    <ScrollView className="flex-1 bg-white" showsVerticalScrollIndicator={false}>
      <View className="px-5 pt-6 pb-4">
        <TouchableOpacity
          className="w-11 h-11 rounded-full bg-neutral-100 items-center justify-center mb-5"
          onPress={() => router.back()}
          activeOpacity={0.75}
        >
          <FontAwesome name="chevron-left" size={14} color="#404040" />
        </TouchableOpacity>

        {isLoading ? (
          <View className="items-center py-20">
            <ActivityIndicator color="#047857" />
            <Text className="text-neutral-400 text-sm mt-4">Cargando producto</Text>
          </View>
        ) : null}

        {error ? (
          <View className="bg-red-50 border border-red-100 rounded-2xl p-5">
            <FontAwesome name="exclamation-circle" size={18} color="#ef4444" />
            <Text className="text-red-500 text-sm mt-3">{error}</Text>
          </View>
        ) : null}

        {producto ? (
          <>
            <View className="h-56 rounded-3xl bg-teal-50 items-center justify-center mb-7">
              <FontAwesome name="cube" size={76} color="#14b8a6" />
            </View>

            <Text className="text-3xl font-bold text-neutral-900 mb-2">
              {producto.prod_nombre}
            </Text>

            {publicacion ? (
              <Text className="text-neutral-500 text-base leading-6 mb-5">
                {publicacion.publ_titulo}
              </Text>
            ) : null}

            <View className="flex-row items-center mb-5">
              <View className="bg-brand-50 border border-brand-100 rounded-full px-3 py-1.5 mr-2">
                <Text className="text-brand-700 text-xs font-bold">{producto.prod_est}</Text>
              </View>
              <View className="bg-neutral-100 rounded-full px-3 py-1.5">
                <Text className="text-neutral-500 text-xs font-semibold">
                  {fechaPublicacion ?? `Publicación #${producto.publ_id}`}
                </Text>
              </View>
            </View>

            <View className="border border-neutral-100 rounded-2xl p-5 mb-5">
              <Text className="text-neutral-400 text-xs uppercase tracking-widest font-semibold mb-2">
                Valor referencial
              </Text>
              <Text className="text-neutral-900 text-2xl font-bold">
                ${producto.prod_precio.toLocaleString('es-CL')}
              </Text>
            </View>

            <View className="border border-neutral-100 rounded-2xl p-5 mb-6">
              <Text className="text-neutral-400 text-xs uppercase tracking-widest font-semibold mb-3">
                Descripción
              </Text>
              <Text className="text-neutral-600 text-sm leading-6">
                {publicacion?.publ_descripcion ?? 'Este producto no tiene descripción disponible.'}
              </Text>
            </View>

            <RequireAuth
              className="w-full bg-brand-700 rounded-2xl h-14 flex-row items-center justify-center mb-4"
              onAuthenticated={() => console.log(`Contactar por producto ${producto.prod_id}`)}
            >
              <FontAwesome name="exchange" size={16} color="#fff" />
              <Text className="text-white text-base font-bold ml-3">Proponer permuta</Text>
            </RequireAuth>
          </>
        ) : null}
      </View>
    </ScrollView>
  );
}
