import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Href, useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { BrandMark, InfoBanner, PrimaryButton, SectionHeader } from '@/components/ui';
import { useAuth } from '../../context/AuthContext';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, token, isAuthenticated, logout } = useAuth();

  if (!isAuthenticated || !user) {
    return (
      <ScrollView className="flex-1 bg-neutral-50" contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 40, paddingBottom: 104 }} showsVerticalScrollIndicator={false}>
        <View className="items-center py-16 bg-white border border-neutral-100 rounded-3xl px-5">
          <BrandMark size="lg" />
          <Text className="text-2xl font-bold text-neutral-950 mt-6 mb-2">Tu perfil Permutapp</Text>
          <Text className="text-neutral-500 text-sm text-center leading-5 mb-6">
            Inicia sesión para ver tus datos, estado de verificación, publicaciones y próximas permutas.
          </Text>
          <PrimaryButton icon="sign-in" onPress={() => router.push('/login')} className="w-full">
            Iniciar sesión
          </PrimaryButton>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView className="flex-1 bg-neutral-50" contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 28, paddingBottom: 104 }} showsVerticalScrollIndicator={false}>
      <SectionHeader title="Perfil" eyebrow="Cuenta" />

      <View className="bg-brand-900 rounded-3xl p-5 mb-5 overflow-hidden">
        <View className="absolute right-0 top-0 w-28 h-full bg-teal-800 opacity-60" />
        <View className="flex-row items-center z-10">
          <View className="w-24 h-24 rounded-3xl bg-white/10 border border-white/10 items-center justify-center mr-4">
            <Text className="text-white font-bold text-3xl">{user.name.charAt(0).toUpperCase()}</Text>
          </View>
          <View className="flex-1">
            <Text className="text-white text-xl font-bold" numberOfLines={2}>{user.name}</Text>
            <Text className="text-brand-100 text-sm mt-1" numberOfLines={1}>{user.email}</Text>
            <View className="self-start bg-white/10 rounded-full px-3 py-1 mt-3">
              <Text className="text-brand-100 text-xs font-bold">{user.biometricVerified ? 'Cuenta verificada' : 'Verificación pendiente'}</Text>
            </View>
          </View>
        </View>
      </View>

      <View className="gap-3 mb-5">
        <InfoBanner
          icon={user.biometricVerified ? 'check-circle' : 'shield'}
          title="Verificación biométrica"
          body={user.biometricVerified ? 'Tu cuenta ya cuenta con verificación facial.' : 'Completa la verificación para aumentar la confianza al permutar.'}
          tone={user.biometricVerified ? 'brand' : 'amber'}
        />
        <InfoBanner
          icon="key"
          title="Sesión segura"
          body={token ? 'Tu sesión local mantiene un JWT activo para consumir los servicios.' : 'No se encontró un token activo.'}
          tone="neutral"
        />
      </View>

      <PrimaryButton icon="plus" onPress={() => router.push('/publish' as Href)} className="mb-3">
        Publicar producto
      </PrimaryButton>
      <PrimaryButton icon="sign-out" variant="ghost" onPress={logout}>
        Cerrar sesión
      </PrimaryButton>
    </ScrollView>
  );
}
