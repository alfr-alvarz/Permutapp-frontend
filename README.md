# PermutApp Frontend

Aplicacion movil y web para publicar productos, proponer permutas y coordinar intercambios entre usuarios verificados. El frontend esta construido con Expo, React Native, Expo Router y TypeScript.

## Estructura solicitada

```text
DOCUMENTACIÓN/
  Informe TPY1101 - PermutApp.docx
  MER/
  Presentacion PermutApp.pptx        Pendiente

GESTION/
  1.1.2 Documento de registro de definicion e identificacion del proyecto.docx
  Integrantes.txt

PRODUCTO/
  Codigo fuente/
    app/
    assets/
    components/
    constants/
    context/
    layouts/
    services/
    package.json
    package-lock.json
```

La presentacion queda pendiente porque aun no esta lista.

## Producto

El codigo fuente esta en `PRODUCTO/Codigo fuente`.

### Tecnologias

- Expo SDK 54
- React 19 y React Native 0.81
- Expo Router 6
- TypeScript
- NativeWind y Tailwind CSS
- Expo Secure Store
- Expo Image Picker

### Funcionalidades

- Registro e inicio de sesion con JWT.
- Persistencia de sesion en web y dispositivos nativos.
- Verificacion de identidad mediante foto de carnet y selfie.
- Catalogo con busqueda y filtros por estado.
- Publicacion de productos con ubicacion aproximada y Metro cercano.
- Carga de hasta 5 fotos por producto.
- Detalle de producto con galeria, vendedor y ubicacion.
- Inicio de conversaciones desde una publicacion.
- Chat entre el propietario y la persona interesada.
- Perfil con estado de verificacion y administracion de publicaciones.

## Instalacion

```bash
git clone https://github.com/alfr-alvarz/Permutapp-frontend.git
cd Permutapp-frontend/PRODUCTO/Codigo\ fuente
npm install
cp .env.example .env
```

## Variables de entorno

El archivo `PRODUCTO/Codigo fuente/.env.example` contiene la configuracion local:

```env
EXPO_PUBLIC_API_BASE_URL=http://localhost:5001
EXPO_PUBLIC_PRODUCTOS_API_BASE_URL=http://localhost:5050
EXPO_PUBLIC_PUBLICACIONES_API_BASE_URL=http://localhost:6001
EXPO_PUBLIC_MENSAJERIA_API_BASE_URL=http://localhost:7001
EXPO_PUBLIC_LOCALIZACION_API_BASE_URL=http://localhost:5002
EXPO_PUBLIC_NOTIFICACIONES_API_BASE_URL=http://localhost:7002
```

En Android Emulator, la aplicacion convierte automaticamente `localhost` y `127.0.0.1` a `10.0.2.2`.

## Ejecucion

Ejecutar desde `PRODUCTO/Codigo fuente`:

```bash
npm run start
npm run android
npm run ios
npm run web
```

Si Metro conserva una configuracion anterior:

```bash
npx expo start --clear
```

## Orden de inicio local

1. Levantar `ServicioUsuarios` en `http://localhost:5001`.
2. Levantar `ServicioProducto` en `http://localhost:5050`.
3. Levantar `ServicioPublicaciones` en `http://localhost:6001`.
4. Levantar `ServicioMensajeria` en `http://localhost:7001`.
5. Levantar `ServicioLocalizacion` en `http://localhost:5002`.
6. Levantar `ServicioNotificaciones` en `http://localhost:7002`.
7. Iniciar el frontend desde `PRODUCTO/Codigo fuente`.

## Validacion

Ejecutar desde `PRODUCTO/Codigo fuente`:

```bash
npx tsc --noEmit
npx expo export --platform web
```

## Consideraciones

- No subir secretos al repositorio.
- Las variables con prefijo `EXPO_PUBLIC_` quedan disponibles en el cliente.
- Las imagenes de productos se convierten a Data URL antes de enviarse al servicio de productos.
- La ubicacion mostrada es aproximada; el punto final se coordina por chat.
