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

import { View, Text, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { useState } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import RequireAuth from '@/components/RequireAuth';

// ────────── Datos de ejemplo (mock) ──────────
// TODO: Reemplazar por datos reales del backend cuando los endpoints estén listos.

/** Productos disponibles en el catálogo. */
const ITEMS_CATALOGO = [
  { id: '1', title: 'Nintendo Switch OLED',      category: 'Electrónica', condition: 'Usado - Como nuevo',  icon: 'gamepad'     as const, bgColor: 'bg-indigo-50',  iconColor: '#6366f1' },
  { id: '2', title: 'Mochila North Face',        category: 'Accesorios',  condition: 'Usado - Buen estado', icon: 'suitcase'    as const, bgColor: 'bg-sky-50',     iconColor: '#0ea5e9' },
  { id: '3', title: 'Teclado Mecánico RGB',       category: 'Electrónica', condition: 'Nuevo sin uso',       icon: 'keyboard-o' as const, bgColor: 'bg-violet-50',  iconColor: '#8b5cf6' },
  { id: '4', title: 'Balón de Fútbol Adidas',     category: 'Deportes',    condition: 'Usado - Buen estado', icon: 'futbol-o'   as const, bgColor: 'bg-rose-50',    iconColor: '#f43f5e' },
  { id: '5', title: 'Audífonos Sony WH-1000XM5',  category: 'Electrónica', condition: 'Usado - Como nuevo',  icon: 'headphones' as const, bgColor: 'bg-amber-50',   iconColor: '#f59e0b' },
  { id: '6', title: 'Libro "Clean Code"',         category: 'Libros',      condition: 'Usado - Buen estado', icon: 'book'       as const, bgColor: 'bg-emerald-50', iconColor: '#10b981' },
];

/**
 * CatalogScreen — Pantalla del catálogo con búsqueda y filtros.
 *
 * El usuario puede buscar productos escribiendo en la barra de búsqueda.
 * El filtrado se realiza en tiempo real comparando el texto ingresado
 * con el título de cada producto (insensible a mayúsculas/minúsculas).
 */
export default function CatalogScreen() {
  /** Texto actual de la barra de búsqueda. */
  const [busqueda, setBusqueda] = useState('');

  /** Lista de productos filtrados según el texto de búsqueda. */
  const itemsFiltrados = ITEMS_CATALOGO.filter((item) =>
    item.title.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <ScrollView className="flex-1 bg-white" showsVerticalScrollIndicator={false}>

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

      {/* ── Chips de filtro por categoría ── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-5 mb-5">
        {['Todos', 'Electrónica', 'Deportes', 'Hogar', 'Libros', 'Moda'].map((etiqueta, i) => (
          <TouchableOpacity
            key={etiqueta}
            className={`mr-2 px-4 py-2 rounded-full ${
              i === 0 ? 'bg-brand-700' : 'bg-neutral-100'
            }`}
            activeOpacity={0.7}
          >
            <Text
              className={`text-xs font-semibold ${
                i === 0 ? 'text-white' : 'text-neutral-600'
              }`}
            >
              {etiqueta}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── Listado de resultados ── */}
      <View className="px-5 pb-6">
        <Text className="text-neutral-400 text-xs mb-4 uppercase tracking-widest font-semibold">
          {itemsFiltrados.length} productos disponibles
        </Text>

        {itemsFiltrados.map((item) => (
          <View
            key={item.id}
            className="bg-white border border-neutral-100 rounded-2xl p-4 mb-3 flex-row items-center"
          >
            {/* Ícono del producto */}
            <View className={`w-14 h-14 rounded-2xl ${item.bgColor} items-center justify-center mr-4`}>
              <FontAwesome name={item.icon} size={22} color={item.iconColor} />
            </View>

            {/* Información del producto */}
            <View className="flex-1 mr-3">
              <Text className="text-neutral-900 font-semibold text-sm" numberOfLines={1}>
                {item.title}
              </Text>
              <Text className="text-neutral-400 text-xs mt-0.5">{item.category}</Text>
              <View className="flex-row items-center mt-1.5">
                <View className="w-1.5 h-1.5 rounded-full bg-brand-500 mr-1.5" />
                <Text className="text-brand-600 text-xs font-medium">{item.condition}</Text>
              </View>
            </View>

            {/* Botón protegido: redirige a login si el usuario es invitado */}
            <RequireAuth
              onAuthenticated={() => console.log(`Detalle: ${item.title}`)}
              className="bg-brand-50 border border-brand-200 rounded-xl px-4 py-2.5"
            >
              <Text className="text-brand-700 font-bold text-xs">Ver</Text>
            </RequireAuth>
          </View>
        ))}

        {/* Estado vacío: cuando la búsqueda no arroja resultados */}
        {itemsFiltrados.length === 0 && (
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
