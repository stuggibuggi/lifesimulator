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

router.post('/enhance', async (req, res) => {
  const learningTip = typeof req.body?.learningTip === 'string' ? req.body.learningTip : '';

  if (process.env.LLM_TIPS_ENABLED !== 'true' || !process.env.LLM_API_URL) {
    return res.json(passthroughTip(learningTip));
  }

  const controller = new AbortController();
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
        eventId: req.body?.eventId,
        choiceId: req.body?.choiceId,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      return res.json(passthroughTip(learningTip, true));
    }

    const data = await response.json().catch(() => ({}));
    const enhancedTip = typeof data.tip === 'string' && data.tip.trim() ? data.tip : learningTip;
    return res.json({ enabled: true, tip: enhancedTip });
  } catch (err) {
    console.warn('[tips/enhance] LLM passthrough fallback:', err.message);
    return res.json(passthroughTip(learningTip, true));
  } finally {
    clearTimeout(timeout);
  }
});

export default router;
