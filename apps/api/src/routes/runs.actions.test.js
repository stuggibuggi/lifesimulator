import express from 'express';
import { createServer } from 'node:http';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ALL_LIFE_EVENTS, ALL_LIFE_GOALS } from '@goal/game-content';
import { createInitialGameState } from '@goal/simulation-engine';

vi.mock('../db/pool.js', () => ({
  query: vi.fn(),
}));

vi.mock('../util.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    parseJsonField: vi.fn((value) => {
      if (value == null) return null;
      if (typeof value === 'object') return value;
      return JSON.parse(value);
    }),
  };
});

const { query } = await import('../db/pool.js');
const { default: runsRouter } = await import('./runs.js');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/runs', runsRouter);
  return app;
}

async function postAction(runId, body, headers = {}) {
  const app = createApp();
  const server = createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  try {
    const res = await fetch(`http://127.0.0.1:${address.port}/api/runs/${runId}/actions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
  } finally {
    await new Promise((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
}

function baseState() {
  return {
    ...createInitialGameState(
      {
        name: 'Alex',
        avatar: 'student_boy',
        startCondition: 'FAMILY_SUPPORT',
        bio: 'Test',
      },
      [ALL_LIFE_GOALS[0]],
      4242
    ),
    rngState: 4242,
  };
}

describe('POST /api/runs/:id/actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects missing student token', async () => {
    const response = await postAction(1, {
      action: { type: 'STEP_MONTH' },
      expectedAge: 16,
      expectedMonth: 1,
      clientEngineVersion: '0.1.0',
      idempotencyKey: 'k1',
    });
    expect(response.status).toBe(401);
  });

  it('rejects when the student does not own the run', async () => {
    query
      .mockResolvedValueOnce([{ id: 10, alias: 'Fuchs', classroom_id: 1, session_token: 'tok' }])
      .mockResolvedValueOnce([
        {
          id: 99,
          membership_id: 11,
          game_state: JSON.stringify(baseState()),
          current_age: 16,
          is_game_over: 0,
          overall_score: null,
        },
      ]);

    const response = await postAction(
      99,
      {
        action: { type: 'STEP_MONTH' },
        expectedAge: 16,
        expectedMonth: 1,
        clientEngineVersion: '0.1.0',
        idempotencyKey: 'k-own',
      },
      { 'X-Student-Token': 'tok' }
    );
    expect(response.status).toBe(403);
  });

  it('applies STEP_MONTH, persists state, and replays idempotently', async () => {
    const state = baseState();
    const runRow = {
      id: 5,
      membership_id: 10,
      game_state: JSON.stringify(state),
      current_age: 16,
      is_game_over: 0,
      overall_score: null,
    };

    query
      // membership
      .mockResolvedValueOnce([{ id: 10, alias: 'Fuchs', classroom_id: 1, session_token: 'tok' }])
      // run
      .mockResolvedValueOnce([runRow])
      // audit miss
      .mockResolvedValueOnce([])
      // published events
      .mockResolvedValueOnce(ALL_LIFE_EVENTS.map((event) => ({ body_json: JSON.stringify(event) })))
      // content version
      .mockResolvedValueOnce([{ version: 3 }])
      // update run
      .mockResolvedValueOnce({ affectedRows: 1 })
      // insert audit
      .mockResolvedValueOnce({ insertId: 1 })
      // replay: membership
      .mockResolvedValueOnce([{ id: 10, alias: 'Fuchs', classroom_id: 1, session_token: 'tok' }])
      // replay: run
      .mockResolvedValueOnce([runRow])
      // replay: audit hit
      .mockResolvedValueOnce([]);

    const body = {
      action: { type: 'STEP_MONTH' },
      expectedAge: state.currentAge,
      expectedMonth: state.currentMonth,
      clientEngineVersion: '0.1.0',
      idempotencyKey: 'idem-1',
    };

    const first = await postAction(5, body, { 'X-Student-Token': 'tok' });
    expect(first.status).toBe(200);
    expect(first.data.nextState.currentMonth).not.toBe(state.currentMonth);
    expect(first.data.serverEngineVersion).toBe('0.1.0');
    expect(first.data.contentVersion).toBe(3);

    // Fix replay audit to return stored response
    const stored = first.data;
    query.mockReset();
    query
      .mockResolvedValueOnce([{ id: 10, alias: 'Fuchs', classroom_id: 1, session_token: 'tok' }])
      .mockResolvedValueOnce([runRow])
      .mockResolvedValueOnce([{ response_json: JSON.stringify(stored) }]);

    const second = await postAction(5, body, { 'X-Student-Token': 'tok' });
    expect(second.status).toBe(200);
    expect(second.data).toEqual(stored);
  });

  it('returns 409 on age/month mismatch', async () => {
    const state = baseState();
    query
      .mockResolvedValueOnce([{ id: 10, alias: 'Fuchs', classroom_id: 1, session_token: 'tok' }])
      .mockResolvedValueOnce([
        {
          id: 5,
          membership_id: 10,
          game_state: JSON.stringify(state),
          current_age: 16,
          is_game_over: 0,
          overall_score: null,
        },
      ])
      .mockResolvedValueOnce([]);

    const response = await postAction(
      5,
      {
        action: { type: 'STEP_MONTH' },
        expectedAge: 99,
        expectedMonth: 1,
        clientEngineVersion: '0.1.0',
        idempotencyKey: 'idem-mismatch',
      },
      { 'X-Student-Token': 'tok' }
    );
    expect(response.status).toBe(409);
  });

  it('returns 422 for an unknown event choice', async () => {
    const state = {
      ...baseState(),
      activeEvent: ALL_LIFE_EVENTS[0],
    };
    query
      .mockResolvedValueOnce([{ id: 10, alias: 'Fuchs', classroom_id: 1, session_token: 'tok' }])
      .mockResolvedValueOnce([
        {
          id: 5,
          membership_id: 10,
          game_state: JSON.stringify(state),
          current_age: state.currentAge,
          is_game_over: 0,
          overall_score: null,
        },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(ALL_LIFE_EVENTS.map((event) => ({ body_json: JSON.stringify(event) })));

    const response = await postAction(
      5,
      {
        action: {
          type: 'EVENT_CHOICE',
          eventId: ALL_LIFE_EVENTS[0].id,
          choiceId: 'nope',
        },
        expectedAge: state.currentAge,
        expectedMonth: state.currentMonth,
        clientEngineVersion: '0.1.0',
        idempotencyKey: 'idem-choice',
      },
      { 'X-Student-Token': 'tok' }
    );
    expect(response.status).toBe(422);
  });
});
