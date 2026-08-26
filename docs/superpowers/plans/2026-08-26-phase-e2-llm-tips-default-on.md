# Phase E2 LLM Tips Default-On Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make event learning tips default-on with LLM enhancement, a richer tip panel, and a server-side kill switch — without blocking gameplay.

**Architecture:** Player-web always requests `POST /api/tips/enhance` after an eligible event choice. Classroom overrides skip the request. The API remains the operational kill switch (`LLM_TIPS_ENABLED` + `LLM_API_URL`). The EventModal tip card shows source, loading, retry, and compact/expand for long text.

**Tech Stack:** React, Zustand, Vitest, Express, existing `/api/tips/enhance` route.

## Global Constraints

- German UI copy
- No student PII to LLM (only `learningTip`, `eventId`, `choiceId`, `age`, `scenarioId`)
- Classroom override always wins and never calls the LLM
- Client must not depend on `VITE_LLM_TIPS`
- Server kill switch remains `LLM_TIPS_ENABLED` + `LLM_API_URL`
- No streaming
- Gameplay never blocks on tip enhancement
- Commit identity via env: `stuggibuggi` / `stuggibuggi@users.noreply.github.com`
- Branch: `feature/phase-e2-llm-tips-default-on`

## File map

- Modify: `apps/player-web/src/store/gameStore.ts` — eligibility, request state, retry
- Modify: `apps/player-web/src/store/gameStore.llmTips.test.ts` — default-on + reducer tests
- Modify: `apps/player-web/src/api/client.ts` — return `{ enabled, tip }`
- Create: `apps/player-web/src/components/EventModal.helpers.ts` — labels, compact/expand helpers
- Create: `apps/player-web/src/components/EventModal.helpers.test.ts`
- Modify: `apps/player-web/src/components/EventModal.tsx` — richer tip card
- Modify: `apps/player-web/src/components/EventModal.feedback.test.tsx`
- Modify: `docs/plesk-go-live-checklist.md`
- Modify: `apps/api/.env.example`

---

### Task 1: Default-on eligibility and tip-result reducer

**Files:**
- Modify: `apps/player-web/src/store/gameStore.ts`
- Test: `apps/player-web/src/store/gameStore.llmTips.test.ts`

**Interfaces:**
- Consumes: existing `EventChoiceFeedback` plus current `shouldRequestEnhancedTip`
- Produces:
  - `TipRequestStatus = 'idle' | 'loading' | 'ready' | 'failed'`
  - `EventChoiceFeedback.tipRequestStatus: TipRequestStatus`
  - `EventChoiceFeedback.canRetry: boolean`
  - `shouldRequestEnhancedTip(feedback): boolean` — no env argument
  - `markTipRequestLoading(feedback): EventChoiceFeedback`
  - `applyTipEnhancementResult(current, requested, result, failed?): { eventChoiceFeedback?: EventChoiceFeedback }`

- [ ] **Step 1: Write the failing tests**

Replace `apps/player-web/src/store/gameStore.llmTips.test.ts` with:

```ts
import { describe, expect, it } from 'vitest';
import {
  applyTipEnhancementResult,
  buildTipEnhancementPayload,
  markTipRequestLoading,
  shouldRequestEnhancedTip,
  type EventChoiceFeedback,
} from './gameStore';

const baseFeedback: EventChoiceFeedback = {
  eventId: 'EVT_TEST',
  choiceId: 'choice_a',
  eventTitle: 'Testereignis',
  choiceLabel: 'Auswahl A',
  learningTip: 'Bleib beim Budget.',
  financialImpact: -10,
  age: 17,
  scenarioId: 'SCENARIO_AUSBILDUNG',
  hasClassroomTipOverride: false,
  tipSource: 'static',
  tipRequestStatus: 'idle',
  canRetry: false,
};

describe('LLM tip wiring helpers', () => {
  it('requests enhancement by default when no classroom override is set', () => {
    expect(shouldRequestEnhancedTip(baseFeedback)).toBe(true);
  });

  it('skips enhancement when a classroom override is already applied', () => {
    expect(
      shouldRequestEnhancedTip({
        ...baseFeedback,
        learningTip: 'Lehrkraft-Tipp.',
        hasClassroomTipOverride: true,
      })
    ).toBe(false);
  });

  it('skips enhancement when the static tip is empty', () => {
    expect(shouldRequestEnhancedTip({ ...baseFeedback, learningTip: '   ' })).toBe(false);
  });

  it('builds an anonymous enhancement payload', () => {
    expect(buildTipEnhancementPayload(baseFeedback)).toEqual({
      learningTip: 'Bleib beim Budget.',
      eventId: 'EVT_TEST',
      choiceId: 'choice_a',
      age: 17,
      scenarioId: 'SCENARIO_AUSBILDUNG',
    });
  });

  it('marks eligible feedback as loading before the request', () => {
    expect(markTipRequestLoading(baseFeedback)).toMatchObject({
      tipRequestStatus: 'loading',
      canRetry: false,
      tipSource: 'static',
    });
  });

  it('keeps classroom overrides idle and never loading', () => {
    const classroom = markTipRequestLoading({
      ...baseFeedback,
      hasClassroomTipOverride: true,
      tipSource: 'classroom',
      learningTip: 'Lehrkraft-Tipp.',
    });
    expect(classroom.tipRequestStatus).toBe('idle');
    expect(classroom.canRetry).toBe(false);
  });

  it('applies an enhanced tip when the API returns a different enabled tip', () => {
    const loading = markTipRequestLoading(baseFeedback);
    const next = applyTipEnhancementResult(loading, baseFeedback, {
      enabled: true,
      tip: 'Vergleiche die Zinsen zuerst.',
    });
    expect(next.eventChoiceFeedback).toMatchObject({
      learningTip: 'Vergleiche die Zinsen zuerst.',
      tipSource: 'llm',
      tipRequestStatus: 'ready',
      canRetry: false,
    });
  });

  it('stays on the static tip without retry when the API kill switch is off', () => {
    const loading = markTipRequestLoading(baseFeedback);
    const next = applyTipEnhancementResult(loading, baseFeedback, {
      enabled: false,
      tip: 'Bleib beim Budget.',
    });
    expect(next.eventChoiceFeedback).toMatchObject({
      learningTip: 'Bleib beim Budget.',
      tipSource: 'static',
      tipRequestStatus: 'ready',
      canRetry: false,
    });
  });

  it('keeps the static tip and allows retry when the provider falls back', () => {
    const loading = markTipRequestLoading(baseFeedback);
    const next = applyTipEnhancementResult(loading, baseFeedback, {
      enabled: true,
      tip: 'Bleib beim Budget.',
    });
    expect(next.eventChoiceFeedback).toMatchObject({
      learningTip: 'Bleib beim Budget.',
      tipSource: 'static',
      tipRequestStatus: 'failed',
      canRetry: true,
    });
  });

  it('allows retry when the request fails', () => {
    const loading = markTipRequestLoading(baseFeedback);
    const next = applyTipEnhancementResult(loading, baseFeedback, null, true);
    expect(next.eventChoiceFeedback).toMatchObject({
      tipSource: 'static',
      tipRequestStatus: 'failed',
      canRetry: true,
    });
  });

  it('ignores stale enhancement results after the feedback event changed', () => {
    const loading = markTipRequestLoading(baseFeedback);
    const next = applyTipEnhancementResult(loading, { eventId: 'EVT_OTHER', choiceId: 'choice_a' }, {
      enabled: true,
      tip: 'Anderer Tipp.',
    });
    expect(next).toEqual({});
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run apps/player-web/src/store/gameStore.llmTips.test.ts`

Expected: FAIL because `shouldRequestEnhancedTip` still requires `VITE_LLM_TIPS` and the new helpers/fields do not exist.

- [ ] **Step 3: Write minimal implementation**

In `apps/player-web/src/store/gameStore.ts`:

1. Extend `EventChoiceFeedback`:

```ts
export type TipRequestStatus = 'idle' | 'loading' | 'ready' | 'failed';

export interface EventChoiceFeedback {
  eventId: string;
  choiceId: string;
  eventTitle: string;
  choiceLabel: string;
  learningTip: string;
  financialImpact: number;
  age: number;
  scenarioId?: string;
  hasClassroomTipOverride: boolean;
  tipSource: 'static' | 'classroom' | 'llm';
  tipRequestStatus: TipRequestStatus;
  canRetry: boolean;
  phoneTipCardId?: string;
}
```

2. In `createEventChoiceFeedback`, set `tipRequestStatus: 'idle'` and `canRetry: false`.

3. Replace flag-gated eligibility with:

```ts
export function shouldRequestEnhancedTip(
  feedback: Pick<EventChoiceFeedback, 'learningTip' | 'hasClassroomTipOverride'>
): boolean {
  return !feedback.hasClassroomTipOverride && feedback.learningTip.trim().length > 0;
}

export function markTipRequestLoading(feedback: EventChoiceFeedback): EventChoiceFeedback {
  if (!shouldRequestEnhancedTip(feedback)) {
    return {
      ...feedback,
      tipRequestStatus: feedback.hasClassroomTipOverride ? 'idle' : 'ready',
      canRetry: false,
    };
  }

  return {
    ...feedback,
    tipRequestStatus: 'loading',
    canRetry: false,
  };
}

export type TipEnhancementResult = {
  enabled: boolean;
  tip: string;
};

export function applyTipEnhancementResult(
  current: EventChoiceFeedback | null,
  requested: Pick<EventChoiceFeedback, 'eventId' | 'choiceId'>,
  result: TipEnhancementResult | null,
  failed = false
): Partial<Pick<{ eventChoiceFeedback: EventChoiceFeedback }, 'eventChoiceFeedback'>> {
  if (
    !current ||
    current.eventId !== requested.eventId ||
    current.choiceId !== requested.choiceId ||
    current.hasClassroomTipOverride ||
    current.tipSource === 'classroom'
  ) {
    return {};
  }

  if (failed || result == null) {
    return {
      eventChoiceFeedback: {
        ...current,
        tipSource: 'static',
        tipRequestStatus: 'failed',
        canRetry: true,
      },
    };
  }

  const enhanced = result.tip.trim();
  const original = current.learningTip.trim();
  if (result.enabled && enhanced && enhanced !== original) {
    return {
      eventChoiceFeedback: {
        ...current,
        learningTip: enhanced,
        tipSource: 'llm',
        tipRequestStatus: 'ready',
        canRetry: false,
      },
    };
  }

  if (!result.enabled) {
    return {
      eventChoiceFeedback: {
        ...current,
        tipSource: 'static',
        tipRequestStatus: 'ready',
        canRetry: false,
      },
    };
  }

  return {
    eventChoiceFeedback: {
      ...current,
      tipSource: 'static',
      tipRequestStatus: 'failed',
      canRetry: true,
    },
  };
}
```

4. Delete `LlmTipsEnv` and `isLlmTipsFlagEnabled`.

- [ ] **Step 4: Run tests and make sure they pass**

Run: `npx vitest run apps/player-web/src/store/gameStore.llmTips.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/player-web/src/store/gameStore.ts apps/player-web/src/store/gameStore.llmTips.test.ts
git commit -m "feat: request event tip enhancement by default"
```

---

### Task 2: Wire enhancement request, retry, and API result shape

**Files:**
- Modify: `apps/player-web/src/api/client.ts`
- Modify: `apps/player-web/src/store/gameStore.ts`
- Test: `apps/player-web/src/store/gameStore.llmTips.test.ts` (keep Task 1 tests)

**Interfaces:**
- Consumes: `shouldRequestEnhancedTip`, `markTipRequestLoading`, `applyTipEnhancementResult`, `buildTipEnhancementPayload`
- Produces:
  - `enhanceLearningTip(request): Promise<{ enabled: boolean; tip: string }>`
  - `retryEnhancedTip()` store action
  - `requestEnhancedTip` uses the reducer and sets loading/failed/ready

- [ ] **Step 1: Write the failing test for the client result shape**

Add to `apps/player-web/src/store/gameStore.llmTips.test.ts` (or keep helpers-only here and add an assertion file if client tests exist). Prefer adding a focused test in a new `apps/player-web/src/api/client.tips.test.ts` only if importing `enhanceLearningTip` is easy without network. Do **not** add a brittle HTTP mock unless needed.

Instead, keep store wiring testable by exporting `requestEnhancedTip` behavior through the already-exported reducer: Task 2 implementation must call `applyTipEnhancementResult` from `requestEnhancedTip` and `retryEnhancedTip`.

Add this test to `gameStore.llmTips.test.ts` to lock retry eligibility:

```ts
  it('only retries when canRetry is true and the source is not classroom', () => {
    expect(shouldRequestEnhancedTip({ ...baseFeedback, hasClassroomTipOverride: false })).toBe(true);
    expect(
      shouldRequestEnhancedTip({
        ...baseFeedback,
        hasClassroomTipOverride: true,
        learningTip: 'Lehrkraft-Tipp.',
      })
    ).toBe(false);
  });
```

That test already exists from Task 1. For Task 2, add a store-level test that `retryEnhancedTip` exists by implementing it and covering `createEventChoiceFeedback` fields:

Update any existing object literals that construct `EventChoiceFeedback` so TypeScript fails until `tipRequestStatus` and `canRetry` are set (this is already Task 1). Task 2 failing test is the client contract:

Create `apps/player-web/src/api/client.tips.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.stubGlobal('window', { localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} } });

describe('enhanceLearningTip result shape', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('returns enabled and tip from the API body', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ enabled: true, tip: 'KI Text.' }),
      }))
    );
    const { enhanceLearningTip } = await import('./client');
    await expect(
      enhanceLearningTip({
        learningTip: 'Original.',
        eventId: 'EVT_TEST',
        choiceId: 'c1',
        age: 18,
      })
    ).resolves.toEqual({ enabled: true, tip: 'KI Text.' });
  });
});
```

If `client.ts` is hard to import in isolation (localStorage, import.meta), skip the separate client test and instead change `enhanceLearningTip` and immediately compile/typecheck via `npx vitest run apps/player-web/src/store/gameStore.llmTips.test.ts` plus `npm run build --workspace=apps/player-web` at the end of this task. Prefer the client test if `fetch` can be stubbed.

- [ ] **Step 2: Run the new test and confirm it fails**

Run: `npx vitest run apps/player-web/src/api/client.tips.test.ts`

Expected: FAIL because `enhanceLearningTip` currently returns a string.

If the import setup is too noisy, drop the file and treat `tsc` as the failing check: `npm run build --workspace=apps/player-web` must fail after changing call sites to expect `{ enabled, tip }` before the client is updated.

- [ ] **Step 3: Implement client + store wiring**

In `apps/player-web/src/api/client.ts`, change:

```ts
export async function enhanceLearningTip(
  request: TipEnhancementRequest
): Promise<{ enabled: boolean; tip: string }> {
  const data = await apiFetch('/api/tips/enhance', {
    method: 'POST',
    body: JSON.stringify(request),
  });
  const tip =
    typeof data.tip === 'string' && data.tip.trim() ? data.tip : request.learningTip;
  return { enabled: Boolean(data.enabled), tip };
}
```

In `apps/player-web/src/store/gameStore.ts`:

1. Add `retryEnhancedTip: () => void` to `GameStoreState`.
2. Replace `requestEnhancedTip` with:

```ts
function requestEnhancedTip(feedback: EventChoiceFeedback) {
  const requested = { eventId: feedback.eventId, choiceId: feedback.choiceId };
  void enhanceLearningTip(buildTipEnhancementPayload(feedback))
    .then((result) => {
      useGameStore.setState((state) =>
        applyTipEnhancementResult(state.eventChoiceFeedback, requested, result)
      );
    })
    .catch(() => {
      useGameStore.setState((state) =>
        applyTipEnhancementResult(state.eventChoiceFeedback, requested, null, true)
      );
    });
}
```

3. In `handleEventChoice`, after creating feedback:

```ts
const feedback = shouldRequestEnhancedTip(eventChoiceFeedback)
  ? markTipRequestLoading(eventChoiceFeedback)
  : eventChoiceFeedback;

set({
  gameState: updatedState,
  eventChoiceFeedback: feedback,
  pendingPhoneTipCardId: eventChoiceFeedback.phoneTipCardId ?? null,
});
persistLocal(updatedState);
if (shouldRequestEnhancedTip(feedback)) {
  requestEnhancedTip(feedback);
}
```

4. Implement `retryEnhancedTip`:

```ts
retryEnhancedTip: () => {
  const current = get().eventChoiceFeedback;
  if (!current?.canRetry || !shouldRequestEnhancedTip(current)) return;
  const loading = markTipRequestLoading(current);
  set({ eventChoiceFeedback: loading });
  requestEnhancedTip(loading);
},
```

- [ ] **Step 4: Run tests**

Run:

```
npx vitest run apps/player-web/src/store/gameStore.llmTips.test.ts apps/api/src/routes/tips.test.js
```

Expected: PASS. Then `npm run build --workspace=apps/player-web` Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/player-web/src/api/client.ts apps/player-web/src/store/gameStore.ts apps/player-web/src/api/client.tips.test.ts
git commit -m "feat: wire default-on tip enhancement and retry"
```

---

### Task 3: Richer EventModal tip card

**Files:**
- Create: `apps/player-web/src/components/EventModal.helpers.ts`
- Create: `apps/player-web/src/components/EventModal.helpers.test.ts`
- Modify: `apps/player-web/src/components/EventModal.tsx`
- Modify: `apps/player-web/src/components/EventModal.feedback.test.tsx`

**Interfaces:**
- Consumes: `EventChoiceFeedback`, `retryEnhancedTip` from the store
- Produces:
  - `TIP_COMPACT_CHAR_LIMIT = 140`
  - `getEventTipSourceLabel(source): string`
  - `shouldShowEventTipLoading(status): boolean`
  - `shouldShowEventTipRetry(feedback): boolean`
  - `shouldCompactEventTip(text): boolean`
  - `getEventTipPreview(text): string`
  - `EventTipCard` in `EventModal.tsx`

Exact German copy:

- classroom → `Tipp deiner Lehrkraft`
- llm → `KI-Tipp`
- static/default → `Lerntipp`
- loading hint → `Eine KI-Variante wird geprüft.`
- retry → `Erneut versuchen`
- expand → `Mehr anzeigen`
- collapse → `Weniger anzeigen`

- [ ] **Step 1: Write failing helper tests**

Create `apps/player-web/src/components/EventModal.helpers.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  getEventTipPreview,
  getEventTipSourceLabel,
  shouldCompactEventTip,
  shouldShowEventTipLoading,
  shouldShowEventTipRetry,
  TIP_COMPACT_CHAR_LIMIT,
} from './EventModal.helpers';

describe('EventModal tip helpers', () => {
  it('labels classroom, llm, and static sources in German', () => {
    expect(getEventTipSourceLabel('classroom')).toBe('Tipp deiner Lehrkraft');
    expect(getEventTipSourceLabel('llm')).toBe('KI-Tipp');
    expect(getEventTipSourceLabel('static')).toBe('Lerntipp');
  });

  it('shows loading only while a request is in flight', () => {
    expect(shouldShowEventTipLoading('loading')).toBe(true);
    expect(shouldShowEventTipLoading('ready')).toBe(false);
    expect(shouldShowEventTipLoading('failed')).toBe(false);
    expect(shouldShowEventTipLoading('idle')).toBe(false);
  });

  it('shows retry only for failed non-classroom tips', () => {
    expect(shouldShowEventTipRetry({ canRetry: true, tipSource: 'static' })).toBe(true);
    expect(shouldShowEventTipRetry({ canRetry: true, tipSource: 'classroom' })).toBe(false);
    expect(shouldShowEventTipRetry({ canRetry: false, tipSource: 'static' })).toBe(false);
  });

  it('compacts tips longer than the character limit', () => {
    const longTip = 'A'.repeat(TIP_COMPACT_CHAR_LIMIT + 1);
    expect(shouldCompactEventTip(longTip)).toBe(true);
    expect(getEventTipPreview(longTip)).toBe(`${'A'.repeat(TIP_COMPACT_CHAR_LIMIT)}…`);
    expect(shouldCompactEventTip('Kurz.')).toBe(false);
    expect(getEventTipPreview('Kurz.')).toBe('Kurz.');
  });
});
```

- [ ] **Step 2: Run helper tests to verify they fail**

Run: `npx vitest run apps/player-web/src/components/EventModal.helpers.test.ts`

Expected: FAIL — module not found.

- [ ] **Step 3: Implement helpers**

Create `apps/player-web/src/components/EventModal.helpers.ts`:

```ts
import type { EventChoiceFeedback, TipRequestStatus } from '../store/gameStore';

export const TIP_COMPACT_CHAR_LIMIT = 140;

export function getEventTipSourceLabel(source: EventChoiceFeedback['tipSource']): string {
  if (source === 'classroom') return 'Tipp deiner Lehrkraft';
  if (source === 'llm') return 'KI-Tipp';
  return 'Lerntipp';
}

export function shouldShowEventTipLoading(status: TipRequestStatus): boolean {
  return status === 'loading';
}

export function shouldShowEventTipRetry(
  feedback: Pick<EventChoiceFeedback, 'canRetry' | 'tipSource'>
): boolean {
  return feedback.canRetry && feedback.tipSource !== 'classroom';
}

export function shouldCompactEventTip(text: string): boolean {
  return text.trim().length > TIP_COMPACT_CHAR_LIMIT;
}

export function getEventTipPreview(text: string): string {
  const trimmed = text.trim();
  if (!shouldCompactEventTip(trimmed)) return trimmed;
  return `${trimmed.slice(0, TIP_COMPACT_CHAR_LIMIT).trimEnd()}…`;
}
```

- [ ] **Step 4: Run helper tests**

Run: `npx vitest run apps/player-web/src/components/EventModal.helpers.test.ts`

Expected: PASS

- [ ] **Step 5: Write failing EventTipCard tests**

Update `apps/player-web/src/components/EventModal.feedback.test.tsx` to import and render `EventTipCard` (exported from `EventModal.tsx`) as well as the modal:

```ts
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { EventModal, EventTipCard } from './EventModal';
import type { EventChoiceFeedback } from '../store/gameStore';

const staticFeedback: EventChoiceFeedback = {
  eventId: 'EVT_PHONE_BROKEN',
  choiceId: 'repair',
  eventTitle: 'Kaputtes Smartphone',
  choiceLabel: 'Reparieren lassen',
  learningTip: 'Eine Rücklage schützt dich vor teuren Überraschungen.',
  financialImpact: -249,
  age: 17,
  hasClassroomTipOverride: false,
  tipSource: 'static',
  tipRequestStatus: 'loading',
  canRetry: false,
};

vi.mock('../store/gameStore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../store/gameStore')>();
  return {
    ...actual,
    useGameStore: () => ({
      gameState: null,
      eventChoiceFeedback: staticFeedback,
      dismissEventFeedback: vi.fn(),
      handleEventChoice: vi.fn(),
      retryEnhancedTip: vi.fn(),
    }),
  };
});

describe('EventModal feedback phase', () => {
  it('renders post-choice feedback without an active event', () => {
    const html = renderToStaticMarkup(<EventModal />);
    expect(html).toContain('Deine Entscheidung');
    expect(html).toContain('Reparieren lassen');
    expect(html).toContain('-249');
    expect(html).toContain('Eine Rücklage schützt dich vor teuren Überraschungen.');
    expect(html).toContain('Lerntipp');
    expect(html).toContain('Eine KI-Variante wird geprüft.');
    expect(html).toContain('Weiter');
  });

  it('labels a classroom override and hides retry', () => {
    const html = renderToStaticMarkup(
      <EventTipCard
        feedback={{
          ...staticFeedback,
          learningTip: 'Sparplan der Klasse.',
          hasClassroomTipOverride: true,
          tipSource: 'classroom',
          tipRequestStatus: 'idle',
          canRetry: false,
        }}
        onRetry={() => undefined}
      />
    );
    expect(html).toContain('Tipp deiner Lehrkraft');
    expect(html).toContain('Sparplan der Klasse.');
    expect(html).not.toContain('Erneut versuchen');
    expect(html).not.toContain('Eine KI-Variante wird geprüft.');
  });

  it('shows retry on a failed enhancement', () => {
    const html = renderToStaticMarkup(
      <EventTipCard
        feedback={{
          ...staticFeedback,
          tipSource: 'static',
          tipRequestStatus: 'failed',
          canRetry: true,
        }}
        onRetry={() => undefined}
      />
    );
    expect(html).toContain('Erneut versuchen');
  });

  it('compacts a long tip behind Mehr anzeigen', () => {
    const longTip = `${'Spare regelmäßig. '.repeat(20)}Ende.`;
    const html = renderToStaticMarkup(
      <EventTipCard
        feedback={{
          ...staticFeedback,
          learningTip: longTip,
          tipSource: 'llm',
          tipRequestStatus: 'ready',
          canRetry: false,
        }}
        onRetry={() => undefined}
      />
    );
    expect(html).toContain('KI-Tipp');
    expect(html).toContain('Mehr anzeigen');
    expect(html).not.toContain('Ende.');
  });
});
```

If `vi.mock` of `gameStore` with `importOriginal` breaks because `EventTipCard` lives in the same file as `useGameStore`, keep the existing static mock for `EventModal` and put `EventTipCard` in `EventModal.TipCard.tsx` so tests can import it without mocking the store. Prefer a small `EventModal.TipCard.tsx` if the mock becomes messy.

- [ ] **Step 6: Run EventModal tests to verify they fail**

Run: `npx vitest run apps/player-web/src/components/EventModal.feedback.test.tsx`

Expected: FAIL — old “Lerneffekt” copy, no `EventTipCard`.

- [ ] **Step 7: Implement the tip card and wire EventModal**

Create `apps/player-web/src/components/EventModal.TipCard.tsx` if needed, otherwise export from `EventModal.tsx`:

```tsx
export function EventTipCard({
  feedback,
  onRetry,
}: {
  feedback: EventChoiceFeedback;
  onRetry: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const compact = shouldCompactEventTip(feedback.learningTip);
  const body = !compact || expanded ? feedback.learningTip : getEventTipPreview(feedback.learningTip);

  return (
    <div className="bg-amber-50/80 p-4 rounded-2xl border border-amber-200 text-xs text-amber-950 flex items-start gap-2.5">
      <BookOpen className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
      <div className="min-w-0">
        <span className="font-extrabold block">{getEventTipSourceLabel(feedback.tipSource)}</span>
        <span className="leading-relaxed">{body}</span>
        {compact && (
          <button
            type="button"
            className="mt-2 font-extrabold text-amber-800 underline-offset-2 hover:underline"
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? 'Weniger anzeigen' : 'Mehr anzeigen'}
          </button>
        )}
        {shouldShowEventTipLoading(feedback.tipRequestStatus) && (
          <span className="mt-2 block text-[11px] font-bold text-amber-800/80">
            Eine KI-Variante wird geprüft.
          </span>
        )}
        {shouldShowEventTipRetry(feedback) && (
          <button
            type="button"
            className="mt-2 font-extrabold text-amber-800 underline-offset-2 hover:underline"
            onClick={onRetry}
          >
            Erneut versuchen
          </button>
        )}
      </div>
    </div>
  );
}
```

In the feedback pane of `EventModal`, replace the old amber tip block with:

```tsx
const { ..., retryEnhancedTip } = useGameStore();
...
<EventTipCard feedback={eventChoiceFeedback} onRetry={retryEnhancedTip} />
```

Leave the pre-confirm “Lerneffekt” preview on the choice screen unchanged.

- [ ] **Step 8: Run UI tests**

Run: `npx vitest run apps/player-web/src/components/EventModal.helpers.test.ts apps/player-web/src/components/EventModal.feedback.test.tsx`

Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add apps/player-web/src/components/EventModal.tsx apps/player-web/src/components/EventModal.TipCard.tsx apps/player-web/src/components/EventModal.helpers.ts apps/player-web/src/components/EventModal.helpers.test.ts apps/player-web/src/components/EventModal.feedback.test.tsx
git commit -m "feat: add richer event tip card with source loading and retry"
```

---

### Task 4: Ops docs and env example

**Files:**
- Modify: `docs/plesk-go-live-checklist.md`
- Modify: `apps/api/.env.example`

**Interfaces:**
- Consumes: E2 operational model (frontend always requests; API kill switch)
- Produces: accurate Plesk/env docs, no `VITE_LLM_TIPS` product flag

- [ ] **Step 1: Update checklist and env example**

In `docs/plesk-go-live-checklist.md`:

- Section 1: keep `LLM_TIPS_ENABLED`, `LLM_API_URL` as the kill switch (not “optional Phase D client flag”).
- Section 3: **remove** `VITE_LLM_TIPS=true`. Replace with: Frontend always requests tip enhancement; disable only via API env.

In `apps/api/.env.example` append:

```
# --- LLM tips (optional kill switch) ---
# Frontend always requests POST /api/tips/enhance after event choices.
# Leave disabled / URL unset to pass through the static tip.
# LLM_TIPS_ENABLED=false
# LLM_API_URL=
# LLM_TIPS_TIMEOUT_MS=1500
```

- [ ] **Step 2: Commit**

```bash
git add docs/plesk-go-live-checklist.md apps/api/.env.example
git commit -m "docs: document E2 default-on tips and server kill switch"
```

---

## Verification (after all tasks)

```
npx vitest run apps/player-web/src/store/gameStore.llmTips.test.ts apps/player-web/src/components/EventModal.helpers.test.ts apps/player-web/src/components/EventModal.feedback.test.tsx apps/api/src/routes/tips.test.js
npm test
npm run build --workspace=apps/player-web
```

Expected: all tests PASS, player-web build PASS.

## Spec coverage

| Spec item | Task |
|-----------|------|
| No `VITE_LLM_TIPS` gate | 1 |
| Classroom override skips LLM | 1, 2 |
| Immediate static tip + background request | 2 |
| Kill switch passthrough, no retry | 1, 2 |
| Provider failure retry | 1, 2, 3 |
| Source labels, loading, compact/expand | 3 |
| Ops docs | 4 |
