# CTRL Portal Interface System

## Direction

CTRL is an evidence and decision workspace for candidate readiness, campaign
progress, assessment delivery, hiring decisions and governance. It should feel
calm, exact and accountable: closer to an operational case file than a generic
SaaS dashboard.

The signature pattern is the **decision trail**:

1. What needs attention.
2. Why it needs attention.
3. The single next action.

Overview pages lead with this trail. They do not reproduce destination pages,
sidebar navigation or a grid of generic shortcut cards.

## Colour world

- Slate: navy dark default canvas (high-focus product theme).
- Obsidian: neutral graphite dark, higher contrast.
- Daylight: cool neutral light surfaces.
- Parchment: warm light surfaces.
- Brand blue (~210°): primary action, focus and selected evidence.
- Status tokens: `success`, `info`, `warning`, `destructive` (always with label/icon).

Always consume semantic tokens (`background`, `foreground`, `card`, `muted`,
`primary`, `border`, `success`, `info`, `warning`, `destructive`) rather than
hard-coded palette values. A status always includes a text label or icon; colour
never carries the meaning alone. Preserve all four accessibility themes:
`slate`, `obsidian`, `daylight`, and `parchment`.

## Depth and spacing

- Depth strategy: borders and subtle surface shifts. Portal panels use
  `portalPanelClass`; no decorative gradients or strong card shadows.
- Base spacing unit: 4px.
- Dense controls: 8–12px internal gaps.
- Panel padding: 16px mobile, 20px desktop.
- Section separation: 24–32px.
- Control target: 44px preferred; never below the WCAG 2.2 24px minimum.
- Small radius for controls, medium radius for panels, large radius only for
  dialogs. Nested radius must remain optically concentric.

## Hierarchy and type

- Display: Outfit (`font-display`) for short page/entity headings.
- Interface/body: Plus Jakarta Sans (`font-sans`).
- Evidence IDs and machine values: JetBrains Mono (`font-mono`).
- Reading accessibility option: Atkinson Hyperlegible.
- Dense product scale: caption 12, body 14, section 18, page 24–26px.
- Weight and tone carry most hierarchy: 600/foreground for decisions,
  500/muted-foreground for labels, 400/muted-foreground for evidence detail.
- Dynamic figures use tabular numbers.
- Headings use balanced wrapping; descriptions use pretty wrapping.

## Page ownership

- Each page has one named task and one dominant action.
- Each entity has one canonical detail URL in `portal-route-registry.ts`.
- A metric key, full status and primary action appear once per screen DTO.
- Route orchestrators own the initial screen query.
- Layouts own shell/session state only.
- Leaf components receive typed props and never fetch, resolve tenants or check
  permissions.
- TanStack Query is the only cache for new browser server-state work. Use
  `portalQueryKeys` and `usePortalScreen`; migrate legacy caches incrementally.

## Shared components

- `PortalPageHeader`: page title, concise context and one action.
- `PortalEntityHeader`: canonical detail identity, one status and compact
  authoritative metadata.
- `PortalWorkQueue`: decision trail list with reason and next action.
- `PortalStatusBadge`: textual state cue; semantic colour is supporting only.
- `PortalPanel`: quiet bordered content surface.
- `PortalDataTable`: captioned semantic table with column headers.
- `PortalFilterBar`: controls plus a live result summary.
- `PortalDetailTabs`: URL navigation with `aria-current`, not hand-rolled tabs.
- `PortalActionMenu`: Radix menu with a named 44px trigger.
- `PortalSidePanel`: Radix sheet with focus management and non-repeated title.
- `PortalEmptyState` / `PortalErrorState`: explicit non-happy-path states.
- `SupportWorkspace`: one shared support layout and vocabulary for every portal.
- `AccountSecurityPanel`: shared account security/TOTP ownership.

Role-specific wrappers are allowed only for genuine domain interaction, never
to copy headers, panels, status badges, empty states, support shells or quick
links.

## Accessibility contract

- Native landmarks, links, buttons and tables first; Radix for composite
  controls.
- Visible `focus-visible` rings with at least 3:1 non-text contrast.
- Logical heading order and a unique page heading.
- Loading and result counts use polite live regions; errors use `role="alert"`.
- Do not obscure focused controls beneath sticky regions.
- Keyboard flows, 200% zoom, reduced motion and screen-reader names are release
  gates for shared components.
- Motion is limited to opacity/transform/colour, normally 150–200ms, and is
  removed when reduced motion is requested.

## Size limits

- Page orchestrator: no more than 200 lines.
- Reusable domain component: no more than 300 lines.
- Assessment runtime exception: must be explicit and documented.
