import { Router } from 'express';

const router = Router();
const DEFAULT_TIMEOUT_MS = 1500;

function passthroughTip(learningTip, enabled = false) {
  return { enabled, tip: learningTip };
}

function parseTimeoutMs(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TIMEOUT_MS;
}

function isEnabledFlag(value) {
  return value === 'true' || value === '1';
}

function optionalString(value) {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, 120) : undefined;
}

function optionalAge(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 && parsed <= 120 ? parsed : undefined;
}

function anonymousTipContext(body) {
  return {
    eventId: optionalString(body?.eventId),
    choiceId: optionalString(body?.choiceId),
    age: optionalAge(body?.age),
    scenarioId: optionalString(body?.scenarioId),
  };
}

router.post('/enhance', async (req, res) => {
  const learningTip = typeof req.body?.learningTip === 'string' ? req.body.learningTip : '';

  if (!isEnabledFlag(process.env.LLM_TIPS_ENABLED) || !process.env.LLM_API_URL) {
    return res.json(passthroughTip(learningTip));
  }

  const controller = new AbortController();
  const startedAt = Date.now();
  const timeout = setTimeout(
    () => controller.abort(),
    parseTimeoutMs(process.env.LLM_TIPS_TIMEOUT_MS)
  );

  try {
    const response = await fetch(process.env.LLM_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        learningTip,
        ...anonymousTipContext(req.body),
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      console.warn('[tips/enhance] LLM fallback', {
        status: response.status,
        latencyMs: Date.now() - startedAt,
      });
      return res.json(passthroughTip(learningTip, true));
    }

    const data = await response.json().catch(() => ({}));
    const enhancedTip = typeof data.tip === 'string' && data.tip.trim() ? data.tip : learningTip;
    console.info('[tips/enhance] LLM success', { latencyMs: Date.now() - startedAt });
    return res.json({ enabled: true, tip: enhancedTip });
  } catch (err) {
    console.warn('[tips/enhance] LLM fallback', {
      reason: err?.name === 'AbortError' ? 'timeout' : 'error',
      latencyMs: Date.now() - startedAt,
    });
    return res.json(passthroughTip(learningTip, true));
  } finally {
    clearTimeout(timeout);
  }
});

export default router;
