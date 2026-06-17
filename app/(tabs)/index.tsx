import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useEffect, useState } from 'react';
import { Href, useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import RequireAuth from '@/components/RequireAuth';
import { BrandMark, EmptyState, InfoBanner, ProductCard, SectionHeader } from '@/components/ui';
import { NotificationBell } from '@/components/NotificationBell';
import { useAuth } from '../../context/AuthContext';
import { Producto } from '../../services/api';
import { obtenerProductosActivos } from '../../services/catalog';

const CATEGORIAS = [
  { id: 'electronica', label: 'Electrónica', query: 'electronica', icon: 'laptop' as const, color: 'bg-sky-50 border-sky-100', iconColor: '#0284c7' },
  { id: 'deportes', label: 'Deportes', query: 'deporte', icon: 'futbol-o' as const, color: 'bg-orange-50 border-orange-100', iconColor: '#ea580c' },
  { id: 'hogar', label: 'Hogar', query: 'hogar', icon: 'home' as const, color: 'bg-violet-50 border-violet-100', iconColor: '#7c3aed' },
  { id: 'moda', label: 'Moda', query: 'moda', icon: 'shopping-bag' as const, color: 'bg-rose-50 border-rose-100', iconColor: '#e11d48' },
  { id: 'libros', label: 'Libros', query: 'libro', icon: 'book' as const, color: 'bg-amber-50 border-amber-100', iconColor: '#d97706' },
  { id: 'juguetes', label: 'Juguetes', query: 'juguete', icon: 'puzzle-piece' as const, color: 'bg-lime-50 border-lime-100', iconColor: '#65a30d' },
  { id: 'herramientas', label: 'Herramientas', query: 'herramienta', icon: 'wrench' as const, color: 'bg-slate-50 border-slate-100', iconColor: '#475569' },
  { id: 'muebles', label: 'Muebles', query: 'mueble', icon: 'bed' as const, color: 'bg-stone-50 border-stone-100', iconColor: '#57534e' },
  { id: 'infantil', label: 'Infantil', query: 'infantil', icon: 'child' as const, color: 'bg-pink-50 border-pink-100', iconColor: '#db2777' },
  { id: 'mascotas', label: 'Mascotas', query: 'mascota', icon: 'paw' as const, color: 'bg-emerald-50 border-emerald-100', iconColor: '#059669' },
];

export default function HomeScreen() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [isLoadingProductos, setIsLoadingProductos] = useState(true);
  const [productosError, setProductosError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function cargarProductos() {
      try {
        setIsLoadingProductos(true);
        const data = await obtenerProductosActivos();
        if (mounted) {
          setProductos(data.slice(0, 4));
          setProductosError(null);
        }
      } catch {
        if (mounted) setProductosError('No fue posible cargar productos reales.');
      } finally {
        if (mounted) setIsLoadingProductos(false);
      }
    }

    cargarProductos();
    return () => { mounted = false; };
  }, []);

  const nombre = isAuthenticated ? user?.name?.split(' ')[0] : null;

  return (
    <ScrollView className="flex-1 bg-neutral-50" contentContainerStyle={{ paddingBottom: 104 }} showsVerticalScrollIndicator={false}>
      <View className="px-5 pt-6 pb-2">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center flex-1 pr-3">
            <BrandMark size="sm" />
            <View className="ml-3 flex-1">
              <Text className="text-brand-700 text-sm font-bold">Permutapp</Text>
              <Text className="text-neutral-950 text-2xl font-bold leading-8" numberOfLines={1}>
                {nombre ? `Hola, ${nombre}` : 'Permuta simple'}
              </Text>
            </View>
          </View>

          {isAuthenticated ? (
            <View className="flex-row gap-2">
              <NotificationBell />
              <TouchableOpacity className="w-11 h-11 rounded-2xl bg-white border border-neutral-100 items-center justify-center" onPress={() => router.push('/(tabs)/profile' as Href)} activeOpacity={0.75}>
                <Text className="text-brand-700 font-bold text-base">{user?.name?.charAt(0) ?? 'U'}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity className="bg-brand-700 rounded-2xl px-4 h-11 items-center justify-center" onPress={() => router.push('/login')} activeOpacity={0.85}>
              <Text className="text-white font-bold text-base">Ingresar</Text>
            </TouchableOpacity>
          )}
        </View>

        <View className="bg-brand-900 rounded-2xl p-5 mt-5">
          <Text className="text-white text-3xl font-bold leading-9">Intercambia sin ruido</Text>
          <Text className="text-brand-100 text-base leading-6 mt-2">Publica, encuentra algo útil y conversa en un flujo más claro.</Text>
          <View className="flex-row gap-3 mt-5">
            <RequireAuth onAuthenticated={() => router.push('/publish' as Href)} className="flex-1 bg-white rounded-2xl h-14 items-center justify-center flex-row">
              <FontAwesome name="plus" size={14} color="#047857" />
              <Text className="text-brand-800 font-bold text-base ml-2">Publicar</Text>
            </RequireAuth>
            <TouchableOpacity className="flex-1 bg-brand-700 rounded-2xl h-14 items-center justify-center flex-row" onPress={() => router.push('/(tabs)/two' as Href)} activeOpacity={0.85}>
              <FontAwesome name="search" size={14} color="#ffffff" />
              <Text className="text-white font-bold text-base ml-2">Explorar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View className="px-5 mt-6">
        <SectionHeader title="Categorías" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 20 }}>
          {CATEGORIAS.map((cat) => (
            <TouchableOpacity key={cat.id} className="items-center mr-4" onPress={() => router.push(`/(tabs)/two?categoria=${encodeURIComponent(cat.query)}` as Href)} activeOpacity={0.75}>
              <View className={`w-16 h-16 rounded-2xl ${cat.color} border items-center justify-center mb-2`}>
                <FontAwesome name={cat.icon} size={22} color={cat.iconColor} />
              </View>
              <Text className="text-neutral-700 text-sm font-bold">{cat.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View className="px-5 mt-7 pb-6">
        <SectionHeader title="Cerca de ti" actionLabel="Ver todo" onActionPress={() => router.push('/(tabs)/two' as Href)} />

        {isLoadingProductos ? (
          <View className="py-10 items-center bg-white rounded-2xl border border-neutral-100">
            <ActivityIndicator color="#047857" />
            <Text className="text-neutral-500 mt-4 text-base">Cargando productos</Text>
          </View>
        ) : null}

        {productosError ? <InfoBanner icon="exclamation-circle" title="Catálogo no disponible" body={productosError} tone="red" /> : null}

        {!isLoadingProductos && !productosError && productos.length === 0 ? (
          <EmptyState icon="inbox" title="Aún no hay publicaciones" body="Cuando alguien publique, aparecerá aquí." />
        ) : null}

        {productos.map((producto) => (
          <ProductCard
            key={producto.prod_id}
            title={producto.prod_nombre}
            subtitle={producto.prod_ubicacion_comuna ?? `Publicación #${producto.publ_id}`}
            status={producto.prod_est}
            price={producto.prod_precio}
            thumbnailUrl={producto.prod_imagenes?.[0]}
            onPress={() => router.push(`/product/${producto.prod_id}` as Href)}
          />
        ))}
      </View>

      {!isAuthenticated ? (
        <View className="px-5 pb-8">
          <TouchableOpacity className="bg-white rounded-2xl p-5 border border-neutral-100 flex-row items-center justify-between" onPress={() => router.push('/register' as Href)} activeOpacity={0.82}>
            <View className="flex-1 pr-4">
              <Text className="text-neutral-950 font-bold text-xl">Crea tu cuenta</Text>
              <Text className="text-neutral-500 text-base mt-1">Publica y negocia tus permutas.</Text>
            </View>
            <FontAwesome name="chevron-right" size={14} color="#a3a3a3" />
          </TouchableOpacity>
        </View>
      ) : null}
    </ScrollView>
  );
}
