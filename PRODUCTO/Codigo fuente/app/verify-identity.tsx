import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as ImagePicker from 'expo-image-picker';
import { Href, useRouter } from 'expo-router';
import { useState } from 'react';
import { Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';

import { BrandBanner, InfoBanner, PrimaryButton } from '@/components/ui';
import { useAuth } from '../context/AuthContext';
import { LocalImageFile, VerificacionIdentidad } from '../services/api';

type ImageKind = 'carnet' | 'selfie';

type SelectedImage = LocalImageFile & {
  label: string;
};

function toLocalImageFile(asset: ImagePicker.ImagePickerAsset, fallbackName: string): SelectedImage {
  const type = asset.file?.type || asset.mimeType || (asset.uri.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg');
  return {
    uri: asset.uri,
    name: asset.fileName || fallbackName,
    type,
    file: asset.file,
    size: asset.fileSize,
    label: asset.fileName || fallbackName,
  };
}

function getStatusText(result: VerificacionIdentidad | null): string {
  if (!result) return 'Pendiente';
  if (result.ver_estado === 'APROBADA') return 'Aprobada';
  if (result.ver_estado === 'RECHAZADA') return 'Rechazada';
  if (result.ver_estado === 'REVISION_MANUAL') return 'Revisión manual';
  return 'Pendiente';
}

function getStatusTone(result: VerificacionIdentidad | null): 'brand' | 'amber' | 'red' | 'neutral' {
  if (!result) return 'neutral';
  if (result.ver_estado === 'APROBADA') return 'brand';
  if (result.ver_estado === 'RECHAZADA') return 'red';
  return 'amber';
}

export default function VerifyIdentityScreen() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, verifyIdentity } = useAuth();
  const [carnet, setCarnet] = useState<SelectedImage | null>(null);
  const [selfie, setSelfie] = useState<SelectedImage | null>(null);
  const [result, setResult] = useState<VerificacionIdentidad | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pickImage = async (kind: ImageKind) => {
    setError(null);

    const permission = kind === 'selfie'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      setError(kind === 'selfie' ? 'Permite usar la cámara para tomar la selfie.' : 'Permite acceder a tus fotos para seleccionar el carnet.');
      return;
    }

    const response = kind === 'selfie'
      ? await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          aspect: [4, 5],
          quality: 0.85,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          quality: 0.9,
        });

    if (response.canceled || !response.assets[0]) {
      return;
    }

    const selected = toLocalImageFile(response.assets[0], kind === 'selfie' ? 'selfie.jpg' : 'carnet.jpg');
    if (kind === 'selfie') {
      setSelfie(selected);
    } else {
      setCarnet(selected);
    }
  };

  const submit = async () => {
    if (!carnet || !selfie) {
      setError('Selecciona la foto del carnet y la selfie antes de verificar.');
      return;
    }

    setError(null);
    try {
      const verification = await verifyIdentity(carnet, selfie);
      setResult(verification);
      if (verification.ver_estado === 'APROBADA') {
        setTimeout(() => {
          router.replace('/(tabs)/profile' as Href);
        }, 1500);
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'No fue posible verificar la identidad.');
    }
  };

  if (!isAuthenticated || !user) {
    return (
      <ScrollView className="flex-1 bg-neutral-50" contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 48, paddingBottom: 40 }}>
        <View className="items-center py-16 bg-white border border-neutral-100 rounded-3xl px-5">
          <FontAwesome name="lock" size={34} color="#047857" />
          <Text className="text-2xl font-bold text-neutral-950 mt-5 mb-2 text-center">Inicia sesión</Text>
          <Text className="text-neutral-500 text-sm text-center leading-5 mb-6">
            Necesitas una cuenta activa para verificar identidad.
          </Text>
          <PrimaryButton icon="sign-in" onPress={() => router.replace('/login')}>Iniciar sesión</PrimaryButton>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView className="flex-1 bg-neutral-50" contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 32, paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
      <View className="mb-6 md:hidden">
        <BrandBanner />
      </View>

      <TouchableOpacity className="self-start mb-5 flex-row items-center" onPress={() => router.back()} activeOpacity={0.75}>
        <FontAwesome name="chevron-left" size={13} color="#047857" />
        <Text className="text-brand-700 font-bold ml-2">Volver</Text>
      </TouchableOpacity>

      <Text className="text-3xl font-bold text-neutral-950 mb-2">Verificar identidad</Text>
      <Text className="text-neutral-500 text-base leading-6 mb-6">
        Esto nos ayuda a cuidar tu seguridad y la de los demás usuarios. Solo el proveedor de reconocimiento accede a la imagen para validar. En Permutapp no guardamos tu rostro ni lo usamos para nada más.
      </Text>

      <View className="gap-4 mb-5">
        <ImagePickerCard
          icon="id-card-o"
          title="Foto del carnet"
          body="Debe verse claro y completo."
          image={carnet}
          buttonLabel="Seleccionar carnet"
          onPress={() => pickImage('carnet')}
        />
        <ImagePickerCard
          icon="camera"
          title="Selfie actual"
          body="Busca buena iluminación y mantén tu rostro visible."
          image={selfie}
          buttonLabel="Tomar selfie"
          onPress={() => pickImage('selfie')}
        />
      </View>

      {error ? (
        <InfoBanner icon="exclamation-circle" title="No se pudo verificar" body={error} tone="red" />
      ) : null}

      {result ? (
        <View className="mt-4">
          <InfoBanner
            icon={result.ver_estado === 'APROBADA' ? 'check-circle' : result.ver_estado === 'RECHAZADA' ? 'times-circle' : 'exclamation-circle'}
            title={`Estado: ${getStatusText(result)}`}
            body={result.ver_observacion || 'Resultado recibido desde el servicio de identidad.'}
            tone={getStatusTone(result)}
          />
          <View className="bg-white border border-neutral-100 rounded-3xl p-4 mt-3">
            <Text className="text-neutral-900 font-bold mb-2">Resultado</Text>
            <Text className="text-neutral-500 text-sm">RUN detectado: {result.ver_ocr_run_detectado || 'No detectado'}</Text>
            <Text className="text-neutral-500 text-sm mt-1">Nombre detectado: {result.ver_ocr_nombre_detectado || 'No confirmado'}</Text>
            <Text className="text-neutral-500 text-sm mt-1">Coincidencia de nombre: {result.ver_nombre_match ? 'Si' : 'No confirmada'}</Text>
          </View>
        </View>
      ) : null}

      <PrimaryButton icon="shield" loading={isLoading} disabled={!carnet || !selfie || isLoading} onPress={submit} className="mt-5">
        Enviar verificación
      </PrimaryButton>
      <PrimaryButton icon="user" variant="ghost" onPress={() => router.replace('/(tabs)/profile' as Href)} className="mt-3">
        Ir a perfil
      </PrimaryButton>
    </ScrollView>
  );
}

function ImagePickerCard({
  icon,
  title,
  body,
  image,
  buttonLabel,
  onPress,
}: {
  icon: React.ComponentProps<typeof FontAwesome>['name'];
  title: string;
  body: string;
  image: SelectedImage | null;
  buttonLabel: string;
  onPress: () => void;
}) {
  return (
    <View className="bg-white border border-neutral-100 rounded-3xl p-4">
      <View className="flex-row">
        <View className="w-11 h-11 rounded-2xl bg-brand-50 items-center justify-center mr-3">
          <FontAwesome name={icon} size={18} color="#047857" />
        </View>
        <View className="flex-1">
          <Text className="text-neutral-950 font-bold text-base">{title}</Text>
          <Text className="text-neutral-500 text-sm leading-5 mt-1">{body}</Text>
        </View>
      </View>

      {image ? (
        <View className="mt-4 overflow-hidden rounded-2xl border border-neutral-100">
          <Image source={{ uri: image.uri }} className="w-full h-48" resizeMode="cover" />
        </View>
      ) : null}

      <TouchableOpacity className="h-12 rounded-2xl bg-neutral-100 flex-row items-center justify-center mt-4" onPress={onPress} activeOpacity={0.85}>
        <FontAwesome name="upload" size={14} color="#525252" />
        <Text className="text-neutral-700 font-bold ml-2">{buttonLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}
