/**
 * register.tsx — Pantalla de registro de usuario de Permutapp.
 *
 * Implementa un flujo de registro en dos pasos:
 * 1. Formulario de datos personales: nombre, email, contraseña, confirmar contraseña.
 * 2. Verificación biométrica: captura del rostro para validar identidad con Amazon Rekognition.
 *
 * La validación de campos es inline (debajo de cada input) con:
 * - Nombre: obligatorio.
 * - Email: formato válido con regex.
 * - Contraseña: mínimo 8 caracteres + al menos 1 carácter especial.
 * - Confirmar contraseña: debe coincidir con la contraseña.
 *
 * El paso de verificación biométrica puede omitirse y completarse después.
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

/** Expresión regular para validar el formato del correo electrónico. */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Expresión regular para verificar la presencia de al menos un carácter especial. */
const SPECIAL_CHAR_REGEX = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/;

/** Tipo que define los posibles errores de validación por campo. */
interface FieldErrors {
  /** Error del campo nombre. */
  name?: string;
  /** Error del campo correo electrónico. */
  email?: string;
  /** Error del campo contraseña. */
  password?: string;
  /** Error del campo confirmar contraseña. */
  confirmPassword?: string;
}

/**
 * Register — Pantalla de registro con flujo de dos pasos.
 *
 * Paso 1: Formulario de datos personales con validación inline.
 * Paso 2: Verificación biométrica con instrucciones y botón de cámara.
 */
export default function Register() {
  /** Paso actual del registro: 'form' (formulario) o 'biometric' (verificación facial). */
  const [step, setStep] = useState<'form' | 'biometric'>('form');
  /** Nombre completo ingresado por el usuario. */
  const [name, setName] = useState('');
  /** Correo electrónico ingresado por el usuario. */
  const [email, setEmail] = useState('');
  /** Contraseña ingresada por el usuario. */
  const [password, setPassword] = useState('');
  /** Confirmación de contraseña para verificar que coincida. */
  const [confirmPassword, setConfirmPassword] = useState('');
  /** Controla si la contraseña se muestra u oculta. */
  const [showPassword, setShowPassword] = useState(false);
  /** Errores de validación por campo. */
  const [errors, setErrors] = useState<FieldErrors>({});
  /** Estado de carga del contexto de autenticación. */
  const { isLoading } = useAuth();
  /** Hook de navegación de Expo Router. */
  const router = useRouter();

  /**
   * clearError — Limpia el error de un campo específico.
   * Se ejecuta cada vez que el usuario escribe en un input, para que el
   * mensaje de error desaparezca al corregir el valor.
   *
   * @param field - Nombre del campo cuyo error se desea limpiar.
   */
  const clearError = (field: keyof FieldErrors) => {
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  /**
   * validate — Valida todos los campos del formulario de registro.
   *
   * Reglas de validación:
   * - Nombre: obligatorio.
   * - Email: obligatorio + formato válido.
   * - Contraseña: obligatoria + mínimo 8 caracteres + carácter especial.
   * - Confirmar contraseña: obligatoria + debe coincidir con la contraseña.
   *
   * @returns true si todos los campos son válidos, false si hay errores.
   */
  const validate = (): boolean => {
    const e: FieldErrors = {};

    if (!name.trim()) e.name = 'El nombre es obligatorio.';

    if (!email.trim()) {
      e.email = 'El correo es obligatorio.';
    } else if (!EMAIL_REGEX.test(email.trim())) {
      e.email = 'Ingresa un correo válido (ej. tu@email.com).';
    }

    if (!password.trim()) {
      e.password = 'La contraseña es obligatoria.';
    } else if (password.length < 8) {
      e.password = 'Debe tener al menos 8 caracteres.';
    } else if (!SPECIAL_CHAR_REGEX.test(password)) {
      e.password = 'Debe incluir al menos un carácter especial (!@#$%...).';
    }

    if (!confirmPassword.trim()) {
      e.confirmPassword = 'Confirma tu contraseña.';
    } else if (password !== confirmPassword) {
      e.confirmPassword = 'Las contraseñas no coinciden.';
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  /**
   * handleRegister — Procesa el envío del formulario de registro.
   * Si la validación pasa, avanza al paso de verificación biométrica.
   */
  const handleRegister = () => {
    if (!validate()) return;
    setStep('biometric');
  };

  /**
   * handleCaptureFace — Inicia la captura del rostro para verificación biométrica.
   *
   * TODO: Implementar con expo-camera para capturar la foto del rostro
   * y enviarla al microservicio de Spring Boot, que la procesará con
   * Amazon Rekognition para validar la identidad del usuario.
   */
  const handleCaptureFace = () => {
    console.log('Capturar rostro para Amazon Rekognition');
    router.replace('/login');
  };

  /**
   * handleSkipBiometric — Omite la verificación biométrica.
   * El usuario podrá completarla más adelante desde su perfil.
   */
  const handleSkipBiometric = () => {
    router.replace('/login');
  };

  /** Componente auxiliar para mostrar error inline */
  const FieldError = ({ message }: { message?: string }) =>
    message ? (
      <View className="flex-row items-center mt-1.5 ml-1">
        <FontAwesome name="info-circle" size={12} color="#ef4444" />
        <Text className="text-red-500 text-xs ml-1.5">{message}</Text>
      </View>
    ) : null;

  // ═══════════ PASO 2: Verificación Biométrica ═══════════
  if (step === 'biometric') {
    return (
      <AuthLayout>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
          showsVerticalScrollIndicator={false}
        >
          {/* Logo móvil */}
          <View className="items-center mb-10 md:hidden">
            <View className="w-16 h-16 rounded-2xl bg-brand-800 items-center justify-center">
              <Text className="text-white text-3xl">♻</Text>
            </View>
          </View>

          {/* Icono central */}
          <View className="items-center mb-8">
            <View className="w-28 h-28 rounded-full bg-brand-50 items-center justify-center border-2 border-brand-200 mb-6">
              <FontAwesome name="user-circle" size={56} color="#059669" />
            </View>
            <Text className="text-2xl font-bold text-neutral-900 text-center mb-2">
              Verifica tu identidad
            </Text>
            <Text className="text-neutral-500 text-sm text-center leading-5 max-w-xs">
              Para tu seguridad y la de la comunidad, necesitamos verificar tu rostro
              mediante reconocimiento facial.
            </Text>
          </View>

          {/* Instrucciones */}
          <View className="bg-brand-50 rounded-2xl p-5 mb-6">
            <View className="flex-row items-center mb-3">
              <View className="w-7 h-7 rounded-full bg-brand-200 items-center justify-center mr-3">
                <Text className="text-brand-800 text-xs font-bold">1</Text>
              </View>
              <Text className="text-neutral-700 text-sm flex-1">
                Coloca tu rostro dentro del marco
              </Text>
            </View>
            <View className="flex-row items-center mb-3">
              <View className="w-7 h-7 rounded-full bg-brand-200 items-center justify-center mr-3">
                <Text className="text-brand-800 text-xs font-bold">2</Text>
              </View>
              <Text className="text-neutral-700 text-sm flex-1">
                Asegúrate de tener buena iluminación
              </Text>
            </View>
            <View className="flex-row items-center">
              <View className="w-7 h-7 rounded-full bg-brand-200 items-center justify-center mr-3">
                <Text className="text-brand-800 text-xs font-bold">3</Text>
              </View>
              <Text className="text-neutral-700 text-sm flex-1">
                No uses lentes de sol ni cubrebocas
              </Text>
            </View>
          </View>

          {/* Botón: Abrir Cámara */}
          <TouchableOpacity
            className="w-full bg-brand-700 rounded-2xl h-14 flex-row items-center justify-center mb-4"
            onPress={handleCaptureFace}
            activeOpacity={0.85}
          >
            <FontAwesome name="camera" size={18} color="#fff" />
            <Text className="text-white font-bold text-base ml-3">
              Abrir cámara
            </Text>
          </TouchableOpacity>

          <Text className="text-neutral-400 text-xs text-center mb-6 leading-4">
            Tecnología de Amazon Rekognition · Datos protegidos
          </Text>

          {/* Botón: Verificar más tarde */}
          <TouchableOpacity
            className="items-center mb-4"
            onPress={handleSkipBiometric}
            activeOpacity={0.7}
          >
            <Text className="text-neutral-400 text-sm">
              Verificar más tarde →
            </Text>
          </TouchableOpacity>

          {/* Volver */}
          <TouchableOpacity
            className="items-center"
            onPress={() => setStep('form')}
            activeOpacity={0.7}
          >
            <Text className="text-brand-600 text-sm font-medium">
              ← Volver al formulario
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </AuthLayout>
    );
  }

  // ═══════════ PASO 1: Formulario de Registro ═══════════
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
          {/* Logo móvil */}
          <View className="items-center mb-10 md:hidden">
            <View className="w-16 h-16 rounded-2xl bg-brand-800 items-center justify-center mb-4">
              <Text className="text-white text-3xl">♻</Text>
            </View>
            <Text className="text-brand-900 text-xl font-bold tracking-tight">
              Permutapp
            </Text>
          </View>

          {/* Encabezado */}
          <Text className="text-3xl font-bold text-neutral-900 mb-1">
            Crear cuenta
          </Text>
          <Text className="text-neutral-500 mb-8 text-base leading-6">
            Únete a la comunidad de intercambio
          </Text>

          {/* Input: Nombre */}
          <View className="mb-4">
            <Text className="text-neutral-700 font-semibold mb-2 text-sm">
              Nombre completo
            </Text>
            <View
              className={`flex-row items-center bg-neutral-50 border rounded-2xl px-4 h-14 ${
                errors.name ? 'border-red-400' : 'border-neutral-200'
              }`}
            >
              <FontAwesome name="user-o" size={16} color={errors.name ? '#f87171' : '#a3a3a3'} />
              <TextInput
                className="flex-1 text-neutral-900 text-base ml-3"
                placeholder="Juan Pérez"
                placeholderTextColor="#a3a3a3"
                value={name}
                onChangeText={(t) => { setName(t); clearError('name'); }}
                autoCapitalize="words"
                editable={!isLoading}
              />
            </View>
            <FieldError message={errors.name} />
          </View>

          {/* Input: Email */}
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
                onChangeText={(t) => { setEmail(t); clearError('email'); }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                editable={!isLoading}
              />
            </View>
            <FieldError message={errors.email} />
          </View>

          {/* Input: Contraseña */}
          <View className="mb-4">
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
                placeholder="Mín. 8 caracteres + carácter especial"
                placeholderTextColor="#a3a3a3"
                value={password}
                onChangeText={(t) => { setPassword(t); clearError('password'); }}
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
            <FieldError message={errors.password} />
          </View>

          {/* Input: Confirmar Contraseña */}
          <View className="mb-6">
            <Text className="text-neutral-700 font-semibold mb-2 text-sm">
              Confirmar contraseña
            </Text>
            <View
              className={`flex-row items-center bg-neutral-50 border rounded-2xl px-4 h-14 ${
                errors.confirmPassword ? 'border-red-400' : 'border-neutral-200'
              }`}
            >
              <FontAwesome name="lock" size={17} color={errors.confirmPassword ? '#f87171' : '#a3a3a3'} />
              <TextInput
                className="flex-1 text-neutral-900 text-base ml-3"
                placeholder="Repite tu contraseña"
                placeholderTextColor="#a3a3a3"
                value={confirmPassword}
                onChangeText={(t) => { setConfirmPassword(t); clearError('confirmPassword'); }}
                secureTextEntry={!showPassword}
                editable={!isLoading}
              />
            </View>
            <FieldError message={errors.confirmPassword} />
          </View>

          {/* Botón: Crear cuenta */}
          <TouchableOpacity
            className={`w-full rounded-2xl h-14 items-center justify-center mb-4 ${
              isLoading ? 'bg-brand-400' : 'bg-brand-700'
            }`}
            onPress={handleRegister}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-bold text-base">
                Continuar
              </Text>
            )}
          </TouchableOpacity>

          {/* Aviso de verificación */}
          <View className="flex-row items-start bg-amber-50 border border-amber-100 rounded-2xl p-4 mb-6">
            <FontAwesome name="shield" size={16} color="#d97706" style={{ marginTop: 2 }} />
            <Text className="text-amber-700 text-xs ml-3 flex-1 leading-4">
              En el siguiente paso verificaremos tu identidad con reconocimiento facial
              para proteger a nuestra comunidad.
            </Text>
          </View>

          {/* Términos */}
          <Text className="text-neutral-400 text-xs text-center leading-4 mb-6">
            Al crear una cuenta aceptas nuestros{' '}
            <Text className="text-brand-600">Términos de Servicio</Text> y{' '}
            <Text className="text-brand-600">Política de Privacidad</Text>.
          </Text>

          {/* Enlace: Ya tengo cuenta */}
          <View className="flex-row justify-center">
            <Text className="text-neutral-500 text-sm">
              ¿Ya tienes cuenta?{' '}
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/login')}
              activeOpacity={0.7}
            >
              <Text className="text-brand-700 font-bold text-sm">
                Iniciar sesión
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </AuthLayout>
  );
}
