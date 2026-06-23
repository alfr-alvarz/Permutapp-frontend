import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Href, useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { BrandMark, InfoBanner, PrimaryButton, SectionHeader } from '@/components/ui';
import { NotificationBell } from '@/components/NotificationBell';
import {
  ApiError,
  EstacionMetro,
  Producto,
  Publicacion,
  actualizarProducto,
  actualizarPublicacion,
  encontrarEstacionMetroPorCoordenadas,
  eliminarProducto,
  eliminarPublicacion,
  eliminarUsuario,
  obtenerEstacionesMetro,
  obtenerProductos,
  obtenerPublicaciones,
} from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const ESTADOS_PRODUCTO = ['Nuevo', 'Como nuevo', 'Buen estado', 'Aceptable'];

interface MiPermuta {
  producto: Producto;
  publicacion: Publicacion;
}

interface EditForm {
  titulo: string;
  descripcion: string;
  nombre: string;
  estado: string;
  precio: string;
  ubicacionComuna: string;
  ubicacionReferencia: string;
}

function getIdentityBadge(status: string | null | undefined, verified: boolean): string {
  if (verified || status === 'APROBADA') return 'Perfil verificado';
  if (status === 'REVISION_MANUAL') return 'En revisión manual';
  if (status === 'RECHAZADA') return 'Verificación rechazada';
  return 'Verificación pendiente';
}

function getIdentityMessage(status: string | null | undefined, verified: boolean): string {
  if (verified || status === 'APROBADA') return 'Tu cuenta ya está verificada.';
  if (status === 'REVISION_MANUAL') return 'Tu verificación está en revisión.';
  if (status === 'RECHAZADA') return 'Puedes intentar nuevamente con imágenes claras.';
  return 'Verifica tu identidad para dar más confianza.';
}

function getIdentityTone(status: string | null | undefined, verified: boolean): 'brand' | 'amber' | 'red' {
  if (verified || status === 'APROBADA') return 'brand';
  if (status === 'RECHAZADA') return 'red';
  return 'amber';
}

function buildEditForm(permuta: MiPermuta): EditForm {
  return {
    titulo: permuta.publicacion.publ_titulo,
    descripcion: permuta.publicacion.publ_descripcion,
    nombre: permuta.producto.prod_nombre,
    estado: permuta.producto.prod_est,
    precio: String(permuta.producto.prod_precio),
    ubicacionComuna: permuta.producto.prod_ubicacion_comuna ?? '',
    ubicacionReferencia: permuta.producto.prod_ubicacion_referencia ?? '',
  };
}

export default function ProfileScreen() {
  const router = useRouter();
  const { user, token, isAuthenticated, logout, refreshIdentityStatus } = useAuth();
  const [identityError, setIdentityError] = useState<string | null>(null);
  const [permutas, setPermutas] = useState<MiPermuta[]>([]);
  const [isLoadingPermutas, setIsLoadingPermutas] = useState(false);
  const [permutasError, setPermutasError] = useState<string | null>(null);
  const [editingPermutaId, setEditingPermutaId] = useState<number | null>(null);
  const [estacionesMetro, setEstacionesMetro] = useState<EstacionMetro[]>([]);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [deletingProductoId, setDeletingProductoId] = useState<number | null>(null);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [deleteAccountText, setDeleteAccountText] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteAccountError, setDeleteAccountError] = useState<string | null>(null);

  const cargarMisPermutas = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setPermutas([]);
      return;
    }

    try {
      setIsLoadingPermutas(true);
      setPermutasError(null);
      const [productos, publicaciones, estaciones] = await Promise.all([
        obtenerProductos(),
        obtenerPublicaciones(),
        obtenerEstacionesMetro().catch(() => []),
      ]);
      const misPublicaciones = publicaciones.filter((publicacion) => publicacion.publ_autor_id === Number(user.id));
      const publicacionesPorId = new Map(misPublicaciones.map((publicacion) => [publicacion.publ_id, publicacion]));
      const misPermutas = productos
        .filter((producto) => publicacionesPorId.has(producto.publ_id))
        .map((producto) => ({ producto, publicacion: publicacionesPorId.get(producto.publ_id)! }))
        .sort((a, b) => new Date(b.publicacion.publ_fech_creacion).getTime() - new Date(a.publicacion.publ_fech_creacion).getTime());
      setPermutas(misPermutas);
      setEstacionesMetro(estaciones);
    } catch (error) {
      setPermutasError(error instanceof ApiError ? error.message : 'No fue posible cargar tus permutas.');
    } finally {
      setIsLoadingPermutas(false);
    }
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      return;
    }

    refreshIdentityStatus()
      .then(() => setIdentityError(null))
      .catch(() => {
        if (user.biometricVerified || user.identityStatus === 'APROBADA') {
          setIdentityError(null);
          return;
        }

        setIdentityError('No se pudo actualizar el estado de verificación.');
      });
  }, [isAuthenticated, refreshIdentityStatus, user?.id]);

  useEffect(() => {
    cargarMisPermutas();
  }, [cargarMisPermutas]);

  const startEdit = (permuta: MiPermuta) => {
    setEditingPermutaId(permuta.producto.prod_id);
    setEditForm(buildEditForm(permuta));
    setPermutasError(null);
  };

  const cancelEdit = () => {
    setEditingPermutaId(null);
    setEditForm(null);
    setIsSavingEdit(false);
  };

  const saveEdit = async (permuta: MiPermuta) => {
    if (!editForm) return;

    const precioNumerico = Number(editForm.precio.replace(/\D/g, ''));
    if (!editForm.titulo.trim() || !editForm.descripcion.trim() || !editForm.nombre.trim()) {
      setPermutasError('Completa titulo, descripcion y nombre antes de guardar.');
      return;
    }

    if (!Number.isInteger(precioNumerico) || precioNumerico < 0) {
      setPermutasError('Ingresa un valor referencial valido.');
      return;
    }

    try {
      setIsSavingEdit(true);
      setPermutasError(null);
      const [publicacionActualizada, productoActualizado] = await Promise.all([
        actualizarPublicacion(permuta.publicacion.publ_id, {
          publ_titulo: editForm.titulo.trim(),
          publ_descripcion: editForm.descripcion.trim(),
        }, token ?? undefined),
        actualizarProducto(permuta.producto.prod_id, {
          prod_nombre: editForm.nombre.trim(),
          prod_est: editForm.estado,
          prod_precio: precioNumerico,
          prod_ubicacion_comuna: editForm.ubicacionComuna.trim() || null,
          prod_ubicacion_referencia: editForm.ubicacionReferencia.trim() || null,
          prod_latitud_aprox: permuta.producto.prod_latitud_aprox ?? null,
          prod_longitud_aprox: permuta.producto.prod_longitud_aprox ?? null,
        }, token ?? undefined),
      ]);
      setPermutas((prev) => prev.map((item) => item.producto.prod_id === permuta.producto.prod_id
        ? { producto: productoActualizado, publicacion: publicacionActualizada }
        : item));
      cancelEdit();
    } catch (error) {
      setPermutasError(error instanceof ApiError ? error.message : 'No fue posible editar la permuta.');
      setIsSavingEdit(false);
    }
  };

  const deletePermuta = async (permuta: MiPermuta) => {
    try {
      setDeletingProductoId(permuta.producto.prod_id);
      setPermutasError(null);
      await eliminarProducto(permuta.producto.prod_id, token ?? undefined);
      await eliminarPublicacion(permuta.publicacion.publ_id, token ?? undefined);
      setPermutas((prev) => prev.filter((item) => item.producto.prod_id !== permuta.producto.prod_id));
      if (editingPermutaId === permuta.producto.prod_id) cancelEdit();
    } catch (error) {
      setPermutasError(error instanceof ApiError ? error.message : 'No fue posible eliminar la permuta.');
    } finally {
      setDeletingProductoId(null);
    }
  };

  const confirmDeleteAccount = async () => {
    if (!user || deleteAccountText.trim().toLowerCase() !== 'eliminar') {
      return;
    }

    try {
      setIsDeletingAccount(true);
      setDeleteAccountError(null);
      await eliminarUsuario(Number(user.id), token ?? undefined);
      await logout();
      setShowDeleteAccount(false);
      setDeleteAccountText('');
    } catch (error) {
      setDeleteAccountError(error instanceof ApiError ? error.message : 'No fue posible eliminar la cuenta.');
    } finally {
      setIsDeletingAccount(false);
    }
  };

  if (!isAuthenticated || !user) {
    return (
      <ScrollView className="flex-1 bg-neutral-50" contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 40, paddingBottom: 104 }} showsVerticalScrollIndicator={false}>
        <View className="items-center py-16 bg-white border border-neutral-100 rounded-2xl px-5">
          <BrandMark size="lg" />
          <Text className="text-2xl font-bold text-neutral-950 mt-6 mb-2">Tu perfil Permutapp</Text>
          <Text className="text-neutral-500 text-base text-center leading-6 mb-6">
            Entra para ver tus publicaciones y estado de verificación.
          </Text>
          <PrimaryButton icon="sign-in" onPress={() => router.push('/login')} className="w-full">
            Iniciar sesión
          </PrimaryButton>
        </View>
      </ScrollView>
    );
  }

  return (
    <>
      <ScrollView className="flex-1 bg-neutral-50" contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 28, paddingBottom: 104 }} showsVerticalScrollIndicator={false}>
        <View className="flex-row items-start justify-between">
          <View className="flex-1 mr-3">
            <SectionHeader title="Perfil" eyebrow="Cuenta" />
          </View>
          <NotificationBell />
        </View>

        <View className="bg-brand-900 rounded-2xl p-5 mb-5 overflow-hidden">
          <View className="absolute right-0 top-0 w-28 h-full bg-teal-800 opacity-60" />
          <View className="flex-row items-center z-10">
            <View className="w-24 h-24 rounded-2xl bg-white/10 border border-white/10 items-center justify-center mr-4">
              <Text className="text-white font-bold text-3xl">{user.name.charAt(0).toUpperCase()}</Text>
            </View>
            <View className="flex-1">
              <View className="flex-row items-center flex-wrap gap-2">
                <Text className="text-white text-xl font-bold">{user.name}</Text>
                {(user.biometricVerified || user.identityStatus === 'APROBADA') && (
                  <FontAwesome name="check-circle" size={18} color="#34d399" />
                )}
              </View>
              <Text className="text-brand-100 text-sm mt-1" numberOfLines={1}>{user.email}</Text>
              <View className="self-start bg-white/10 rounded-full px-3 py-1 mt-3">
                <Text className="text-brand-100 text-sm font-bold">{getIdentityBadge(user.identityStatus, user.biometricVerified)}</Text>
              </View>
            </View>
          </View>
        </View>

        <View className="gap-3 mb-5">
          <InfoBanner
            icon={user.biometricVerified ? 'check-circle' : 'shield'}
            title="Verificación de identidad"
            body={getIdentityMessage(user.identityStatus, user.biometricVerified)}
            tone={getIdentityTone(user.identityStatus, user.biometricVerified)}
          />
          {identityError ? (
            <InfoBanner icon="exclamation-circle" title="Estado no actualizado" body={identityError} tone="amber" />
          ) : null}
        </View>

        {!user.biometricVerified ? (
          <PrimaryButton icon="shield" onPress={() => router.push('/verify-identity' as Href)} className="mb-3">
            Verificar identidad
          </PrimaryButton>
        ) : null}
        <PrimaryButton icon="plus" onPress={() => router.push('/publish' as Href)} className="mb-5">
          Publicar producto
        </PrimaryButton>

        <View className="mb-5">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-neutral-950 text-xl font-bold">Mis permutas</Text>
            <TouchableOpacity className="w-10 h-10 rounded-2xl bg-white border border-neutral-100 items-center justify-center" onPress={cargarMisPermutas} disabled={isLoadingPermutas} activeOpacity={0.75}>
              {isLoadingPermutas ? <ActivityIndicator color="#047857" /> : <FontAwesome name="refresh" size={15} color="#047857" />}
            </TouchableOpacity>
          </View>

          {permutasError ? <InfoBanner icon="exclamation-circle" title="No se pudo completar" body={permutasError} tone="red" /> : null}

          {isLoadingPermutas && permutas.length === 0 ? (
            <View className="bg-white border border-neutral-100 rounded-2xl p-6 items-center">
              <ActivityIndicator color="#047857" />
              <Text className="text-neutral-500 text-sm mt-3">Cargando tus permutas</Text>
            </View>
          ) : null}

          {!isLoadingPermutas && permutas.length === 0 ? (
            <View className="bg-white border border-neutral-100 rounded-2xl p-5">
              <Text className="text-neutral-950 text-base font-bold mb-1">Aún no tienes productos publicados</Text>
              <Text className="text-neutral-500 text-base leading-6">Cuando publiques, aparecerá aquí.</Text>
            </View>
          ) : null}

          {permutas.map((permuta) => {
            const isEditing = editingPermutaId === permuta.producto.prod_id && editForm;
            const isDeleting = deletingProductoId === permuta.producto.prod_id;
            const estacionMetro = encontrarEstacionMetroPorCoordenadas(
              estacionesMetro,
              permuta.producto.prod_latitud_aprox,
              permuta.producto.prod_longitud_aprox,
            );
            return (
              <View key={permuta.producto.prod_id} className="bg-white border border-neutral-100 rounded-2xl p-4 mb-3">
                {isEditing ? (
                  <View className="gap-3">
                    <TextInput className="bg-neutral-50 border border-neutral-200 rounded-2xl px-4 h-12 text-neutral-900" placeholder="Título" value={editForm.titulo} onChangeText={(titulo) => setEditForm((prev) => prev ? { ...prev, titulo } : prev)} />
                    <TextInput className="bg-neutral-50 border border-neutral-200 rounded-2xl px-4 min-h-24 text-neutral-900" placeholder="Descripción" value={editForm.descripcion} onChangeText={(descripcion) => setEditForm((prev) => prev ? { ...prev, descripcion } : prev)} multiline textAlignVertical="top" />
                    <TextInput className="bg-neutral-50 border border-neutral-200 rounded-2xl px-4 h-12 text-neutral-900" placeholder="Producto" value={editForm.nombre} onChangeText={(nombre) => setEditForm((prev) => prev ? { ...prev, nombre } : prev)} />
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 8 }}>
                      {ESTADOS_PRODUCTO.map((estado) => {
                        const selected = editForm.estado === estado;
                        return (
                          <TouchableOpacity key={estado} className={`mr-2 px-3 h-10 rounded-2xl border items-center justify-center ${selected ? 'bg-brand-700 border-brand-700' : 'bg-neutral-50 border-neutral-200'}`} onPress={() => setEditForm((prev) => prev ? { ...prev, estado } : prev)} activeOpacity={0.75}>
                            <Text className={`text-sm font-bold ${selected ? 'text-white' : 'text-neutral-700'}`}>{estado}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                    <TextInput className="bg-neutral-50 border border-neutral-200 rounded-2xl px-4 h-12 text-neutral-900" placeholder="Valor referencial" value={editForm.precio} onChangeText={(precio) => setEditForm((prev) => prev ? { ...prev, precio: precio.replace(/\D/g, '') } : prev)} keyboardType="number-pad" inputMode="numeric" />
                    <TextInput className="bg-neutral-100 border border-neutral-200 rounded-2xl px-4 h-12 text-neutral-500" placeholder="Comuna" value={editForm.ubicacionComuna} editable={false} />
                    <TextInput className="bg-brand-50 border border-brand-100 rounded-2xl px-4 h-12 text-brand-800 font-bold" placeholder="Metro no registrado" value={estacionMetro ? `Metro ${estacionMetro.nombre} · ${estacionMetro.linea}` : ''} editable={false} />
                    {!estacionMetro ? <Text className="text-amber-700 text-xs leading-5">Este producto no tiene coordenadas de Metro registradas.</Text> : null}
                    <Text className="text-neutral-500 text-sm leading-5">La comuna proviene de ServicioLocalizacion y no se edita como texto libre.</Text>
                    <TextInput className="bg-neutral-50 border border-neutral-200 rounded-2xl px-4 h-12 text-neutral-900" placeholder="Referencia" value={editForm.ubicacionReferencia} onChangeText={(ubicacionReferencia) => setEditForm((prev) => prev ? { ...prev, ubicacionReferencia } : prev)} />
                    <View className="flex-row gap-2">
                      <TouchableOpacity className="flex-1 h-12 rounded-2xl bg-brand-700 items-center justify-center" onPress={() => saveEdit(permuta)} disabled={isSavingEdit} activeOpacity={0.75}>
                        {isSavingEdit ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-bold">Guardar</Text>}
                      </TouchableOpacity>
                      <TouchableOpacity className="flex-1 h-12 rounded-2xl bg-neutral-100 items-center justify-center" onPress={cancelEdit} disabled={isSavingEdit} activeOpacity={0.75}>
                        <Text className="text-neutral-700 font-bold">Cancelar</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <>
                    <View className="flex-row items-start justify-between mb-3">
                      <View className="flex-1 pr-3">
                        <Text className="text-neutral-950 text-lg leading-6 font-bold">{permuta.producto.prod_nombre}</Text>
                        <Text className="text-neutral-500 text-base mt-1" numberOfLines={2}>{permuta.publicacion.publ_titulo}</Text>
                      </View>
                      <Text className="text-brand-700 text-base font-bold">${permuta.producto.prod_precio.toLocaleString('es-CL')}</Text>
                    </View>
                    <View className="flex-row items-center flex-wrap mb-3">
                      <View className="bg-brand-50 border border-brand-100 rounded-full px-3 py-1 mr-2 mb-2">
                        <Text className="text-brand-700 text-sm font-bold">{permuta.producto.prod_est}</Text>
                      </View>
                      {permuta.producto.prod_ubicacion_comuna ? (
                        <View className="bg-neutral-100 rounded-full px-3 py-1 mb-2">
                          <Text className="text-neutral-600 text-sm font-bold">{permuta.producto.prod_ubicacion_comuna}</Text>
                        </View>
                      ) : null}
                      {estacionMetro ? (
                        <View className="bg-brand-50 border border-brand-100 rounded-full px-3 py-1 mb-2 ml-2">
                          <Text className="text-brand-700 text-sm font-bold">Metro {estacionMetro.nombre} · {estacionMetro.linea}</Text>
                        </View>
                      ) : null}
                    </View>
                    <View className="flex-row gap-2">
                      <TouchableOpacity className="flex-1 h-11 rounded-2xl bg-neutral-100 items-center justify-center flex-row" onPress={() => startEdit(permuta)} activeOpacity={0.75}>
                        <FontAwesome name="pencil" size={13} color="#404040" />
                        <Text className="text-neutral-700 text-sm font-bold ml-2">Editar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity className="flex-1 h-11 rounded-2xl bg-red-50 border border-red-100 items-center justify-center flex-row" onPress={() => deletePermuta(permuta)} disabled={isDeleting} activeOpacity={0.75}>
                        {isDeleting ? <ActivityIndicator color="#dc2626" /> : <><FontAwesome name="trash" size={13} color="#dc2626" /><Text className="text-red-600 text-sm font-bold ml-2">Eliminar</Text></>}
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>
            );
          })}
        </View>

        <View className="bg-white border border-neutral-100 rounded-2xl p-5 mb-5">
          <Text className="text-neutral-950 text-lg font-bold mb-1">Configuración y privacidad</Text>
          <Text className="text-neutral-500 text-base leading-6 mb-4">
            Revisa tus documentos legales y preferencias.
          </Text>
          <TouchableOpacity className="h-12 rounded-2xl bg-neutral-100 flex-row items-center justify-between px-4 mb-2" onPress={() => router.push('/terms' as Href)} activeOpacity={0.75}>
            <View className="flex-row items-center">
              <FontAwesome name="file-text-o" size={15} color="#525252" />
              <Text className="text-neutral-700 font-bold ml-3">Términos de Servicio</Text>
            </View>
            <FontAwesome name="chevron-right" size={12} color="#a3a3a3" />
          </TouchableOpacity>
          <TouchableOpacity className="h-12 rounded-2xl bg-neutral-100 flex-row items-center justify-between px-4" onPress={() => router.push('/privacy' as Href)} activeOpacity={0.75}>
            <View className="flex-row items-center">
              <FontAwesome name="shield" size={15} color="#525252" />
              <Text className="text-neutral-700 font-bold ml-3">Política de Privacidad</Text>
            </View>
            <FontAwesome name="chevron-right" size={12} color="#a3a3a3" />
          </TouchableOpacity>
        </View>

        <PrimaryButton icon="sign-out" variant="ghost" onPress={logout} className="mb-3">
          Cerrar sesión
        </PrimaryButton>
        <TouchableOpacity className="h-14 rounded-2xl bg-red-50 border border-red-100 flex-row items-center justify-center" onPress={() => setShowDeleteAccount(true)} activeOpacity={0.75}>
          <FontAwesome name="trash" size={15} color="#dc2626" />
          <Text className="text-red-600 font-bold ml-2">Eliminar cuenta</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={showDeleteAccount} transparent animationType="fade" onRequestClose={() => setShowDeleteAccount(false)}>
        <View className="flex-1 bg-black/40 items-center justify-center px-5">
          <View className="w-full max-w-md bg-white rounded-2xl p-5">
            <View className="w-12 h-12 rounded-2xl bg-red-50 border border-red-100 items-center justify-center mb-4">
              <FontAwesome name="exclamation-triangle" size={20} color="#dc2626" />
            </View>
            <Text className="text-neutral-950 text-xl font-bold mb-2">Eliminar cuenta</Text>
            <Text className="text-neutral-500 text-sm leading-5 mb-4">Para confirmar, escribe eliminar. Tu cuenta quedará desactivada y se cerrará la sesión.</Text>
            <TextInput className="bg-neutral-50 border border-neutral-200 rounded-2xl px-4 h-12 text-neutral-900 mb-3" placeholder="eliminar" placeholderTextColor="#a3a3a3" value={deleteAccountText} onChangeText={(text) => { setDeleteAccountText(text); setDeleteAccountError(null); }} autoCapitalize="none" />
            {deleteAccountError ? <Text className="text-red-500 text-xs mb-3">{deleteAccountError}</Text> : null}
            <View className="flex-row gap-2">
              <TouchableOpacity className="flex-1 h-12 rounded-2xl bg-neutral-100 items-center justify-center" onPress={() => { setShowDeleteAccount(false); setDeleteAccountText(''); setDeleteAccountError(null); }} disabled={isDeletingAccount} activeOpacity={0.75}>
                <Text className="text-neutral-700 font-bold">Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity className={`flex-1 h-12 rounded-2xl items-center justify-center ${deleteAccountText.trim().toLowerCase() === 'eliminar' ? 'bg-red-600' : 'bg-red-200'}`} onPress={confirmDeleteAccount} disabled={deleteAccountText.trim().toLowerCase() !== 'eliminar' || isDeletingAccount} activeOpacity={0.75}>
                {isDeletingAccount ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-bold">Eliminar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
