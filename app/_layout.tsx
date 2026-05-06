/**
 * _layout.tsx — Layout raíz de la aplicación Permutapp.
 *
 * Este archivo es el punto de entrada de la navegación. Se encarga de:
 * 1. Cargar las fuentes personalizadas (SpaceMono, FontAwesome).
 * 2. Controlar la pantalla de carga (SplashScreen) hasta que todo esté listo.
 * 3. Envolver toda la app con el AuthProvider (contexto de autenticación).
 * 4. Definir las rutas principales del Stack de navegación.
 */

import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';
import '../global.css';

import { useColorScheme } from '@/components/useColorScheme';
import { AuthProvider } from '../context/AuthContext';

export {
  // Captura errores lanzados por el componente de Layout.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Asegura que al recargar en `/modal` se mantenga el botón de volver.
  initialRouteName: '(tabs)',
};

// Evita que la pantalla de carga (splash) se oculte antes de que las fuentes estén cargadas.
SplashScreen.preventAutoHideAsync();

/**
 * RootLayout — Componente raíz que carga las fuentes y renderiza la navegación.
 *
 * Mientras las fuentes no estén cargadas, no renderiza nada (muestra el splash).
 * Una vez listas, oculta el splash y monta el árbol de navegación completo.
 */
export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  // Expo Router usa Error Boundaries para capturar errores en el árbol de navegación.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  // Cuando las fuentes están cargadas, oculta la pantalla de carga.
  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  // Mientras carga, no renderiza nada (el splash sigue visible).
  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

/**
 * RootLayoutNav — Configura el Stack de navegación principal.
 *
 * Envuelve todo con:
 * - AuthProvider: para que el estado de sesión esté disponible en toda la app.
 * - ThemeProvider: para aplicar el tema claro/oscuro según la configuración del dispositivo.
 *
 * Rutas registradas:
 * - (tabs)    → Pantalla principal con pestañas (Inicio, Catálogo).
 * - login     → Pantalla de inicio de sesión.
 * - register  → Pantalla de registro de usuario.
 * - modal     → Pantalla modal genérica.
 */
function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <AuthProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="register" options={{ headerShown: false }} />
          <Stack.Screen name="publish" options={{ headerShown: false }} />
          <Stack.Screen name="product/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        </Stack>
      </ThemeProvider>
    </AuthProvider>
  );
}
