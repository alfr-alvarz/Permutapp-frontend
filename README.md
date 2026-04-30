#  Permutapp — Frontend

**Permutapp** es un proyecto de título desarrollado por estudiantes de **Duoc UC** que consiste en una plataforma móvil enfocada en la **economía circular** a través del intercambio y permuta segura de objetos de segunda mano.

Su objetivo principal es prolongar el ciclo de vida de los productos para reducir la huella ecológica y mitigar barreras económicas como la inflación, diferenciándose de otras plataformas al actuar como un mediador que garantiza la seguridad mediante la recomendación de "puntos de encuentro seguros" y un sistema de **validación de identidad biométrica** (Amazon Rekognition).

---

## Arquitectura General

```
Frontend (Expo / React Native)  →  Spring Boot (API Gateway)  →  Supabase (PostgreSQL)
                                         ↕
                                  Amazon Rekognition
                                (Verificación biométrica)
```

- **Frontend:** Expo + React Native + Expo Router (navegación basada en archivos).
- **Estilos:** Tailwind CSS vía NativeWind (clases de utilidad como `className="bg-brand-700 rounded-2xl"`).
- **Backend:** Microservicios en Spring Boot (Java) que actúan como API Gateway.
- **Base de datos:** PostgreSQL alojada en Supabase.
- **Verificación biométrica:** Amazon Rekognition integrado vía Spring Boot.

---

##  Stack Tecnológico

| Tecnología | Versión | Uso |
|---|---|---|
| Expo | SDK 52 | Framework base para desarrollo multiplataforma |
| React Native | 0.76.x | Motor de renderizado nativo |
| Expo Router | v4 | Navegación basada en archivos (file-based routing) |
| NativeWind | v4 | Tailwind CSS para React Native |
| TypeScript | 5.x | Tipado estático para mayor robustez |
| FontAwesome | — | Íconos vectoriales |

---

##  Estructura del Proyecto

```
Permutapp-frontend/
├── app/                        # Pantallas (Expo Router - file-based routing)
│   ├── _layout.tsx             # Layout raíz: carga fuentes, AuthProvider, Stack de rutas
│   ├── +html.tsx               # Plantilla HTML para la versión web
│   ├── +not-found.tsx          # Pantalla 404
│   ├── login.tsx               # Pantalla de inicio de sesión
│   ├── register.tsx            # Pantalla de registro (2 pasos + verificación biométrica)
│   ├── modal.tsx               # Pantalla modal genérica
│   └── (tabs)/                 # Grupo de pestañas principales
│       ├── _layout.tsx         # Configuración del Tab Bar (Inicio, Catálogo)
│       ├── index.tsx           # Pestaña Inicio: banner hero, categorías, productos
│       └── two.tsx             # Pestaña Catálogo: búsqueda, filtros, listado
│
├── components/                 # Componentes reutilizables
│   ├── RequireAuth.tsx         # Wrapper que protege acciones (redirige a login si es invitado)
│   ├── Themed.tsx              # Componentes Text/View con soporte para tema claro/oscuro
│   ├── EditScreenInfo.tsx      # Componente de info de pantalla (plantilla Expo)
│   └── useColorScheme.tsx      # Hook para detectar el esquema de color del dispositivo
│
├── context/                    # Contextos de React (estado global)
│   └── AuthContext.tsx         # Contexto de autenticación: login, logout, verificación biométrica
│
├── layouts/                    # Layouts reutilizables
│   ├── AuthLayout.tsx          # Layout de autenticación: 2 columnas en PC, full en móvil
│   └── MainLayout.tsx          # Layout principal: columna central con ancho máximo
│
├── assets/                     # Recursos estáticos (fuentes, imágenes)
├── global.css                  # Archivo CSS de entrada para Tailwind (NativeWind)
├── tailwind.config.js          # Configuración de Tailwind: paleta brand, rutas de escaneo
├── metro.config.js             # Configuración de Metro Bundler + NativeWind
├── babel.config.js             # Configuración de Babel + NativeWind
├── tsconfig.json               # Configuración de TypeScript
└── package.json                # Dependencias y scripts del proyecto
```

---

##  Instalación y Ejecución

### Requisitos previos

- [Node.js](https://nodejs.org/) v18 o superior
- [npm](https://www.npmjs.com/) o [yarn](https://yarnpkg.com/)
- [Expo CLI](https://docs.expo.dev/get-started/installation/) (se instala automáticamente con `npx`)

### Pasos

```bash
# 1. Clonar el repositorio
git clone https://github.com/alfr-alvarz/Permutapp-frontend.git
cd Permutapp-frontend

# 2. Instalar dependencias
npm install

# 3. Iniciar el servidor de desarrollo
npx expo start
```

Esto abre el panel de Expo. Desde ahí puedes:
- Presionar `w` para abrir en el **navegador web**.
- Escanear el QR con **Expo Go** en tu celular (iOS/Android).
- Presionar `a` para abrir en un **emulador Android**.
- Presionar `i` para abrir en un **simulador iOS** (solo macOS).

---

##  Flujo de Autenticación

### Modo Invitado
Los usuarios pueden navegar libremente por el catálogo sin necesidad de crear una cuenta. Los botones de acción (Publicar, Permutar) están protegidos con el componente `<RequireAuth>`, que redirige al login automáticamente.

### Login
- Autenticación tradicional con **email + contraseña**.
- Opción de **verificación facial** con Amazon Rekognition.
- Validación inline de campos:
  - Email: formato válido (regex).
  - Contraseña: mínimo 8 caracteres + carácter especial.

### Registro (2 pasos)
1. **Formulario:** nombre, email, contraseña, confirmar contraseña.
2. **Verificación biométrica:** captura facial con instrucciones paso a paso. Puede omitirse y completarse después.

---

##  Paleta de Colores (Brand)

La identidad visual usa tonos **verde/esmeralda** que representan sustentabilidad y confianza:

| Token | Hex | Uso principal |
|---|---|---|
| `brand-50` | `#ecfdf5` | Fondos muy sutiles |
| `brand-100` | `#d1fae5` | Fondos suaves (badges, alertas) |
| `brand-200` | `#a7f3d0` | Bordes y acentos |
| `brand-500` | `#10b981` | Color intermedio |
| `brand-700` | `#047857` | **Botones principales** |
| `brand-800` | `#065f46` | Fondos oscuros (branding, hero) |

---

##  Estado Actual

### ✅ Implementado
- [x] Navegación con Expo Router (tabs + stack)
- [x] Contexto de autenticación (AuthContext) con modo invitado
- [x] Componente RequireAuth para proteger acciones
- [x] Pantalla de Login con validación inline
- [x] Pantalla de Registro en 2 pasos (formulario + verificación biométrica)
- [x] Home con banner hero, categorías y productos
- [x] Catálogo con búsqueda en tiempo real y filtros
- [x] Diseño responsivo (móvil + web/PC)
- [x] Paleta de colores personalizada (brand)
- [x] Documentación en español de todo el código

###  Pendiente
- [ ] Conectar AuthContext con los microservicios de Spring Boot
- [ ] Implementar `expo-camera` para captura facial (Amazon Rekognition)
- [ ] Persistencia de tokens de sesión (`expo-secure-store`)
- [ ] Pantalla de perfil de usuario
- [ ] Sistema de chat entre usuarios
- [ ] Mapa con puntos de encuentro seguros (geolocalización)
- [ ] Publicación de productos con imágenes

---

##  Equipo

Proyecto de título — **Duoc UC**

---

##  Licencia

Este proyecto es parte de un trabajo académico y no tiene licencia de distribución pública.
