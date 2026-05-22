# PermutApp Frontend

Frontend movil y web de PermutApp construido con Expo, React Native, Expo Router y TypeScript.

La app consume directamente tres microservicios Spring Boot:

- `ServicioUsuarios`: registro, login, JWT y verificacion de identidad.
- `ServicioPublicaciones`: creacion y consulta de publicaciones.
- `ServicioProducto`: creacion y consulta de productos.

## Requisitos

- Node.js 18 o superior
- npm
- Expo Go o Android Studio/Xcode si se quiere probar en emulador
- Backend corriendo localmente o desplegado

## Instalar dependencias

```bash
npm install
```

## Variables de entorno

Crear o revisar el archivo `.env` en la raiz del frontend.

Para entorno local:

```env
EXPO_PUBLIC_API_BASE_URL=http://localhost:5001
EXPO_PUBLIC_PRODUCTOS_API_BASE_URL=http://localhost:5050
EXPO_PUBLIC_PUBLICACIONES_API_BASE_URL=http://localhost:6000
```

Estas URLs apuntan a:

- `5001`: ServicioUsuarios
- `5050`: ServicioProducto
- `6000`: ServicioPublicaciones

En Android Emulator, el codigo convierte automaticamente `localhost` y `127.0.0.1` a `10.0.2.2`, por lo que se pueden mantener las URLs anteriores en `.env`.

Cuando se despliegue, estas variables deben cambiar a las URLs reales del backend en Render.

## Correr el proyecto

```bash
npm run start
```

Tambien se puede correr directo por plataforma:

```bash
npm run android
npm run ios
npm run web
```

Con Expo abierto:

- `w`: abre version web
- `a`: abre Android Emulator
- `i`: abre iOS Simulator en macOS
- QR: abre en Expo Go desde celular

## Validar TypeScript

El proyecto no tiene script propio para typecheck, pero se puede ejecutar:

```bash
npx tsc --noEmit
```

## Flujo principal de la app

1. Registro de usuario.
2. Login con email y contrasena.
3. Perfil con estado de verificacion de identidad.
4. Verificacion de identidad con foto de carnet y selfie.
5. Creacion de publicacion.
6. Creacion de producto asociado a la publicacion.
7. Listado y detalle de productos.

## Verificacion de identidad

La pantalla `verify-identity` permite subir una foto del carnet y tomar una selfie.

El frontend envia ambas imagenes a `ServicioUsuarios` mediante `multipart/form-data`.

El backend responde con un estado:

- `APROBADA`
- `RECHAZADA`
- `REVISION_MANUAL`
- `PENDIENTE`

La app muestra el resultado en pantalla y actualiza el perfil con el estado real consultado al backend.

## Rutas principales

```txt
/login                 Inicio de sesion
/register              Registro de usuario
/verify-identity       Verificacion de identidad
/publish               Crear publicacion y producto
/product/[id]          Detalle de producto
/(tabs)                Navegacion principal
/(tabs)/index          Inicio
/(tabs)/two            Catalogo
/(tabs)/profile        Perfil
```

## Servicios usados

Archivo principal de consumo API:

```txt
services/api.ts
```

Funciones importantes:

- `login`
- `register`
- `verificarIdentidad`
- `obtenerEstadoIdentidad`
- `crearPublicacion`
- `crearProducto`
- `obtenerProductos`
- `obtenerProductoPorId`
- `listarRevisionManualIdentidad`
- `resolverRevisionManualIdentidad`

## Autenticacion

El backend entrega un JWT al iniciar sesion o registrarse.

El frontend guarda la sesion y envia el token en endpoints privados con:

```http
Authorization: Bearer TOKEN
```

## Estructura basica

```txt
app/                  Pantallas y rutas Expo Router
components/           Componentes reutilizables
context/              AuthContext y estado global de sesion
services/             Cliente API y almacenamiento de sesion
assets/               Imagenes y recursos estaticos
tailwind.config.js    Configuracion de estilos
```

## Orden recomendado para probar local

1. Levantar `ServicioUsuarios` en `http://localhost:5001`.
2. Levantar `ServicioPublicaciones` en `http://localhost:6000`.
3. Levantar `ServicioProducto` en `http://localhost:5050`.
4. Iniciar Expo con `npm run start`.
5. Registrar o iniciar sesion.
6. Probar verificacion de identidad.
7. Crear publicacion y producto.
