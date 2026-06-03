import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Href, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { InfoBanner, PrimaryButton, SectionHeader } from '@/components/ui';
import { crearProducto, crearPublicacion, ApiError } from '../services/api';
import { useAuth } from '../context/AuthContext';
import MainLayout from '../layouts/MainLayout';

const ESTADOS = ['Nuevo', 'Como nuevo', 'Buen estado', 'Aceptable'];
const MAX_PRODUCT_PHOTOS = 5;

interface SelectedProductPhoto {
  id: string;
  uri: string;
  dataUrl: string;
}

interface PublishErrors {
  titulo?: string;
  descripcion?: string;
  nombre?: string;
  precio?: string;
  fotos?: string;
  general?: string;
}

async function uriToDataUrl(uri: string, mimeType: string): Promise<string> {
  if (uri.startsWith('data:')) {
    return uri;
  }

  const response = await fetch(uri);
  const blob = await response.blob();

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('No fue posible leer la imagen.'));
    reader.readAsDataURL(blob.type ? blob : new Blob([blob], { type: mimeType }));
  });
}

async function toSelectedProductPhoto(asset: ImagePicker.ImagePickerAsset, index: number): Promise<SelectedProductPhoto> {
  const mimeType = asset.mimeType || (asset.uri.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg');
  const dataUrl = asset.base64 ? `data:${mimeType};base64,${asset.base64}` : await uriToDataUrl(asset.uri, mimeType);

  return {
    id: `${Date.now()}-${index}-${asset.uri}`,
    uri: asset.uri,
    dataUrl,
  };
}

export default function PublishScreen() {
  const router = useRouter();
  const { user, token, isAuthenticated, isRestoring } = useAuth();
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [nombre, setNombre] = useState('');
  const [estado, setEstado] = useState(ESTADOS[1]);
  const [precio, setPrecio] = useState('');
  const [fotos, setFotos] = useState<SelectedProductPhoto[]>([]);
  const [isPickingPhotos, setIsPickingPhotos] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<PublishErrors>({});

  const clearError = (field: keyof PublishErrors) => {
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const pickPhotos = async () => {
    clearError('fotos');
    setIsPickingPhotos(true);

    try {
      const remainingSlots = MAX_PRODUCT_PHOTOS - fotos.length;
      if (remainingSlots <= 0) {
        setErrors((prev) => ({ ...prev, fotos: 'Puedes subir hasta 5 fotos por producto.' }));
        return;
      }

      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setErrors((prev) => ({ ...prev, fotos: 'Permite acceder a tus fotos para agregar imágenes del producto.' }));
        return;
      }

      const response = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: remainingSlots,
        quality: 0.75,
        base64: true,
      });

      if (response.canceled || response.assets.length === 0) {
        return;
      }

      const selected = await Promise.all(response.assets.slice(0, remainingSlots).map(toSelectedProductPhoto));
      setFotos((prev) => [...prev, ...selected].slice(0, MAX_PRODUCT_PHOTOS));
    } catch {
      setErrors((prev) => ({ ...prev, fotos: 'No fue posible cargar las fotos seleccionadas.' }));
    } finally {
      setIsPickingPhotos(false);
    }
  };

  const removePhoto = (photoId: string) => {
    setFotos((prev) => prev.filter((photo) => photo.id !== photoId));
    clearError('fotos');
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
    if (!isAuthenticated || !user || !token) {
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
      }, token);
      const producto = await crearProducto({
        prod_nombre: nombre.trim(),
        prod_est: estado,
        prod_precio: Number(precio.replace(/\D/g, '')),
        publ_id: publicacion.publ_id,
        prod_imagenes: fotos.map((foto) => foto.dataUrl),
      }, token);
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


                <View className="mb-4">
                  <View className="flex-row items-center justify-between mb-2">
                    <Text className="text-neutral-800 font-bold text-sm">Fotos del producto</Text>
                    <Text className="text-neutral-500 text-xs font-bold">{fotos.length}/{MAX_PRODUCT_PHOTOS}</Text>
                  </View>

                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 12 }}>
                    {fotos.map((foto, index) => (
                      <View key={foto.id} className="w-24 h-24 rounded-2xl overflow-hidden border border-neutral-200 mr-3 bg-neutral-50">
                        <Image source={{ uri: foto.uri }} className="w-full h-full" resizeMode="cover" />
                        <TouchableOpacity className="absolute top-1 right-1 w-7 h-7 rounded-full bg-black/60 items-center justify-center" onPress={() => removePhoto(foto.id)} activeOpacity={0.8} disabled={isSubmitting}>
                          <FontAwesome name="times" size={12} color="#fff" />
                        </TouchableOpacity>
                        {index === 0 ? (
                          <View className="absolute left-1 bottom-1 bg-brand-700 rounded-full px-2 py-0.5">
                            <Text className="text-white text-[11px] font-bold">Portada</Text>
                          </View>
                        ) : null}
                      </View>
                    ))}

                    {fotos.length < MAX_PRODUCT_PHOTOS ? (
                      <TouchableOpacity className="w-24 h-24 rounded-2xl border border-dashed border-brand-200 bg-brand-50 items-center justify-center" onPress={pickPhotos} activeOpacity={0.8} disabled={isSubmitting || isPickingPhotos}>
                        {isPickingPhotos ? (
                          <ActivityIndicator color="#047857" />
                        ) : (
                          <>
                            <FontAwesome name="camera" size={18} color="#047857" />
                            <Text className="text-brand-700 text-xs font-bold mt-2 text-center">Agregar</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    ) : null}
                  </ScrollView>
                  <Text className="text-neutral-500 text-xs leading-5 mt-2">Puedes agregar hasta 5 fotos. La primera será la portada.</Text>
                  <FieldError message={errors.fotos} />
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
