/**
 * (tabs)/_layout.tsx — Layout de las pestañas principales de Permutapp.
 *
 * Define la barra de navegación inferior (Tab Bar) con las pestañas:
 * - Inicio: Pantalla principal con el catálogo de productos y banner hero.
 * - Catálogo: Búsqueda y listado filtrable de productos disponibles.
 *
 * Todo el contenido de las pestañas se envuelve con <MainLayout />,
 * que restringe el ancho máximo en pantallas grandes (PC) y lo centra.
 */

import React from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';

import MainLayout from '../../layouts/MainLayout';

/**
 * TabBarIcon — Componente auxiliar para renderizar los íconos de la barra de pestañas.
 *
 * @param name - Nombre del ícono de FontAwesome a mostrar.
 * @param color - Color del ícono (lo provee automáticamente el Tab Bar según esté activo o no).
 */
function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={22} style={{ marginBottom: -2 }} {...props} />;
}

/**
 * TabLayout — Configura y renderiza la barra de pestañas inferior.
 *
 * Estilos de la barra:
 * - Color activo: verde brand (#047857) para resaltar la pestaña seleccionada.
 * - Color inactivo: gris neutro (#a3a3a3).
 * - Sin sombra ni elevación para un look limpio y moderno.
 * - Header de navegación oculto (cada pantalla maneja su propio encabezado).
 */
export default function TabLayout() {
  return (
    <MainLayout>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: '#047857',     // Verde brand para pestaña activa
          tabBarInactiveTintColor: '#a3a3a3',   // Gris neutro para pestañas inactivas
          tabBarStyle: {
            borderTopWidth: 1,
            borderTopColor: '#f5f5f5',          // Borde superior sutil
            backgroundColor: '#ffffff',
            elevation: 0,                       // Sin sombra en Android
            shadowOpacity: 0,                   // Sin sombra en iOS
            height: 56,
            paddingBottom: 6,
            paddingTop: 6,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
          },
          headerShown: false,                   // Cada pantalla maneja su propio header
        }}>

        {/* Pestaña: Inicio */}
        <Tabs.Screen
          name="index"
          options={{
            title: 'Inicio',
            tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} />,
          }}
        />

        {/* Pestaña: Catálogo */}
        <Tabs.Screen
          name="two"
          options={{
            title: 'Catálogo',
            tabBarIcon: ({ color }) => <TabBarIcon name="th-large" color={color} />,
          }}
        />
      </Tabs>
    </MainLayout>
  );
}
