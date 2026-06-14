import { Platform } from 'react-native';

import { ApiError } from './api';

function resolveLocalUrl(url: string): string {
  if (Platform.OS === 'web') return url.replace('http://127.0.0.1:', 'http://localhost:');
  if (Platform.OS !== 'android') return url;
  return url
    .replace('http://127.0.0.1:', 'http://10.0.2.2:')
    .replace('http://localhost:', 'http://10.0.2.2:');
}

const BASE_URL = resolveLocalUrl(
  process.env.EXPO_PUBLIC_MENSAJERIA_API_BASE_URL ?? 'http://localhost:7001',
);

export type EstadoConversacion = 'NEGOCIANDO' | 'FINALIZACION_PENDIENTE' | 'FINALIZADA';
export type TipoMensaje = 'TEXTO' | 'OFERTA' | 'SISTEMA';

export interface OfertaProducto {
  prod_id: number;
  publ_id: number;
  nombre: string;
  titulo: string;
  estado: string;
  precio: number;
  imagen?: string | null;
}

export interface ConversacionPermuta {
  conv_id: number;
  publ_id: number;
  prod_id?: number | null;
  publ_titulo: string;
  publ_autor_id: number;
  interesado_id: number;
  conv_fech_creacion: string;
  conv_ultima_actividad: string;
  conv_activa: boolean;
  ultimo_mensaje?: string | null;
  conv_estado: EstadoConversacion;
  cantidad_mensajes: number;
  mensajes_para_finalizar: number;
  finalizacion_solicitada_por?: number | null;
  conv_fecha_finalizacion?: string | null;
  oferta?: OfertaProducto | null;
  otro_usuario_id: number;
  puede_ofertar: boolean;
  puede_solicitar_finalizacion: boolean;
  puede_confirmar_finalizacion: boolean;
  puede_valorar: boolean;
  usuario_ya_valoro: boolean;
}

export interface MensajePermuta {
  mens_id: number;
  conv_id: number;
  emisor_id: number;
  mens_contenido: string;
  mens_fech_envio: string;
  mens_tipo: TipoMensaje;
  oferta?: OfertaProducto | null;
}

export interface Valoracion {
  val_id: number;
  conv_id: number;
  evaluador_id: number;
  evaluado_id: number;
  estrellas: number;
  comentario: string;
  fecha: string;
}

export interface ResumenValoracion {
  usuario_id: number;
  promedio: number;
  cantidad: number;
  valoraciones: Valoracion[];
}

async function request<T>(
  path: string,
  token?: string,
  options: { method?: 'GET' | 'POST'; body?: unknown } = {},
): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    throw new ApiError(`No se pudo conectar con ServicioMensajeria en ${BASE_URL}.`, 0);
  }
  if (!response.ok) {
    const raw = await response.text();
    let message = raw || 'No fue posible completar la solicitud.';
    try {
      const parsed = JSON.parse(raw) as { message?: string; detail?: string };
      message = parsed.message ?? parsed.detail ?? message;
    } catch {
      // Keep the plain server response.
    }
    throw new ApiError(message, response.status);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export function obtenerDetallePermuta(id: number, usuarioId: number, token: string) {
  return request<ConversacionPermuta>(`/chat/conversaciones/${id}?usuarioId=${usuarioId}`, token);
}

export function obtenerMensajesPermuta(id: number, usuarioId: number, token: string) {
  return request<MensajePermuta[]>(`/chat/conversaciones/${id}/mensajes?usuarioId=${usuarioId}`, token);
}

export function enviarMensajePermuta(id: number, usuarioId: number, contenido: string, token: string) {
  return request<MensajePermuta>(`/chat/conversaciones/${id}/mensajes`, token, {
    method: 'POST',
    body: { emisor_id: usuarioId, contenido },
  });
}

export function seleccionarOferta(id: number, usuarioId: number, productoId: number, token: string) {
  return request<ConversacionPermuta>(`/chat/conversaciones/${id}/oferta`, token, {
    method: 'POST',
    body: { usuario_id: usuarioId, prod_id: productoId },
  });
}

export function solicitarFinalizacion(id: number, usuarioId: number, token: string) {
  return request<ConversacionPermuta>(`/chat/conversaciones/${id}/finalizacion`, token, {
    method: 'POST',
    body: { usuario_id: usuarioId },
  });
}

export function confirmarFinalizacion(id: number, usuarioId: number, token: string) {
  return request<ConversacionPermuta>(`/chat/conversaciones/${id}/finalizacion/confirmar`, token, {
    method: 'POST',
    body: { usuario_id: usuarioId },
  });
}

export function crearValoracion(
  id: number,
  usuarioId: number,
  estrellas: number,
  comentario: string,
  token: string,
) {
  return request<Valoracion>(`/chat/conversaciones/${id}/valoraciones`, token, {
    method: 'POST',
    body: { evaluador_id: usuarioId, estrellas, comentario },
  });
}

export function obtenerResumenValoracion(usuarioId: number) {
  return request<ResumenValoracion>(`/chat/usuarios/${usuarioId}/valoraciones/resumen`);
}
