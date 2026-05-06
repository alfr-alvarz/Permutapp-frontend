/**
 * two.tsx — Pantalla de Catálogo de Permutapp.
 *
 * Muestra un listado completo de productos disponibles para intercambio.
 * Incluye:
 * - Barra de búsqueda funcional que filtra productos en tiempo real.
 * - Chips de filtro por categoría (Todos, Electrónica, Deportes, etc.).
 * - Tarjetas de producto con ícono, nombre, categoría y estado del producto.
 * - Estado vacío cuando no hay resultados de búsqueda.
 *
 * Los botones "Ver" de cada producto están protegidos con <RequireAuth>,
 * redirigiendo al login si el usuario no está autenticado.
 */

import { ActivityIndicator, View, Text, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { useEffect, useMemo, useState } from 'react';
import { Href, useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import RequireAuth from '@/components/RequireAuth';
import { obtenerProductos, Producto } from '../../services/api';

// ────────── Datos de ejemplo (mock) ──────────
// TODO: Reemplazar por datos reales del backend cuando los endpoints estén listos.

const PRODUCT_ICON = 'cube' as const;

/**
 * CatalogScreen — Pantalla del catálogo con búsqueda y filtros.
 *
 * El usuario puede buscar productos escribiendo en la barra de búsqueda.
 * El filtrado se realiza en tiempo real comparando el texto ingresado
 * con el título de cada producto (insensible a mayúsculas/minúsculas).
 */
export default function CatalogScreen() {
  const router = useRouter();
  /** Texto actual de la barra de búsqueda. */
  const [busqueda, setBusqueda] = useState('');
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
        if (mounted) {
          setError('No fue posible cargar el catálogo.');
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    cargarProductos();

    return () => {
      mounted = false;
    };
  }, []);

  /** Lista de productos filtrados según el texto de búsqueda. */
  const itemsFiltrados = useMemo(
    () => productos.filter((item) =>
      item.prod_nombre.toLowerCase().includes(busqueda.toLowerCase())
        || item.prod_est.toLowerCase().includes(busqueda.toLowerCase())
    ),
    [busqueda, productos],
  );

  return (
    <ScrollView
      className="flex-1 bg-white"
      contentContainerStyle={{ paddingBottom: 96 }}
      showsVerticalScrollIndicator={false}
    >

      {/* ── Encabezado ── */}
      <View className="px-5 pt-6 pb-2">
        <Text className="text-2xl font-bold text-neutral-900">Catálogo</Text>
        <Text className="text-neutral-400 text-sm mt-1">
          Encuentra lo que necesitas
        </Text>
      </View>

      {/* ── Barra de búsqueda ── */}
      <View className="px-5 mt-4 mb-5">
        <View className="flex-row items-center bg-neutral-100 rounded-2xl px-4 h-12">
          <FontAwesome name="search" size={15} color="#a3a3a3" />
          <TextInput
            className="flex-1 text-neutral-900 text-sm ml-3"
            placeholder="Buscar productos..."
            placeholderTextColor="#a3a3a3"
            value={busqueda}
            onChangeText={setBusqueda}
          />
          {/* Botón para limpiar la búsqueda (solo visible si hay texto) */}
          {busqueda.length > 0 && (
            <TouchableOpacity onPress={() => setBusqueda('')} activeOpacity={0.7}>
              <FontAwesome name="times-circle" size={16} color="#a3a3a3" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Listado de resultados ── */}
      <View className="px-5 pb-6">
        <Text className="text-neutral-400 text-xs mb-4 uppercase tracking-widest font-semibold">
          {itemsFiltrados.length} productos disponibles
        </Text>

        {isLoading ? (
          <View className="items-center py-16">
            <ActivityIndicator color="#047857" />
            <Text className="text-neutral-400 mt-4 text-sm">Cargando catálogo</Text>
          </View>
        ) : null}

        {error ? (
          <View className="bg-red-50 border border-red-100 rounded-2xl p-4 mb-3">
            <Text className="text-red-500 text-sm">{error}</Text>
          </View>
        ) : null}

        {itemsFiltrados.map((item) => (
          <View
            key={item.prod_id}
            className="bg-white border border-neutral-100 rounded-2xl p-4 mb-3 flex-row items-center"
          >
            {/* Ícono del producto */}
            <View className="w-14 h-14 rounded-2xl bg-teal-50 items-center justify-center mr-4">
              <FontAwesome name={PRODUCT_ICON} size={22} color="#14b8a6" />
            </View>

            {/* Información del producto */}
            <View className="flex-1 mr-3">
              <Text className="text-neutral-900 font-semibold text-sm" numberOfLines={1}>
                {item.prod_nombre}
              </Text>
              <Text className="text-neutral-400 text-xs mt-0.5">Publicación #{item.publ_id}</Text>
              <View className="flex-row items-center mt-1.5">
                <View className="w-1.5 h-1.5 rounded-full bg-brand-500 mr-1.5" />
                <Text className="text-brand-600 text-xs font-medium">{item.prod_est}</Text>
              </View>
            </View>

            {/* Botón protegido: redirige a login si el usuario es invitado */}
            <RequireAuth
              onAuthenticated={() => router.push(`/product/${item.prod_id}` as Href)}
              className="bg-brand-50 border border-brand-200 rounded-xl px-4 py-2.5"
            >
              <Text className="text-brand-700 font-bold text-xs">Ver</Text>
            </RequireAuth>
          </View>
        ))}

        {/* Estado vacío: cuando la búsqueda no arroja resultados */}
        {!isLoading && !error && itemsFiltrados.length === 0 && (
          <View className="items-center py-16">
            <FontAwesome name="search" size={32} color="#d4d4d4" />
            <Text className="text-neutral-400 mt-4 text-sm">
              No se encontraron resultados
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
