# Phase E2 — LLM Tips Default-On (report)

**Branch:** `feature/phase-e2-llm-tips-default-on`  
**Spec:** `docs/superpowers/specs/2026-08-26-phase-e2-llm-tips-default-on-design.md`

## Delivered

- Client requests tip enhancement by default (no `VITE_LLM_TIPS`)
- Store states: `tipSource`, `tipRequestStatus`, `canRetry` + retry action
- API client returns `{ enabled, tip }`; kill switch → static without retry noise
- Richer Event tip card: source labels, loading hint, retry, compact/expand
- Ops docs: Plesk checklist + `apps/api/.env.example` LLM kill switch notes

## Explicit non-goals

- Streaming
- Classroom override LLM rewrite
- New LLM provider infra

## Verification

Focused tip/API tests + full suite + player-web build on the feature branch.
