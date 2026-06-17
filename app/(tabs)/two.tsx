import { ActivityIndicator, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useEffect, useMemo, useState } from 'react';
import { Href, useLocalSearchParams, useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { EmptyState, FeedEnd, InfoBanner, ProductCard, SectionHeader } from '@/components/ui';
import { Producto } from '../../services/api';
import { obtenerProductosActivos } from '../../services/catalog';

const ESTADOS = ['Todos', 'Nuevo', 'Como nuevo', 'Buen estado', 'Aceptable'];
const CATEGORIAS = [
  'Electrónica',
  'Deportes',
  'Hogar',
  'Moda',
  'Libros',
  'Juguetes',
  'Herramientas',
  'Muebles',
  'Infantil',
  'Mascotas',
];

function normalizarTexto(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export default function CatalogScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ categoria?: string }>();
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
        const data = await obtenerProductosActivos();
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

  useEffect(() => {
    if (typeof params.categoria === 'string') {
      setBusqueda(params.categoria);
    }
  }, [params.categoria]);

  const itemsFiltrados = useMemo(
    () => productos.filter((item) => {
      const busquedaNormalizada = normalizarTexto(busqueda);
      const textoProducto = normalizarTexto([
        item.prod_nombre,
        item.prod_est,
        item.prod_ubicacion_comuna ?? '',
        item.prod_ubicacion_referencia ?? '',
      ].join(' '));
      const coincideBusqueda = !busquedaNormalizada || textoProducto.includes(busquedaNormalizada);
      const coincideEstado = estadoActivo === 'Todos' || item.prod_est === estadoActivo;
      return coincideBusqueda && coincideEstado;
    }),
    [busqueda, estadoActivo, productos],
  );

  return (
    <ScrollView className="flex-1 bg-neutral-50" contentContainerStyle={{ paddingBottom: 104 }} showsVerticalScrollIndicator={false}>
      <View className="px-5 pt-6 pb-2">
        <Text className="text-brand-700 text-sm font-bold mb-1">Catálogo</Text>
        <Text className="text-3xl font-bold text-neutral-950 leading-10">Encuentra algo útil</Text>
      </View>

      <View className="px-5 mt-5">
        <View className="flex-row items-center bg-white border border-neutral-100 rounded-2xl px-4 h-16">
          <FontAwesome name="search" size={17} color="#737373" />
          <TextInput className="flex-1 text-neutral-900 text-base ml-3" placeholder="Buscar producto o comuna" placeholderTextColor="#a3a3a3" value={busqueda} onChangeText={setBusqueda} />
          {busqueda.length > 0 ? (
            <TouchableOpacity className="w-9 h-9 rounded-full items-center justify-center" onPress={() => setBusqueda('')} activeOpacity={0.7}>
              <FontAwesome name="times-circle" size={18} color="#a3a3a3" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-4" contentContainerStyle={{ paddingHorizontal: 20 }}>
        {CATEGORIAS.map((categoria) => {
          const query = normalizarTexto(categoria);
          const selected = normalizarTexto(busqueda) === query;
          return (
            <TouchableOpacity
              key={categoria}
              className={`mr-2 px-4 h-11 rounded-2xl items-center justify-center border ${selected ? 'bg-brand-700 border-brand-700' : 'bg-white border-neutral-100'}`}
              onPress={() => setBusqueda(selected ? '' : query)}
              activeOpacity={0.75}
            >
              <Text className={`text-sm font-bold ${selected ? 'text-white' : 'text-neutral-600'}`}>{categoria}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3" contentContainerStyle={{ paddingHorizontal: 20 }}>
        {ESTADOS.map((estado) => (
          <TouchableOpacity key={estado} className={`mr-2 px-4 h-11 rounded-2xl items-center justify-center border ${estadoActivo === estado ? 'bg-neutral-950 border-neutral-950' : 'bg-white border-neutral-100'}`} onPress={() => setEstadoActivo(estado)} activeOpacity={0.75}>
            <Text className={`text-sm font-bold ${estadoActivo === estado ? 'text-white' : 'text-neutral-600'}`}>{estado}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View className="px-5 mt-7 pb-6">
        <SectionHeader title={`${itemsFiltrados.length} disponibles`} />
        {isLoading ? (
          <View className="items-center py-16 bg-white rounded-2xl border border-neutral-100">
            <ActivityIndicator color="#047857" />
            <Text className="text-neutral-500 mt-4 text-base">Cargando catálogo</Text>
          </View>
        ) : null}
        {error ? <InfoBanner icon="exclamation-circle" title="Sin conexión al catálogo" body={error} tone="red" /> : null}
        {!isLoading && !error && itemsFiltrados.length === 0 ? <EmptyState icon="search" title="Sin resultados" body="Limpia filtros o busca otro producto." /> : null}
        {itemsFiltrados.map((item) => (
          <ProductCard key={item.prod_id} title={item.prod_nombre} subtitle={item.prod_ubicacion_comuna ?? `Publicación #${item.publ_id}`} status={item.prod_est} price={item.prod_precio} thumbnailUrl={item.prod_imagenes?.[0]} onPress={() => router.push(`/product/${item.prod_id}` as Href)} />
        ))}

        {!isLoading && !error && itemsFiltrados.length > 0 ? (
          <FeedEnd />
        ) : null}
      </View>
    </ScrollView>
  );
}
