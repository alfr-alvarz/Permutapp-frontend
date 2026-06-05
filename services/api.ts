import { Platform } from 'react-native';

export interface Usuario {
  usu_id: number;
  usu_numrun: number;
  usu_dvrun: string;
  usu_pri_nombre: string;
  usu_seg_nombre?: string | null;
  usu_pri_apellido: string;
  usu_seg_apellido?: string | null;
  usu_email: string;
  usu_prom_rep: number;
  usu_activo: boolean;
  usu_identidad_verificada: boolean;
}

export type EstadoVerificacionIdentidad = 'PENDIENTE' | 'APROBADA' | 'RECHAZADA' | 'REVISION_MANUAL';

export interface VerificacionIdentidad {
  ver_id: number;
  usu_id: number;
  ver_estado: EstadoVerificacionIdentidad;
  ver_face_similarity: number;
  ver_face_threshold: number;
  ver_face_provider: string;
  ver_ocr_run_detectado?: string | null;
  ver_ocr_nombre_detectado?: string | null;
  ver_run_match: boolean;
  ver_nombre_match?: boolean | null;
  ver_ocr_provider: string;
  ver_fecha: string;
  ver_observacion?: string | null;
  ver_revisor_email?: string | null;
  ver_fecha_revision?: string | null;
}

export interface LocalImageFile {
  uri: string;
  name: string;
  type: string;
}

export interface AuthResponse {
  token: string;
  tokenType: 'Bearer';
  expiresIn: number;
  usuario: Usuario;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  usu_numrun: number;
  usu_dvrun: string;
  usu_pri_nombre: string;
  usu_seg_nombre?: string;
  usu_pri_apellido: string;
  usu_seg_apellido?: string;
  usu_email: string;
  usu_pass: string;
}

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

type ApiErrorPayload = {
  message?: string;
  error?: string;
  detail?: string;
  reason?: string;
  errors?: Array<{ field?: string; defaultMessage?: string; message?: string } | string>;
};

function resolveLocalApiUrl(url: string): string {
  if (Platform.OS === 'web') {
    return url.replace('http://127.0.0.1:', 'http://localhost:');
  }

  if (Platform.OS !== 'android') {
    return url;
  }

  return url
    .replace('http://127.0.0.1:', 'http://10.0.2.2:')
    .replace('http://localhost:', 'http://10.0.2.2:');
}

const API_BASE_URL = resolveLocalApiUrl(process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:5001');
const PRODUCTOS_API_BASE_URL = resolveLocalApiUrl(process.env.EXPO_PUBLIC_PRODUCTOS_API_BASE_URL ?? 'http://localhost:5050');
const PUBLICACIONES_API_BASE_URL = resolveLocalApiUrl(process.env.EXPO_PUBLIC_PUBLICACIONES_API_BASE_URL ?? 'http://localhost:6001');
const MENSAJERIA_API_BASE_URL = resolveLocalApiUrl(process.env.EXPO_PUBLIC_MENSAJERIA_API_BASE_URL ?? 'http://localhost:7001');
const LOCALIZACION_API_BASE_URL = resolveLocalApiUrl(process.env.EXPO_PUBLIC_LOCALIZACION_API_BASE_URL ?? 'http://localhost:5002');

function getServiceName(baseUrl: string): string {
  if (baseUrl === API_BASE_URL) {
    return 'ServicioUsuarios';
  }

  if (baseUrl === PRODUCTOS_API_BASE_URL) {
    return 'ServicioProducto';
  }

  if (baseUrl === PUBLICACIONES_API_BASE_URL) {
    return 'ServicioPublicaciones';
  }

  if (baseUrl === MENSAJERIA_API_BASE_URL) {
    return 'ServicioMensajeria';
  }

  if (baseUrl === LOCALIZACION_API_BASE_URL) {
    return 'ServicioLocalizacion';
  }

  return 'el backend';
}

function getApiErrorMessage(payload: ApiErrorPayload, fallback: string): string {
  if (payload.message) {
    return payload.message;
  }

  if (payload.detail) {
    return payload.detail;
  }

  if (payload.reason) {
    return payload.reason;
  }

  const validationError = payload.errors?.find(Boolean);
  if (typeof validationError === 'string') {
    return validationError;
  }

  if (validationError?.defaultMessage) {
    return validationError.defaultMessage;
  }

  if (validationError?.message) {
    return validationError.message;
  }

  return payload.error ?? fallback;
}


function getImageName(uri: string, fallback: string): string {
  const rawName = uri.split('/').pop() || fallback;
  return rawName.includes('.') ? rawName : `${rawName}.jpg`;
}

async function multipartRequest<TResponse>(
  baseUrl: string,
  path: string,
  formData: FormData,
  token?: string,
): Promise<TResponse> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;

  try {
    response = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers,
      body: formData,
    });
  } catch {
    throw new ApiError(
      `No se pudo conectar con ${getServiceName(baseUrl)} en ${baseUrl}. Verifica que el servicio esté corriendo.`,
      0,
    );
  }

  if (!response.ok) {
    let message = 'No fue posible completar la solicitud.';
    try {
      const payload = (await response.json()) as ApiErrorPayload;
      message = getApiErrorMessage(payload, message);
    } catch {
      // Keep the generic message when the backend does not return JSON.
    }
    throw new ApiError(message, response.status);
  }

  return (await response.json()) as TResponse;
}

async function request<TResponse, TBody = undefined>(
  baseUrl: string,
  path: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    body?: TBody;
    token?: string;
  } = {},
): Promise<TResponse> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  let response: Response;

  try {
    response = await fetch(`${baseUrl}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiError(
      `No se pudo conectar con ${getServiceName(baseUrl)} en ${baseUrl}. Verifica que el servicio esté corriendo.`,
      0,
    );
  }

  if (!response.ok) {
    let message = 'No fue posible completar la solicitud.';
    try {
      const payload = (await response.json()) as ApiErrorPayload;
      message = getApiErrorMessage(payload, message);
    } catch {
      // Keep the generic message when the backend does not return JSON.
    }
    throw new ApiError(message, response.status);
  }

  return (await response.json()) as TResponse;
}

export function login(payload: LoginPayload): Promise<AuthResponse> {
  return request<AuthResponse, LoginPayload>(API_BASE_URL, '/auth/login', {
    method: 'POST',
    body: payload,
  });
}

export function register(payload: RegisterPayload): Promise<AuthResponse> {
  return request<AuthResponse, RegisterPayload>(API_BASE_URL, '/auth/register', {
    method: 'POST',
    body: payload,
  });
}

export function obtenerUsuarioPorId(usuarioId: number, token?: string): Promise<Usuario> {
  return request<Usuario>(API_BASE_URL, `/usuario/${usuarioId}`, { token });
}

export function eliminarUsuario(usuarioId: number, token?: string): Promise<string> {
  return request<string>(API_BASE_URL, `/usuario/${usuarioId}`, { method: 'DELETE', token });
}

export interface Producto {
  prod_id: number;
  prod_nombre: string;
  prod_est: string;
  prod_precio: number;
  publ_id: number;
  prod_imagenes?: string[];
  prod_ubicacion_comuna?: string | null;
  prod_ubicacion_referencia?: string | null;
  prod_latitud_aprox?: number | null;
  prod_longitud_aprox?: number | null;
}

export interface CrearPublicacionPayload {
  publ_titulo: string;
  publ_descripcion: string;
  usu_id: number;
}

export interface Publicacion {
  publ_id: number;
  publ_titulo: string;
  publ_descripcion: string;
  publ_fech_creacion: string;
  publ_activo: boolean;
  publ_autor_id: number;
}

export interface CrearProductoPayload {
  prod_nombre: string;
  prod_est: string;
  prod_precio: number;
  publ_id: number;
  prod_imagenes?: string[];
  prod_ubicacion_comuna?: string;
  prod_ubicacion_referencia?: string;
  prod_latitud_aprox?: number;
  prod_longitud_aprox?: number;
}

export interface ActualizarPublicacionPayload {
  publ_titulo: string;
  publ_descripcion: string;
}

export interface ActualizarProductoPayload {
  prod_nombre: string;
  prod_est: string;
  prod_precio: number;
  prod_ubicacion_comuna?: string | null;
  prod_ubicacion_referencia?: string | null;
  prod_latitud_aprox?: number | null;
  prod_longitud_aprox?: number | null;
}

export function obtenerProductos(): Promise<Producto[]> {
  return request<Producto[]>(PRODUCTOS_API_BASE_URL, '/producto');
}

export function obtenerProductoPorId(idProducto: number): Promise<Producto> {
  return request<Producto>(PRODUCTOS_API_BASE_URL, `/producto/${idProducto}`);
}

export function obtenerPublicacionPorId(idPublicacion: number): Promise<Publicacion> {
  return request<Publicacion>(PUBLICACIONES_API_BASE_URL, `/publicacion/${idPublicacion}`);
}

export function obtenerPublicaciones(): Promise<Publicacion[]> {
  return request<Publicacion[]>(PUBLICACIONES_API_BASE_URL, '/publicacion');
}

export function crearPublicacion(payload: CrearPublicacionPayload, token?: string): Promise<Publicacion> {
  return request<Publicacion, CrearPublicacionPayload>(PUBLICACIONES_API_BASE_URL, '/publicacion', {
    method: 'POST',
    body: payload,
    token,
  });
}

export function actualizarPublicacion(idPublicacion: number, payload: ActualizarPublicacionPayload, token?: string): Promise<Publicacion> {
  return request<Publicacion, ActualizarPublicacionPayload>(PUBLICACIONES_API_BASE_URL, `/publicacion/${idPublicacion}`, {
    method: 'PUT',
    body: payload,
    token,
  });
}

export function eliminarPublicacion(idPublicacion: number, token?: string): Promise<string> {
  return request<string>(PUBLICACIONES_API_BASE_URL, `/publicacion/${idPublicacion}`, { method: 'DELETE', token });
}

export function crearProducto(payload: CrearProductoPayload, token?: string): Promise<Producto> {
  return request<Producto, CrearProductoPayload>(PRODUCTOS_API_BASE_URL, '/producto', {
    method: 'POST',
    body: payload,
    token,
  });
}

export function actualizarProducto(idProducto: number, payload: ActualizarProductoPayload, token?: string): Promise<Producto> {
  return request<Producto, ActualizarProductoPayload>(PRODUCTOS_API_BASE_URL, `/producto/${idProducto}`, {
    method: 'PUT',
    body: payload,
    token,
  });
}

export function eliminarProducto(idProducto: number, token?: string): Promise<string> {
  return request<string>(PRODUCTOS_API_BASE_URL, `/producto/${idProducto}`, { method: 'DELETE', token });
}

async function uriToBlob(uri: string): Promise<Blob> {
  const response = await fetch(uri);
  return response.blob();
}

export async function verificarIdentidad(payload: {
  usuarioId: number;
  carnet: LocalImageFile;
  selfie: LocalImageFile;
  token: string;
}): Promise<VerificacionIdentidad> {
  const formData = new FormData();
  formData.append('usuarioId', String(payload.usuarioId));

  if (Platform.OS === 'web') {
    // On web, FormData needs real Blob/File objects
    const carnetBlob = await uriToBlob(payload.carnet.uri);
    const selfieBlob = await uriToBlob(payload.selfie.uri);
    formData.append('carnet', carnetBlob, payload.carnet.name || getImageName(payload.carnet.uri, 'carnet.jpg'));
    formData.append('selfie', selfieBlob, payload.selfie.name || getImageName(payload.selfie.uri, 'selfie.jpg'));
  } else {
    // On native, React Native accepts {uri, name, type} objects
    formData.append('carnet', {
      uri: payload.carnet.uri,
      name: payload.carnet.name || getImageName(payload.carnet.uri, 'carnet.jpg'),
      type: payload.carnet.type || 'image/jpeg',
    } as unknown as Blob);
    formData.append('selfie', {
      uri: payload.selfie.uri,
      name: payload.selfie.name || getImageName(payload.selfie.uri, 'selfie.jpg'),
      type: payload.selfie.type || 'image/jpeg',
    } as unknown as Blob);
  }

  return multipartRequest<VerificacionIdentidad>(API_BASE_URL, '/identidad/verificar', formData, payload.token);
}

export function obtenerEstadoIdentidad(usuarioId: number, token: string): Promise<VerificacionIdentidad> {
  return request<VerificacionIdentidad>(API_BASE_URL, `/identidad/estado/${usuarioId}`, { token });
}


export interface ResolverRevisionIdentidadPayload {
  estado: 'APROBADA' | 'RECHAZADA';
  observacion?: string;
}

export function listarRevisionManualIdentidad(token: string): Promise<VerificacionIdentidad[]> {
  return request<VerificacionIdentidad[]>(API_BASE_URL, '/identidad/revision-manual', { token });
}

export function resolverRevisionManualIdentidad(
  verificacionId: number,
  payload: ResolverRevisionIdentidadPayload,
  token: string,
): Promise<VerificacionIdentidad> {
  return request<VerificacionIdentidad, ResolverRevisionIdentidadPayload>(
    API_BASE_URL,
    `/identidad/revision-manual/${verificacionId}/resolver`,
    { method: 'POST', body: payload, token },
  );
}

export interface Conversacion {
  conv_id: number;
  publ_id: number;
  publ_titulo: string;
  publ_autor_id: number;
  interesado_id: number;
  conv_fech_creacion: string;
  conv_ultima_actividad: string;
  conv_activa: boolean;
  ultimo_mensaje?: string | null;
}

export interface Mensaje {
  mens_id: number;
  conv_id: number;
  emisor_id: number;
  mens_contenido: string;
  mens_fech_envio: string;
}

export interface CrearConversacionPayload {
  publ_id: number;
  interesado_id: number;
  mensaje_inicial: string;
}

export interface EnviarMensajePayload {
  emisor_id: number;
  contenido: string;
}

export function iniciarConversacion(payload: CrearConversacionPayload, token: string): Promise<Conversacion> {
  return request<Conversacion, CrearConversacionPayload>(MENSAJERIA_API_BASE_URL, '/chat/conversaciones', {
    method: 'POST',
    body: payload,
    token,
  });
}

export function listarConversaciones(usuarioId: number, token: string): Promise<Conversacion[]> {
  return request<Conversacion[]>(MENSAJERIA_API_BASE_URL, `/chat/conversaciones/usuario/${usuarioId}`, { token });
}

export function obtenerConversacion(conversacionId: number, usuarioId: number, token: string): Promise<Conversacion> {
  return request<Conversacion>(MENSAJERIA_API_BASE_URL, `/chat/conversaciones/${conversacionId}?usuarioId=${usuarioId}`, { token });
}

export function obtenerMensajes(conversacionId: number, usuarioId: number, token: string): Promise<Mensaje[]> {
  return request<Mensaje[]>(MENSAJERIA_API_BASE_URL, `/chat/conversaciones/${conversacionId}/mensajes?usuarioId=${usuarioId}`, { token });
}

export function enviarMensaje(conversacionId: number, payload: EnviarMensajePayload, token: string): Promise<Mensaje> {
  return request<Mensaje, EnviarMensajePayload>(MENSAJERIA_API_BASE_URL, `/chat/conversaciones/${conversacionId}/mensajes`, {
    method: 'POST',
    body: payload,
    token,
  });
}


export interface EstacionMetro {
  id: number;
  nombre: string;
  linea: string;
  orden?: number | null;
  esCombinacion?: boolean | null;
  latitud?: number | null;
  longitud?: number | null;
  direccion?: string | null;
  comuna?: string | null;
}

export interface SugerenciaPuntoMedioPayload {
  latitudOrigen: number;
  longitudOrigen: number;
  latitudDestino: number;
  longitudDestino: number;
}

export interface SugerenciaPuntoMedio {
  puntoMedioLatitud: number;
  puntoMedioLongitud: number;
  estacionSugerida: EstacionMetro;
  distanciaPuntoMedioKm: number;
  distanciaOrigenKm: number;
  distanciaDestinoKm: number;
  criterio: string;
}

export function obtenerEstacionesMetro(): Promise<EstacionMetro[]> {
  return request<EstacionMetro[]>(LOCALIZACION_API_BASE_URL, '/localizacion/metro/estaciones');
}

export function sugerirMetroPuntoMedio(payload: SugerenciaPuntoMedioPayload): Promise<SugerenciaPuntoMedio> {
  return request<SugerenciaPuntoMedio, SugerenciaPuntoMedioPayload>(LOCALIZACION_API_BASE_URL, '/localizacion/metro/punto-medio', {
    method: 'POST',
    body: payload,
  });
}
