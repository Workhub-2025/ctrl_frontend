# Integración Strapi Auth + Estado Global — `ctrl-frontend-hybrid`

> Análisis y plan de tareas para la rama `ctrl-frontend-hybrid`  
> Última actualización: abril 2026

---

## 1. Estado actual de la autenticación

### Flujo vigente

```
Browser → NextAuth CredentialsProvider
  → POST /auth/local (Strapi Users & Permissions)
  → JWT de usuario almacenado en sesión NextAuth (estrategia jwt)
  → Server Actions / Route Handlers usan getServerStrapiClient() con el JWT
  → strapiServerClient (singleton con API Token) para operaciones privilegiadas
```

### Archivos clave

| Archivo | Responsabilidad |
|---|---|
| `src/app/api/auth/[...nextauth]/route.ts` | Configuración NextAuth, authorize, callbacks jwt/session |
| `src/services/auth-api.ts` | `AuthAPI.login`, `AuthAPI.register` → llaman a Strapi vía `fetch-client.ts` |
| `src/lib/strapi.ts` | **Fuente de verdad del cliente Strapi** — ver sección 1.1 |
| `src/lib/fetch-client.ts` | Cliente HTTP legacy — solo usado en `auth-api.ts` para auth endpoints |
| `src/hooks/use-auth.ts` | Hook cliente: `login`, `logout`, `register`, `routeAfterLogin` |
| `src/lib/auth/server-action-auth.ts` | Helpers Server Actions: `getActionAuthContext`, `requireAdminActionContext` |
| `src/middleware.ts` | Protección de rutas con `withAuth` |
| `src/lib/auth/role-model.ts` | Normalización de roles: `candidate`, `hiring_manager`, `client`, `admin` |

### 1.1 Cliente Strapi (`src/lib/strapi.ts`) — implementación actual

El proyecto usa `@strapi/client` (cliente oficial Strapi v5). `fetch-client.ts` **ya no se usa** para llamadas a colecciones o usuarios — solo permanece en `auth-api.ts` para los endpoints `/auth/local` y `/auth/local/register`.

```
src/lib/strapi.ts expone tres constructores:

1. strapiServerClient   — singleton lazy con API Token (Proxy, nunca crashea en module init)
                          Para uso server-side sin contexto de usuario
2. getStrapiClient(jwt?) — factory por request; usa JWT de usuario si se pasa,
                            fallback al API Token del servidor
3. getServerStrapiClient() — async; resuelve getServerSession() y devuelve client
                              con JWT del usuario. Solo en Server Components/Actions.
```

**Regla de uso:**
- Operaciones del usuario (read/write datos propios) → server: `getServerStrapiJwt()`; browser: `/api/strapi-proxy`
- Operaciones privilegiadas sin contexto de usuario → `getStrapiClient()` o `strapiServerClient` (usan API Token)
- `use-auth.ts` (cliente) → solo vía Server Actions (`getCurrentUserAction`, etc.)

### Variables de entorno actuales

```bash
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_STRAPI_API_URL=http://localhost:1337/api   # cliente (browser)
STRAPI_API_URL=http://localhost:1337/api               # servidor (SSR / Server Actions)

# Strapi API Token — SOLO SERVER SIDE, NUNCA NEXT_PUBLIC_
STRAPI_API_FULL_ACCCESS_TOKEN=<token-full-access>   # nombre de variable actual (typo incluido)
# Aliases adicionales soportados:
# STRAPI_API_TOKEN=<token>
# NEXT_PUBLIC_STRAPI_API_TOKEN=<token>  ← solo como último fallback, no recomendado
```

> **Estado**: El API Token ya está integrado en `strapi.ts`. La prioridad de búsqueda es:
> `STRAPI_API_FULL_ACCCESS_TOKEN` → `STRAPI_API_TOKEN` → `NEXT_PUBLIC_STRAPI_API_TOKEN` → `undefined`.
> Si ninguna está definida, `strapiServerClient` y `getStrapiClient()` hacen requests sin token (riesgo de 401).

---

## 2. Problemas identificados

### 2.1 Registro sin asignación de rol (prioridad alta)

`AuthAPI.register` llama a `/auth/local/register` (endpoint público). Strapi no permite asignar
un `role` personalizado desde este endpoint sin permisos de administrador.

**Impacto:**
- Los usuarios nuevos quedan con el rol `Authenticated` (default de Strapi) en lugar de `Candidate`.
- Los campos adicionales (`firstName`, `lastName`, `phone`, `organization`) pueden no persistirse.

**Solución:** Ver sección 3 — Fase 2.

### 2.2 Ausencia de gestor de estado global

No hay ningún store (Redux/Zustand/Jotai). El estado de la aplicación está fragmentado en:

- `useSession` de NextAuth (datos básicos del usuario)
- Estado local `useState` en cada página/componente
- Server Actions para mutaciones (sin cache compartido client-side)

**Impacto:**
- El perfil del usuario se re-fetcha en cada página que lo necesita.
- El progreso de assessment no se comparte entre componentes sin prop-drilling.
- Las notificaciones y alertas de UI no tienen un canal centralizado.

> **Nota de diseño:** Zustand **no reemplaza** al servidor como fuente de verdad.
> En Next.js App Router, los datos de DB/API viven en Server Components y Server Actions.
> Zustand se usa exclusivamente para **estado de UI y cache de sesión en memoria**
> (datos ya cargados desde el servidor que se comparten entre Client Components sin re-fetch).

### 2.3 `fetch-client.ts` — uso residual

`fetch-client.ts` aún es usado por `auth-api.ts` para los endpoints de autenticación. Para el
resto de operaciones (colecciones, usuarios) ya fue reemplazado por `@strapi/client` vía
`src/lib/strapi.ts`. No se debe extender ni crear `fetchApiAdmin` — ese patrón está **obsoleto**;
usar `getStrapiClient()` sin JWT en su lugar.

---

## 3. Plan de implementación

### Fase 1 — API Token y cliente Strapi ✅ COMPLETADO

| Tarea | Estado | Notas |
|---|---|---|
| T1.1 Generar API Token en Strapi Admin | ⚙️ Config | Variable `STRAPI_API_FULL_ACCCESS_TOKEN` |
| T1.2 Integrar token en cliente Strapi | ✅ Hecho | `src/lib/strapi.ts` — lazy proxy + fallback chain |
| T1.3 Proteger token de exposición cliente | ✅ Hecho | No usa `NEXT_PUBLIC_` como primera opción |
| T1.4 Reemplazar `fetchApi` en servicios | ✅ Hecho | `users-simple.service.ts`, `texts.service.ts`, `question.service.ts` ya usan `getServerStrapiClient()` |
| T1.5 Migrar `profile/route.ts` a `@strapi/client` | ✅ Hecho | GET y PUT migrados; bug de doble `/api` corregido |
| T1.6 Fix `use-auth.ts` — 401 post-login | ✅ Hecho | Reemplazado `UsersService.getCurrentUser()` por `getCurrentUserAction()` (Server Action) |

### Fase 2 — Registro con rol asignado

**Problema**: `AuthAPI.register` usa `/auth/local/register` → crea usuario sin rol `Candidate`.

**Solución**:
```
1. Mantener POST /auth/local/register para crear la cuenta base.
2. En Server Action post-registro, usar getStrapiClient() (API Token) para:
   - PUT /users/:id → asignar role Candidate (roleId según entorno)
   - PUT /users/:id → completar campos: firstName, lastName, phone, organization
```

**Archivos a modificar:**

- `src/services/auth-api.ts` → agregar `AuthAPI.assignRole(userId, roleId)` usando `getStrapiClient()` sin JWT
- `src/app/actions/users.actions.ts` → invocar `assignRole` en el Server Action post-registro
- `src/hooks/use-auth.ts` → adaptar `register()` para pasar por la nueva Server Action

```typescript
// src/services/auth-api.ts — ADICIÓN
import { getStrapiClient } from '@/lib/strapi';

static async assignRole(userId: string, roleId: number): Promise<void> {
  // Usa el API Token del servidor (sin JWT de usuario)
  const client = getStrapiClient();
  await client.collection('users').update(userId, {
    role: roleId,
  } as Record<string, unknown>);
}
```

**Checklist Fase 2:**

- [ ] **T2.1** `AuthAPI.assignRole(userId, roleId)` en `auth-api.ts` usando `getStrapiClient()`
- [ ] **T2.2** Server Action en `users.actions.ts` que llame `assignRole` post-registro
- [ ] **T2.3** Verificar que `firstName`, `lastName`, `phone`, `organization` se guardan via `update()`
- [ ] **T2.4** Manejar errores de asignación de rol sin bloquear el flujo (log + fallback)
- [ ] **T2.5** Obtener `roleId` de Candidate dinámicamente (`UsersService.getRoles()`) en lugar de hardcodearlo

### Fase 3 — Gestor de Estado Global (Zustand)

### 3.1 Recomendación: Zustand

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

### 3.2 Instalación

```bash
npm install zustand
```

### 3.3 Estructura propuesta

```
src/
  store/
    index.ts              ← re-export de todos los stores
    auth.store.ts         ← perfil de usuario cacheado, estado de sesión extendido
    assessment.store.ts   ← progreso de assessment activo
    notifications.store.ts ← notificaciones/alerts globales
    ui.store.ts           ← sidebar, modales, loaders globales
```

### 3.4 `auth.store.ts` — Store de autenticación/perfil

> **Sin `persist`** — el perfil es un dato de servidor. Persistirlo en `localStorage`
> introduciría datos stale entre sesiones. El store actúa como **cache en memoria**:
> se llena tras login, se vacía en logout.

```typescript
// src/store/auth.store.ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { IPublicUser } from '@/types';

interface AuthState {
  userProfile: IPublicUser | null;
  profileLoaded: boolean;
  setUserProfile: (profile: IPublicUser) => void;
  clearUserProfile: () => void;
  updateProfileField: <K extends keyof IPublicUser>(key: K, value: IPublicUser[K]) => void;
}

export const useAuthStore = create<AuthState>()(
  devtools(
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
  )
);
```

### 3.5 `notifications.store.ts` — Notificaciones globales

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

### 3.6 `assessment.store.ts` — Progreso de assessment

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

### 3.7 Provider y configuración (App Router)

Zustand **no necesita un Provider** para su uso básico. El wrapper `StoreHydration` solo es
necesario si se usa el middleware `persist` con `localStorage` para evitar hydration mismatch.
Como `useAuthStore` no usa `persist`, `StoreHydration` en el layout actúa como punto de
extensión para futuros stores que sí lo necesiten (ej. preferencias de UI).

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

### 3.8 Integración con `use-auth.ts`

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

### Fase 1 — API Token y cliente Strapi ✅ COMPLETADO

- [x] **T1.1** Generar API Token Full Access en Strapi Admin → variable `STRAPI_API_FULL_ACCCESS_TOKEN`
- [x] **T1.2** Integrar token en `src/lib/strapi.ts` con lazy proxy + fallback chain
- [x] **T1.3** Proteger token de exposición cliente (no `NEXT_PUBLIC_` como primera opción)
- [x] **T1.4** Reemplazar `fetchApi` en servicios por `getServerStrapiClient()` / `getStrapiClient()`
- [x] **T1.5** Migrar `PUT /api/user/profile` a `@strapi/client` (bug doble `/api` corregido)
- [x] **T1.6** Fix `use-auth.ts` — 401 post-login: reemplazar `UsersService.getCurrentUser()` por `getCurrentUserAction()`

### Fase 2 — Registro con rol asignado

- [ ] **T2.1** `AuthAPI.assignRole(userId, roleId)` en `auth-api.ts` usando `getStrapiClient()` (API Token)
- [ ] **T2.2** Server Action en `users.actions.ts` que llame `assignRole` post-registro
- [ ] **T2.3** Verificar que `firstName`, `lastName`, `phone`, `organization` se guarden via `update()`
- [ ] **T2.4** Manejar errores de asignación de rol sin bloquear el flujo (log + fallback)
- [ ] **T2.5** Obtener `roleId` de Candidate dinámicamente (`UsersService.getRoles()`) sin hardcodear

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

- [ ] **T4.1** Auditar que ningún `console.log` imprima el valor del API Token
- [ ] **T4.2** Verificar que `STRAPI_API_FULL_ACCCESS_TOKEN` no esté en el bundle cliente
- [ ] **T4.3** Documentar la rotación del API Token en el README

---

## 6. Diagrama de flujo actualizado

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENTE (Browser)                        │
│                                                               │
│  useAuth() → signIn('credentials') → NextAuth               │
│  getCurrentUserAction() → Server Action (post-login)        │
│  useAuthStore() [Fase 3] → perfil cacheado en Zustand       │
└─────────────────────────────────────────────────────────────┘
         │ HTTPS (cookie de sesión NextAuth)
         ▼
┌─────────────────────────────────────────────────────────────┐
│              NEXT.JS SERVER (App Router)                     │
│                                                               │
│  Route Handlers / Server Actions                             │
│  ├── getServerStrapiClient()   → user JWT (operaciones own) │
│  ├── getStrapiClient(jwt)      → user JWT explícito         │
│  └── getStrapiClient()         → API Token (privilegiado)   │
│      strapiServerClient        → API Token singleton lazy   │
└─────────────────────────────────────────────────────────────┘
         │ Bearer <userJWT>          │ Bearer <API_TOKEN>
         ▼                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  STRAPI BACKEND                              │
│                                                               │
│  /auth/local            → autenticación (fetch-client)      │
│  /users/me              → perfil propio (user JWT)          │
│  /users/:documentId     → update perfil (@strapi/client)    │
│  /users-permissions/*   → roles (API Token)                 │
│  /[colecciones]         → CRUD (@strapi/client)             │
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

Zustand **no compite** con Server Components, Server Actions ni el cache de Next.js.
El cambio de paradigma con App Router es:

| Tipo de estado | Dónde vive |
|---|---|
| Datos de DB/API | Server Components / Server Actions |
| Cache en memoria de sesión | Zustand (sin persist) |
| Estado de UI/interacción | Zustand |
| Datos que deben persistir entre sesiones | DB (Server Actions) |
| Preferencias de UI locales | Zustand con persist + localStorage |

**Anti-pattern a evitar:**
```ts
// ❌ MAL — datos del servidor en Zustand con persist
const useStore = create(persist(() => ({ posts: [] }), { name: 'posts' }))
```

**Patrón correcto en este proyecto:**
```ts
// ✅ BIEN — servidor es la fuente de verdad, Zustand es cache de sesión
// 1. Server Action obtiene el dato
const user = await UsersService.getCurrentUser();
// 2. Cliente lo cachea en memoria para compartir entre componentes
setUserProfile(user);
```

Zustand **no funciona en React Server Components**. Los stores solo deben accederse desde:
- Client Components (`'use client'`)
- Hooks cliente (`use-auth.ts`, etc.)

Para pasar datos de servidor a Zustand, el patrón recomendado es:
1. Server Component fetcha los datos
2. Pasa datos como props a un Client Component
3. El Client Component llama `store.setState()` una sola vez

### Sobre `documentId` (Strapi v5)

El tipo `IUser` ya incluye `documentId?: string` para compatibilidad con Strapi v5.
`@strapi/client` usa `documentId` (string UUID) internamente en `collection().update(id, data)`.
Para llamadas directas vía `client.fetch('/users/:id', ...)`, usar el `id` numérico o `documentId`
según lo que devuelva el endpoint de Strapi v5.
