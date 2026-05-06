/**
 * login.tsx — Pantalla de inicio de sesión de Permutapp.
 *
 * Ofrece dos métodos de autenticación:
 * 1. Autenticación tradicional: correo electrónico + contraseña.
 * 2. Verificación biométrica facial: a través de Amazon Rekognition (vía Spring Boot).
 *
 * También permite:
 * - Continuar como invitado (navega a las pestañas principales).
 * - Navegar a la pantalla de registro (/register).
 *
 * La validación de campos es inline (debajo de cada input) con:
 * - Email: formato válido con regex.
 * - Contraseña: mínimo 8 caracteres + al menos 1 carácter especial.
 */

import {
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import AuthLayout from '../layouts/AuthLayout';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../services/api';

/** Expresión regular para validar el formato del correo electrónico. */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Expresión regular para verificar la presencia de al menos un carácter especial. */
const SPECIAL_CHAR_REGEX = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/;

/**
 * Login — Pantalla de inicio de sesión.
 *
 * Renderiza el formulario dentro del AuthLayout.
 * En móvil se ve a pantalla completa; en PC se muestra junto al panel de branding.
 */
export default function Login() {
  /** Correo electrónico ingresado por el usuario. */
  const [email, setEmail] = useState('');
  /** Contraseña ingresada por el usuario. */
  const [password, setPassword] = useState('');
  /** Controla si la contraseña se muestra u oculta. */
  const [showPassword, setShowPassword] = useState(false);
  /** Errores de validación por campo (email, password) y error general del servidor. */
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});
  /** Funciones y estado del contexto de autenticación. */
  const { login, isLoading } = useAuth();
  /** Hook de navegación de Expo Router. */
  const router = useRouter();

  /**
   * validate — Valida los campos del formulario antes de enviar.
   *
   * Reglas de validación:
   * - Email: obligatorio + formato válido.
   * - Contraseña: obligatoria + mínimo 8 caracteres + al menos 1 carácter especial.
   *
   * @returns true si todos los campos son válidos, false si hay errores.
   */
  const validate = (): boolean => {
    const nuevosErrores: typeof errors = {};

    if (!email.trim()) {
      nuevosErrores.email = 'El correo es obligatorio.';
    } else if (!EMAIL_REGEX.test(email.trim())) {
      nuevosErrores.email = 'Ingresa un correo válido (ej. tu@email.com).';
    }

    if (!password.trim()) {
      nuevosErrores.password = 'La contraseña es obligatoria.';
    } else if (password.length < 8) {
      nuevosErrores.password = 'Debe tener al menos 8 caracteres.';
    } else if (!SPECIAL_CHAR_REGEX.test(password)) {
      nuevosErrores.password = 'Debe incluir al menos un carácter especial (!@#$%...).';
    }

    setErrors(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  /**
   * handleLogin — Procesa el intento de inicio de sesión.
   *
   * Primero valida los campos. Si son válidos, llama a la función login()
   * del AuthContext. Si el login es exitoso, redirige a las pestañas principales.
   * Si falla, muestra un error general.
   */
  const handleLogin = async () => {
    if (!validate()) return;

    try {
      await login(email, password);
      router.replace('/(tabs)');
    } catch (error) {
      setErrors({
        general: error instanceof ApiError
          ? error.message
          : 'Credenciales incorrectas. Inténtalo de nuevo.',
      });
    }
  };

  /**
   * handleBiometricLogin — Inicia el flujo de verificación biométrica.
   *
   * TODO: Implementar la captura de rostro con expo-camera y enviar
   * la imagen al microservicio de Spring Boot para validar con Amazon Rekognition.
   */
  const handleBiometricLogin = () => {
    console.log('Iniciar flujo biométrico con Amazon Rekognition');
  };

  return (
    <AuthLayout>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Logo móvil ── */}
          <View className="items-center mb-10 md:hidden">
            <View className="w-16 h-16 rounded-2xl bg-brand-800 items-center justify-center mb-4">
              <Text className="text-white text-3xl">♻</Text>
            </View>
            <Text className="text-brand-900 text-xl font-bold tracking-tight">
              Permutapp
            </Text>
          </View>

          {/* ── Encabezado ── */}
          <Text className="text-3xl font-bold text-neutral-900 mb-1">
            Iniciar sesión
          </Text>
          <Text className="text-neutral-500 mb-8 text-base leading-6">
            Ingresa a tu cuenta para intercambiar
          </Text>

          {/* ── Error general (credenciales incorrectas) ── */}
          {errors.general ? (
            <View className="bg-red-50 border border-red-100 rounded-2xl p-4 mb-5 flex-row items-center">
              <FontAwesome name="exclamation-circle" size={16} color="#ef4444" />
              <Text className="text-red-500 ml-3 text-sm flex-1">{errors.general}</Text>
            </View>
          ) : null}

          {/* ── Input: Email ── */}
          <View className="mb-4">
            <Text className="text-neutral-700 font-semibold mb-2 text-sm">
              Correo electrónico
            </Text>
            <View
              className={`flex-row items-center bg-neutral-50 border rounded-2xl px-4 h-14 ${
                errors.email ? 'border-red-400' : 'border-neutral-200'
              }`}
            >
              <FontAwesome name="envelope-o" size={16} color={errors.email ? '#f87171' : '#a3a3a3'} />
              <TextInput
                className="flex-1 text-neutral-900 text-base ml-3"
                placeholder="tu@email.com"
                placeholderTextColor="#a3a3a3"
                value={email}
                onChangeText={(t) => { setEmail(t); if (errors.email) setErrors((p) => ({ ...p, email: undefined })); }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                editable={!isLoading}
              />
            </View>
            {errors.email ? (
              <View className="flex-row items-center mt-1.5 ml-1">
                <FontAwesome name="info-circle" size={12} color="#ef4444" />
                <Text className="text-red-500 text-xs ml-1.5">{errors.email}</Text>
              </View>
            ) : null}
          </View>

          {/* ── Input: Contraseña ── */}
          <View className="mb-2">
            <Text className="text-neutral-700 font-semibold mb-2 text-sm">
              Contraseña
            </Text>
            <View
              className={`flex-row items-center bg-neutral-50 border rounded-2xl px-4 h-14 ${
                errors.password ? 'border-red-400' : 'border-neutral-200'
              }`}
            >
              <FontAwesome name="lock" size={17} color={errors.password ? '#f87171' : '#a3a3a3'} />
              <TextInput
                className="flex-1 text-neutral-900 text-base ml-3"
                placeholder="••••••••"
                placeholderTextColor="#a3a3a3"
                value={password}
                onChangeText={(t) => { setPassword(t); if (errors.password) setErrors((p) => ({ ...p, password: undefined })); }}
                secureTextEntry={!showPassword}
                editable={!isLoading}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <FontAwesome
                  name={showPassword ? 'eye-slash' : 'eye'}
                  size={17}
                  color="#a3a3a3"
                />
              </TouchableOpacity>
            </View>
            {errors.password ? (
              <View className="flex-row items-center mt-1.5 ml-1">
                <FontAwesome name="info-circle" size={12} color="#ef4444" />
                <Text className="text-red-500 text-xs ml-1.5">{errors.password}</Text>
              </View>
            ) : null}
          </View>

          {/* ── Olvidé contraseña ── */}
          <TouchableOpacity className="self-end mb-6" activeOpacity={0.7}>
            <Text className="text-brand-600 text-sm font-medium">
              ¿Olvidaste tu contraseña?
            </Text>
          </TouchableOpacity>

          {/* ── Botón: Ingresar ── */}
          <TouchableOpacity
            className={`w-full rounded-2xl h-14 items-center justify-center mb-4 ${
              isLoading ? 'bg-brand-400' : 'bg-brand-700'
            }`}
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-bold text-base">Continuar</Text>
            )}
          </TouchableOpacity>

          {/* ── Separador ── */}
          <View className="flex-row items-center my-5">
            <View className="flex-1 h-px bg-neutral-200" />
            <Text className="mx-4 text-neutral-400 text-xs uppercase tracking-widest">
              o bien
            </Text>
            <View className="flex-1 h-px bg-neutral-200" />
          </View>

          {/* ── Botón: Verificación Biométrica ── */}
          <TouchableOpacity
            className="w-full border border-neutral-200 rounded-2xl h-14 flex-row items-center justify-center mb-4 bg-neutral-50"
            onPress={handleBiometricLogin}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            <View className="w-8 h-8 rounded-full bg-brand-100 items-center justify-center mr-3">
              <FontAwesome name="camera" size={14} color="#047857" />
            </View>
            <Text className="text-neutral-800 font-semibold text-sm">
              Verificación facial
            </Text>
          </TouchableOpacity>

          <Text className="text-neutral-400 text-xs text-center mb-8 leading-4">
            Validación de identidad con Amazon Rekognition
          </Text>

          {/* ── Enlace: Continuar como invitado ── */}
          <TouchableOpacity
            className="items-center mb-5"
            onPress={() => router.replace('/(tabs)')}
            activeOpacity={0.7}
          >
            <Text className="text-neutral-400 text-sm">
              Continuar sin cuenta →
            </Text>
          </TouchableOpacity>

          {/* ── Enlace: Registrarse ── */}
          <View className="flex-row justify-center">
            <Text className="text-neutral-500 text-sm">
              ¿Primera vez aquí?{' '}
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/register')}
              activeOpacity={0.7}
            >
              <Text className="text-brand-700 font-bold text-sm">
                Crear cuenta
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </AuthLayout>
  );
}
