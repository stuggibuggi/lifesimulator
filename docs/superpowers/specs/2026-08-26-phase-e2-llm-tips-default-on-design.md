# Phase E2 — LLM Tips Default-On Design Spec

> **Status:** Approved in brainstorming (2026-08-26)  
> **Scope:** E2 only  
> **Recommended approach:** Client always requests enhancement; server keeps the operational kill switch

## 1. Goal

Make learning tips feel like a first-class product feature by turning LLM enhancement on by default in the player experience, while preserving a safe server-side fallback and keeping classroom teacher overrides authoritative.

### Success criteria

1. After an event choice, the client automatically attempts `POST /api/tips/enhance` without requiring a frontend feature flag.
2. If the API LLM integration is disabled, missing, slow, or failing, gameplay still shows the existing static tip immediately and never blocks progression.
3. Classroom tip overrides continue to win over all other tip sources and skip the LLM request entirely.
4. The event feedback UI shows a richer tip experience with source labeling, loading feedback, retry, and compact expand/collapse behavior for longer tips.

### Non-goals

- Streaming LLM responses
- New student data in tip requests beyond the existing anonymous context
- Teacher-authored AI prompt controls
- New provider infrastructure beyond the current optional API URL integration

---

## 2. Product behavior

### Tip request model

- The player-web client removes the product-level dependency on `VITE_LLM_TIPS`.
- After an event choice, the store creates feedback immediately using the current static tip or classroom override.
- If the feedback source is not `classroom` and the tip text is non-empty, the client starts an asynchronous enhancement request in the background.
- The player can continue immediately; the tip area updates in place if an enhanced response arrives.

### Source precedence

1. Classroom override
2. LLM-enhanced tip
3. Static event tip

Classroom overrides are fixed teacher-authored guidance. They are never rewritten by the LLM in this phase.

### Operational kill switch

The backend remains the single operational control point:

- `LLM_TIPS_ENABLED` + `LLM_API_URL` configured: enhancement may run
- disabled flag or missing URL: passthrough response
- timeout / provider failure / malformed response: passthrough response

This makes the feature default-on in product UX, but still easy to disable on Plesk without rebuilding the frontend.

---

## 3. UI design

### Tip panel states

The event feedback modal keeps one tip card, but it can show distinct states:

- **Classroom override:** label `Tipp deiner Lehrkraft`
- **Static fallback while loading:** label `Lerntipp`, plus subtle loading hint that a KI-Variante geprüft wird
- **LLM success:** label `KI-Tipp`
- **LLM failure after request:** static tip remains visible, with an unobtrusive retry action

The tip panel must never flash empty, collapse unexpectedly, or block the “Weiter” action.

### Compact / expanded behavior

- Short tips render fully inline
- Longer tips render in a compact preview first
- A `Mehr anzeigen` / `Weniger anzeigen` toggle expands the full text
- This behavior is shared across static, classroom, and LLM tips; no separate API field for short/long variants is required

### Tone and copy

- German UI copy
- Source labels should be descriptive rather than technical
- Failure copy should stay low-friction and avoid blaming the user

---

## 4. Technical design

### Client state

Extend the event feedback model with explicit enhancement state:

- `tipSource`: `static | classroom | llm`
- `tipRequestStatus`: `idle | loading | ready | failed`
- `canRetry`: boolean

Recommended semantics:

- `classroom` → `idle`, no request
- initial static tip with request in flight → `static` + `loading`
- enhanced response → `llm` + `ready`
- fallback after failed request → `static` + `failed`, `canRetry=true`

### Client flow

1. Resolve `EventChoiceFeedback` from event choice + optional classroom override
2. Store feedback immediately in state
3. If eligible, set request status to `loading`
4. Call `enhanceLearningTip(...)`
5. On success, replace the visible tip and set source/status accordingly
6. On failure, keep the static tip, mark the request failed, and allow retry

Retry should reuse the same anonymous payload builder and only be available when the current source is not `classroom`.

### API behavior

The existing `POST /api/tips/enhance` endpoint remains the integration point.

Phase E2 changes:

- preserve current anonymous request payload shape
- preserve short timeout behavior
- preserve success/fail + latency logging only
- continue returning a passthrough tip whenever enhancement should not run

No server-side session changes are required for this phase.

---

## 5. Privacy and operations

### Privacy

- No student name, alias, email, classroom name, or teacher data in the LLM request
- Only anonymous gameplay context is allowed: `learningTip`, `eventId`, `choiceId`, `age`, `scenarioId`
- No prompt or full response body logging in production

### Operations

- Plesk operators can disable enhancement centrally via API env
- Frontend deployment no longer depends on remembering a matching `VITE_LLM_TIPS` flag
- Optional documentation updates should reflect that the frontend always attempts enhancement, while the API remains authoritative for enable/disable

---

## 6. Testing strategy

### Automated

- Store helper tests: enhancement eligibility no longer depends on a frontend flag
- Store behavior tests: classroom override still skips requests
- UI tests: source labels, loading state, retry visibility, expand/collapse behavior
- API tests: passthrough when disabled or provider fails remains stable

### Manual smoke

- Normal event shows static tip immediately, then upgrades to KI tip
- Provider disabled shows static tip only, without broken UI
- Classroom override shows teacher tip and no KI transition
- Long tip expands/collapses correctly on desktop and mobile widths

---

## 7. Risks and mitigations

| Risk | Mitigation |
|------|------------|
| Perceived UI flicker during enhancement | Always render the current tip immediately; update in place only |
| Provider instability causes noisy UX | Keep fallback silent, lightweight, and retry optional |
| Classroom guidance gets diluted | Classroom override remains authoritative and bypasses AI |
| Cost surprises after default-on rollout | Backend kill switch remains central and can disable enhancement instantly |

---

## 8. Delivery shape

This should be implemented as a focused feature track on its own branch, for example:

- `feature/phase-e2-llm-tips-default-on`

Expected file areas:

- `apps/player-web/src/store/gameStore.ts`
- `apps/player-web/src/store/gameStore.llmTips.test.ts`
- `apps/player-web/src/components/EventModal.tsx`
- `apps/player-web/src/components/EventModal.feedback.test.tsx`
- `apps/api/src/routes/tips.js`
- `apps/api/src/routes/tips.test.js`
- relevant docs / env examples as needed

## 9. Next step

If this spec is approved, the next step is a dedicated implementation plan for E2 that breaks the work into executable tasks for client state, UI behavior, tests, and deployment documentation.
