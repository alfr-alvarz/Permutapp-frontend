/**
 * modal.tsx — Pantalla modal genérica.
 *
 * Se presenta como un modal sobre la pantalla actual.
 * Útil para mostrar información adicional, configuraciones o
 * contenido que no requiere una navegación completa.
 */

import { StatusBar } from 'expo-status-bar';
import { Platform, StyleSheet } from 'react-native';

import EditScreenInfo from '@/components/EditScreenInfo';
import { Text, View } from '@/components/Themed';

/**
 * ModalScreen — Renderiza el contenido del modal.
 * En iOS usa una barra de estado clara para compensar el espacio negro
 * que aparece encima del modal.
 */
export default function ModalScreen() {
  return (
    <View style={styles.contenedor}>
      <Text style={styles.titulo}>Modal</Text>
      <View style={styles.separador} lightColor="#eee" darkColor="rgba(255,255,255,0.1)" />
      <EditScreenInfo path="app/modal.tsx" />

      {/* En iOS usa barra de estado clara para el espacio negro encima del modal */}
      <StatusBar style={Platform.OS === 'ios' ? 'light' : 'auto'} />
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titulo: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  separador: {
    marginVertical: 30,
    height: 1,
    width: '80%',
  },
});
