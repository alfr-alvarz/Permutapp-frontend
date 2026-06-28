import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Href, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { InfoBanner, PrimaryButton, SectionHeader } from '@/components/ui';
import { ProductCategory, ProductCategoryId, toProductCategory } from '@/constants/categories';
import {
  COMMUNE_SEARCH_MAX_LENGTH,
  LOCATION_REFERENCE_MAX_LENGTH,
  PRODUCT_DESCRIPTION_MAX_LENGTH,
  PRODUCT_NAME_MAX_LENGTH,
  PUBLICATION_TITLE_MAX_LENGTH,
  REFERENCE_PRICE_MAX_LENGTH,
  REFERENCE_PRICE_MAX_VALUE,
} from '@/constants/input-limits';
import {
  ApiError,
  Ciudad,
  Comuna,
  EstacionMetro,
  Region,
  crearProducto,
  crearPublicacion,
  obtenerCiudadesPorRegion,
  obtenerComunasPorCiudad,
  obtenerCategoriasProducto,
  obtenerEstacionesMetro,
  obtenerPaisesConRegiones,
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import MainLayout from '../layouts/MainLayout';

const ESTADOS = ['Nuevo', 'Como nuevo', 'Buen estado', 'Aceptable'];
type MetroSelectorAbierto = 'linea' | 'estacion' | null;
const MAX_PRODUCT_PHOTOS = 5;
const MAX_PRODUCT_PHOTO_BYTES = 5 * 1024 * 1024;
const PRODUCT_PHOTO_FORMATS = new Set(['image/jpeg', 'image/png', 'image/webp']);

const METRO_LINEAS = [
  { id: 'L1', label: 'Línea 1', color: '#C8102E' },
  { id: 'L2', label: 'Línea 2', color: '#F2C300' },
  { id: 'L3', label: 'Línea 3', color: '#7A432A' },
  { id: 'L4', label: 'Línea 4', color: '#003DA5' },
  { id: 'L4A', label: 'Línea 4A', color: '#3F7DBD' },
  { id: 'L5', label: 'Línea 5', color: '#009A6A' },
  { id: 'L6', label: 'Línea 6', color: '#8E3A97' },
  { id: 'L7', label: 'Línea 7', color: '#8A8D8F' },
  { id: 'L8', label: 'Línea 8', color: '#D8752E' },
  { id: 'L9', label: 'Línea 9', color: '#D67DAA' },
];

const LINEA_FALLBACK = '#047857';

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
  categoria?: string;
  ubicacionComuna?: string;
  metro?: string;
  fotos?: string;
  general?: string;
}

function normalizarTexto(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function normalizarPrecio(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  return String(Math.min(Number(digits), REFERENCE_PRICE_MAX_VALUE));
}

function formatearNombreMetro(nombre: string): string {
  return nombre.replace(/\bNunoa\b/g, 'Ñuñoa').replace(/\bnunoa\b/g, 'ñuñoa');
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

function resolveProductPhotoMimeType(asset: ImagePicker.ImagePickerAsset): string | null {
  const reportedMimeType = asset.mimeType?.toLowerCase().split(';')[0];
  if (reportedMimeType === 'image/jpg') return 'image/jpeg';
  if (reportedMimeType && PRODUCT_PHOTO_FORMATS.has(reportedMimeType)) return reportedMimeType;

  const fileName = (asset.fileName || asset.uri).toLowerCase().split('?')[0];
  if (/\.jpe?g$/.test(fileName)) return 'image/jpeg';
  if (fileName.endsWith('.png')) return 'image/png';
  if (fileName.endsWith('.webp')) return 'image/webp';
  return null;
}

function getBase64Size(dataUrl: string): number {
  const separatorIndex = dataUrl.indexOf(',');
  const base64 = separatorIndex >= 0 ? dataUrl.slice(separatorIndex + 1) : '';
  if (!base64) return 0;

  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
}

async function toSelectedProductPhoto(asset: ImagePicker.ImagePickerAsset, index: number): Promise<SelectedProductPhoto> {
  const mimeType = resolveProductPhotoMimeType(asset);
  if (!mimeType) {
    throw new Error('Formato no permitido. Usa fotos JPG, PNG o WebP.');
  }
  if (asset.fileSize !== undefined && asset.fileSize > MAX_PRODUCT_PHOTO_BYTES) {
    throw new Error('Cada foto puede pesar como máximo 5 MB.');
  }

  const dataUrl = asset.base64 ? `data:${mimeType};base64,${asset.base64}` : await uriToDataUrl(asset.uri, mimeType);
  if (getBase64Size(dataUrl) > MAX_PRODUCT_PHOTO_BYTES) {
    throw new Error('Cada foto puede pesar como máximo 5 MB.');
  }

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
  const [estadoAbierto, setEstadoAbierto] = useState(false);
  const [precio, setPrecio] = useState('');
  const [categoria, setCategoria] = useState<ProductCategoryId | null>(null);
  const [categoriaAbierta, setCategoriaAbierta] = useState(false);
  const [categorias, setCategorias] = useState<ProductCategory[]>([]);
  const [isLoadingCategorias, setIsLoadingCategorias] = useState(false);
  const [regiones, setRegiones] = useState<Region[]>([]);
  const [regionSeleccionada, setRegionSeleccionada] = useState<Region | null>(null);
  const [ciudades, setCiudades] = useState<Ciudad[]>([]);
  const [ciudadSeleccionada, setCiudadSeleccionada] = useState<Ciudad | null>(null);
  const [comunas, setComunas] = useState<Comuna[]>([]);
  const [comunaSeleccionada, setComunaSeleccionada] = useState<Comuna | null>(null);
  const [busquedaComuna, setBusquedaComuna] = useState('');
  const [isLoadingGeografia, setIsLoadingGeografia] = useState(false);
  const [ubicacionReferencia, setUbicacionReferencia] = useState('');
  const [estacionesMetro, setEstacionesMetro] = useState<EstacionMetro[]>([]);
  const [estacionSeleccionada, setEstacionSeleccionada] = useState<EstacionMetro | null>(null);
  const [lineaSeleccionada, setLineaSeleccionada] = useState('L1');
  const [metroSelectorAbierto, setMetroSelectorAbierto] = useState<MetroSelectorAbierto>(null);
  const [isLoadingMetro, setIsLoadingMetro] = useState(false);
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
    } catch (error) {
      setErrors((prev) => ({
        ...prev,
        fotos: error instanceof Error ? error.message : 'No fue posible cargar las fotos seleccionadas.',
      }));
    } finally {
      setIsPickingPhotos(false);
    }
  };

  const removePhoto = (photoId: string) => {
    setFotos((prev) => prev.filter((photo) => photo.id !== photoId));
    clearError('fotos');
  };

  const seleccionarCiudad = async (ciudad: Ciudad) => {
    try {
      setCiudadSeleccionada(ciudad);
      setComunaSeleccionada(null);
      setBusquedaComuna('');
      setIsLoadingGeografia(true);
      const data = await obtenerComunasPorCiudad(ciudad.id);
      setComunas(data.sort((a, b) => a.nombre.localeCompare(b.nombre)));
      clearError('ubicacionComuna');
    } catch {
      setErrors((prev) => ({ ...prev, ubicacionComuna: 'No fue posible cargar las comunas.' }));
    } finally {
      setIsLoadingGeografia(false);
    }
  };

  const seleccionarRegion = async (region: Region) => {
    try {
      setRegionSeleccionada(region);
      setCiudadSeleccionada(null);
      setComunaSeleccionada(null);
      setCiudades([]);
      setComunas([]);
      setBusquedaComuna('');
      setIsLoadingGeografia(true);
      const data = await obtenerCiudadesPorRegion(region.id);
      const ordenadas = data.sort((a, b) => a.nombre.localeCompare(b.nombre));
      setCiudades(ordenadas);
      const inicial = ordenadas.find((ciudad) => normalizarTexto(ciudad.nombre).includes('santiago')) ?? ordenadas[0];
      if (inicial) {
        setCiudadSeleccionada(inicial);
        const comunasData = await obtenerComunasPorCiudad(inicial.id);
        setComunas(comunasData.sort((a, b) => a.nombre.localeCompare(b.nombre)));
      }
      clearError('ubicacionComuna');
    } catch {
      setErrors((prev) => ({ ...prev, ubicacionComuna: 'No fue posible cargar ciudades y comunas.' }));
    } finally {
      setIsLoadingGeografia(false);
    }
  };

  const seleccionarComuna = (comuna: Comuna) => {
    setComunaSeleccionada(comuna);
    setBusquedaComuna(comuna.nombre);
    clearError('ubicacionComuna');
    const estacionMismaComuna = estacionesMetro.find(
      (estacion) => estacion.comuna && normalizarTexto(estacion.comuna) === normalizarTexto(comuna.nombre),
    );
    if (estacionMismaComuna) {
      setLineaSeleccionada(estacionMismaComuna.linea);
      if (estacionSeleccionada?.linea !== estacionMismaComuna.linea) setEstacionSeleccionada(null);
    }
  };

  const handleBusquedaComunaChange = (text: string) => {
    setBusquedaComuna(text);
    clearError('ubicacionComuna');
    if (comunaSeleccionada && normalizarTexto(text.trim()) !== normalizarTexto(comunaSeleccionada.nombre)) {
      setComunaSeleccionada(null);
    }
  };

  const seleccionarCategoria = (item: ProductCategory) => {
    setCategoria(item.id);
    setCategoriaAbierta(false);
    clearError('categoria');
  };

  const seleccionarEstado = (item: string) => {
    setEstado(item);
    setEstadoAbierto(false);
  };

  const seleccionarLineaMetro = (lineaId: string) => {
    const tieneEstaciones = estacionesMetro.some((estacion) => estacion.linea === lineaId);
    if (!tieneEstaciones) return;
    setLineaSeleccionada(lineaId);
    setMetroSelectorAbierto(null);
    if (estacionSeleccionada?.linea !== lineaId) setEstacionSeleccionada(null);
  };

  const seleccionarEstacionMetro = (estacion: EstacionMetro) => {
    setEstacionSeleccionada(estacion);
    setMetroSelectorAbierto(null);
    clearError('metro');
  };

  const validate = () => {
    const nextErrors: PublishErrors = {};
    const precioNumerico = Number(precio.replace(/\D/g, ''));

    if (!titulo.trim()) nextErrors.titulo = 'El título es obligatorio.';
    if (!descripcion.trim()) nextErrors.descripcion = 'La descripción es obligatoria.';
    if (!nombre.trim()) nextErrors.nombre = 'El nombre del producto es obligatorio.';
    if (!categoria) nextErrors.categoria = categorias.length === 0 ? 'No fue posible cargar categorías desde ServicioProducto.' : 'Selecciona una categoría.';
    if (!Number.isInteger(precioNumerico) || precioNumerico < 0) nextErrors.precio = 'Ingresa un valor referencial válido.';
    if (precioNumerico > REFERENCE_PRICE_MAX_VALUE) nextErrors.precio = 'El valor referencial máximo es $5.000.000.';
    if (!comunaSeleccionada) nextErrors.ubicacionComuna = 'Selecciona una comuna cargada desde ServicioLocalizacion.';

    if (!estacionSeleccionada) nextErrors.metro = 'Selecciona un Metro cercano para calcular puntos seguros.';

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
        prod_categoria: categoria ?? undefined,
        prod_precio: Number(normalizarPrecio(precio)),
        publ_id: publicacion.publ_id,
        prod_imagenes: fotos.map((foto) => foto.dataUrl),
        prod_ubicacion_comuna: comunaSeleccionada?.nombre,
        prod_ubicacion_referencia: ubicacionReferencia.trim() || undefined,
        prod_latitud_aprox: estacionSeleccionada?.latitud ?? undefined,
        prod_longitud_aprox: estacionSeleccionada?.longitud ?? undefined,
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


  useEffect(() => {
    let mounted = true;

    async function cargarCategoriasPublicacion() {
      try {
        setIsLoadingCategorias(true);
        const data = await obtenerCategoriasProducto();
        if (mounted) setCategorias(data.map(toProductCategory));
      } catch {
        if (mounted) setCategorias([]);
      } finally {
        if (mounted) setIsLoadingCategorias(false);
      }
    }

    cargarCategoriasPublicacion();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function cargarGeografia() {
      try {
        setIsLoadingGeografia(true);
        const paises = await obtenerPaisesConRegiones();
        const chile = paises.find((pais) => normalizarTexto(pais.nombre).includes('chile')) ?? paises[0];
        const regionesData = [...(chile?.regiones ?? [])].sort((a, b) => a.nombre.localeCompare(b.nombre));
        const regionInicial = regionesData.find((region) => normalizarTexto(region.nombre).includes('metropolitana')) ?? regionesData[0];
        if (!regionInicial) throw new Error('No hay regiones disponibles');

        const ciudadesData = (await obtenerCiudadesPorRegion(regionInicial.id)).sort((a, b) => a.nombre.localeCompare(b.nombre));
        const ciudadInicial = ciudadesData.find((ciudad) => normalizarTexto(ciudad.nombre).includes('santiago')) ?? ciudadesData[0];
        const comunasData = ciudadInicial
          ? (await obtenerComunasPorCiudad(ciudadInicial.id)).sort((a, b) => a.nombre.localeCompare(b.nombre))
          : [];

        if (mounted) {
          setRegiones(regionesData);
          setRegionSeleccionada(regionInicial);
          setCiudades(ciudadesData);
          setCiudadSeleccionada(ciudadInicial ?? null);
          setComunas(comunasData);
        }
      } catch {
        if (mounted) {
          setErrors((prev) => ({ ...prev, ubicacionComuna: 'No fue posible cargar comunas desde ServicioLocalizacion.' }));
        }
      } finally {
        if (mounted) setIsLoadingGeografia(false);
      }
    }

    cargarGeografia();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function cargarEstacionesMetro() {
      try {
        setIsLoadingMetro(true);
        const data = await obtenerEstacionesMetro();
        if (mounted) {
          setEstacionesMetro(data.filter((estacion) => estacion.latitud != null && estacion.longitud != null));
        }
      } catch {
        if (mounted) {
          setErrors((prev) => ({ ...prev, metro: 'No fue posible cargar estaciones de Metro.' }));
        }
      } finally {
        if (mounted) setIsLoadingMetro(false);
      }
    }

    cargarEstacionesMetro();
    return () => { mounted = false; };
  }, []);

  const estacionesPorLinea = useMemo(
    () => estacionesMetro
      .filter((estacion) => estacion.linea === lineaSeleccionada)
      .sort((a, b) => (a.orden ?? 999) - (b.orden ?? 999) || a.nombre.localeCompare(b.nombre)),
    [estacionesMetro, lineaSeleccionada],
  );

  const categoriaSeleccionada = useMemo(
    () => categorias.find((item) => item.id === categoria) ?? null,
    [categorias, categoria],
  );

  const comunasSugeridas = useMemo(() => {
    const queryOriginal = busquedaComuna.trim();
    const query = normalizarTexto(queryOriginal);
    if (!query || normalizarTexto(comunaSeleccionada?.nombre ?? '') === query) return [];
    return comunas
      .filter((comuna) => normalizarTexto(comuna.nombre).includes(query))
      .slice(0, 6);
  }, [busquedaComuna, comunaSeleccionada?.nombre, comunas]);

  const mostrarSugerenciasComuna = busquedaComuna.trim().length > 0 && comunasSugeridas.length > 0;
  const mostrarSinResultadosComuna = busquedaComuna.trim().length > 0 && !comunaSeleccionada && !isLoadingGeografia && comunasSugeridas.length === 0;

  const lineaActiva = METRO_LINEAS.find((linea) => linea.id === lineaSeleccionada);
  const colorLineaActiva = lineaActiva?.color ?? LINEA_FALLBACK;

  const FieldError = ({ message }: { message?: string }) => message ? <Text className="text-red-500 text-xs mt-1.5 ml-1">{message}</Text> : null;
  const FieldLabel = ({ label, length, maxLength }: { label: string; length: number; maxLength: number }) => (
    <View className="flex-row items-center justify-between mb-2">
      <Text className="text-neutral-800 font-bold text-base">{label}</Text>
      <Text className="text-neutral-400 text-xs font-bold" style={{ fontVariant: ['tabular-nums'] }}>{length}/{maxLength}</Text>
    </View>
  );

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

              <SectionHeader title="Publica en 3 pasos" eyebrow="Nueva permuta" />
              <InfoBanner icon="leaf" title="Fotos, estado y ubicación aproximada" body="Solo pedimos lo necesario para iniciar una permuta clara." />

              {errors.general ? <View className="mt-4"><InfoBanner icon="exclamation-circle" title="No se pudo publicar" body={errors.general} tone="red" /></View> : null}

              <View className="mt-6 bg-white border border-neutral-100 rounded-2xl p-5">
                <Text className="text-neutral-950 text-xl font-bold mb-4">1. Producto</Text>
                <View className="mb-4">
                  <FieldLabel label="Título de publicación" length={titulo.length} maxLength={PUBLICATION_TITLE_MAX_LENGTH} />
                  <TextInput className={`bg-neutral-50 border rounded-2xl px-4 h-14 text-neutral-900 text-base ${errors.titulo ? 'border-red-400' : 'border-neutral-200'}`} placeholder="Ej: Cambio notebook por bicicleta" placeholderTextColor="#a3a3a3" value={titulo} onChangeText={(text) => { setTitulo(text); clearError('titulo'); }} maxLength={PUBLICATION_TITLE_MAX_LENGTH} editable={!isSubmitting} />
                  <FieldError message={errors.titulo} />
                </View>

                <View className="mb-4">
                  <FieldLabel label="Nombre del producto" length={nombre.length} maxLength={PRODUCT_NAME_MAX_LENGTH} />
                  <TextInput className={`bg-neutral-50 border rounded-2xl px-4 h-14 text-neutral-900 text-base ${errors.nombre ? 'border-red-400' : 'border-neutral-200'}`} placeholder="Ej: Notebook Lenovo ThinkPad" placeholderTextColor="#a3a3a3" value={nombre} onChangeText={(text) => { setNombre(text); clearError('nombre'); }} maxLength={PRODUCT_NAME_MAX_LENGTH} editable={!isSubmitting} />
                  <FieldError message={errors.nombre} />
                </View>

                <View className="mb-4">
                  <FieldLabel label="Descripción" length={descripcion.length} maxLength={PRODUCT_DESCRIPTION_MAX_LENGTH} />
                  <TextInput className={`bg-neutral-50 border rounded-2xl px-4 py-4 min-h-32 text-neutral-900 text-base ${errors.descripcion ? 'border-red-400' : 'border-neutral-200'}`} placeholder="Cuenta el estado, uso y qué buscas a cambio." placeholderTextColor="#a3a3a3" value={descripcion} onChangeText={(text) => { setDescripcion(text); clearError('descripcion'); }} maxLength={PRODUCT_DESCRIPTION_MAX_LENGTH} multiline textAlignVertical="top" editable={!isSubmitting} />
                  <FieldError message={errors.descripcion} />
                </View>

                <View className="mb-4">
                  <Text className="text-neutral-800 font-bold mb-2 text-base">Categoría</Text>
                  {isLoadingCategorias ? (
                    <View className="flex-row items-center bg-neutral-50 border border-neutral-200 rounded-2xl px-4 h-12">
                      <ActivityIndicator color="#047857" size="small" />
                      <Text className="text-neutral-500 text-sm font-bold ml-3">Cargando categorías</Text>
                    </View>
                  ) : categorias.length > 0 ? (
                    <View>
                      <TouchableOpacity
                        className={`bg-neutral-50 border rounded-2xl px-4 h-14 flex-row items-center justify-between ${errors.categoria ? 'border-red-400' : categoriaAbierta ? 'border-brand-700' : 'border-neutral-200'}`}
                        onPress={() => setCategoriaAbierta((abierta) => !abierta)}
                        activeOpacity={0.82}
                        disabled={isSubmitting}
                        accessibilityRole="button"
                        accessibilityLabel="Seleccionar categoría del producto"
                      >
                        <View className="flex-row items-center flex-1 pr-3">
                          {categoriaSeleccionada ? <FontAwesome name={categoriaSeleccionada.icon} size={15} color={categoriaSeleccionada.iconColor} /> : null}
                          <Text className={`text-base font-bold ${categoriaSeleccionada ? 'text-neutral-900 ml-2' : 'text-neutral-400'}`} numberOfLines={1}>
                            {categoriaSeleccionada?.label ?? 'Seleccionar categoría'}
                          </Text>
                        </View>
                        <FontAwesome name={categoriaAbierta ? 'chevron-up' : 'chevron-down'} size={12} color="#047857" />
                      </TouchableOpacity>

                      {categoriaAbierta ? (
                        <View className="bg-white border border-neutral-100 rounded-2xl overflow-hidden mt-2">
                          {categorias.map((item, index) => {
                            const selected = categoria === item.id;
                            return (
                              <TouchableOpacity
                                key={item.id}
                                className={`px-4 h-12 flex-row items-center justify-between ${index < categorias.length - 1 ? 'border-b border-neutral-100' : ''}`}
                                onPress={() => seleccionarCategoria(item)}
                                activeOpacity={0.75}
                                disabled={isSubmitting}
                              >
                                <View className="flex-row items-center flex-1 pr-3">
                                  <FontAwesome name={item.icon} size={14} color={selected ? '#047857' : item.iconColor} />
                                  <Text className={`text-sm font-bold ml-2 ${selected ? 'text-brand-700' : 'text-neutral-700'}`}>{item.label}</Text>
                                </View>
                                {selected ? <FontAwesome name="check" size={13} color="#047857" /> : null}
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      ) : null}
                    </View>
                  ) : (
                    <InfoBanner icon="exclamation-circle" title="Categorías no disponibles" body="ServicioProducto no entregó categorías." tone="red" />
                  )}
                  <FieldError message={errors.categoria} />
                </View>

                <View className="mb-4">
                  <Text className="text-neutral-800 font-bold mb-2 text-base">Estado</Text>
                  <TouchableOpacity
                    className={`bg-neutral-50 border rounded-2xl px-4 h-14 flex-row items-center justify-between ${estadoAbierto ? 'border-brand-700' : 'border-neutral-200'}`}
                    onPress={() => setEstadoAbierto((abierto) => !abierto)}
                    activeOpacity={0.82}
                    disabled={isSubmitting}
                    accessibilityRole="button"
                    accessibilityLabel="Seleccionar estado del producto"
                  >
                    <Text className="text-neutral-900 text-base font-bold">{estado}</Text>
                    <FontAwesome name={estadoAbierto ? 'chevron-up' : 'chevron-down'} size={12} color="#047857" />
                  </TouchableOpacity>

                  {estadoAbierto ? (
                    <View className="bg-white border border-neutral-100 rounded-2xl overflow-hidden mt-2">
                      {ESTADOS.map((item, index) => {
                        const selected = estado === item;
                        return (
                          <TouchableOpacity
                            key={item}
                            className={`px-4 h-12 flex-row items-center justify-between ${index < ESTADOS.length - 1 ? 'border-b border-neutral-100' : ''}`}
                            onPress={() => seleccionarEstado(item)}
                            activeOpacity={0.75}
                            disabled={isSubmitting}
                          >
                            <Text className={`text-sm font-bold ${selected ? 'text-brand-700' : 'text-neutral-700'}`}>{item}</Text>
                            {selected ? <FontAwesome name="check" size={13} color="#047857" /> : null}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ) : null}
                </View>


                <View className="mb-4">
                  <Text className="text-neutral-950 text-xl font-bold mb-4 mt-2">2. Fotos</Text>
                  <View className="flex-row items-center justify-between mb-2">
                    <Text className="text-neutral-800 font-bold text-base">Fotos del producto</Text>
                    <Text className="text-neutral-500 text-sm font-bold">{fotos.length}/{MAX_PRODUCT_PHOTOS}</Text>
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
                            <Text className="text-brand-700 text-sm font-bold mt-2 text-center">Agregar</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    ) : null}
                  </ScrollView>
                  <Text className="text-neutral-500 text-sm leading-5 mt-2">Hasta 5 fotos, máximo 5 MB por foto. Formatos permitidos: JPG, PNG y WebP. La primera será la portada.</Text>
                  <FieldError message={errors.fotos} />
                </View>


                <View className="mb-4">
                  <Text className="text-neutral-950 text-xl font-bold mb-4 mt-2">3. Ubicación segura</Text>
                  <View className="flex-row items-center justify-between mb-2">
                    <Text className="text-neutral-800 font-bold text-base">Comuna del producto</Text>
                    {isLoadingGeografia ? <ActivityIndicator size="small" color="#047857" /> : null}
                  </View>
                  <Text className="text-neutral-500 text-sm leading-5 mb-3">Guardamos una ubicación aproximada.</Text>

                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 12 }}>
                    {regiones.map((region) => {
                      const selected = regionSeleccionada?.id === region.id;
                      return (
                        <TouchableOpacity key={region.id} className={`mr-2 px-3 h-10 rounded-2xl border items-center justify-center ${selected ? 'bg-brand-700 border-brand-700' : 'bg-neutral-50 border-neutral-200'}`} onPress={() => seleccionarRegion(region)} disabled={isSubmitting || isLoadingGeografia} activeOpacity={0.75}>
                          <Text className={`text-sm font-bold ${selected ? 'text-white' : 'text-neutral-700'}`}>{region.nombre}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>

                  {ciudades.length > 1 ? (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3" contentContainerStyle={{ paddingRight: 12 }}>
                      {ciudades.map((ciudad) => {
                        const selected = ciudadSeleccionada?.id === ciudad.id;
                        return (
                          <TouchableOpacity key={ciudad.id} className={`mr-2 px-3 h-10 rounded-2xl border items-center justify-center ${selected ? 'bg-teal-100 border-teal-300' : 'bg-neutral-50 border-neutral-200'}`} onPress={() => seleccionarCiudad(ciudad)} disabled={isSubmitting || isLoadingGeografia} activeOpacity={0.75}>
                            <Text className="text-neutral-700 text-sm font-bold">{ciudad.nombre}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  ) : null}

                  <TextInput
                    className={`bg-neutral-50 border rounded-2xl px-4 h-12 text-neutral-900 mt-3 ${errors.ubicacionComuna ? 'border-red-400' : 'border-neutral-200'}`}
                    placeholder="Escribe tu comuna"
                    placeholderTextColor="#a3a3a3"
                    value={busquedaComuna}
                    onChangeText={handleBusquedaComunaChange}
                    maxLength={COMMUNE_SEARCH_MAX_LENGTH}
                    editable={!isSubmitting && !isLoadingGeografia}
                  />
                  {comunaSeleccionada ? (
                    <View className="bg-brand-50 border border-brand-100 rounded-2xl px-4 py-3 mt-3 flex-row items-center justify-between">
                      <View className="flex-row items-center flex-1 pr-3">
                        <FontAwesome name="check-circle" size={15} color="#047857" />
                        <Text className="text-brand-800 text-sm font-bold ml-2" numberOfLines={1}>{comunaSeleccionada.nombre}</Text>
                      </View>
                      <Text className="text-brand-700 text-xs font-bold">Seleccionada</Text>
                    </View>
                  ) : null}
                  {mostrarSugerenciasComuna ? (
                    <View className="bg-white border border-neutral-100 rounded-2xl overflow-hidden mt-3">
                      {comunasSugeridas.map((comuna, index) => (
                        <TouchableOpacity
                          key={comuna.id}
                          className={`px-4 h-12 flex-row items-center justify-between ${index < comunasSugeridas.length - 1 ? 'border-b border-neutral-100' : ''}`}
                          onPress={() => seleccionarComuna(comuna)}
                          disabled={isSubmitting}
                          activeOpacity={0.75}
                        >
                          <Text className="text-neutral-800 text-sm font-bold">{comuna.nombre}</Text>
                          <FontAwesome name="map-marker" size={13} color="#047857" />
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : null}
                  {mostrarSinResultadosComuna ? <Text className="text-amber-700 text-sm leading-5 mt-2">No encontramos comunas con ese nombre en la ciudad seleccionada.</Text> : null}
                  <FieldError message={errors.ubicacionComuna} />
                  <TextInput className="bg-neutral-50 border border-neutral-200 rounded-2xl px-4 h-14 text-neutral-900 text-base mt-3" placeholder="Referencia opcional: sector, barrio o cruce cercano" placeholderTextColor="#a3a3a3" value={ubicacionReferencia} onChangeText={setUbicacionReferencia} maxLength={LOCATION_REFERENCE_MAX_LENGTH} editable={!isSubmitting} />
                  <Text className="text-neutral-400 text-xs text-right mt-1" style={{ fontVariant: ['tabular-nums'] }}>{ubicacionReferencia.length}/{LOCATION_REFERENCE_MAX_LENGTH}</Text>

                  <View className="mt-4">
                    <View className="flex-row items-center justify-between mb-2">
                      <Text className="text-neutral-800 font-bold text-base">Metro cercano</Text>
                      <Text className="text-neutral-500 text-sm font-bold">{isLoadingMetro ? 'Cargando' : `${estacionesMetro.length} estaciones`}</Text>
                    </View>

                    <TouchableOpacity
                      className="bg-neutral-50 border rounded-2xl px-4 h-14 flex-row items-center justify-between"
                      style={{ borderColor: colorLineaActiva }}
                      onPress={() => setMetroSelectorAbierto((actual) => (actual === 'linea' ? null : 'linea'))}
                      activeOpacity={0.82}
                      disabled={isSubmitting || isLoadingMetro}
                      accessibilityRole="button"
                      accessibilityLabel="Seleccionar línea de Metro"
                    >
                      <View className="flex-row items-center flex-1 pr-3">
                        <View className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: colorLineaActiva }} />
                        <View className="flex-1">
                          <Text className="text-neutral-500 text-xs font-bold">Línea</Text>
                          <Text className="text-neutral-950 text-sm font-bold mt-0.5" numberOfLines={1}>{lineaActiva?.label ?? lineaSeleccionada}</Text>
                        </View>
                      </View>
                      <FontAwesome name={metroSelectorAbierto === 'linea' ? 'chevron-up' : 'chevron-down'} size={12} color="#047857" />
                    </TouchableOpacity>

                    {metroSelectorAbierto === 'linea' ? (
                      <View className="bg-white border border-neutral-100 rounded-2xl overflow-hidden mt-2">
                        {METRO_LINEAS.map((linea, index) => {
                          const selected = linea.id === lineaSeleccionada;
                          const count = estacionesMetro.filter((estacion) => estacion.linea === linea.id).length;
                          return (
                            <TouchableOpacity
                              key={linea.id}
                              className={`px-4 h-12 flex-row items-center justify-between ${index < METRO_LINEAS.length - 1 ? 'border-b border-neutral-100' : ''}`}
                              onPress={() => seleccionarLineaMetro(linea.id)}
                              activeOpacity={0.75}
                              disabled={isSubmitting || count === 0}
                              style={{ opacity: count === 0 ? 0.45 : 1 }}
                            >
                              <View className="flex-row items-center flex-1 pr-3">
                                <View className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: linea.color }} />
                                <Text className={`text-sm font-bold ${selected ? 'text-brand-700' : 'text-neutral-700'}`}>{linea.label}</Text>
                                <Text className="text-neutral-400 text-xs font-bold ml-2">{count}</Text>
                              </View>
                              {selected ? <FontAwesome name="check" size={13} color="#047857" /> : null}
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    ) : null}

                    <TouchableOpacity
                      className={`bg-neutral-50 border rounded-2xl px-4 h-14 flex-row items-center justify-between mt-3 ${errors.metro ? 'border-red-400' : 'border-neutral-200'}`}
                      onPress={() => setMetroSelectorAbierto((actual) => (actual === 'estacion' ? null : 'estacion'))}
                      activeOpacity={0.82}
                      disabled={isSubmitting || isLoadingMetro || estacionesPorLinea.length === 0}
                      accessibilityRole="button"
                      accessibilityLabel="Seleccionar estación de Metro cercana"
                    >
                      <View className="flex-1 pr-3">
                        <Text className="text-neutral-500 text-xs font-bold">Estación</Text>
                        <Text className={`text-sm font-bold mt-0.5 ${estacionSeleccionada ? 'text-neutral-950' : 'text-neutral-400'}`} numberOfLines={1}>
                          {estacionSeleccionada ? formatearNombreMetro(estacionSeleccionada.nombre) : 'Seleccionar estación cercana'}
                        </Text>
                      </View>
                      <FontAwesome name={metroSelectorAbierto === 'estacion' ? 'chevron-up' : 'chevron-down'} size={12} color="#047857" />
                    </TouchableOpacity>

                    {metroSelectorAbierto === 'estacion' ? (
                      <View className="bg-white border border-neutral-100 rounded-2xl overflow-hidden mt-2">
                        {estacionesPorLinea.length === 0 ? (
                          <Text className="text-neutral-500 text-sm leading-5 p-4">Esta línea todavía no tiene estaciones cargadas en Supabase.</Text>
                        ) : (
                          <ScrollView style={{ maxHeight: 260 }} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                            {estacionesPorLinea.map((estacion, index) => {
                              const selected = estacionSeleccionada?.id === estacion.id;
                              return (
                                <TouchableOpacity
                                  key={`${estacion.id}-${estacion.linea}`}
                                  className={`px-4 h-12 flex-row items-center justify-between ${index < estacionesPorLinea.length - 1 ? 'border-b border-neutral-100' : ''}`}
                                  onPress={() => seleccionarEstacionMetro(estacion)}
                                  activeOpacity={0.75}
                                  disabled={isSubmitting}
                                >
                                  <Text className={`text-sm font-bold ${selected ? 'text-brand-700' : 'text-neutral-700'}`}>{formatearNombreMetro(estacion.nombre)}</Text>
                                  {selected ? <FontAwesome name="check" size={13} color="#047857" /> : null}
                                </TouchableOpacity>
                              );
                            })}
                          </ScrollView>
                        )}
                      </View>
                    ) : null}
                    <FieldError message={errors.metro} />
                  </View>
                  <Text className="text-neutral-500 text-sm leading-5 mt-2">El chat usará esta referencia para sugerir un punto intermedio.</Text>
                </View>

                <View className="mb-6">
                  <Text className="text-neutral-800 font-bold mb-2 text-base">Valor referencial</Text>
                  <TextInput
                    className={`bg-neutral-50 border rounded-2xl px-4 h-14 text-neutral-900 text-base ${errors.precio ? 'border-red-400' : 'border-neutral-200'}`}
                    placeholder="Ej: 150000"
                    placeholderTextColor="#a3a3a3"
                    value={precio}
                    onChangeText={(text) => {
                      setPrecio(normalizarPrecio(text));
                      clearError('precio');
                    }}
                    keyboardType="number-pad"
                    inputMode="numeric"
                    maxLength={REFERENCE_PRICE_MAX_LENGTH}
                    editable={!isSubmitting}
                  />
                  <Text className="text-neutral-500 text-sm leading-5 mt-2">Máximo $5.000.000.</Text>
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
