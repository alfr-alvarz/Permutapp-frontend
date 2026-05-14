/**
 * MainLayout.tsx — Layout principal para vistas móviles centradas en web.
 */

import { ReactNode } from 'react';
import { View } from 'react-native';

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <View className="flex-1 bg-slate-100 items-center w-full">
      <View className="w-full flex-1 max-w-lg bg-white md:shadow-lg md:border-x md:border-neutral-200">
        {children}
      </View>
    </View>
  );
}
