/**
 * index.tsx — Pantalla de Inicio (Home) de Permutapp.
 *
 * Es la primera vista que ve el usuario al abrir la app.
 * Muestra:
 * - Un header con saludo personalizado (si está logueado) o genérico (invitado).
 * - Un banner hero con llamado a la acción para publicar un producto.
 * - Una barra horizontal de categorías para explorar.
 * - Un listado de productos disponibles con botones "Permutar".
 * - Un footer para invitados que invita a registrarse.
 *
 * Los botones de acción (Publicar, Permutar) están envueltos con <RequireAuth>,
 * lo que significa que si el usuario es invitado, será redirigido al Login.
 */

import { ActivityIndicator, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useEffect, useState } from 'react';
import { Href, useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import RequireAuth from '@/components/RequireAuth';
import { useAuth } from '../../context/AuthContext';
import { obtenerProductos, Producto } from '../../services/api';

// ────────── Datos de ejemplo (mock) ──────────
// TODO: Reemplazar por datos reales del backend cuando los endpoints estén listos.

/** Categorías disponibles para filtrar productos. */
const CATEGORIAS = [
  { id: '1', label: 'Electrónica',  icon: 'laptop'       as const, color: 'bg-blue-100',   iconColor: '#3b82f6' },
  { id: '2', label: 'Deportes',     icon: 'futbol-o'      as const, color: 'bg-orange-100',  iconColor: '#f97316' },
  { id: '3', label: 'Hogar',        icon: 'home'          as const, color: 'bg-purple-100',  iconColor: '#a855f7' },
  { id: '4', label: 'Moda',         icon: 'shopping-bag'  as const, color: 'bg-pink-100',    iconColor: '#ec4899' },
];

const PRODUCT_ICON = 'cube' as const;

/**
 * HomeScreen — Pantalla principal de la aplicación.
 *
 * Accesible tanto para usuarios autenticados como para invitados.
 * Los invitados pueden ver el catálogo pero no pueden interactuar
 * con los botones de acción (Publicar, Permutar).
 */
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
        if (mounted) {
          setProductosError('No fue posible cargar productos reales.');
        }
      } finally {
        if (mounted) {
          setIsLoadingProductos(false);
        }
      }
    }

    cargarProductos();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <ScrollView className="flex-1 bg-white" showsVerticalScrollIndicator={false}>

      {/* ═══════════ Encabezado ═══════════ */}
      <View className="px-5 pt-6 pb-2">
        <View className="flex-row items-center justify-between mb-1">
          <View className="flex-1">
            <Text className="text-sm text-neutral-400">
              {isAuthenticated ? 'Bienvenido de vuelta' : 'Explora libremente'}
            </Text>
            <Text className="text-2xl font-bold text-neutral-900 mt-1">
              {isAuthenticated ? `${user?.name} 👋` : 'Descubre permutas'}
            </Text>
          </View>

          {/* Botón de avatar (logueado) o botón de ingresar (invitado) */}
          {isAuthenticated ? (
            <TouchableOpacity
              className="w-11 h-11 rounded-full bg-brand-100 items-center justify-center"
              onPress={logout}
              activeOpacity={0.7}
            >
              <Text className="text-brand-700 font-bold text-base">
                {user?.name?.charAt(0) ?? 'U'}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              className="bg-brand-700 rounded-full px-5 py-2.5"
              onPress={() => router.push('/login')}
              activeOpacity={0.85}
            >
              <Text className="text-white font-semibold text-sm">Ingresar</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ═══════════ Banner hero ═══════════ */}
      <View className="mx-5 mt-4 bg-brand-800 rounded-3xl p-6 overflow-hidden">
        {/* Formas decorativas de fondo */}
        <View className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-brand-700 opacity-50" />
        <View className="absolute bottom-2 right-8 w-20 h-20 rounded-full bg-brand-600 opacity-30" />

        <View className="z-10">
          <Text className="text-brand-200 text-xs font-semibold uppercase tracking-widest mb-2">
            Economía Circular
          </Text>
          <Text className="text-white text-xl font-bold mb-2 leading-7">
            Intercambia lo que ya{'\n'}no usas por algo mejor
          </Text>
          <Text className="text-brand-300 text-sm mb-5 leading-5">
            Publica tus productos y encuentra permutas cerca de ti.
          </Text>

          {/* Botón protegido: solo usuarios autenticados pueden publicar */}
          <RequireAuth
            onAuthenticated={() => router.push('/publish' as Href)}
            className="bg-white rounded-xl px-5 py-3 self-start flex-row items-center"
          >
            <FontAwesome name="plus" size={12} color="#047857" />
            <Text className="text-brand-800 font-bold text-sm ml-2">
              Publicar producto
            </Text>
          </RequireAuth>
        </View>
      </View>

      {/* ═══════════ Categorías ═══════════ */}
      <View className="px-5 mt-7">
        <Text className="text-lg font-bold text-neutral-900 mb-4">Categorías</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
          {CATEGORIAS.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              className="items-center mr-5"
              activeOpacity={0.7}
            >
              <View className={`w-14 h-14 rounded-2xl ${cat.color} items-center justify-center mb-2`}>
                <FontAwesome name={cat.icon} size={22} color={cat.iconColor} />
              </View>
              <Text className="text-neutral-600 text-xs font-medium">{cat.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ═══════════ Productos disponibles ═══════════ */}
      <View className="px-5 mt-6 pb-6">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-lg font-bold text-neutral-900">
            Disponibles cerca de ti
          </Text>
          <TouchableOpacity activeOpacity={0.7} onPress={() => router.push('/(tabs)/two')}>
            <Text className="text-brand-600 text-sm font-semibold">Ver todo</Text>
          </TouchableOpacity>
        </View>

        {isLoadingProductos ? (
          <View className="py-8 items-center">
            <ActivityIndicator color="#047857" />
          </View>
        ) : null}

        {productosError ? (
          <View className="bg-red-50 border border-red-100 rounded-2xl p-4 mb-3">
            <Text className="text-red-500 text-sm">{productosError}</Text>
          </View>
        ) : null}

        {!isLoadingProductos && !productosError && productos.length === 0 ? (
          <View className="bg-neutral-50 rounded-2xl p-5 items-center">
            <FontAwesome name="inbox" size={22} color="#a3a3a3" />
            <Text className="text-neutral-400 text-sm mt-3">Aún no hay productos publicados.</Text>
          </View>
        ) : null}

        {productos.map((producto) => (
          <View
            key={producto.prod_id}
            className="bg-white border border-neutral-100 rounded-2xl p-4 mb-3 flex-row items-center"
          >
            {/* Ícono del producto */}
            <View className="w-14 h-14 rounded-2xl bg-teal-50 items-center justify-center mr-4">
              <FontAwesome name={PRODUCT_ICON} size={22} color="#14b8a6" />
            </View>

            {/* Información del producto */}
            <View className="flex-1 mr-3">
              <Text className="text-neutral-900 font-semibold text-sm" numberOfLines={1}>
                {producto.prod_nombre}
              </Text>
              <Text className="text-neutral-400 text-xs mt-1">Publicación #{producto.publ_id}</Text>
              <View className="flex-row items-center mt-1.5">
                <View className="w-1.5 h-1.5 rounded-full bg-brand-500 mr-1.5" />
                <Text className="text-brand-600 text-xs font-medium">
                  {producto.prod_est}
                </Text>
              </View>
            </View>

            {/* Botón protegido: solo usuarios autenticados pueden permutar */}
            <RequireAuth
              onAuthenticated={() => router.push(`/product/${producto.prod_id}` as Href)}
              className="bg-brand-50 border border-brand-200 rounded-xl px-4 py-2.5"
            >
              <Text className="text-brand-700 font-bold text-xs">Ver</Text>
            </RequireAuth>
          </View>
        ))}
      </View>

      {/* ═══════════ Footer para invitados ═══════════ */}
      {!isAuthenticated && (
        <View className="px-5 pb-8 items-center">
          <View className="w-full bg-neutral-50 rounded-2xl p-5 items-center">
            <FontAwesome name="lock" size={20} color="#a3a3a3" />
            <Text className="text-neutral-500 text-sm mt-3 text-center leading-5">
              Inicia sesión para publicar productos,{'\n'}proponer permutas y chatear.
            </Text>
            <TouchableOpacity
              className="bg-brand-700 rounded-xl px-6 py-3 mt-4"
              onPress={() => router.push('/login')}
              activeOpacity={0.85}
            >
              <Text className="text-white font-bold text-sm">Crear cuenta gratis</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
}
