/**
 * AuthLayout.tsx — Layout para las pantallas de autenticación de Permutapp.
 */

import FontAwesome from '@expo/vector-icons/FontAwesome';
import { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { BrandBanner } from '../components/ui';

interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <View className="flex-1 flex-row w-full bg-neutral-50">
      <View className="hidden md:flex flex-1 bg-brand-900 justify-center items-center p-16 overflow-hidden">
        <View className="absolute inset-x-0 top-0 h-52 bg-brand-800 opacity-70" />
        <View className="absolute left-0 bottom-0 right-0 h-44 bg-teal-900 opacity-60" />

        <View className="z-10 max-w-md">
          <View className="mb-8">
            <BrandBanner />
          </View>
          <Text className="text-brand-100 text-lg text-center leading-7">
            Intercambia objetos con confianza, reutiliza recursos y coordina encuentros seguros dentro de tu comunidad.
          </Text>

          <View className="mt-10 gap-3">
            <View className="bg-white/10 border border-white/10 rounded-3xl p-4 flex-row items-center">
              <View className="w-11 h-11 rounded-2xl bg-white/10 items-center justify-center mr-4">
                <FontAwesome name="shield" size={17} color="#a7f3d0" />
              </View>
              <View className="flex-1">
                <Text className="text-white font-bold text-base">Identidad verificada</Text>
                <Text className="text-brand-200 text-xs mt-1">Registro con datos y validación biométrica.</Text>
              </View>
            </View>

            <View className="bg-white/10 border border-white/10 rounded-3xl p-4 flex-row items-center">
              <View className="w-11 h-11 rounded-2xl bg-white/10 items-center justify-center mr-4">
                <FontAwesome name="map-marker" size={18} color="#fde68a" />
              </View>
              <View className="flex-1">
                <Text className="text-white font-bold text-base">Permutas locales</Text>
                <Text className="text-brand-200 text-xs mt-1">Productos cercanos y puntos de encuentro seguros.</Text>
              </View>
            </View>

            <View className="bg-white/10 border border-white/10 rounded-3xl p-4 flex-row items-center">
              <View className="w-11 h-11 rounded-2xl bg-white/10 items-center justify-center mr-4">
                <FontAwesome name="leaf" size={17} color="#6ee7b7" />
              </View>
              <View className="flex-1">
                <Text className="text-white font-bold text-base">Economía circular</Text>
                <Text className="text-brand-200 text-xs mt-1">Menos residuos, más valor para cada objeto.</Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      <View className="flex-1 bg-white">
        <View className="w-full max-w-md flex-1 self-center">
          {children}
        </View>
      </View>
    </View>
  );
}
