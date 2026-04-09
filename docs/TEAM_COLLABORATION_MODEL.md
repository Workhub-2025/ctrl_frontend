# CTRL Team Collaboration Model

## Purpose

This document defines how the CTRL team should collaborate so development can move in parallel without confusion, duplicated work, or ownership gaps.

It is designed for the current team structure:

- `PM + Product Developer` - Mihir
- `Backend / Security Developer` - Dev 2
- `Generalist / Integration Developer` - Dev 3

The goal is simple:

- keep product direction clear
- keep backend secure and reliable
- keep delivery moving without blockers

---

## Team Roles

### 1. Mihir - PM + Product Developer

Primary role:

- Own product direction and execution quality

Main responsibilities:

- define what gets built and in what order
- write or approve feature scope
- own the UX and visual direction of the app
- own the assessment experience from the user's point of view
- build key frontend/product surfaces
- review completed work against product goals
- decide when a feature is ready for internal review

Mihir is responsible for:

- product decisions
- app flow decisions
- frontend quality and consistency
- assessment experience design
- coordination between business and engineering

Mihir is not the main owner of:

- backend auth/security internals
- Docker/backend ops implementation
- low-level Strapi schema design details

---

### 2. Dev 2 - Backend / Security / Strapi

Primary role:

- Own backend trust, security, and persistence

Main responsibilities:

- own Strapi content types and data modelling
- own authentication and authorization
- own roles and permissions
- own API stability and backend contracts
- own Docker setup and backend runtime reliability
- own backend-side audit/security/logging
- own secure persistence of assessment and hiring data

Dev 2 is responsible for:

- making sure backend systems are safe to trust
- making sure data is stored correctly
- making sure auth and roles behave correctly
- making sure developers can run backend reliably

Dev 2 is not the main owner of:

- frontend UX decisions
- assessment screen design
- landing page or product visuals

---

### 3. Dev 3 - Generalist / Integration / QA Support

Primary role:

- Keep the whole product moving by connecting systems and reducing bottlenecks

Main responsibilities:

- integrate frontend with backend endpoints
- support dashboard/admin/recruiter/client-facing pages
- help test full flows end-to-end
- pick up bugs and regression fixes
- help with shared components and app polish
- fill delivery gaps between product and backend
- improve docs and developer handoff clarity

Dev 3 is responsible for:

- integration work
- QA support
- bug fixing
- implementation support on shared product surfaces

Dev 3 should avoid becoming:

- the accidental owner of unclear work
- the fallback for every unsolved product or backend decision

---

## Ownership Rules

To avoid overlap, ownership should follow this model:

- `Product / UX / frontend flow` -> Mihir
- `Backend / auth / Strapi / security / Docker` -> Dev 2
- `Integration / testing / support / overflow delivery` -> Dev 3

If a task touches all three areas:

1. Mihir defines expected user behavior
2. Dev 2 defines backend contract and security rules
3. Dev 3 helps connect, test, and polish

---

## Decision-Making Model

### Mihir decides

- feature priority
- UX behavior
- visual design direction
- assessment experience expectations
- product acceptance

### Dev 2 decides

- auth structure
- role model
- Strapi schema approach
- API security constraints
- Docker/backend environment decisions

### Dev 3 decides

- best implementation support path for integration tasks
- test flow improvements
- bug fix sequencing for shared delivery support

### Shared decisions

The team should discuss together when a decision affects:

- data model + UI at the same time
- delivery order across multiple people
- breaking changes to routes, auth, or assessment structure

---

## Collaboration Workflow

For most features, use this sequence:

1. Mihir defines the feature
2. Dev 2 defines the backend contract
3. Dev 3 helps connect and test
4. Mihir reviews and approves from product perspective

This keeps product intent clear and prevents backend or integration work from guessing at requirements.

---

## Working Agreement

### Before a task starts

Each task should be clear on:

- owner
- goal
- dependencies
- branch
- done criteria

### While a task is in progress

Each developer should:

- stay within their ownership unless asked to support
- document assumptions if backend/frontend dependencies are unclear
- avoid changing another person's area without checking first

### When a task is complete

The owner should provide:

- what changed
- what needs review
- any known risks
- anything blocked or deferred

---

## Branch Strategy

Recommended branch model:

- `main`
  - stable deployable branch

- `ctrl-frontend-hybrid`
  - active product integration branch for current major app work

- feature branches off `ctrl-frontend-hybrid`
  - one per focused task

Suggested naming:

- `mihir/feature-assessment-results`
- `dev2/auth-role-hardening`
- `dev2/strapi-hybrid-summary-model`
- `dev3/recruiter-results-integration`
- `dev3/qa-assessment-flow-fixes`

Rules:

- no direct work on `main`
- use focused feature branches
- merge into `ctrl-frontend-hybrid` first
- only merge to `main` once tested and reviewed

---

## Review Responsibilities

### Mihir reviews

- product correctness
- UX consistency
- assessment flow quality
- frontend implementation quality

### Dev 2 reviews

- backend contract correctness
- security implications
- auth/role impacts
- data model safety

### Dev 3 reviews

- integration quality
- testability
- flow regressions
- practical usability issues

---

## Current Workstream Split For CTRL

### Mihir

- visual system of the app
- assessment experience UX
- landing/app consistency
- recruiter/client-facing product flows
- hybrid assessment product direction

### Dev 2

- Strapi models for hybrid assessment summaries
- secure assessment result persistence
- role-safe access to candidate/recruiter/client data
- auth/session hardening
- Docker/backend environment reliability

### Dev 3

- wiring frontend screens to backend data
- recruiter/admin/support views
- QA of assessment completion flows
- bug fixing and regression cleanup
- shared component and dashboard support

---

## Suggested Immediate Task Partition

### Mihir

- own Phase `4.3`
- design and implement recruiter/client decision views
- refine how hybrid results are shown in the app

### Dev 2

- create proper Strapi schema for hybrid assessment evidence
- define API shape for persisted summary retrieval
- harden auth, permissions, and candidate result access

### Dev 3

- connect recruiter/client screens to the new summary endpoint
- test assessment completion -> persistence -> results flow
- clean up bugs across dashboard/admin/results surfaces

---

## Definition Of Done

A feature is done when:

- frontend behavior matches agreed product intent
- backend contract is stable and secure
- integration works end-to-end
- key happy-path flow is tested
- known risks are documented

---

## Escalation Rule

Raise a team discussion early if:

- ownership is unclear
- a backend change affects product behavior
- a UI requirement requires schema or API changes
- one person is blocked on another for more than one working session

Do not let unclear work sit in silence.

---

## Summary

The working model is:

- Mihir owns `what the product should be`
- Dev 2 owns `whether the backend can be trusted`
- Dev 3 owns `keeping everything connected and moving`

This structure should let the team build in parallel without losing quality or control.
