import { Link, Stack } from 'expo-router';
import { Text, View } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Ruta no encontrada' }} />
      <View className="flex-1 bg-neutral-50 items-center justify-center px-6">
        <View className="bg-white border border-neutral-100 rounded-3xl p-6 w-full max-w-sm items-center">
          <View className="w-16 h-16 rounded-3xl bg-amber-50 items-center justify-center mb-4">
            <FontAwesome name="compass" size={24} color="#d97706" />
          </View>
          <Text className="text-neutral-950 text-2xl font-bold text-center">No encontramos esta pantalla</Text>
          <Text className="text-neutral-500 text-sm text-center leading-5 mt-2 mb-5">
            La ruta no existe o la publicación ya no está disponible.
          </Text>
          <Link href="/" className="bg-brand-700 rounded-2xl px-6 py-3">
            <Text className="text-white font-bold text-sm">Volver al inicio</Text>
          </Link>
        </View>
      </View>
    </>
  );
}
