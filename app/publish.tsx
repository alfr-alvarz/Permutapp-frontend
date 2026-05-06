import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Href, useRouter } from 'expo-router';
import { useState } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { crearProducto, crearPublicacion, ApiError } from '../services/api';
import { useAuth } from '../context/AuthContext';

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
  const { user, isAuthenticated } = useAuth();
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
    if (!Number.isInteger(precioNumerico) || precioNumerico < 0) {
      nextErrors.precio = 'Ingresa un valor referencial válido.';
    }

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

  const FieldError = ({ message }: { message?: string }) =>
    message ? <Text className="text-red-500 text-xs mt-1.5 ml-1">{message}</Text> : null;

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView className="flex-1" keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View className="px-5 pt-6 pb-8">
          <TouchableOpacity
            className="w-11 h-11 rounded-full bg-neutral-100 items-center justify-center mb-5"
            onPress={() => router.back()}
            activeOpacity={0.75}
          >
            <FontAwesome name="chevron-left" size={14} color="#404040" />
          </TouchableOpacity>

          <Text className="text-3xl font-bold text-neutral-900 mb-1">Publicar producto</Text>
          <Text className="text-neutral-500 text-base mb-7">Comparte un objeto disponible para permuta.</Text>

          {errors.general ? (
            <View className="bg-red-50 border border-red-100 rounded-2xl p-4 mb-5 flex-row items-center">
              <FontAwesome name="exclamation-circle" size={16} color="#ef4444" />
              <Text className="text-red-500 ml-3 text-sm flex-1">{errors.general}</Text>
            </View>
          ) : null}

          <View className="mb-4">
            <Text className="text-neutral-700 font-semibold mb-2 text-sm">Título de publicación</Text>
            <TextInput
              className={`bg-neutral-50 border rounded-2xl px-4 h-14 text-neutral-900 text-base ${errors.titulo ? 'border-red-400' : 'border-neutral-200'}`}
              placeholder="Ej: Cambio notebook por bicicleta"
              placeholderTextColor="#a3a3a3"
              value={titulo}
              onChangeText={(text) => { setTitulo(text); clearError('titulo'); }}
              editable={!isSubmitting}
            />
            <FieldError message={errors.titulo} />
          </View>

          <View className="mb-4">
            <Text className="text-neutral-700 font-semibold mb-2 text-sm">Nombre del producto</Text>
            <TextInput
              className={`bg-neutral-50 border rounded-2xl px-4 h-14 text-neutral-900 text-base ${errors.nombre ? 'border-red-400' : 'border-neutral-200'}`}
              placeholder="Ej: Notebook Lenovo ThinkPad"
              placeholderTextColor="#a3a3a3"
              value={nombre}
              onChangeText={(text) => { setNombre(text); clearError('nombre'); }}
              editable={!isSubmitting}
            />
            <FieldError message={errors.nombre} />
          </View>

          <View className="mb-4">
            <Text className="text-neutral-700 font-semibold mb-2 text-sm">Descripción</Text>
            <TextInput
              className={`bg-neutral-50 border rounded-2xl px-4 py-4 min-h-28 text-neutral-900 text-base ${errors.descripcion ? 'border-red-400' : 'border-neutral-200'}`}
              placeholder="Cuenta el estado, uso y qué buscas a cambio."
              placeholderTextColor="#a3a3a3"
              value={descripcion}
              onChangeText={(text) => { setDescripcion(text); clearError('descripcion'); }}
              multiline
              textAlignVertical="top"
              editable={!isSubmitting}
            />
            <FieldError message={errors.descripcion} />
          </View>

          <View className="mb-4">
            <Text className="text-neutral-700 font-semibold mb-2 text-sm">Estado</Text>
            <View className="flex-row flex-wrap">
              {ESTADOS.map((item) => (
                <TouchableOpacity
                  key={item}
                  className={`mr-2 mb-2 px-4 py-2 rounded-full ${estado === item ? 'bg-brand-700' : 'bg-neutral-100'}`}
                  onPress={() => setEstado(item)}
                  activeOpacity={0.75}
                  disabled={isSubmitting}
                >
                  <Text className={`text-xs font-bold ${estado === item ? 'text-white' : 'text-neutral-600'}`}>
                    {item}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View className="mb-6">
            <Text className="text-neutral-700 font-semibold mb-2 text-sm">Valor referencial</Text>
            <TextInput
              className={`bg-neutral-50 border rounded-2xl px-4 h-14 text-neutral-900 text-base ${errors.precio ? 'border-red-400' : 'border-neutral-200'}`}
              placeholder="Ej: 150000"
              placeholderTextColor="#a3a3a3"
              value={precio}
              onChangeText={(text) => { setPrecio(text); clearError('precio'); }}
              keyboardType="number-pad"
              editable={!isSubmitting}
            />
            <FieldError message={errors.precio} />
          </View>

          <TouchableOpacity
            className={`w-full rounded-2xl h-14 items-center justify-center ${isSubmitting ? 'bg-brand-400' : 'bg-brand-700'}`}
            onPress={handleSubmit}
            disabled={isSubmitting}
            activeOpacity={0.85}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-bold text-base">Publicar</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
