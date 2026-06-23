import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { BrandBanner, InfoBanner, PrimaryButton } from '@/components/ui';
import AuthLayout from '@/layouts/AuthLayout';
import {
  ApiError,
  LocalImageFile,
  restablecerPassword,
  verificarIdentidadParaRecuperacion,
} from '@/services/api';

type ImageKind = 'carnet' | 'selfie';
type SelectedImage = LocalImageFile & { label: string };

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SPECIAL_CHAR_REGEX = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/;

function toLocalImageFile(asset: ImagePicker.ImagePickerAsset, fallbackName: string): SelectedImage {
  const type = asset.file?.type
    || asset.mimeType
    || (asset.uri.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg');
  return {
    uri: asset.uri,
    name: asset.fileName || fallbackName,
    type,
    file: asset.file,
    size: asset.fileSize,
    label: asset.fileName || fallbackName,
  };
}

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [carnet, setCarnet] = useState<SelectedImage | null>(null);
  const [selfie, setSelfie] = useState<SelectedImage | null>(null);
  const [recoveryToken, setRecoveryToken] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const pickImage = async (kind: ImageKind) => {
    setError(null);
    const permission = kind === 'selfie'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      setError(kind === 'selfie'
        ? 'Permite usar la cámara para tomar una selfie actual.'
        : 'Permite acceder a tus fotos para seleccionar el carnet.');
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

    if (response.canceled || !response.assets[0]) return;

    const selected = toLocalImageFile(
      response.assets[0],
      kind === 'selfie' ? 'selfie.jpg' : 'carnet.jpg',
    );
    if (kind === 'selfie') setSelfie(selected);
    else setCarnet(selected);
  };

  const verifyIdentity = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !EMAIL_REGEX.test(normalizedEmail)) {
      setError('Ingresa un correo electrónico válido.');
      return;
    }
    if (!carnet || !selfie) {
      setError('Selecciona la foto del carnet y toma una selfie actual.');
      return;
    }

    setError(null);
    setSuccess(null);
    setIsLoading(true);
    try {
      const response = await verificarIdentidadParaRecuperacion({
        email: normalizedEmail,
        carnet,
        selfie,
      });
      setRecoveryToken(response.recoveryToken);
      setSuccess(response.message);
    } catch (requestError) {
      setError(requestError instanceof ApiError
        ? requestError.message
        : 'No fue posible confirmar tu identidad. Inténtalo nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async () => {
    if (!recoveryToken) return;
    if (newPassword.length < 8) {
      setError('La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (!SPECIAL_CHAR_REGEX.test(newPassword)) {
      setError('La nueva contraseña debe incluir al menos un carácter especial.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setError(null);
    setIsLoading(true);
    try {
      await restablecerPassword({ recoveryToken, newPassword });
      setSuccess('Contraseña actualizada. Ya puedes iniciar sesión con tu nueva contraseña.');
      setCompleted(true);
      setRecoveryToken(null);
    } catch (requestError) {
      setError(requestError instanceof ApiError
        ? requestError.message
        : 'No fue posible actualizar la contraseña.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 32, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="mb-6 md:hidden">
            <BrandBanner />
          </View>

          <TouchableOpacity
            className="self-start mb-5 flex-row items-center"
            onPress={() => router.replace('/login')}
            activeOpacity={0.75}
          >
            <FontAwesome name="chevron-left" size={13} color="#047857" />
            <Text className="text-brand-700 font-bold ml-2">Volver al login</Text>
          </TouchableOpacity>

          <Text className="text-3xl font-bold text-neutral-950 mb-2">
            Recuperar contraseña
          </Text>
          <Text className="text-neutral-500 text-base leading-6 mb-6">
            Confirmaremos tu identidad nuevamente usando el carnet y una selfie actual.
          </Text>

          {error ? (
            <View className="mb-4">
              <InfoBanner icon="exclamation-circle" title="No se pudo continuar" body={error} tone="red" />
            </View>
          ) : null}
          {success ? (
            <View className="mb-4">
              <InfoBanner
                icon="check-circle"
                title={completed ? 'Contraseña actualizada' : 'Identidad confirmada'}
                body={success}
                tone="brand"
              />
            </View>
          ) : null}

          {completed ? (
            <PrimaryButton
              icon="sign-in"
              onPress={() => router.replace('/login')}
            >
              Volver al login
            </PrimaryButton>
          ) : !recoveryToken ? (
            <>
              <Text className="text-neutral-700 font-semibold mb-2 text-sm">Correo electrónico</Text>
              <View className="flex-row items-center bg-neutral-50 border border-neutral-200 rounded-2xl px-4 h-14 mb-4">
                <FontAwesome name="envelope-o" size={16} color="#a3a3a3" />
                <TextInput
                  className="flex-1 text-neutral-900 text-base ml-3"
                  placeholder="tu@email.com"
                  placeholderTextColor="#a3a3a3"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  editable={!isLoading}
                />
              </View>

              <ImageCard
                icon="id-card-o"
                title="Foto del carnet"
                body="Debe verse completo, frontal y con buena iluminación."
                image={carnet}
                buttonLabel="Seleccionar carnet"
                onPress={() => pickImage('carnet')}
              />
              <View className="h-4" />
              <ImageCard
                icon="camera"
                title="Selfie actual"
                body="Mantén tu rostro visible y sin accesorios que lo cubran."
                image={selfie}
                buttonLabel="Tomar selfie"
                onPress={() => pickImage('selfie')}
              />

              <PrimaryButton
                icon="shield"
                loading={isLoading}
                disabled={!email.trim() || !carnet || !selfie || isLoading}
                onPress={verifyIdentity}
                className="mt-5"
              >
                Confirmar identidad
              </PrimaryButton>
            </>
          ) : (
            <>
              <PasswordInput
                label="Nueva contraseña"
                value={newPassword}
                onChangeText={setNewPassword}
                visible={showPassword}
                onToggle={() => setShowPassword((current) => !current)}
              />
              <PasswordInput
                label="Confirmar nueva contraseña"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                visible={showPassword}
                onToggle={() => setShowPassword((current) => !current)}
              />
              <Text className="text-neutral-400 text-xs leading-5 mb-5">
                Usa al menos 8 caracteres e incluye un carácter especial.
              </Text>
              <PrimaryButton
                icon="lock"
                loading={isLoading}
                disabled={!newPassword || !confirmPassword || isLoading}
                onPress={resetPassword}
              >
                Guardar nueva contraseña
              </PrimaryButton>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </AuthLayout>
  );
}

function ImageCard({
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
          <Image source={{ uri: image.uri }} className="w-full h-44" resizeMode="cover" />
        </View>
      ) : null}
      <TouchableOpacity
        className="h-12 rounded-2xl bg-neutral-100 flex-row items-center justify-center mt-4"
        onPress={onPress}
        activeOpacity={0.85}
      >
        <FontAwesome name="upload" size={14} color="#525252" />
        <Text className="text-neutral-700 font-bold ml-2">{buttonLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}

function PasswordInput({
  label,
  value,
  onChangeText,
  visible,
  onToggle,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  visible: boolean;
  onToggle: () => void;
}) {
  return (
    <View className="mb-4">
      <Text className="text-neutral-700 font-semibold mb-2 text-sm">{label}</Text>
      <View className="flex-row items-center bg-neutral-50 border border-neutral-200 rounded-2xl px-4 h-14">
        <FontAwesome name="lock" size={17} color="#a3a3a3" />
        <TextInput
          className="flex-1 text-neutral-900 text-base ml-3"
          placeholder="••••••••"
          placeholderTextColor="#a3a3a3"
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={!visible}
          autoCapitalize="none"
        />
        <TouchableOpacity
          onPress={onToggle}
          accessibilityLabel={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <FontAwesome name={visible ? 'eye-slash' : 'eye'} size={17} color="#a3a3a3" />
        </TouchableOpacity>
      </View>
    </View>
  );
}
