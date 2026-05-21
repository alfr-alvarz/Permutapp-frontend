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
  ver_ocr_provider: string;
  ver_fecha: string;
  ver_observacion?: string | null;
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

export interface Producto {
  prod_id: number;
  prod_nombre: string;
  prod_est: string;
  prod_precio: number;
  publ_id: number;
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

export function crearPublicacion(payload: CrearPublicacionPayload): Promise<Publicacion> {
  return request<Publicacion, CrearPublicacionPayload>(PUBLICACIONES_API_BASE_URL, '/publicacion', {
    method: 'POST',
    body: payload,
  });
}

export function crearProducto(payload: CrearProductoPayload): Promise<Producto> {
  return request<Producto, CrearProductoPayload>(PRODUCTOS_API_BASE_URL, '/producto', {
    method: 'POST',
    body: payload,
  });
}

export function verificarIdentidad(payload: {
  usuarioId: number;
  carnet: LocalImageFile;
  selfie: LocalImageFile;
  token: string;
}): Promise<VerificacionIdentidad> {
  const formData = new FormData();
  formData.append('usuarioId', String(payload.usuarioId));
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

  return multipartRequest<VerificacionIdentidad>(API_BASE_URL, '/identidad/verificar', formData, payload.token);
}

export function obtenerEstadoIdentidad(usuarioId: number, token: string): Promise<VerificacionIdentidad> {
  return request<VerificacionIdentidad>(API_BASE_URL, `/identidad/estado/${usuarioId}`, { token });
}
