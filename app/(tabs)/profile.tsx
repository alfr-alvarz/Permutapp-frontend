import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Href, useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useAuth } from '../../context/AuthContext';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, token, isAuthenticated, logout } = useAuth();

  if (!isAuthenticated || !user) {
    return (
      <ScrollView
        className="flex-1 bg-white"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 40, paddingBottom: 96 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="items-center py-16">
          <View className="w-20 h-20 rounded-full bg-neutral-100 items-center justify-center mb-5">
            <FontAwesome name="user-o" size={30} color="#a3a3a3" />
          </View>
          <Text className="text-2xl font-bold text-neutral-900 mb-2">Tu perfil</Text>
          <Text className="text-neutral-500 text-sm text-center leading-5 mb-6">
            Inicia sesión para ver tus datos, publicaciones y estado de verificación.
          </Text>
          <TouchableOpacity
            className="bg-brand-700 rounded-2xl px-6 h-12 items-center justify-center"
            onPress={() => router.push('/login')}
            activeOpacity={0.85}
          >
            <Text className="text-white font-bold text-sm">Iniciar sesión</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-white"
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 32, paddingBottom: 96 }}
      showsVerticalScrollIndicator={false}
    >
      <Text className="text-2xl font-bold text-neutral-900 mb-6">Perfil</Text>

      <View className="items-center mb-7">
        <View className="w-24 h-24 rounded-full bg-brand-100 items-center justify-center mb-4">
          <Text className="text-brand-700 font-bold text-3xl">
            {user.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text className="text-neutral-900 text-xl font-bold">{user.name}</Text>
        <Text className="text-neutral-400 text-sm mt-1">{user.email}</Text>
      </View>

      <View className="border border-neutral-100 rounded-2xl p-5 mb-4">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-neutral-900 font-bold text-sm">Verificación biométrica</Text>
            <Text className="text-neutral-400 text-xs mt-1">
              {user.biometricVerified ? 'Cuenta verificada' : 'Pendiente de verificación'}
            </Text>
          </View>
          <View className={`px-3 py-1.5 rounded-full ${user.biometricVerified ? 'bg-brand-50' : 'bg-amber-50'}`}>
            <Text className={`text-xs font-bold ${user.biometricVerified ? 'text-brand-700' : 'text-amber-700'}`}>
              {user.biometricVerified ? 'Verificado' : 'Pendiente'}
            </Text>
          </View>
        </View>
      </View>

      <View className="border border-neutral-100 rounded-2xl p-5 mb-6">
        <Text className="text-neutral-400 text-xs uppercase tracking-widest font-semibold mb-2">
          Sesión
        </Text>
        <Text className="text-neutral-600 text-sm" numberOfLines={1}>
          JWT activo: {token ? 'sí' : 'no'}
        </Text>
      </View>

      <TouchableOpacity
        className="bg-brand-700 rounded-2xl h-14 flex-row items-center justify-center mb-3"
        onPress={() => router.push('/publish' as Href)}
        activeOpacity={0.85}
      >
        <FontAwesome name="plus" size={14} color="#fff" />
        <Text className="text-white font-bold text-base ml-3">Publicar producto</Text>
      </TouchableOpacity>

      <TouchableOpacity
        className="bg-neutral-100 rounded-2xl h-14 flex-row items-center justify-center"
        onPress={logout}
        activeOpacity={0.85}
      >
        <FontAwesome name="sign-out" size={14} color="#525252" />
        <Text className="text-neutral-700 font-bold text-base ml-3">Cerrar sesión</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
