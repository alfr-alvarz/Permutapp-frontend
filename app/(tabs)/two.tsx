import { ActivityIndicator, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useEffect, useMemo, useState } from 'react';
import { Href, useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { EmptyState, InfoBanner, ProductCard, SectionHeader } from '@/components/ui';
import { obtenerProductos, Producto } from '../../services/api';

const ESTADOS = ['Todos', 'Nuevo', 'Como nuevo', 'Buen estado', 'Aceptable'];

export default function CatalogScreen() {
  const router = useRouter();
  const [busqueda, setBusqueda] = useState('');
  const [estadoActivo, setEstadoActivo] = useState('Todos');
  const [productos, setProductos] = useState<Producto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function cargarProductos() {
      try {
        setIsLoading(true);
        const data = await obtenerProductos();
        if (mounted) {
          setProductos(data);
          setError(null);
        }
      } catch {
        if (mounted) setError('No fue posible cargar el catálogo.');
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    cargarProductos();
    return () => { mounted = false; };
  }, []);

  const itemsFiltrados = useMemo(
    () => productos.filter((item) => {
      const coincideBusqueda = item.prod_nombre.toLowerCase().includes(busqueda.toLowerCase())
        || item.prod_est.toLowerCase().includes(busqueda.toLowerCase());
      const coincideEstado = estadoActivo === 'Todos' || item.prod_est === estadoActivo;
      return coincideBusqueda && coincideEstado;
    }),
    [busqueda, estadoActivo, productos],
  );

  return (
    <ScrollView className="flex-1 bg-neutral-50" contentContainerStyle={{ paddingBottom: 104 }} showsVerticalScrollIndicator={false}>
      <View className="px-5 pt-6 pb-2">
        <Text className="text-brand-700 text-xs uppercase tracking-widest font-bold mb-2">Catálogo</Text>
        <Text className="text-3xl font-bold text-neutral-950">Encuentra tu próxima permuta</Text>
        <Text className="text-neutral-500 text-sm mt-2 leading-5">
          Busca productos publicados por la comunidad y revisa su estado antes de proponer un intercambio.
        </Text>
      </View>

      <View className="px-5 mt-5">
        <View className="flex-row items-center bg-white border border-neutral-100 rounded-3xl px-4 h-14">
          <FontAwesome name="search" size={15} color="#737373" />
          <TextInput className="flex-1 text-neutral-900 text-sm ml-3" placeholder="Buscar por producto o estado" placeholderTextColor="#a3a3a3" value={busqueda} onChangeText={setBusqueda} />
          {busqueda.length > 0 ? (
            <TouchableOpacity onPress={() => setBusqueda('')} activeOpacity={0.7}>
              <FontAwesome name="times-circle" size={16} color="#a3a3a3" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-4" contentContainerStyle={{ paddingHorizontal: 20 }}>
        {ESTADOS.map((estado) => (
          <TouchableOpacity key={estado} className={`mr-2 px-4 h-10 rounded-full items-center justify-center border ${estadoActivo === estado ? 'bg-brand-700 border-brand-700' : 'bg-white border-neutral-100'}`} onPress={() => setEstadoActivo(estado)} activeOpacity={0.75}>
            <Text className={`text-xs font-bold ${estadoActivo === estado ? 'text-white' : 'text-neutral-600'}`}>{estado}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View className="px-5 mt-7 pb-6">
        <SectionHeader title={`${itemsFiltrados.length} productos disponibles`} eyebrow="Resultados" />
        {isLoading ? (
          <View className="items-center py-16 bg-white rounded-3xl border border-neutral-100">
            <ActivityIndicator color="#047857" />
            <Text className="text-neutral-500 mt-4 text-sm">Cargando catálogo</Text>
          </View>
        ) : null}
        {error ? <InfoBanner icon="exclamation-circle" title="Sin conexión al catálogo" body={error} tone="red" /> : null}
        {!isLoading && !error && itemsFiltrados.length === 0 ? <EmptyState icon="search" title="No encontramos resultados" body="Prueba con otro nombre o limpia los filtros para ver más productos." /> : null}
        {itemsFiltrados.map((item) => (
          <ProductCard key={item.prod_id} title={item.prod_nombre} subtitle={`Publicación #${item.publ_id}`} status={item.prod_est} price={item.prod_precio} onPress={() => router.push(`/product/${item.prod_id}` as Href)} />
        ))}
      </View>
    </ScrollView>
  );
}
