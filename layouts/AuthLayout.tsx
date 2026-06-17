/**
 * AuthLayout.tsx — Layout para las pantallas de autenticación de Permutapp.
 */

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
        <View className="z-10 max-w-sm w-full">
          <BrandBanner />
          <Text className="text-white text-3xl font-bold text-center mt-8">Permuta sin ruido</Text>
          <Text className="text-brand-100 text-lg text-center leading-7 mt-3">
            Publica, conversa y coordina intercambios seguros.
          </Text>
        </View>
      </View>

      <View className="flex-1 bg-neutral-50">
        <View className="w-full max-w-md flex-1 self-center bg-white md:bg-neutral-50">
          {children}
        </View>
      </View>
    </View>
  );
}
