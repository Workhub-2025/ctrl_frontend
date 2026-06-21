# Stripe — Backend migration

## Context

The architectural analysis identified three Stripe-related problems where logic that belongs in the backend (`ctrl_backend`) currently lives in the frontend (`ctrl_frontend`):

1. **The frontend creates Stripe Checkout Sessions** for the manual billing flows (send-invoice, resend-invoice, send-renewal, send-activation), duplicating pricing logic and exposing `STRIPE_SECRET_KEY` in a layer that should not need it.
2. **The Stripe Webhook lives in the frontend**, coupling payment fulfilment to Next.js availability.
3. **`admin-comms-templates.ts` is duplicated** across frontend and backend, creating a risk of template content divergence.

The backend already has `src/lib/stripe-checkout.ts` with `getStripeClient()` and `createContractRenewalCheckoutSession()`, used by the auto-renewal cron. The manual endpoints must use the same infrastructure.

---

## Problem 1 — Frontend creates Stripe Checkout Sessions

### Current situation

Four BFF routes in the frontend call `stripe.checkout.sessions.create(...)` directly:

| Frontend route | Purpose |
|---|---|
| `src/app/api/admin/billing/send-invoice/[ticketId]/route.ts` | Sends an invoice for the first time |
| `src/app/api/admin/billing/resend-invoice/[ticketId]/route.ts` | Resends an existing invoice |
| `src/app/api/admin/billing/send-renewal/[clientId]/route.ts` | Contract renewal invoice |
| `src/app/api/admin/billing/send-activation/[clientId]/route.ts` | New contract activation invoice |

Each one:
1. Resolves the annual price (`resolveEffectiveAnnualPlatformPence`) — function duplicated in `ctrl_frontend/src/lib/billing/contract-pricing-lock.ts`
2. Calls Stripe directly with `STRIPE_SECRET_KEY`
3. Records the result in the backend via `POST /admin/billing/requests/{id}/invoice-sent`
4. The backend then fires the **Invoice Notification** (`billing-action-needed`)

### Solution

Create four new backend endpoints that encapsulate the entire flow. The frontend passes only the required IDs.

---

### Task 1.1 — Create `POST /admin/billing/requests/:id/create-checkout` in the backend

**File:** `ctrl_backend/src/api/client/controllers/client.ts`
**Route:** `ctrl_backend/src/api/client/routes/custom-client.ts`

New endpoint logic:
1. Verify the user is an admin
2. Load the `BillingRequest` by `requestDocumentId`
3. Verify `billingStatus !== 'paid'` and `billingStatus !== 'invoice_sent'`
4. Load `platform-pricing`
5. Resolve `amountPence` with `resolveEffectiveAnnualPlatformPence` (already exists in `ctrl_backend/src/lib/contract-pricing-lock.ts`)
6. Call `createBillingCheckoutSession(...)` — moved from `ctrl_frontend/src/lib/stripe/billing-checkout.ts` to `ctrl_backend/src/lib/stripe-checkout.ts`
7. Internally call the existing `invoice-sent` handler to record the Checkout Session ID
8. Fire the **Invoice Notification** (`billing-action-needed`) with the `checkoutUrl`
9. Return `{ checkoutSessionId, checkoutUrl, amountPence, currency, billingStatus: 'invoice_sent' }`

**Acceptance criterion:** the frontend can send `POST /admin/billing/requests/{id}/create-checkout` with no body and receive the `checkoutUrl`.

---

### Task 1.2 — Create `POST /admin/billing/requests/:id/resend-checkout` in the backend

Same as 1.1 but:
- Verify `billingStatus` is `invoice_sent` or `failed` (RESENDABLE_STATUSES)
- Create a new Checkout Session (the previous one may have expired in Stripe)
- Update the `BillingRequest` with the new `stripeCheckoutSessionId`

---

### Task 1.3 — Create `POST /admin/billing/clients/:clientId/send-renewal` in the backend

Move the logic from `ctrl_frontend/src/app/api/admin/billing/send-renewal/[clientId]/route.ts`:
1. Load the `Client` and its active contract
2. Resolve price with `resolveEffectiveAnnualPlatformPence`
3. Create the `BillingRequest` of type `contract_renewal`
4. Create the Checkout Session with `createContractRenewalCheckoutSession` (already exists)
5. Record and send the **Invoice Notification**

**Note:** `createContractRenewalCheckoutSession` is already in `ctrl_backend/src/lib/stripe-checkout.ts` — reuse directly.

---

### Task 1.4 — Create `POST /admin/billing/clients/:clientId/send-activation` in the backend

Move the logic from `ctrl_frontend/src/app/api/admin/billing/send-activation/[clientId]/route.ts`:
1. Load the `Client` and its `pending` contract
2. Resolve price
3. Create a `BillingRequest` of type `contract_activation`
4. Create Checkout Session — add `createContractActivationCheckoutSession` to `ctrl_backend/src/lib/stripe-checkout.ts` (analogous to renewal)
5. Record and send the **Invoice Notification**

---

### Task 1.5 — Update the frontend BFF routes

Once the backend endpoints are created, replace the four BFF routes:

| Current frontend route | New behaviour |
|---|---|
| `send-invoice/[ticketId]` | Proxy to `POST /admin/billing/requests/{id}/create-checkout` |
| `resend-invoice/[ticketId]` | Proxy to `POST /admin/billing/requests/{id}/resend-checkout` |
| `send-renewal/[clientId]` | Proxy to `POST /admin/billing/clients/{id}/send-renewal` |
| `send-activation/[clientId]` | Proxy to `POST /admin/billing/clients/{id}/send-activation` |

Each BFF route reduces to: authenticate admin session → forward to backend → return response.

---

### Task 1.6 — Remove `ctrl_frontend/src/lib/billing/contract-pricing-lock.ts`

Once the frontend no longer resolves prices, this file can be deleted. It currently has **two consumers** — the four BFF routes (already migrated in 1.5) and `admin-platform.service.ts` (still pending).

**Current state:**
```
grep -r "contract-pricing-lock" ctrl_frontend/src
# → ctrl_frontend/src/services/admin-platform.service.ts  (line 5 — import)
# → ctrl_frontend/src/lib/billing/contract-pricing-lock.ts (self)
```

---

### Task 1.6.1 — Migrate `resolveContractAnnualPence` in `admin-platform.service.ts`

**File:** `ctrl_frontend/src/services/admin-platform.service.ts`

**Current situation:**

`getAdminRevenueAnalytics` calls `resolveContractAnnualPence` to compute the ARR (Annual Recurring Revenue) of each active contract. This function delegates to `resolveEffectiveAnnualPlatformPence` from the frontend module:

```typescript
import { resolveEffectiveAnnualPlatformPence } from "@/lib/billing/contract-pricing-lock";

function resolveContractAnnualPence(contract: RawContract, pricing: RawPlatformPricing) {
  return asPence(
    resolveEffectiveAnnualPlatformPence(
      {
        tier: contract.tier,
        lockedAnnualPlatformPence: contract.lockedAnnualPlatformPence,
        pricingLockedUntil: contract.pricingLockedUntil,
      },
      pricing
    )
  );
}
```

**Logic implemented by `resolveEffectiveAnnualPlatformPence`:**

1. If `lockedAnnualPlatformPence > 0` and `pricingLockedUntil` is a future date → return the locked price
2. Otherwise → look up `pricing.contractTypePrices[tier]?.basePlatformYearlyPence`
3. Otherwise → fall back to `pricing.basePlatformYearlyPence`

**Solution — inline the logic directly in the service:**

Remove the import and replace `resolveContractAnnualPence` with an inline implementation:

```typescript
function resolveContractAnnualPence(contract: RawContract, pricing: RawPlatformPricing) {
  const today = new Date().toISOString().split("T")[0];
  if (
    contract.lockedAnnualPlatformPence &&
    contract.lockedAnnualPlatformPence > 0 &&
    contract.pricingLockedUntil &&
    contract.pricingLockedUntil >= today
  ) {
    return asPence(contract.lockedAnnualPlatformPence);
  }
  const tier = (contract.tier ?? "").toLowerCase();
  const contractTypePrices = pricing.contractTypePrices ?? {};
  return asPence(
    contractTypePrices[tier]?.basePlatformYearlyPence ??
    pricing.basePlatformYearlyPence
  );
}
```

This exactly replicates the logic of `contract-pricing-lock.ts` without depending on the external module.

**Acceptance criterion:** `admin-platform.service.ts` compiles without importing `contract-pricing-lock`, and ARR values in the analytics dashboard are identical to the current ones.

---

### Task 1.6.2 — Delete `ctrl_frontend/src/lib/billing/contract-pricing-lock.ts`

Once Task 1.6.1 is complete, verify no consumers remain:

```
grep -r "contract-pricing-lock" ctrl_frontend/src
# → must return no results
```

If the grep returns nothing, delete the file:

```
rm ctrl_frontend/src/lib/billing/contract-pricing-lock.ts
```

Also confirm that `STRIPE_SECRET_KEY` is no longer referenced anywhere in the frontend (except tests or mocks).

---

## Problem 2 — Stripe Webhook in the frontend

### Current situation

`ctrl_frontend/src/app/api/webhooks/stripe/route.ts`:
1. Receives `checkout.session.completed` from Stripe
2. Verifies the signature with `STRIPE_WEBHOOK_SECRET`
3. Calls `POST /internal/billing/fulfill` in the backend with `BILLING_INTERNAL_SECRET`

The backend (`ctrl_backend`) already has the `/internal/billing/fulfill` endpoint that does the real work.

### Concrete problem

If the frontend (Next.js / Cloud Run) is down or deploying, Stripe webhooks are lost. Stripe retries, but within limited windows. Payment fulfilment should not depend on frontend availability.

### Preferred solution (Strapi receives the webhook directly)

---

### Task 2.1 — Create `POST /stripe/webhook` in the backend

**New file:** `ctrl_backend/src/middlewares/stripe-raw-body.ts` (raw body capture middleware)  
**Handler:** added to `ctrl_backend/src/api/client/controllers/client.ts` → `stripeWebhook`  
**Route:** added to `ctrl_backend/src/api/client/routes/custom-client.ts`

Logic:
1. Read raw body (required for Stripe signature verification) — captured by `global::stripe-raw-body` middleware before koa-bodyparser
2. Verify signature with `stripe.webhooks.constructEvent(body, sig, STRIPE_WEBHOOK_SECRET)`
3. If `event.type !== 'checkout.session.completed'` → return `{ received: true }`
4. Parse metadata from the Checkout Session (inline — mirrors `billing-checkout-metadata.ts`)
5. Call `billing.fulfillUpgradeRequest(...)` directly through the Strapi service (no HTTP hop)
6. Return `{ received: true }`

**Security consideration:** the endpoint is public (no JWT) but protected exclusively by Stripe HMAC signature verification. Registered with `auth: false, policies: []` in the route config. The `global::stripe-raw-body` middleware is registered before `strapi::body` in `config/middlewares.ts`.

**Required environment variable in Strapi:** `STRIPE_WEBHOOK_SECRET`

---

### Task 2.2 — Register the new endpoint in the Stripe Dashboard

In Stripe Dashboard → Developers → Webhooks:
- Add the backend endpoint: `https://<strapi-domain>/api/stripe/webhook`
- Event: `checkout.session.completed`
- Keep the frontend endpoint temporarily active during the transition

---

### Task 2.3 — Deprecate the frontend webhook BFF route

Once confirmed that the backend webhook receives and processes events correctly:
1. Delete `ctrl_frontend/src/app/api/webhooks/stripe/route.ts`
2. Delete `ctrl_frontend/src/lib/stripe/fulfill-billing.ts`
3. Remove `BILLING_INTERNAL_SECRET` from frontend environment variables (keep only in the backend)
4. Remove the frontend webhook endpoint from the Stripe Dashboard

---

### Task 2.4 — Keep `BILLING_INTERNAL_SECRET` as a fallback (optional)

If deployment constraints prevent the backend from receiving webhooks directly (e.g. it is behind a private network), keeping the frontend webhook as an intermediary is acceptable, but it must be explicitly documented as an architectural decision with its own ADR.

---

## Problem 3 — Duplication of `admin-comms-templates.ts`

### Current situation

Admin Broadcast pre-fills are defined in two places:

| File | Role |
|---|---|
| `ctrl_backend/src/lib/email.service.ts` — `ADMIN_BROADCAST_PREFILLS` | Source of truth for the actual send |
| `ctrl_frontend/src/lib/admin-comms-templates.ts` — `ADMIN_BROADCAST_PREFILLS` | Copy used to populate the Admin form |

If a template's text changes in the backend, the form preview in the frontend shows the old text until someone remembers to update it manually.

### Solution

---

### Task 3.1 — Create `GET /admin/comms/templates` in the backend

**File:** `ctrl_backend/src/api/client/controllers/client.ts` (or a dedicated comms controller)

Response:
```json
{
  "data": {
    "site-down":              { "subject": "...", "body": "..." },
    "maintenance":            { "subject": "...", "body": "..." },
    "platform-upgrade":       { "subject": "...", "body": "..." },
    "renewal-price-increase": { "subject": "...", "body": "..." },
    "custom":                 { "subject": "",    "body": "" }
  }
}
```

---

### Task 3.2 — Create BFF route `GET /api/admin/comms/templates` in the frontend

Authenticated proxy (admin only) to the new backend endpoint.

---

### Task 3.3 — Update the Admin Broadcast component

Change the component that builds the broadcast form to load pre-fills from `GET /api/admin/comms/templates` instead of importing them from `admin-comms-templates.ts`.

Types (`AdminBroadcastTemplateKey`, `AdminBroadcastAudience`, etc.) can remain in the frontend — they are UI types, not content.

---

### Task 3.4 — Remove `ADMIN_BROADCAST_PREFILLS` from the frontend

Delete the constant from `ctrl_frontend/src/lib/admin-comms-templates.ts`. Keep the types and audience options, which are still needed by the form.

---

## Recommended execution order

```
Problem 3 (low risk, no external dependencies)
  → 3.1 → 3.2 → 3.3 → 3.4

Problem 1 (higher impact, requires billing testing)
  → 1.1 → 1.2 → 1.3 → 1.4 → 1.5 → 1.6

Problem 2 (highest operational risk, requires Stripe Dashboard coordination)
  → 2.1 → 2.2 → test in staging → 2.3
```

---

## Affected environment variables

### Backend (`ctrl_backend` — Strapi)

| Variable | Required | Where it is used | Description |
|---|---|---|---|
| `STRIPE_SECRET_KEY` | Yes (for billing) | `src/lib/stripe-checkout.ts`, `src/api/client/controllers/client.ts`, `src/api/client/services/billing.ts` | Stripe secret key (`sk_live_…` / `sk_test_…`). Used to create Checkout Sessions in the Problem 1 and 2 handlers and in the auto-renewal cron. |
| `STRIPE_WEBHOOK_SECRET` | Yes (Task 2.1) | `src/api/client/controllers/client.ts` → `stripeWebhook` | Stripe webhook signing secret (`whsec_…`). Required for `POST /api/stripe/webhook`. Generated in Stripe Dashboard → Developers → Webhooks when registering the endpoint. |
| `BILLING_INTERNAL_SECRET` | Yes (while the frontend webhook still exists) | `src/api/client/controllers/client.ts` → `fulfillBilling` | Shared secret that authorises the frontend to call `POST /api/internal/billing/fulfill`. Can be removed once Task 2.3 is complete (webhook migrated to the backend). |

### Frontend (`ctrl_frontend` — Next.js)

| Variable | Status after migration | Currently used in | Description |
|---|---|---|---|
| `STRIPE_SECRET_KEY` | **Partially removable** | `src/lib/stripe/server.ts`, `src/app/api/client/billing/checkout/route.ts`, `src/app/api/client/billing/confirm/route.ts` | Admin flows (send-invoice, resend-invoice, send-renewal, send-activation) no longer need it — migrated to the backend in Problem 1. **The variable must be kept** while the client-facing routes (`/client/billing/checkout` and `/client/billing/confirm`) remain in the frontend. |
| `STRIPE_WEBHOOK_SECRET` | **Remove after Task 2.3** | `src/app/api/webhooks/stripe/route.ts` (marked `@deprecated`) | Only needed while the frontend webhook is still active as a fallback. Once the backend webhook is confirmed, remove from frontend env vars. |
| `BILLING_INTERNAL_SECRET` | **Remove after Task 2.3** | `src/lib/stripe/fulfill-billing.ts` | Shared secret for the frontend webhook to call the backend. Removed together with `fulfill-billing.ts`. |

### Per-stage summary

| Stage | Frontend action | Backend action |
|---|---|---|
| After Problem 1 | None — `STRIPE_SECRET_KEY` stays active for client flows | Add `STRIPE_SECRET_KEY` if not already set |
| After Task 2.2 (webhook registered in Stripe) | Keep `STRIPE_WEBHOOK_SECRET` and `BILLING_INTERNAL_SECRET` as fallback | Add `STRIPE_WEBHOOK_SECRET` |
| After Task 2.3 (confirmed in staging) | Remove `STRIPE_WEBHOOK_SECRET` and `BILLING_INTERNAL_SECRET` | Remove `BILLING_INTERNAL_SECRET` if no other consumers remain |
| Future — client flows migrated to the backend | Remove `STRIPE_SECRET_KEY` from the frontend | — |

---

## Problema 1 — Frontend crea Stripe Checkout Sessions

### Situación actual

Cuatro BFF routes en el frontend hacen directamente `stripe.checkout.sessions.create(...)`:

| Route frontend | Propósito |
|---|---|
| `src/app/api/admin/billing/send-invoice/[ticketId]/route.ts` | Envía factura por primera vez |
| `src/app/api/admin/billing/resend-invoice/[ticketId]/route.ts` | Reenvía factura existente |
| `src/app/api/admin/billing/send-renewal/[clientId]/route.ts` | Factura de renovación de contrato |
| `src/app/api/admin/billing/send-activation/[clientId]/route.ts` | Factura de activación de nuevo contrato |

Cada una:
1. Resuelve el precio anual (`resolveEffectiveAnnualPlatformPence`) — función duplicada en `ctrl_frontend/src/lib/billing/contract-pricing-lock.ts`
2. Llama a Stripe directamente con `STRIPE_SECRET_KEY`
3. Registra el resultado en el backend vía `POST /admin/billing/requests/{id}/invoice-sent`
4. El backend entonces dispara el **Invoice Notification** (`billing-action-needed`)

### Solución

Crear cuatro nuevos endpoints en el backend que encapsulen todo el flujo. El frontend pasa solo los IDs necesarios.

---

### Tarea 1.1 — Crear `POST /admin/billing/requests/:id/create-checkout` en el backend

**Archivo:** `ctrl_backend/src/api/client/controllers/client.ts`
**Ruta:** `ctrl_backend/src/api/client/routes/custom-client.ts`

Lógica del nuevo endpoint:
1. Verificar que el usuario es admin
2. Cargar el `BillingRequest` por `requestDocumentId`
3. Verificar que `billingStatus !== 'paid'` y `billingStatus !== 'invoice_sent'`
4. Cargar `platform-pricing`
5. Resolver `amountPence` con `resolveEffectiveAnnualPlatformPence` (ya existe en `ctrl_backend/src/lib/contract-pricing-lock.ts`)
6. Llamar a `createBillingCheckoutSession(...)` — mover esta función de `ctrl_frontend/src/lib/stripe/billing-checkout.ts` a `ctrl_backend/src/lib/stripe-checkout.ts`
7. Llamar al handler existente `invoice-sent` internamente para registrar el Checkout Session ID
8. Disparar el **Invoice Notification** (`billing-action-needed`) con el `checkoutUrl`
9. Devolver `{ checkoutSessionId, checkoutUrl, amountPence, currency, billingStatus: 'invoice_sent' }`

**Criterio de aceptación:** el frontend puede enviar `POST /admin/billing/requests/{id}/create-checkout` sin cuerpo y recibir el `checkoutUrl`.

---

### Tarea 1.2 — Crear `POST /admin/billing/requests/:id/resend-checkout` en el backend

Igual que 1.1 pero:
- Verificar que `billingStatus` sea `invoice_sent` o `failed` (RESENDABLE_STATUSES)
- Crear un nuevo Checkout Session (el anterior puede haber expirado en Stripe)
- Actualizar el `BillingRequest` con el nuevo `stripeCheckoutSessionId`

---

### Tarea 1.3 — Crear `POST /admin/billing/clients/:clientId/send-renewal` en el backend

Mover la lógica de `ctrl_frontend/src/app/api/admin/billing/send-renewal/[clientId]/route.ts`:
1. Cargar el `Client` y su contrato activo
2. Resolver precio con `resolveEffectiveAnnualPlatformPence`
3. Crear el `BillingRequest` de tipo `contract_renewal`
4. Crear el Checkout Session con `createContractRenewalCheckoutSession` (ya existe)
5. Registrar y enviar **Invoice Notification**

**Nota:** `createContractRenewalCheckoutSession` ya está en `ctrl_backend/src/lib/stripe-checkout.ts` — reutilizar directamente.

---

### Tarea 1.4 — Crear `POST /admin/billing/clients/:clientId/send-activation` en el backend

Mover la lógica de `ctrl_frontend/src/app/api/admin/billing/send-activation/[clientId]/route.ts`:
1. Cargar el `Client` y su contrato `pending`
2. Resolver precio
3. Crear `BillingRequest` de tipo `contract_activation`
4. Crear Checkout Session — añadir `createContractActivationCheckoutSession` en `ctrl_backend/src/lib/stripe-checkout.ts` (análogo al de renovación)
5. Registrar y enviar **Invoice Notification**

---

### Tarea 1.5 — Actualizar las BFF routes del frontend

Una vez creados los endpoints del backend, reemplazar las cuatro BFF routes:

| Route frontend actual | Nuevo comportamiento |
|---|---|
| `send-invoice/[ticketId]` | Proxy a `POST /admin/billing/requests/{id}/create-checkout` |
| `resend-invoice/[ticketId]` | Proxy a `POST /admin/billing/requests/{id}/resend-checkout` |
| `send-renewal/[clientId]` | Proxy a `POST /admin/billing/clients/{id}/send-renewal` |
| `send-activation/[clientId]` | Proxy a `POST /admin/billing/clients/{id}/send-activation` |

Cada BFF route se reduce a: autenticar sesión admin → reenviar al backend → devolver respuesta.

---

### Tarea 1.6 — Eliminar `ctrl_frontend/src/lib/billing/contract-pricing-lock.ts`

Una vez que el frontend ya no resuelve precios, este archivo se puede eliminar. Actualmente tiene **dos consumidores** — las cuatro BFF routes (ya migradas en 1.5) y `admin-platform.service.ts` (aún pendiente).

**Estado actual:**
```
grep -r "contract-pricing-lock" ctrl_frontend/src
# → ctrl_frontend/src/services/admin-platform.service.ts  (line 5 — import)
# → ctrl_frontend/src/lib/billing/contract-pricing-lock.ts (self)
```

---

### Tarea 1.6.1 — Migrar `resolveContractAnnualPence` en `admin-platform.service.ts`

**Archivo:** `ctrl_frontend/src/services/admin-platform.service.ts`

**Situación actual:**

`getAdminRevenueAnalytics` llama a `resolveContractAnnualPence` para calcular el ARR (Annual Recurring Revenue) de cada contrato activo. Esta función delega en `resolveEffectiveAnnualPlatformPence` del módulo frontend:

```typescript
import { resolveEffectiveAnnualPlatformPence } from "@/lib/billing/contract-pricing-lock";

function resolveContractAnnualPence(contract: RawContract, pricing: RawPlatformPricing) {
  return asPence(
    resolveEffectiveAnnualPlatformPence(
      {
        tier: contract.tier,
        lockedAnnualPlatformPence: contract.lockedAnnualPlatformPence,
        pricingLockedUntil: contract.pricingLockedUntil,
      },
      pricing
    )
  );
}
```

**Lógica que implementa `resolveEffectiveAnnualPlatformPence`:**

1. Si `lockedAnnualPlatformPence > 0` y `pricingLockedUntil` es una fecha futura → devolver el precio bloqueado
2. Si no → buscar `pricing.contractTypePrices[tier]?.basePlatformYearlyPence`
3. Si no → fallback a `pricing.basePlatformYearlyPence`

**Solución — inline la lógica directamente en el servicio:**

Eliminar el import y reemplazar la función `resolveContractAnnualPence` con implementación inline:

```typescript
function resolveContractAnnualPence(contract: RawContract, pricing: RawPlatformPricing) {
  const today = new Date().toISOString().split("T")[0];
  if (
    contract.lockedAnnualPlatformPence &&
    contract.lockedAnnualPlatformPence > 0 &&
    contract.pricingLockedUntil &&
    contract.pricingLockedUntil >= today
  ) {
    return asPence(contract.lockedAnnualPlatformPence);
  }
  const tier = (contract.tier ?? "").toLowerCase();
  const contractTypePrices = pricing.contractTypePrices ?? {};
  return asPence(
    contractTypePrices[tier]?.basePlatformYearlyPence ??
    pricing.basePlatformYearlyPence
  );
}
```

Esto replica exactamente la lógica de `contract-pricing-lock.ts` sin depender del módulo externo.

**Criterio de aceptación:** `admin-platform.service.ts` compila sin importar `contract-pricing-lock`, y los valores de ARR en el dashboard de analytics son idénticos a los actuales.

---

### Tarea 1.6.2 — Borrar `ctrl_frontend/src/lib/billing/contract-pricing-lock.ts`

Una vez completada la Tarea 1.6.1, verificar que no queden consumidores:

```
grep -r "contract-pricing-lock" ctrl_frontend/src
# → no debe devolver resultados
```

Si el grep no devuelve nada, eliminar el archivo:

```
rm ctrl_frontend/src/lib/billing/contract-pricing-lock.ts
```

Confirmar también que ya no quedan variables de entorno `STRIPE_SECRET_KEY` siendo usadas en el frontend (excepto si hay tests o mocks).

---

## Problema 2 — Stripe Webhook en el frontend

### Situación actual

`ctrl_frontend/src/app/api/webhooks/stripe/route.ts`:
1. Recibe `checkout.session.completed` de Stripe
2. Verifica firma con `STRIPE_WEBHOOK_SECRET`
3. Llama a `POST /internal/billing/fulfill` en el backend con `BILLING_INTERNAL_SECRET`

El backend en `ctrl_backend` ya tiene el endpoint `/internal/billing/fulfill` que hace el trabajo real.

### Problema concreto

Si el frontend (Next.js / Cloud Run) está caído o desplegando, los webhooks de Stripe se pierden. Stripe reintenta, pero con ventanas limitadas. El fulfillment de pagos no debería depender de la disponibilidad del frontend.

### Solución preferida (Strapi recibe el webhook directamente)

---

### Tarea 2.1 — Crear `POST /stripe/webhook` en el backend

**Archivo nuevo:** `ctrl_backend/src/api/client/controllers/stripe-webhook.ts`  
**Ruta nueva:** añadir a `custom-client.ts` o crear `stripe-webhook.ts` dedicado

Lógica:
1. Leer body raw (necesario para verificación de firma Stripe)
2. Verificar firma con `stripe.webhooks.constructEvent(body, sig, STRIPE_WEBHOOK_SECRET)`
3. Si `event.type !== 'checkout.session.completed'` → devolver `{ received: true }`
4. Parsear metadata con `parseBillingCheckoutMetadata`
5. Llamar al servicio `billing.fulfillBillingRequest(...)` internamente (sin HTTP)
6. Devolver `{ received: true }`

**Consideración de seguridad:** el endpoint debe ser público (sin JWT) pero protegido exclusivamente por la verificación de firma Stripe. Añadir al array de rutas públicas en `config/middlewares.ts`.

**Variable de entorno necesaria en Strapi:** `STRIPE_WEBHOOK_SECRET`

---

### Tarea 2.2 — Registrar el nuevo endpoint en Stripe Dashboard

En Stripe Dashboard → Developers → Webhooks:
- Añadir el endpoint del backend: `https://<strapi-domain>/api/stripe/webhook`
- Evento: `checkout.session.completed`
- Mantener temporalmente el endpoint del frontend activo durante la transición

---

### Tarea 2.3 — Deprecar la BFF route del webhook en el frontend

Una vez confirmado que el webhook del backend recibe y procesa correctamente:
1. Eliminar `ctrl_frontend/src/app/api/webhooks/stripe/route.ts`
2. Eliminar `ctrl_frontend/src/lib/stripe/fulfill-billing.ts`
3. Eliminar `BILLING_INTERNAL_SECRET` de las variables de entorno del frontend (se queda solo en el backend)
4. Eliminar el endpoint de webhook del frontend en Stripe Dashboard

---

### Tarea 2.4 — Mantener `BILLING_INTERNAL_SECRET` como fallback (opcional)

Si por restricciones de despliegue el backend no puede recibir webhooks directamente (ej. está detrás de una red privada), mantener el webhook en el frontend como intermediario es aceptable, pero documentarlo explícitamente como una decisión arquitectónica con su ADR.

---

## Problema 3 — Duplicación de `admin-comms-templates.ts`

### Situación actual

Los pre-fills del Admin Broadcast están definidos en dos lugares:

| Archivo | Rol |
|---|---|
| `ctrl_backend/src/lib/email.service.ts` — `ADMIN_BROADCAST_PREFILLS` | Fuente de verdad para el envío real |
| `ctrl_frontend/src/lib/admin-comms-templates.ts` — `ADMIN_BROADCAST_PREFILLS` | Copia para poblar el formulario del Admin |

Si el texto de una plantilla cambia en el backend, el preview del formulario en el frontend muestra el texto antiguo hasta que alguien recuerde actualizarlo manualmente.

### Solución

---

### Tarea 3.1 — Crear `GET /admin/comms/templates` en el backend

**Archivo:** `ctrl_backend/src/api/client/controllers/client.ts` (o un controlador dedicado de comms)

Respuesta:
```json
{
  "data": {
    "site-down":              { "subject": "...", "body": "..." },
    "maintenance":            { "subject": "...", "body": "..." },
    "platform-upgrade":       { "subject": "...", "body": "..." },
    "renewal-price-increase": { "subject": "...", "body": "..." },
    "custom":                 { "subject": "",    "body": "" }
  }
}
```

---

### Tarea 3.2 — Crear BFF route `GET /api/admin/comms/templates` en el frontend

Proxy autenticado (solo admin) hacia el nuevo endpoint del backend.

---

### Tarea 3.3 — Actualizar el componente de Admin Broadcast

Cambiar el componente que construye el formulario de broadcast para cargar los pre-fills desde `GET /api/admin/comms/templates` en lugar de importarlos de `admin-comms-templates.ts`.

Los tipos (`AdminBroadcastTemplateKey`, `AdminBroadcastAudience`, etc.) pueden mantenerse en el frontend — son tipos de UI, no contenido.

---

### Tarea 3.4 — Eliminar `ADMIN_BROADCAST_PREFILLS` del frontend

Eliminar la constante del archivo `ctrl_frontend/src/lib/admin-comms-templates.ts`. Mantener los tipos y las opciones de audiencia, que son necesarios para el formulario.

---

## Orden de ejecución recomendado

```
Problema 3 (bajo riesgo, sin dependencias externas)
  → 3.1 → 3.2 → 3.3 → 3.4

Problema 1 (mayor impacto, requiere pruebas de billing)
  → 1.1 → 1.2 → 1.3 → 1.4 → 1.5 → 1.6

Problema 2 (mayor riesgo operacional, requiere coordinación con Stripe Dashboard)
  → 2.1 → 2.2 → probar en staging → 2.3
```

---

## Variables de entorno afectadas

### Backend (`ctrl_backend` — Strapi)

| Variable | Obligatoria | Dónde se usa | Descripción |
|---|---|---|---|
| `STRIPE_SECRET_KEY` | Sí (para billing) | `src/lib/stripe-checkout.ts`, `src/api/client/controllers/client.ts`, `src/api/client/services/billing.ts` | Clave secreta de Stripe (`sk_live_…` / `sk_test_…`). Usada para crear Checkout Sessions en los handlers de los Problemas 1 y 2, y en el cron de auto-renovación. |
| `STRIPE_WEBHOOK_SECRET` | Sí (Tarea 2.1) | `src/api/client/controllers/client.ts` → `stripeWebhook` | Secreto de firma del webhook de Stripe (`whsec_…`). Obligatorio para `POST /api/stripe/webhook`. Generado en Stripe Dashboard → Developers → Webhooks al registrar el endpoint. |
| `BILLING_INTERNAL_SECRET` | Sí (mientras exista el webhook del frontend) | `src/api/client/controllers/client.ts` → `fulfillBilling` | Secreto compartido que autoriza al frontend a llamar `POST /api/internal/billing/fulfill`. Puede eliminarse una vez completada la Tarea 2.3 (webhook migrado al backend). |

### Frontend (`ctrl_frontend` — Next.js)

| Variable | Estado tras migración | Dónde se usa actualmente | Descripción |
|---|---|---|---|
| `STRIPE_SECRET_KEY` | **Parcialmente eliminable** | `src/lib/stripe/server.ts`, `src/app/api/client/billing/checkout/route.ts`, `src/app/api/client/billing/confirm/route.ts` | Los flujos de admin (send-invoice, resend-invoice, send-renewal, send-activation) ya no la necesitan — migrados al backend en el Problema 1. **La variable debe mantenerse** mientras las rutas de cliente (`/client/billing/checkout` y `/client/billing/confirm`) sigan en el frontend. |
| `STRIPE_WEBHOOK_SECRET` | **Eliminar tras Tarea 2.3** | `src/app/api/webhooks/stripe/route.ts` (marcada `@deprecated`) | Solo necesaria mientras el webhook del frontend siga activo como fallback. Una vez confirmado el webhook del backend, eliminar de las variables del frontend. |
| `BILLING_INTERNAL_SECRET` | **Eliminar tras Tarea 2.3** | `src/lib/stripe/fulfill-billing.ts` | Secreto compartido para llamar al backend desde el webhook del frontend. Se elimina junto con `fulfill-billing.ts`. |

### Resumen por etapa

| Etapa | Acción en frontend | Acción en backend |
|---|---|---|
| Después del Problema 1 | Ninguna — `STRIPE_SECRET_KEY` sigue activa para flujos de cliente | Añadir `STRIPE_SECRET_KEY` si no estaba |
| Después de Tarea 2.2 (webhook registrado en Stripe) | Mantener `STRIPE_WEBHOOK_SECRET` y `BILLING_INTERNAL_SECRET` como fallback | Añadir `STRIPE_WEBHOOK_SECRET` |
| Después de Tarea 2.3 (confirmado en staging) | Eliminar `STRIPE_WEBHOOK_SECRET` y `BILLING_INTERNAL_SECRET` | Eliminar `BILLING_INTERNAL_SECRET` si ya no hay otros consumidores |
| Futuro — flujos de cliente migrados al backend | Eliminar `STRIPE_SECRET_KEY` del frontend | — |
