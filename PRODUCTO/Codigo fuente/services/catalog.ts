import { Producto, obtenerProductos, obtenerPublicaciones } from './api';

export async function obtenerProductosActivos(): Promise<Producto[]> {
  const [productos, publicaciones] = await Promise.all([
    obtenerProductos(),
    obtenerPublicaciones(),
  ]);
  const publicacionesActivas = new Set(
    publicaciones
      .filter((publicacion) => publicacion.publ_activo)
      .map((publicacion) => publicacion.publ_id),
  );
  return productos.filter((producto) => publicacionesActivas.has(producto.publ_id));
}
