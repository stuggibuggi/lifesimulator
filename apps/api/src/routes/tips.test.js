import express from 'express';
import { createServer } from 'node:http';
import { afterEach, describe, expect, it, vi } from 'vitest';
import tipsRouter from './tips.js';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/tips', tipsRouter);
  return app;
}

async function postEnhance(body) {
  const app = createApp();
  const server = createServer(app);

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();

  try {
    const res = await fetch(`http://127.0.0.1:${address.port}/api/tips/enhance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return { status: res.status, data };
  } finally {
    await new Promise((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
}

describe('POST /api/tips/enhance', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('passes through the learning tip when disabled', async () => {
    vi.stubEnv('LLM_TIPS_ENABLED', 'false');

    const response = await postEnhance({ learningTip: 'Bleib beim Budget.' });

    expect(response.status).toBe(200);
    expect(response.data).toEqual({ enabled: false, tip: 'Bleib beim Budget.' });
  });

  it('passes through the learning tip when enabled without an API URL', async () => {
    vi.stubEnv('LLM_TIPS_ENABLED', 'true');
    vi.stubEnv('LLM_API_URL', '');

    const response = await postEnhance({ learningTip: 'Vergleiche Zinsen.' });

    expect(response.status).toBe(200);
    expect(response.data).toEqual({ enabled: false, tip: 'Vergleiche Zinsen.' });
  });

  it('returns an enhanced tip when the optional provider responds', async () => {
    const realFetch = globalThis.fetch;
    vi.stubEnv('LLM_TIPS_ENABLED', 'true');
    vi.stubEnv('LLM_API_URL', 'https://llm.example.test/tips');
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, options) => {
      if (String(url).startsWith('http://127.0.0.1')) {
        return realFetch(url, options);
      }
      return {
        ok: true,
        json: async () => ({ tip: 'Erweiterter Hinweis.' }),
      };
    });

    const response = await postEnhance({
      learningTip: 'Kurzfassung.',
      eventId: 'EVT_TEST',
      choiceId: 'c_test',
      age: 17,
      scenarioId: 'SCENARIO_AUSBILDUNG',
      alias: 'Alex',
      email: 'alex@example.test',
      name: 'Alex Beispiel',
    });

    expect(response.status).toBe(200);
    expect(response.data).toEqual({ enabled: true, tip: 'Erweiterter Hinweis.' });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://llm.example.test/tips',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          learningTip: 'Kurzfassung.',
          eventId: 'EVT_TEST',
          choiceId: 'c_test',
          age: 17,
          scenarioId: 'SCENARIO_AUSBILDUNG',
        }),
      })
    );
  });

  it('falls back to passthrough when the optional provider fails', async () => {
    const realFetch = globalThis.fetch;
    vi.stubEnv('LLM_TIPS_ENABLED', 'true');
    vi.stubEnv('LLM_API_URL', 'https://llm.example.test/tips');
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, options) => {
      if (String(url).startsWith('http://127.0.0.1')) {
        return realFetch(url, options);
      }
      return { ok: false, json: async () => ({}) };
    });

    const response = await postEnhance({ learningTip: 'Original bleibt.' });

    expect(response.status).toBe(200);
    expect(response.data).toEqual({ enabled: true, tip: 'Original bleibt.' });
  });
});
