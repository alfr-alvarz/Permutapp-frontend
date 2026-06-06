# PermutApp Frontend

Aplicacion movil y web para publicar productos, proponer permutas y coordinar
intercambios entre usuarios verificados.

El frontend esta construido con Expo, React Native, Expo Router y TypeScript.
Consume una arquitectura de microservicios Spring Boot para autenticacion,
publicaciones, productos, mensajeria y localizacion.

## Tecnologias

- Expo SDK 54
- React 19 y React Native 0.81
- Expo Router 6
- TypeScript en modo estricto
- NativeWind y Tailwind CSS
- Expo Secure Store
- Expo Image Picker

## Funcionalidades

- Registro e inicio de sesion con JWT.
- Persistencia de sesion en web y dispositivos nativos.
- Verificacion de identidad mediante foto de carnet y selfie.
- Catalogo con busqueda y filtros por estado.
- Publicacion de productos con ubicacion aproximada y Metro cercano.
- Carga de hasta 5 fotos por producto; la primera se usa como portada.
- Detalle de producto con galeria, vendedor y ubicacion.
- Inicio de conversaciones desde una publicacion.
- Chat entre el propietario y la persona interesada.
- Perfil con estado de verificacion y administracion de publicaciones.
- Edicion y eliminacion de productos publicados.

## Requisitos

- Node.js 20 LTS recomendado.
- npm.
- Expo Go, un emulador o simulador para ejecutar la version nativa.
- Los microservicios de PermutApp levantados localmente o desplegados.

## Instalacion

```bash
git clone https://github.com/alfr-alvarz/Permutapp-frontend.git
cd Permutapp-frontend
npm install
cp .env.example .env
```

## Variables de entorno

El archivo `.env.example` contiene la configuracion local:

```env
EXPO_PUBLIC_API_BASE_URL=http://localhost:5001
EXPO_PUBLIC_PRODUCTOS_API_BASE_URL=http://localhost:5050
EXPO_PUBLIC_PUBLICACIONES_API_BASE_URL=http://localhost:6001
EXPO_PUBLIC_MENSAJERIA_API_BASE_URL=http://localhost:7001
EXPO_PUBLIC_LOCALIZACION_API_BASE_URL=http://localhost:5002
```

| Variable | Servicio | Puerto local |
| --- | --- | ---: |
| `EXPO_PUBLIC_API_BASE_URL` | ServicioUsuarios | `5001` |
| `EXPO_PUBLIC_PRODUCTOS_API_BASE_URL` | ServicioProducto | `5050` |
| `EXPO_PUBLIC_PUBLICACIONES_API_BASE_URL` | ServicioPublicaciones | `6001` |
| `EXPO_PUBLIC_MENSAJERIA_API_BASE_URL` | ServicioMensajeria | `7001` |
| `EXPO_PUBLIC_LOCALIZACION_API_BASE_URL` | ServicioLocalizacion | `5002` |

En Android Emulator, la aplicacion convierte automaticamente `localhost` y
`127.0.0.1` a `10.0.2.2`.

Para probar desde Expo Go en un telefono fisico, reemplaza `localhost` por la IP
local del computador y asegurate de que ambos dispositivos esten en la misma
red. En ambientes desplegados, usa las URL HTTPS reales de cada servicio.

## Ejecucion

Inicia el servidor de desarrollo:

```bash
npm run start
```

Tambien puedes abrir una plataforma directamente:

```bash
npm run android
npm run ios
npm run web
```

Atajos disponibles en la terminal de Expo:

- `w`: abre la aplicacion web.
- `a`: abre Android Emulator.
- `i`: abre iOS Simulator en macOS.
- QR: abre el proyecto con Expo Go.

Si Metro conserva una configuracion anterior, reinicia limpiando la cache:

```bash
npx expo start --clear
```

## Orden de inicio local

1. Levanta `ServicioUsuarios` en `http://localhost:5001`.
2. Levanta `ServicioProducto` en `http://localhost:5050`.
3. Levanta `ServicioPublicaciones` en `http://localhost:6001`.
4. Levanta `ServicioMensajeria` en `http://localhost:7001`.
5. Levanta `ServicioLocalizacion` en `http://localhost:5002`.
6. Inicia el frontend con `npm run start`.

La pantalla de inicio y el catalogo pueden abrirse sin sesion. Para publicar,
verificar identidad, administrar productos o usar el chat se necesita iniciar
sesion y disponer de los servicios correspondientes.

## Flujo principal

1. El usuario crea una cuenta o inicia sesion.
2. Puede verificar su identidad con una foto del carnet y una selfie.
3. Explora el catalogo o publica un producto.
4. Al publicar, selecciona estado, valor referencial, ubicacion, Metro cercano
   y hasta cinco imagenes.
5. Otra persona abre el detalle y propone una permuta.
6. Ambas partes coordinan el intercambio mediante el chat.
7. El propietario administra sus publicaciones desde el perfil.

## Rutas

| Ruta | Descripcion |
| --- | --- |
| `/(tabs)` | Navegacion principal |
| `/(tabs)/index` | Inicio y productos destacados |
| `/(tabs)/two` | Catalogo y busqueda |
| `/(tabs)/chats` | Conversaciones del usuario |
| `/(tabs)/profile` | Perfil y publicaciones propias |
| `/login` | Inicio de sesion |
| `/register` | Registro |
| `/verify-identity` | Verificacion de identidad |
| `/publish` | Creacion de publicacion y producto |
| `/product/[id]` | Detalle de producto |
| `/chat/[id]` | Conversacion de una permuta |

## Integracion con la API

El cliente HTTP se encuentra en `services/api.ts`. Centraliza:

- Resolucion de URL para web, Android y otros dispositivos nativos.
- Cabecera `Authorization: Bearer <token>` en endpoints protegidos.
- Solicitudes JSON y `multipart/form-data`.
- Mensajes de error de conexion asociados a cada microservicio.
- Operaciones de usuarios, publicaciones, productos, chats y localizacion.

La sesion se administra desde `context/AuthContext.tsx` y se persiste mediante
`services/sessionStorage.ts`.

## Estructura

```text
app/                    Pantallas y rutas de Expo Router
  (tabs)/               Inicio, catalogo, chats y perfil
  chat/[id].tsx         Conversacion de una permuta
  product/[id].tsx      Detalle de producto
  publish.tsx           Flujo de publicacion
  verify-identity.tsx   Verificacion de identidad
components/             Componentes reutilizables
constants/              Colores y constantes visuales
context/                Estado global de autenticacion
layouts/                Layouts principales
services/               Cliente API y almacenamiento de sesion
assets/                 Iconos, imagenes y fuentes
```

## Validacion

Comprueba los tipos antes de enviar cambios:

```bash
npx tsc --noEmit
```

Para revisar que Expo pueda resolver la configuracion:

```bash
npx expo config --type public
```

## Consideraciones

- Las imagenes de productos se convierten a Data URL antes de enviarse al
  servicio de productos.
- El limite del flujo de publicacion es de cinco fotos.
- La ubicacion mostrada es aproximada; el punto final se coordina por chat.
- No subas secretos al repositorio. Solo las variables con prefijo
  `EXPO_PUBLIC_` deben estar disponibles en el cliente.
