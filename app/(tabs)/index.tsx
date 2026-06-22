import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useEffect, useState } from 'react';
import { Href, useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import RequireAuth from '@/components/RequireAuth';
import { BrandMark, EmptyState, FeedEnd, InfoBanner, ProductCard, ScreenContent, SectionHeader } from '@/components/ui';
import { NotificationBell } from '@/components/NotificationBell';
import { useAuth } from '../../context/AuthContext';
import { ProductCategory, toProductCategory } from '@/constants/categories';
import { Producto, obtenerCategoriasProducto } from '../../services/api';
import { obtenerProductosActivos } from '../../services/catalog';

export default function HomeScreen() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [totalProductos, setTotalProductos] = useState(0);
  const [isLoadingProductos, setIsLoadingProductos] = useState(true);
  const [productosError, setProductosError] = useState<string | null>(null);
  const [categorias, setCategorias] = useState<ProductCategory[]>([]);

  useEffect(() => {
    let mounted = true;

    async function cargarProductos() {
      try {
        setIsLoadingProductos(true);
        const data = await obtenerProductosActivos();
        if (mounted) {
          setProductos(data.slice(0, 4));
          setTotalProductos(data.length);
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

  useEffect(() => {
    let mounted = true;

    async function cargarCategoriasInicio() {
      try {
        const data = await obtenerCategoriasProducto();
        if (mounted) setCategorias(data.map(toProductCategory));
      } catch {
        if (mounted) setCategorias([]);
      }
    }

    cargarCategoriasInicio();
    return () => { mounted = false; };
  }, []);

  const nombre = isAuthenticated ? user?.name?.split(' ')[0] : null;
  const hayMasProductos = totalProductos > productos.length;
  const feedEndBody = hayMasProductos
    ? 'Revisa el catálogo completo para ver más permutas.'
    : 'No hay más permutas nuevas por ver.';

  return (
    <ScrollView className="flex-1 bg-neutral-50" contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ paddingBottom: 18 }} showsVerticalScrollIndicator={false} stickyHeaderIndices={[0]}>
      <ScreenContent className="px-4 pt-5 pb-3 bg-neutral-50">
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
              <TouchableOpacity className="w-11 h-11 rounded-2xl bg-brand-700 border border-brand-700 items-center justify-center" onPress={() => router.push('/(tabs)/profile' as Href)} activeOpacity={0.82} accessibilityRole="button" accessibilityLabel="Ir a mi perfil">
                <FontAwesome name="user" size={18} color="#ffffff" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity className="bg-brand-700 rounded-2xl px-4 h-11 items-center justify-center" onPress={() => router.push('/login')} activeOpacity={0.85}>
              <Text className="text-white font-bold text-base">Ingresar</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScreenContent>

      <ScreenContent className="px-4 pb-2">
        <View className="bg-brand-900 rounded-2xl p-5 min-h-[176px] justify-between">
          <Text className="text-white text-2xl font-bold leading-8">Permuta simple</Text>
          <Text className="text-brand-100 text-sm leading-5 mt-1" numberOfLines={2}>Publica o explora objetos cerca de ti.</Text>
          <View className="flex-row gap-2 mt-7">
            <RequireAuth onAuthenticated={() => router.push('/publish' as Href)} className="flex-1 bg-white rounded-2xl h-12 items-center justify-center flex-row">
              <FontAwesome name="plus" size={14} color="#047857" />
              <Text className="text-brand-800 font-bold text-base ml-2">Publicar</Text>
            </RequireAuth>
            <TouchableOpacity className="flex-1 bg-brand-700 rounded-2xl h-12 items-center justify-center flex-row" onPress={() => router.push('/(tabs)/two' as Href)} activeOpacity={0.85}>
              <FontAwesome name="search" size={14} color="#ffffff" />
              <Text className="text-white font-bold text-base ml-2">Explorar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScreenContent>

      {categorias.length > 0 ? (
        <ScreenContent className="px-4 mt-5">
          <SectionHeader title="Categorías" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 20 }}>
            {categorias.map((cat) => (
              <TouchableOpacity key={cat.id} className="items-center mr-4" onPress={() => router.push(`/(tabs)/two?categoria=${encodeURIComponent(cat.id)}` as Href)} activeOpacity={0.75}>
                <View className="w-14 h-14 rounded-2xl border items-center justify-center mb-2" style={{ backgroundColor: cat.backgroundColor, borderColor: cat.borderColor }}>
                  <FontAwesome name={cat.icon} size={22} color={cat.iconColor} />
                </View>
                <Text className="text-neutral-700 text-xs font-bold">{cat.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </ScreenContent>
      ) : null}

      <ScreenContent className="px-4 mt-6 pb-2">
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

        {isAuthenticated && !isLoadingProductos && !productosError && productos.length > 0 ? (
          <FeedEnd body={feedEndBody} />
        ) : null}
      </ScreenContent>

      {!isAuthenticated ? (
        <>
          <ScreenContent className="px-4 pb-3">
            <TouchableOpacity className="bg-white rounded-2xl p-5 border border-neutral-100 flex-row items-center justify-between" onPress={() => router.push('/register' as Href)} activeOpacity={0.82}>
              <View className="flex-1 pr-4">
                <Text className="text-neutral-950 font-bold text-xl">Crea tu cuenta</Text>
                <Text className="text-neutral-500 text-base mt-1">Publica y negocia tus permutas.</Text>
              </View>
              <FontAwesome name="chevron-right" size={14} color="#a3a3a3" />
            </TouchableOpacity>
          </ScreenContent>

          {!isLoadingProductos && !productosError && productos.length > 0 ? (
            <ScreenContent className="px-4 pb-8">
              <FeedEnd body={feedEndBody} />
            </ScreenContent>
          ) : null}
        </>
      ) : null}
    </ScrollView>
  );
}
