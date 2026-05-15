import FontAwesome from '@expo/vector-icons/FontAwesome';
import { ReactNode } from 'react';
import { ActivityIndicator, Image, Text, TouchableOpacity, View } from 'react-native';

type IconName = React.ComponentProps<typeof FontAwesome>['name'];

const brandIcon = require('../assets/images/permutapp-app-icon.png');
const brandBanner = require('../assets/images/permutapp-brand-banner.png');

interface BrandMarkProps {
  size?: 'sm' | 'md' | 'lg';
}

export function BrandMark({ size = 'md' }: BrandMarkProps) {
  const boxSize = size === 'lg' ? 'w-20 h-20 rounded-3xl' : size === 'sm' ? 'w-11 h-11 rounded-2xl' : 'w-16 h-16 rounded-3xl';

  return (
    <View className={`${boxSize} bg-white items-center justify-center overflow-hidden`}>
      <Image source={brandIcon} className="w-full h-full" resizeMode="cover" />
    </View>
  );
}

export function BrandBanner() {
  return (
    <View className="w-full rounded-3xl bg-white overflow-hidden border border-neutral-100">
      <Image source={brandBanner} className="w-full h-32" resizeMode="contain" />
    </View>
  );
}

interface PrimaryButtonProps {
  children: ReactNode;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost';
  onPress: () => void;
  className?: string;
}

export function PrimaryButton({
  children,
  icon,
  loading,
  disabled,
  variant = 'primary',
  onPress,
  className = '',
}: PrimaryButtonProps) {
  const variantClass = {
    primary: disabled || loading ? 'bg-brand-400' : 'bg-brand-700',
    secondary: 'bg-brand-50 border border-brand-200',
    ghost: 'bg-neutral-100',
  }[variant];
  const textClass = variant === 'primary' ? 'text-white' : variant === 'secondary' ? 'text-brand-800' : 'text-neutral-700';
  const iconColor = variant === 'primary' ? '#ffffff' : variant === 'secondary' ? '#047857' : '#525252';

  return (
    <TouchableOpacity
      className={`h-14 rounded-2xl items-center justify-center flex-row ${variantClass} ${className}`}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#fff' : '#047857'} />
      ) : (
        <>
          {icon ? <FontAwesome name={icon} size={15} color={iconColor} /> : null}
          <Text className={`${textClass} font-bold text-base ${icon ? 'ml-3' : ''}`}>{children}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

interface SectionHeaderProps {
  title: string;
  eyebrow?: string;
  actionLabel?: string;
  onActionPress?: () => void;
}

export function SectionHeader({ title, eyebrow, actionLabel, onActionPress }: SectionHeaderProps) {
  return (
    <View className="flex-row items-end justify-between mb-4">
      <View className="flex-1 pr-4">
        {eyebrow ? (
          <Text className="text-brand-700 text-xs uppercase tracking-widest font-bold mb-1">{eyebrow}</Text>
        ) : null}
        <Text className="text-neutral-950 text-xl font-bold">{title}</Text>
      </View>
      {actionLabel && onActionPress ? (
        <TouchableOpacity onPress={onActionPress} activeOpacity={0.75}>
          <Text className="text-brand-700 text-sm font-bold">{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

interface InfoBannerProps {
  icon: IconName;
  title: string;
  body: string;
  tone?: 'brand' | 'amber' | 'red' | 'neutral';
}

export function InfoBanner({ icon, title, body, tone = 'brand' }: InfoBannerProps) {
  const toneClass = {
    brand: { box: 'bg-brand-50 border-brand-100', icon: 'bg-brand-100', color: '#047857', title: 'text-brand-900', body: 'text-brand-800' },
    amber: { box: 'bg-amber-50 border-amber-100', icon: 'bg-amber-100', color: '#d97706', title: 'text-amber-900', body: 'text-amber-800' },
    red: { box: 'bg-red-50 border-red-100', icon: 'bg-red-100', color: '#ef4444', title: 'text-red-900', body: 'text-red-700' },
    neutral: { box: 'bg-neutral-50 border-neutral-100', icon: 'bg-white', color: '#525252', title: 'text-neutral-900', body: 'text-neutral-500' },
  }[tone];

  return (
    <View className={`border rounded-3xl p-4 flex-row ${toneClass.box}`}>
      <View className={`w-10 h-10 rounded-2xl items-center justify-center mr-3 ${toneClass.icon}`}>
        <FontAwesome name={icon} size={16} color={toneClass.color} />
      </View>
      <View className="flex-1">
        <Text className={`${toneClass.title} font-bold text-sm`}>{title}</Text>
        <Text className={`${toneClass.body} text-xs leading-5 mt-1`}>{body}</Text>
      </View>
    </View>
  );
}

interface EmptyStateProps {
  icon: IconName;
  title: string;
  body: string;
}

export function EmptyState({ icon, title, body }: EmptyStateProps) {
  return (
    <View className="items-center py-14 px-5 bg-neutral-50 rounded-3xl border border-neutral-100">
      <View className="w-16 h-16 rounded-3xl bg-white items-center justify-center mb-4 border border-neutral-100">
        <FontAwesome name={icon} size={24} color="#a3a3a3" />
      </View>
      <Text className="text-neutral-900 font-bold text-base text-center">{title}</Text>
      <Text className="text-neutral-500 text-sm text-center leading-5 mt-2">{body}</Text>
    </View>
  );
}

interface ProductCardProps {
  title: string;
  subtitle: string;
  status: string;
  price?: number;
  onPress: () => void;
}

export function ProductCard({ title, subtitle, status, price, onPress }: ProductCardProps) {
  return (
    <View className="bg-white border border-neutral-100 rounded-3xl p-4 mb-3 flex-row items-center">
      <View className="w-16 h-16 rounded-3xl bg-teal-50 items-center justify-center mr-4 border border-teal-100">
        <FontAwesome name="cube" size={24} color="#0f766e" />
      </View>

      <View className="flex-1 mr-3">
        <Text className="text-neutral-950 font-bold text-base" numberOfLines={1}>{title}</Text>
        <Text className="text-neutral-500 text-xs mt-1" numberOfLines={1}>{subtitle}</Text>
        <View className="flex-row items-center mt-2 flex-wrap">
          <View className="bg-brand-50 border border-brand-100 rounded-full px-2.5 py-1 mr-2">
            <Text className="text-brand-700 text-xs font-bold">{status}</Text>
          </View>
          {price !== undefined ? (
            <Text className="text-neutral-500 text-xs font-semibold">
              ${price.toLocaleString('es-CL')}
            </Text>
          ) : null}
        </View>
      </View>

      <TouchableOpacity
        className="w-11 h-11 rounded-2xl bg-brand-700 items-center justify-center"
        onPress={onPress}
        activeOpacity={0.85}
      >
        <FontAwesome name="chevron-right" size={13} color="#ffffff" />
      </TouchableOpacity>
    </View>
  );
}
