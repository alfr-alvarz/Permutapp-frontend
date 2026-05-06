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

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:5001';
const PRODUCTOS_API_BASE_URL = process.env.EXPO_PUBLIC_PRODUCTOS_API_BASE_URL ?? 'http://localhost:5050';
const PUBLICACIONES_API_BASE_URL = process.env.EXPO_PUBLIC_PUBLICACIONES_API_BASE_URL ?? 'http://localhost:6000';

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
      const payload = (await response.json()) as { message?: string; error?: string };
      message = payload.message ?? payload.error ?? message;
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
