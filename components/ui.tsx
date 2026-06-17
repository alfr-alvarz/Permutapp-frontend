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
  const dim = size === 'lg' ? 80 : size === 'sm' ? 44 : 64;
  const radius = size === 'sm' ? 14 : 20;

  return (
    <View
      style={{
        width: dim,
        height: dim,
        borderRadius: radius,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      <Image
        source={brandIcon}
        style={{ width: dim, height: dim }}
        resizeMode="cover"
      />
    </View>
  );
}

export function BrandBanner() {
  return (
    <View className="w-full rounded-2xl bg-white overflow-hidden border border-neutral-100">
      <Image
        source={brandBanner}
        style={{ width: '100%', aspectRatio: 2.9 }}
        resizeMode="contain"
      />
    </View>
  );
}

interface PrimaryButtonProps {
  children?: ReactNode;
  icon?: IconName;
  iconOnly?: boolean;
  accessibilityLabel?: string;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost';
  onPress: () => void;
  className?: string;
}

export function PrimaryButton({
  children,
  icon,
  iconOnly = false,
  accessibilityLabel,
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
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#fff' : '#047857'} />
      ) : (
        <>
          {icon ? <FontAwesome name={icon} size={15} color={iconColor} /> : null}
          {!iconOnly ? (
            <Text className={`${textClass} font-bold text-[17px] ${icon ? 'ml-3' : ''}`}>{children}</Text>
          ) : null}
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
    <View className="flex-row items-center justify-between mb-4">
      <View className="flex-1 pr-4">
        {eyebrow ? (
          <Text className="text-brand-700 text-sm font-bold mb-1">{eyebrow}</Text>
        ) : null}
        <Text className="text-neutral-950 text-2xl font-bold leading-8">{title}</Text>
      </View>
      {actionLabel && onActionPress ? (
        <TouchableOpacity className="h-10 px-3 rounded-2xl bg-white border border-neutral-100 items-center justify-center" onPress={onActionPress} activeOpacity={0.75}>
          <Text className="text-brand-700 text-sm font-bold">{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

interface InfoBannerProps {
  icon: IconName;
  title: string;
  body?: string;
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
    <View className={`border rounded-2xl p-4 flex-row ${toneClass.box}`}>
      <View className={`w-10 h-10 rounded-2xl items-center justify-center mr-3 ${toneClass.icon}`}>
        <FontAwesome name={icon} size={16} color={toneClass.color} />
      </View>
      <View className="flex-1 justify-center">
        <Text className={`${toneClass.title} font-bold text-base leading-5`}>{title}</Text>
        {body ? <Text className={`${toneClass.body} text-sm leading-5 mt-1`}>{body}</Text> : null}
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
    <View className="items-center py-12 px-5 bg-white rounded-2xl border border-neutral-100">
      <View className="w-16 h-16 rounded-2xl bg-neutral-50 items-center justify-center mb-4 border border-neutral-100">
        <FontAwesome name={icon} size={24} color="#a3a3a3" />
      </View>
      <Text className="text-neutral-900 font-bold text-xl text-center">{title}</Text>
      <Text className="text-neutral-500 text-base text-center leading-6 mt-2">{body}</Text>
    </View>
  );
}

interface ProductCardProps {
  title: string;
  subtitle: string;
  status: string;
  price?: number;
  thumbnailUrl?: string;
  onPress: () => void;
}

export function ProductCard({ title, subtitle, status, price, thumbnailUrl, onPress }: ProductCardProps) {
  return (
    <TouchableOpacity
      className="bg-white border border-neutral-100 rounded-2xl p-3 mb-3 flex-row items-center"
      onPress={onPress}
      activeOpacity={0.82}
    >
      <View className="w-20 h-20 rounded-2xl bg-teal-50 items-center justify-center mr-4 border border-teal-100 overflow-hidden">
        {thumbnailUrl ? (
          <Image source={{ uri: thumbnailUrl }} className="w-full h-full" resizeMode="cover" />
        ) : (
          <FontAwesome name="cube" size={24} color="#0f766e" />
        )}
      </View>

      <View className="flex-1 mr-3">
        <Text className="text-neutral-950 font-bold text-lg leading-6" numberOfLines={2}>{title}</Text>
        <Text className="text-neutral-500 text-sm mt-1" numberOfLines={1}>{subtitle}</Text>
        {price !== undefined ? (
          <Text className="text-neutral-950 text-lg font-bold mt-2">
            ${price.toLocaleString('es-CL')}
          </Text>
        ) : null}
      </View>

      <View className="items-end">
        <View className="bg-brand-50 border border-brand-100 rounded-full px-2.5 py-1 mb-3">
          <Text className="text-brand-700 text-xs font-bold">{status}</Text>
        </View>
        <FontAwesome name="chevron-right" size={13} color="#a3a3a3" />
      </View>
    </TouchableOpacity>
  );
}
