import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useEffect, useState } from 'react';
import { Href, useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import RequireAuth from '@/components/RequireAuth';
import { BrandMark, EmptyState, InfoBanner, ProductCard, SectionHeader } from '@/components/ui';
import { useAuth } from '../../context/AuthContext';
import { obtenerProductos, Producto } from '../../services/api';

const CATEGORIAS = [
  { id: '1', label: 'Electrónica', icon: 'laptop' as const, color: 'bg-sky-50 border-sky-100', iconColor: '#0284c7' },
  { id: '2', label: 'Deportes', icon: 'futbol-o' as const, color: 'bg-orange-50 border-orange-100', iconColor: '#ea580c' },
  { id: '3', label: 'Hogar', icon: 'home' as const, color: 'bg-violet-50 border-violet-100', iconColor: '#7c3aed' },
  { id: '4', label: 'Moda', icon: 'shopping-bag' as const, color: 'bg-rose-50 border-rose-100', iconColor: '#e11d48' },
];

export default function HomeScreen() {
  const router = useRouter();
  const { isAuthenticated, user, logout } = useAuth();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [isLoadingProductos, setIsLoadingProductos] = useState(true);
  const [productosError, setProductosError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function cargarProductos() {
      try {
        setIsLoadingProductos(true);
        const data = await obtenerProductos();
        if (mounted) {
          setProductos(data.slice(0, 5));
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

  return (
    <ScrollView className="flex-1 bg-neutral-50" contentContainerStyle={{ paddingBottom: 104 }} showsVerticalScrollIndicator={false}>
      <View className="px-5 pt-6 pb-2">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center flex-1 pr-3">
            <BrandMark size="sm" />
            <View className="ml-3 flex-1">
              <Text className="text-xs text-neutral-500 font-semibold">
                {isAuthenticated ? 'Bienvenido de vuelta' : 'Explora en modo invitado'}
              </Text>
              <Text className="text-2xl font-bold text-neutral-950 mt-0.5" numberOfLines={1}>
                {isAuthenticated ? user?.name : 'Permutas circulares'}
              </Text>
            </View>
          </View>

          {isAuthenticated ? (
            <TouchableOpacity className="w-11 h-11 rounded-2xl bg-white border border-neutral-100 items-center justify-center" onPress={logout} activeOpacity={0.75}>
              <Text className="text-brand-700 font-bold text-base">{user?.name?.charAt(0) ?? 'U'}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity className="bg-brand-700 rounded-2xl px-4 h-11 items-center justify-center" onPress={() => router.push('/login')} activeOpacity={0.85}>
              <Text className="text-white font-bold text-sm">Ingresar</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View className="mx-5 mt-5 bg-brand-900 rounded-3xl p-6 overflow-hidden">
        <View className="absolute top-0 right-0 w-32 h-full bg-teal-800 opacity-60" />
        <View className="absolute -bottom-6 -left-4 w-36 h-16 bg-brand-700 opacity-70 rotate-12" />

        <View className="z-10">
          <View className="self-start bg-white/10 border border-white/10 rounded-full px-3 py-1.5 mb-4">
            <Text className="text-brand-100 text-xs font-bold uppercase tracking-widest">Economía circular</Text>
          </View>
          <Text className="text-white text-3xl font-bold leading-9 mb-3">Dale otra vida a lo que ya no usas</Text>
          <Text className="text-brand-100 text-sm leading-6 mb-6">
            Publica productos, descubre oportunidades cercanas y propone intercambios con una comunidad verificada.
          </Text>

          <RequireAuth onAuthenticated={() => router.push('/publish' as Href)} className="bg-white rounded-2xl px-5 h-12 self-start flex-row items-center">
            <FontAwesome name="plus" size={12} color="#047857" />
            <Text className="text-brand-800 font-bold text-sm ml-2">Publicar producto</Text>
          </RequireAuth>
        </View>
      </View>

      <View className="px-5 mt-5">
        <InfoBanner icon="shield" title="Intercambios con más confianza" body="Permutapp prioriza identidad, reputación y encuentros seguros para que la permuta sea simple y responsable." />
      </View>

      <View className="px-5 mt-7">
        <SectionHeader title="Explora por categoría" eyebrow="Descubre" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 20 }}>
          {CATEGORIAS.map((cat) => (
            <TouchableOpacity key={cat.id} className="items-center mr-4" activeOpacity={0.75}>
              <View className={`w-16 h-16 rounded-3xl ${cat.color} border items-center justify-center mb-2`}>
                <FontAwesome name={cat.icon} size={22} color={cat.iconColor} />
              </View>
              <Text className="text-neutral-700 text-xs font-bold">{cat.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View className="px-5 mt-7 pb-6">
        <SectionHeader title="Disponibles cerca de ti" eyebrow="Catálogo" actionLabel="Ver todo" onActionPress={() => router.push('/(tabs)/two')} />

        {isLoadingProductos ? (
          <View className="py-10 items-center bg-white rounded-3xl border border-neutral-100">
            <ActivityIndicator color="#047857" />
            <Text className="text-neutral-500 mt-4 text-sm">Buscando productos disponibles</Text>
          </View>
        ) : null}

        {productosError ? <InfoBanner icon="exclamation-circle" title="Catálogo no disponible" body={productosError} tone="red" /> : null}

        {!isLoadingProductos && !productosError && productos.length === 0 ? (
          <EmptyState icon="inbox" title="Aún no hay publicaciones" body="Cuando la comunidad publique productos, aparecerán aquí para iniciar nuevas permutas." />
        ) : null}

        {productos.map((producto) => (
          <ProductCard
            key={producto.prod_id}
            title={producto.prod_nombre}
            subtitle={`Publicación #${producto.publ_id}`}
            status={producto.prod_est}
            price={producto.prod_precio}
            onPress={() => router.push(`/product/${producto.prod_id}` as Href)}
          />
        ))}
      </View>

      {!isAuthenticated ? (
        <View className="px-5 pb-8">
          <View className="bg-white rounded-3xl p-5 border border-neutral-100">
            <Text className="text-neutral-950 font-bold text-lg">¿Listo para permutar?</Text>
            <Text className="text-neutral-500 text-sm mt-2 leading-5">Crea una cuenta para publicar, guardar tu sesión y proponer intercambios.</Text>
            <TouchableOpacity className="bg-brand-700 rounded-2xl h-12 items-center justify-center mt-4" onPress={() => router.push('/register')} activeOpacity={0.85}>
              <Text className="text-white font-bold text-sm">Crear cuenta gratis</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}
