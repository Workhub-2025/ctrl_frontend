# Integración Strapi Auth + Estado Global — `ctrl-frontend-hybrid`

> Análisis y plan de tareas para la rama `ctrl-frontend-hybrid`  
> Fecha: abril 2026

---

## 1. Estado actual de la autenticación

### Flujo vigente

```
Browser → NextAuth CredentialsProvider
  → POST /auth/local (Strapi Users & Permissions)
  → GET /users/me?populate=role (con el JWT de usuario)
  → JWT almacenado en la sesión NextAuth (estrategia jwt)
  → fetch-client.ts inyecta Authorization: Bearer <userJWT> en cada request
```

### Archivos clave

| Archivo | Responsabilidad |
|---|---|
| `src/app/api/auth/[...nextauth]/route.ts` | Configuración NextAuth, authorize, callbacks jwt/session |
| `src/services/auth-api.ts` | `AuthAPI.login`, `AuthAPI.register` → llaman a Strapi |
| `src/lib/fetch-client.ts` | Cliente HTTP; inyecta JWT de sesión NextAuth en cada request |
| `src/hooks/use-auth.ts` | Hook cliente: `login`, `logout`, `register`, `routeAfterLogin` |
| `src/lib/auth/server-action-auth.ts` | Helpers Server Actions: `getActionAuthContext`, `requireAdminActionContext` |
| `src/middleware.ts` | Protección de rutas con `withAuth` |
| `src/lib/auth/role-model.ts` | Normalización de roles: `candidate`, `hiring_manager`, `client`, `admin` |

### Variables de entorno actuales

```bash
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_STRAPI_API_URL=http://localhost:1337   # cliente
STRAPI_API_URL=http://localhost:1337/api            # servidor (SSR / Server Actions)
```

> **Problema**: No existe `STRAPI_API_TOKEN`. Todas las peticiones servidor-servidor
> utilizan el JWT del usuario, que tiene los mismos permisos limitados que el usuario final.

---

## 2. Problemas identificados

### 2.1 Ausencia del Strapi API Token (prioridad alta)

El Strapi API Token es una credencial de **servicio a servicio** generada en el panel de Strapi
(`Settings → API Tokens`). Es independiente de la sesión del usuario y permite que el backend
de Next.js realice operaciones privilegiadas sin exponer credenciales de usuario.

**Impacto de no tenerlo:**

- El registro de usuarios pasa por el endpoint público `/auth/local/register`, que no puede
  asignar roles personalizados ni completar campos customizados en el mismo request.
- Las Server Actions y Route Handlers admin (`/admin/*`) delegan toda la autorización
  únicamente en el JWT del usuario: si el token expira o es inválido, la operación falla
  silenciosamente o devuelve 401 sin posibilidad de reintento server-side.
- No hay forma de hacer llamadas administrativas (consultas a colecciones privadas, gestión de
  usuarios, estadísticas) desde SSR sin impersonar al usuario.

### 2.2 Ausencia de gestor de estado global

Actualmente no hay ningún store (Redux/Zustand/Jotai). El estado de la aplicación está
fragmentado en:

- `useSession` de NextAuth (datos básicos del usuario)
- Estado local `useState` en cada página/componente
- Server Actions para mutaciones (sin cache compartido client-side)

**Impacto:**

- El perfil del usuario se re-fetcha en cada página que lo necesita.
- El progreso de assessment no se comparte entre componentes sin prop-drilling.
- Las notificaciones y alertas de UI no tienen un canal centralizado.
- Refrescar el perfil en una página no actualiza la UI en otra.

### 2.3 `fetch-client.ts` no distingue contextos de llamada

El cliente usa siempre el JWT del usuario. No tiene un modo para inyectar el API Token de Strapi
en llamadas server-to-server privilegiadas.

---

## 3. Plan de integración: Strapi API Token

### 3.1 Configuración del token en Strapi

1. En Strapi Admin: `Settings → API Tokens → Create new API Token`
2. Crear **dos tokens**:

   | Token | Tipo | Uso |
   |---|---|---|
   | `CTRL_SERVER_FULL` | Full Access | Server Actions admin, creación de usuarios, asignación de roles |
   | `CTRL_SERVER_READ` | Read-only | SSR de contenido público (si aplica) |

3. Agregar al `.env.local` (y variables de entorno en Railway/Render/DO):

```bash
# Strapi API Token — SOLO SERVER SIDE, NUNCA NEXT_PUBLIC_
STRAPI_API_TOKEN=<token-full-access>
STRAPI_API_TOKEN_READONLY=<token-read-only>
```

### 3.2 Modificar `fetch-client.ts`

Agregar una función `fetchApiAdmin` (o `fetchApiWithToken`) que use el API Token en lugar del
JWT de usuario. Esta función **solo debe invocarse en contextos server-side** (Server Actions,
Route Handlers, `getServerSession`).

```typescript
// src/lib/fetch-client.ts — ADICIÓN

const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN;

/**
 * Fetch client para llamadas server-side con Strapi API Token.
 * NUNCA llamar desde Client Components.
 */
export const fetchApiAdmin = {
  get: async <T>(url: string, options: RequestInit = {}): Promise<T> => {
    if (typeof window !== 'undefined') {
      throw new Error('fetchApiAdmin must only be called server-side');
    }
    return fetchWithToken<T>(url, { ...options, method: 'GET' });
  },
  post: async <T>(url: string, body: unknown, options: RequestInit = {}): Promise<T> => {
    return fetchWithToken<T>(url, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
    });
  },
  put: async <T>(url: string, body: unknown, options: RequestInit = {}): Promise<T> => {
    return fetchWithToken<T>(url, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },
};

async function fetchWithToken<T>(url: string, options: RequestInit): Promise<T> {
  const baseUrl = process.env.STRAPI_API_URL || 'http://strapi:1337/api';
  const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;

  const response = await fetch(fullUrl, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${STRAPI_API_TOKEN}`,
      ...(options.headers ?? {}),
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      error?.error?.message || `Strapi Admin API error ${response.status}`
    );
  }

  return response.json() as Promise<T>;
}
```

### 3.3 Tareas por módulo

#### A. Registro de usuarios

**Problema actual**: `AuthAPI.register` llama a `/auth/local/register` (endpoint público).
Strapi no permite asignar un `role` personalizado ni completar campos JSON (`equalityMonitoring`)
desde este endpoint sin permisos de administrador.

**Solución**:

```
1. Mantener POST /auth/local/register para crear la cuenta base (sin rol personalizado).
2. En Server Action (post-registro), usar fetchApiAdmin para:
   - PUT /users/:id  → asignar role correcto (Candidate = roleId 4)
   - PUT /users/:id  → completar campos: firstName, lastName, phone, organization
```

**Archivos a modificar:**

- `src/services/auth-api.ts` → agregar `AuthAPI.assignRole(userId, roleId)` que use `fetchApiAdmin`
- `src/app/actions/users.actions.ts` → invocar `assignRole` en el Server Action post-registro
- `src/hooks/use-auth.ts` → adaptar `register()` para pasar por la nueva acción

#### B. Operaciones admin (Server Actions)

**Problema actual**: `getActionAuthContext` en `server-action-auth.ts` obtiene el JWT del usuario
de la sesión. Si el usuario tiene un rol admin en Strapi, sus requests son privilegiados. Pero si
el JWT expira, los Server Actions fallan.

**Solución**: Para operaciones de escritura admin (crear/eliminar usuarios, cambiar roles), las
Server Actions deben usar `fetchApiAdmin` en lugar del JWT de usuario.

**Archivos a modificar:**

- `src/lib/auth/server-action-auth.ts` → agregar helper `requireAdminApiCall()` que retorne
  `fetchApiAdmin` tras verificar el rol admin de la sesión
- `src/app/actions/users.actions.ts` → reemplazar `UsersService.updateUser` con llamadas admin
  para operaciones de escritura privilegiadas

#### C. Route Handlers (`/api/user/profile`, `/api/user/privacy-consent`)

**Problema actual**: Los Route Handlers obtienen el JWT de sesión y lo pasan directamente a
Strapi. Si se necesita leer campos privados o actualizar datos de otro usuario, el JWT del usuario
no tiene permisos.

**Solución**: En el Route Handler, verificar sesión con NextAuth, luego usar `fetchApiAdmin` para
el call a Strapi si la operación lo requiere.

```typescript
// src/app/api/user/profile/route.ts — MODIFICACIÓN PARCIAL
// GET: mantener con JWT de usuario (solo lee sus propios datos)
// PUT: usar fetchApiAdmin para actualizar campos que requieran permisos elevados
import { fetchApiAdmin } from '@/lib/fetch-client';

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  // Usar API Token para la actualización (evita problemas de permisos en Strapi)
  const updated = await fetchApiAdmin.put(`/users/${session.user.id}`, body);
  return NextResponse.json(updated);
}
```

#### D. Variables de entorno y seguridad

**Checklist**:

- [ ] `STRAPI_API_TOKEN` nunca debe tener prefijo `NEXT_PUBLIC_`
- [ ] Agregar `STRAPI_API_TOKEN` a `.env.local.example` con un valor placeholder
- [ ] En Vercel/Railway/DO App Platform: agregar como variable de entorno de servidor
- [ ] En CI/CD: no imprimir el token en logs (`console.log` con token → riesgo)
- [ ] Rotar el token si se expone accidentalmente (Strapi Admin → revocar y regenerar)

---

## 4. Plan de integración: Gestor de Estado Global

### 4.1 Recomendación: Zustand

**Por qué Zustand sobre Redux:**

| Criterio | Zustand | Redux Toolkit |
|---|---|---|
| Boilerplate | Mínimo | Medio (slices, reducers, thunks) |
| Compatibilidad App Router (RSC) | Excelente con patrón Provider | Requiere `use client` en Provider |
| Bundle size | ~3 KB | ~15 KB (RTK) |
| TypeScript | First-class | First-class |
| DevTools | Zustand devtools middleware | Redux DevTools (más maduro) |
| Curva de aprendizaje | Baja | Media |

> Para este proyecto (Next.js 15 + App Router + RSC) Zustand es la opción más simple y compatible.

### 4.2 Instalación

```bash
npm install zustand
```

### 4.3 Estructura propuesta

```
src/
  store/
    index.ts              ← re-export de todos los stores
    auth.store.ts         ← perfil de usuario cacheado, estado de sesión extendido
    assessment.store.ts   ← progreso de assessment activo
    notifications.store.ts ← notificaciones/alerts globales
    ui.store.ts           ← sidebar, modales, loaders globales
```

### 4.4 `auth.store.ts` — Store de autenticación/perfil

```typescript
// src/store/auth.store.ts
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { IPublicUser } from '@/types';

interface AuthState {
  // Perfil extendido del usuario (más completo que la sesión NextAuth)
  userProfile: IPublicUser | null;
  profileLoaded: boolean;
  // Acciones
  setUserProfile: (profile: IPublicUser) => void;
  clearUserProfile: () => void;
  updateProfileField: <K extends keyof IPublicUser>(key: K, value: IPublicUser[K]) => void;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set) => ({
        userProfile: null,
        profileLoaded: false,
        setUserProfile: (profile) =>
          set({ userProfile: profile, profileLoaded: true }, false, 'auth/setUserProfile'),
        clearUserProfile: () =>
          set({ userProfile: null, profileLoaded: false }, false, 'auth/clearUserProfile'),
        updateProfileField: (key, value) =>
          set(
            (state) => ({
              userProfile: state.userProfile
                ? { ...state.userProfile, [key]: value }
                : null,
            }),
            false,
            'auth/updateProfileField'
          ),
      }),
      {
        name: 'ctrl-auth-profile',
        // Solo persistir campos no sensibles
        partialize: (state) => ({
          userProfile: state.userProfile
            ? {
                id: state.userProfile.id,
                firstName: state.userProfile.firstName,
                lastName: state.userProfile.lastName,
                email: state.userProfile.email,
                role: state.userProfile.role,
                organization: state.userProfile.organization,
              }
            : null,
          profileLoaded: state.profileLoaded,
        }),
      }
    )
  )
);
```

### 4.5 `notifications.store.ts` — Notificaciones globales

```typescript
// src/store/notifications.store.ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  autoDismiss?: boolean; // true por defecto
  duration?: number;     // ms, default 4000
}

interface NotificationsState {
  notifications: Notification[];
  addNotification: (n: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

export const useNotificationsStore = create<NotificationsState>()(
  devtools((set) => ({
    notifications: [],
    addNotification: (n) =>
      set(
        (state) => ({
          notifications: [
            ...state.notifications,
            { ...n, id: crypto.randomUUID() },
          ],
        }),
        false,
        'notifications/add'
      ),
    removeNotification: (id) =>
      set(
        (state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        }),
        false,
        'notifications/remove'
      ),
    clearAll: () => set({ notifications: [] }, false, 'notifications/clearAll'),
  }))
);
```

### 4.6 `assessment.store.ts` — Progreso de assessment

```typescript
// src/store/assessment.store.ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface AssessmentState {
  activeAssessmentId: string | null;
  currentStep: number;
  totalSteps: number;
  answers: Record<string, unknown>;
  integrityEvents: string[];
  setActiveAssessment: (id: string, totalSteps: number) => void;
  recordAnswer: (questionId: string, answer: unknown) => void;
  addIntegrityEvent: (event: string) => void;
  resetAssessment: () => void;
}

export const useAssessmentStore = create<AssessmentState>()(
  devtools((set) => ({
    activeAssessmentId: null,
    currentStep: 0,
    totalSteps: 0,
    answers: {},
    integrityEvents: [],
    setActiveAssessment: (id, totalSteps) =>
      set({ activeAssessmentId: id, totalSteps, currentStep: 0, answers: {} },
        false, 'assessment/setActive'),
    recordAnswer: (questionId, answer) =>
      set(
        (state) => ({
          answers: { ...state.answers, [questionId]: answer },
          currentStep: state.currentStep + 1,
        }),
        false,
        'assessment/recordAnswer'
      ),
    addIntegrityEvent: (event) =>
      set(
        (state) => ({ integrityEvents: [...state.integrityEvents, event] }),
        false,
        'assessment/integrityEvent'
      ),
    resetAssessment: () =>
      set({
        activeAssessmentId: null,
        currentStep: 0,
        totalSteps: 0,
        answers: {},
        integrityEvents: [],
      }, false, 'assessment/reset'),
  }))
);
```

### 4.7 Provider y configuración (App Router)

Zustand **no necesita un Provider** para su uso básico. Pero si se usa `persist` con
`localStorage` (SSR), se requiere un wrapper para evitar hydration mismatch:

```typescript
// src/components/providers/store-hydration.tsx
'use client';

import { useEffect, useState } from 'react';

/**
 * Wrapper para hidratar stores con persist en App Router.
 * Evita hydration mismatch entre SSR y cliente.
 */
export function StoreHydration({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  return hydrated ? <>{children}</> : null;
}
```

Agregar a `src/app/layout.tsx`:

```tsx
// src/app/layout.tsx — MODIFICACIÓN
import { StoreHydration } from '@/components/providers/store-hydration';
// ...
<StoreHydration>
  {children}
</StoreHydration>
```

### 4.8 Integración con `use-auth.ts`

Modificar `use-auth.ts` para sincronizar el perfil con el store tras el login:

```typescript
// src/hooks/use-auth.ts — MODIFICACIÓN PARCIAL
import { useAuthStore } from '@/store/auth.store';
import { useNotificationsStore } from '@/store/notifications.store';

export function useAuth() {
  const { data: session, status } = useSession();
  const { setUserProfile, clearUserProfile } = useAuthStore();
  const { addNotification } = useNotificationsStore();
  // ...

  const login = async (email: string, password: string) => {
    // ... lógica existente ...
    // Tras login exitoso, fetch del perfil completo y persistir en store
    const profileResponse = await fetch('/api/user/profile');
    if (profileResponse.ok) {
      const profile = await profileResponse.json();
      setUserProfile(profile);
    }
  };

  const logout = async () => {
    clearUserProfile();
    await signOut({ redirect: false });
    router.push('/');
  };
}
```

---

## 5. Lista de tareas consolidada

### Fase 1 — Strapi API Token (servidor)

- [ ] **T1.1** Generar API Token Full Access en Strapi Admin y agregar `STRAPI_API_TOKEN` a `.env.local`
- [ ] **T1.2** Agregar `STRAPI_API_TOKEN` a `.env.local.example` con placeholder
- [ ] **T1.3** Agregar función `fetchApiAdmin` (y `fetchWithToken`) en `src/lib/fetch-client.ts`
- [ ] **T1.4** Agregar guard en `fetchApiAdmin` que lance error si se llama client-side
- [ ] **T1.5** Crear `AuthAPI.assignRole(userId: number, roleId: number)` usando `fetchApiAdmin`
- [ ] **T1.6** Modificar `users.actions.ts` para usar `fetchApiAdmin` en operaciones de escritura admin
- [ ] **T1.7** Modificar `PUT /api/user/profile` para usar `fetchApiAdmin` en la actualización
- [ ] **T1.8** Revisar Server Actions en `companies.actions.ts`, `question.actions.ts` y `texts.actions.ts` — reemplazar `fetchApi` por `fetchApiAdmin` donde se requieran permisos elevados
- [ ] **T1.9** Actualizar `STRAPI_CLIENT_README.md` con la diferencia entre `fetchApi` (user JWT) y `fetchApiAdmin` (API Token)

### Fase 2 — Registro con rol asignado

- [ ] **T2.1** Después de `POST /auth/local/register`, llamar `AuthAPI.assignRole` con el roleId de Candidate (Server Action)
- [ ] **T2.2** Verificar que los campos `firstName`, `lastName`, `phone`, `organization` se guarden correctamente vía `fetchApiAdmin.put(/users/:id, data)` post-registro
- [ ] **T2.3** Manejar errores de asignación de rol sin bloquear el flujo de registro (log + fallback)

### Fase 3 — Zustand (estado global)

- [ ] **T3.1** `npm install zustand`
- [ ] **T3.2** Crear `src/store/auth.store.ts` con `useAuthStore`
- [ ] **T3.3** Crear `src/store/notifications.store.ts` con `useNotificationsStore`
- [ ] **T3.4** Crear `src/store/assessment.store.ts` con `useAssessmentStore`
- [ ] **T3.5** Crear `src/store/index.ts` re-exportando todos los stores
- [ ] **T3.6** Crear `src/components/providers/store-hydration.tsx`
- [ ] **T3.7** Integrar `StoreHydration` en `src/app/layout.tsx`
- [ ] **T3.8** Modificar `use-auth.ts`: sync de perfil al `useAuthStore` tras login/logout
- [ ] **T3.9** Reemplazar `useState` de perfil de usuario en páginas Dashboard por `useAuthStore`
- [ ] **T3.10** Conectar `useAssessmentStore` en `secure-assessment-shell.tsx` y `use-assessment-integrity.ts`
- [ ] **T3.11** Reemplazar toasts/sonner locales por `useNotificationsStore.addNotification` en componentes de auth

### Fase 4 — Seguridad y validación

- [ ] **T4.1** Auditar que ningún `console.log` imprima el valor de `STRAPI_API_TOKEN`
- [ ] **T4.2** Verificar que `STRAPI_API_TOKEN` no esté en el bundle cliente (no `NEXT_PUBLIC_`)
- [ ] **T4.3** Agregar test de tipo TypeScript que falle si `fetchApiAdmin` se importa en un Client Component
- [ ] **T4.4** Documentar la rotación del API Token en el README

---

## 6. Diagrama de flujo actualizado

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENTE (Browser)                        │
│                                                               │
│  useAuth() → signIn('credentials') → NextAuth               │
│  useAuthStore() → perfil cacheado en Zustand                │
│  useNotificationsStore() → alerts globales                  │
└─────────────────────────────────────────────────────────────┘
         │ HTTPS (JWT de usuario en sesión NextAuth)
         ▼
┌─────────────────────────────────────────────────────────────┐
│              NEXT.JS SERVER (App Router)                     │
│                                                               │
│  Route Handlers / Server Actions                             │
│  ├── fetchApi (user JWT)    → operaciones propias del usuario│
│  └── fetchApiAdmin (API Token) → operaciones privilegiadas  │
└─────────────────────────────────────────────────────────────┘
         │ Bearer <userJWT>          │ Bearer <STRAPI_API_TOKEN>
         ▼                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  STRAPI BACKEND                              │
│                                                               │
│  /auth/local            → autenticación usuario             │
│  /users/me              → perfil propio (user JWT)          │
│  /users/:id  (PUT)      → actualizar perfil (API Token)     │
│  /users-permissions/*   → roles (API Token)                 │
│  /[colecciones]         → CRUD admin (API Token)            │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. Notas adicionales

### Sobre la estrategia de sesión NextAuth

La estrategia `jwt` actual es la correcta para este stack (no se necesita BD para sesiones).
El JWT de NextAuth **contiene** el JWT de Strapi del usuario (campo `token.jwt`).

- No aumentar el tiempo de expiración del JWT de Strapi a más de 30 días.
- Si se requiere renovar el token de Strapi automáticamente, implementar el callback
  `jwt` en NextAuth para llamar a `POST /auth/local` con refresh token (Strapi v4/v5 soporta
  refresh tokens a través del plugin `@strapi/plugin-users-permissions`).

### Sobre Zustand y Server Components

Zustand **no funciona en React Server Components**. Los stores solo deben accederse desde:
- Client Components (`'use client'`)
- Hooks cliente (`use-auth.ts`, etc.)

Para pasar datos de servidor a Zustand, el patrón recomendado es:
1. Server Component fetcha los datos
2. Pasa datos como props a un Client Component "hidratador"
3. El Client Component llama `store.setState()` una sola vez

### Sobre `documentId` (Strapi v5)

El tipo `IUser` ya incluye `documentId?: string` para compatibilidad con Strapi v5.
Al usar `fetchApiAdmin.put`, verificar si Strapi está en v4 (`/users/:id`) o v5
(`/users/:documentId`) y ajustar la URL según corresponda.
