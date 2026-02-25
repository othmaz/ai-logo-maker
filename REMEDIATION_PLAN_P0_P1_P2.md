# AI Logo Maker — Remediation Plan (P0 / P1 / P2)

## Goal
Stabilize security + billing correctness first, then harden reliability, then improve maintainability without breaking growth momentum.

## Working Rules
1. **No feature work until P0 is green.**
2. Ship in small PR-sized batches with runtime verification after each batch.
3. Keep production behavior stable; no aesthetic rewrites during remediation.

---

## Phase 0 — Setup (same day, 30-60 min)

### Deliverables
- Create branch: `chore/p0-security-billing-hardening`
- Add a lightweight tracking checklist in this file (or project board)
- Add a baseline smoke test script for critical endpoints used in this plan

### Verification
- `npm run build` passes
- `npm run validate-deployment` passes

---

## P0 — Critical (execute first)

## P0.1 Server-side identity verification (auth middleware)

### Tasks
- Add Clerk token verification middleware on server.
- Derive authenticated user ID from token server-side.
- Remove trust in client-provided `clerkUserId` for protected endpoints.
- Update protected endpoints to use `req.auth.userId` (or equivalent):
  - `/api/users/profile`
  - `/api/users/subscription`
  - `/api/logos/*`
  - `/api/generations/*`
  - `/api/analytics/*`
  - `/api/create-payment-intent-with-user`

### Acceptance criteria
- Requests with spoofed `clerkUserId` are rejected/ignored.
- Authenticated user can still access own data and premium formats.

---

## P0.2 Credit model contract unification (`credits_used`)

### Tasks
- Standardize usage field across client/server/DB on `credits_used`.
- Replace all `generations_used` reads in client UI + logic.
- Keep one source of truth for free-tier counters.

### Acceptance criteria
- Dashboard and usage gate show the same number.
- Free-tier exhaustion behavior is deterministic for signed-in users.

---

## P0.3 Migration pipeline repair

### Tasks
- Fix `server/lib/migrate.js` to write `credits_used` (not `generations_used`).
- Normalize localStorage migration payload keys (`creditsUsed` vs `generationsUsed`).
- Add a compatibility adapter so old clients still migrate cleanly.

### Acceptance criteria
- Migration from localStorage updates DB without SQL errors.
- No silent data drop in migration path.

---

## P0.4 Refinement correctness and concurrency safety

### Tasks
- Declare `let contents` in `callGeminiAPI`.
- Send **all** selected reference images (not only first one).
- Fix client MIME consistency (PNG bytes => `image/png`).
- Keep fallback behavior for missing/failed references.

### Acceptance criteria
- Refinement request logs confirm multiple images are received and passed through.
- Output quality materially reflects selected logo references.
- No shared/global state leakage under concurrent requests.

---

## P0 Exit Gate (must all pass)
- Build ✅
- Deployment validator ✅
- Manual E2E smoke:
  1. Anonymous generation
  2. Signed-in generation + usage decrement
  3. Payment success + premium unlock
  4. Premium-only format endpoints reject non-premium
  5. Refinement with 2 selected logos uses both references

---

## P1 — High impact hardening

## P1.1 Security and abuse controls

### Tasks
- Restrict CORS to known origins (prod + localhost dev).
- Add rate limiting for expensive endpoints:
  - `/api/generate-multiple`
  - `/api/upscale`
  - `/api/logos/:id/vectorize`
  - `/api/logos/:id/remove-background`
- Remove sensitive key-shape logs.

### Acceptance criteria
- Unexpected origins blocked.
- Burst abuse attempts throttled.
- No secret-like values printed in prod logs.

---

## P1.2 Reliability bugs and script integrity

### Tasks
- Fix SQL result handling bug in background-removal fallback (`{ rows }` pattern).
- Fix health-check endpoint from `/api/generate` to `/api/generate-multiple` (or add explicit health route).
- Remove dead state paths in legacy app (`showDashboard`, `showPaymentSuccess` leftovers).
- Remove global `window._logo4kUrl` flow state from DownloadModal.

### Acceptance criteria
- Background removal fallback works when `logoUrl` missing.
- Health-check result reflects real server state.
- Download flow works in repeated/parallel sessions without cross-contamination.

---

## P1.3 Product/legal consistency

### Tasks
- Unify all free-tier messaging to actual policy (currently 15 credits).
- Update ToS/upgrade modal copy and any old "3 generations" strings.

### Acceptance criteria
- No conflicting credit values in UI/legal modals.

---

## P1 Exit Gate
- Lint errors reduced significantly (target: <= 10 errors)
- All premium format flows pass manual check
- Health-check script passes against deployed env

---

## P2 — Maintainability and quality

## P2.1 Architecture decomposition

### Tasks
- Split `App.tsx` by concerns:
  - generation hook/service
  - payment flow hook
  - usage gate hook
  - page sections/components
- Split `server/server.js` into route modules:
  - `routes/generation`
  - `routes/payments`
  - `routes/users`
  - `routes/logos`
  - `routes/analytics`

### Acceptance criteria
- `App.tsx` < 1200 LOC
- `server.js` becomes thin bootstrap file

---

## P2.2 Quality gates

### Tasks
- Drive lint to green.
- Tighten TypeScript types (`DatabaseContext.d.ts`, remove broad `any`).
- Remove dead backup artifacts from source paths.

### Acceptance criteria
- `npm run lint` fully green
- No `any` in core state contracts unless explicitly justified

---

## P2.3 Compliance/docs/devex

### Tasks
- Gate analytics loading by cookie consent state.
- Expand `.env.example` to include all required vars.
- Update `docs/README.md` to current architecture and flows.

### Acceptance criteria
- Consent toggle controls analytics loading behavior.
- Fresh setup from docs works without hidden variables.

---

## Suggested Timeline

### Day 1
- P0.1 + P0.2 + P0.3

### Day 2
- P0.4 + P0 exit gate testing

### Day 3
- P1.1 + P1.2

### Day 4
- P1.3 + lint reduction start

### Day 5+
- P2 decomposition in controlled slices

---

## Execution Strategy
- Open one PR per P0 item (or 2 tightly scoped PRs max).
- After each PR:
  - `npm run build`
  - `npm run validate-deployment`
  - targeted runtime smoke
- Deploy only after P0 exit gate is fully green.
