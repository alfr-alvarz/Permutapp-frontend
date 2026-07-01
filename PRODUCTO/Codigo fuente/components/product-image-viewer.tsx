import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useEffect, useState } from 'react';
import { Image, Modal, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ProductImageViewerProps = {
  images: string[];
  initialIndex: number;
  visible: boolean;
  onClose: () => void;
};

export function ProductImageViewer({
  images,
  initialIndex,
  visible,
  onClose,
}: ProductImageViewerProps) {
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (visible) setActiveIndex(initialIndex);
  }, [initialIndex, visible]);

  const activeImage = images[activeIndex];
  const hasSeveralImages = images.length > 1;
  const imageHeight = Math.max(height - insets.top - insets.bottom - 136, 1);

  const showPrevious = () => {
    setActiveIndex((currentIndex) => (currentIndex - 1 + images.length) % images.length);
  };

  const showNext = () => {
    setActiveIndex((currentIndex) => (currentIndex + 1) % images.length);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black" accessibilityViewIsModal>
        <View
          className="flex-row items-center justify-between px-4"
          style={{ paddingTop: Math.max(insets.top, 12), minHeight: Math.max(insets.top, 12) + 52 }}
        >
          <Text className="text-white text-sm font-bold" style={{ fontVariant: ['tabular-nums'] }}>
            {images.length > 0 ? `${activeIndex + 1} de ${images.length}` : 'Sin foto'}
          </Text>
          <TouchableOpacity
            className="w-11 h-11 rounded-full bg-white/15 items-center justify-center"
            onPress={onClose}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Cerrar imagen ampliada"
          >
            <FontAwesome name="close" size={22} color="#ffffff" />
          </TouchableOpacity>
        </View>

        <View className="flex-1 items-center justify-center overflow-hidden">
          {activeImage ? (
            <Image
              source={{ uri: activeImage }}
              resizeMode="contain"
              accessibilityLabel={`Foto ${activeIndex + 1} de ${images.length} del producto`}
              style={{ width, height: imageHeight }}
            />
          ) : null}

          {hasSeveralImages ? (
            <>
              <TouchableOpacity
                className="absolute left-4 w-12 h-12 rounded-full bg-black/60 border border-white/20 items-center justify-center"
                onPress={showPrevious}
                activeOpacity={0.78}
                accessibilityRole="button"
                accessibilityLabel="Ver foto anterior"
              >
                <FontAwesome name="chevron-left" size={18} color="#ffffff" />
              </TouchableOpacity>
              <TouchableOpacity
                className="absolute right-4 w-12 h-12 rounded-full bg-black/60 border border-white/20 items-center justify-center"
                onPress={showNext}
                activeOpacity={0.78}
                accessibilityRole="button"
                accessibilityLabel="Ver foto siguiente"
              >
                <FontAwesome name="chevron-right" size={18} color="#ffffff" />
              </TouchableOpacity>
            </>
          ) : null}
        </View>

        <View
          className="items-center justify-center px-5"
          style={{ paddingBottom: Math.max(insets.bottom, 12), minHeight: Math.max(insets.bottom, 12) + 52 }}
        >
          <Text className="text-neutral-300 text-sm text-center">
            Imagen ajustada al tamaño de tu pantalla
          </Text>
        </View>
      </View>
    </Modal>
  );
}
