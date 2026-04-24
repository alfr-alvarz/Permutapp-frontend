/**
 * +not-found.tsx — Pantalla de error 404.
 *
 * Se muestra automáticamente cuando el usuario navega a una ruta
 * que no existe dentro de la aplicación. Ofrece un enlace para
 * volver a la pantalla principal.
 */

import { Link, Stack } from 'expo-router';
import { StyleSheet } from 'react-native';

import { Text, View } from '@/components/Themed';

/**
 * NotFoundScreen — Pantalla que se renderiza cuando la ruta solicitada no existe.
 * Muestra un mensaje de error y un enlace para regresar al inicio.
 */
export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: '¡Ups!' }} />
      <View style={styles.contenedor}>
        <Text style={styles.titulo}>Esta pantalla no existe.</Text>

        <Link href="/" style={styles.enlace}>
          <Text style={styles.textoEnlace}>Volver a la pantalla principal</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  titulo: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  enlace: {
    marginTop: 15,
    paddingVertical: 15,
  },
  textoEnlace: {
    fontSize: 14,
    color: '#2e78b7',
  },
});
