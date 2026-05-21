import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Href, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { InfoBanner, PrimaryButton, SectionHeader } from '@/components/ui';
import { crearProducto, crearPublicacion, ApiError } from '../services/api';
import { useAuth } from '../context/AuthContext';
import MainLayout from '../layouts/MainLayout';

const ESTADOS = ['Nuevo', 'Como nuevo', 'Buen estado', 'Aceptable'];

interface PublishErrors {
  titulo?: string;
  descripcion?: string;
  nombre?: string;
  precio?: string;
  general?: string;
}

export default function PublishScreen() {
  const router = useRouter();
  const { user, isAuthenticated, isRestoring } = useAuth();
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [nombre, setNombre] = useState('');
  const [estado, setEstado] = useState(ESTADOS[1]);
  const [precio, setPrecio] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<PublishErrors>({});

  const clearError = (field: keyof PublishErrors) => {
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validate = () => {
    const nextErrors: PublishErrors = {};
    const precioNumerico = Number(precio.replace(/\D/g, ''));

    if (!titulo.trim()) nextErrors.titulo = 'El título es obligatorio.';
    if (!descripcion.trim()) nextErrors.descripcion = 'La descripción es obligatoria.';
    if (!nombre.trim()) nextErrors.nombre = 'El nombre del producto es obligatorio.';
    if (!Number.isInteger(precioNumerico) || precioNumerico < 0) nextErrors.precio = 'Ingresa un valor referencial válido.';

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!isAuthenticated || !user) {
      router.replace('/login');
      return;
    }

    if (!validate()) return;

    try {
      setIsSubmitting(true);
      const publicacion = await crearPublicacion({
        publ_titulo: titulo.trim(),
        publ_descripcion: descripcion.trim(),
        usu_id: Number(user.id),
      });
      const producto = await crearProducto({
        prod_nombre: nombre.trim(),
        prod_est: estado,
        prod_precio: Number(precio.replace(/\D/g, '')),
        publ_id: publicacion.publ_id,
      });
      router.replace(`/product/${producto.prod_id}` as Href);
    } catch (error) {
      setErrors((prev) => ({
        ...prev,
        general: error instanceof ApiError ? error.message : 'No fue posible publicar el producto.',
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (!isRestoring && !isAuthenticated) router.replace('/login');
  }, [isAuthenticated, isRestoring, router]);

  const FieldError = ({ message }: { message?: string }) => message ? <Text className="text-red-500 text-xs mt-1.5 ml-1">{message}</Text> : null;

  return (
    <MainLayout>
      <KeyboardAvoidingView className="flex-1 bg-neutral-50" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {isRestoring || !isAuthenticated ? (
          <View className="flex-1 items-center justify-center px-5">
            <ActivityIndicator color="#047857" />
            <Text className="text-neutral-500 text-sm mt-4">Preparando publicación</Text>
          </View>
        ) : (
          <ScrollView className="flex-1" keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 36 }}>
            <View className="px-5 pt-6 pb-8">
              <TouchableOpacity className="w-11 h-11 rounded-2xl bg-white border border-neutral-100 items-center justify-center mb-5" onPress={() => router.back()} activeOpacity={0.75}>
                <FontAwesome name="chevron-left" size={14} color="#404040" />
              </TouchableOpacity>

              <SectionHeader title="Publicar producto" eyebrow="Nueva permuta" />
              <InfoBanner icon="leaf" title="Publica con contexto" body="Mientras más claro sea el estado y lo que buscas a cambio, más fácil será recibir propuestas útiles." />

              {errors.general ? <View className="mt-4"><InfoBanner icon="exclamation-circle" title="No se pudo publicar" body={errors.general} tone="red" /></View> : null}

              <View className="mt-6 bg-white border border-neutral-100 rounded-3xl p-5">
                <View className="mb-4">
                  <Text className="text-neutral-800 font-bold mb-2 text-sm">Título de publicación</Text>
                  <TextInput className={`bg-neutral-50 border rounded-2xl px-4 h-14 text-neutral-900 text-base ${errors.titulo ? 'border-red-400' : 'border-neutral-200'}`} placeholder="Ej: Cambio notebook por bicicleta" placeholderTextColor="#a3a3a3" value={titulo} onChangeText={(text) => { setTitulo(text); clearError('titulo'); }} editable={!isSubmitting} />
                  <FieldError message={errors.titulo} />
                </View>

                <View className="mb-4">
                  <Text className="text-neutral-800 font-bold mb-2 text-sm">Nombre del producto</Text>
                  <TextInput className={`bg-neutral-50 border rounded-2xl px-4 h-14 text-neutral-900 text-base ${errors.nombre ? 'border-red-400' : 'border-neutral-200'}`} placeholder="Ej: Notebook Lenovo ThinkPad" placeholderTextColor="#a3a3a3" value={nombre} onChangeText={(text) => { setNombre(text); clearError('nombre'); }} editable={!isSubmitting} />
                  <FieldError message={errors.nombre} />
                </View>

                <View className="mb-4">
                  <Text className="text-neutral-800 font-bold mb-2 text-sm">Descripción</Text>
                  <TextInput className={`bg-neutral-50 border rounded-2xl px-4 py-4 min-h-32 text-neutral-900 text-base ${errors.descripcion ? 'border-red-400' : 'border-neutral-200'}`} placeholder="Cuenta el estado, uso y qué buscas a cambio." placeholderTextColor="#a3a3a3" value={descripcion} onChangeText={(text) => { setDescripcion(text); clearError('descripcion'); }} multiline textAlignVertical="top" editable={!isSubmitting} />
                  <FieldError message={errors.descripcion} />
                </View>

                <View className="mb-4">
                  <Text className="text-neutral-800 font-bold mb-2 text-sm">Estado</Text>
                  <View className="flex-row flex-wrap">
                    {ESTADOS.map((item) => (
                      <TouchableOpacity key={item} className={`mr-2 mb-2 px-4 h-10 rounded-full items-center justify-center border ${estado === item ? 'bg-brand-700 border-brand-700' : 'bg-neutral-50 border-neutral-200'}`} onPress={() => setEstado(item)} activeOpacity={0.75} disabled={isSubmitting}>
                        <Text className={`text-xs font-bold ${estado === item ? 'text-white' : 'text-neutral-600'}`}>{item}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View className="mb-6">
                  <Text className="text-neutral-800 font-bold mb-2 text-sm">Valor referencial</Text>
                  <TextInput className={`bg-neutral-50 border rounded-2xl px-4 h-14 text-neutral-900 text-base ${errors.precio ? 'border-red-400' : 'border-neutral-200'}`} placeholder="Ej: 150000" placeholderTextColor="#a3a3a3" value={precio} onChangeText={(text) => { setPrecio(text); clearError('precio'); }} keyboardType="number-pad" editable={!isSubmitting} />
                  <FieldError message={errors.precio} />
                </View>

                <PrimaryButton icon="check" loading={isSubmitting} onPress={handleSubmit}>
                  Publicar
                </PrimaryButton>
              </View>
            </View>
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </MainLayout>
  );
}
