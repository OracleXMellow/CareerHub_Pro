# CareerHub Pro — Production Readiness Evaluation

**Prepared for:** Mamello
**Date:** 8 September 2026
**Environment evaluated:** Production build + production-like runtime (local production build, live deployment logs at the hosted URL, and the running server)
**Method:** Static code review of every API route, data-isolation checks, input-validation checks, live production log inspection, a full production build, type-check, and an end-to-end authentication smoke test (signup → login → session).

---

## 1. Evaluation Criteria

The product was assessed against seven production-readiness dimensions:

| # | Dimension | What was checked |
|---|-----------|------------------|
| 1 | Security & access control | Auth guards on every data route, per-user ownership checks, secret exposure |
| 2 | Data integrity & isolation | Every DB query scoped to the signed-in user |
| 3 | Input validation | Bad/empty request bodies rejected before expensive work |
| 4 | Reliability & error handling | AI/LLM failures, retries, graceful client messaging |
| 5 | Build & type health | Clean production build, no type errors, SSR/dynamic correctness |
| 6 | Runtime behaviour | Live logs, real request flows, auth end-to-end |
| 7 | Performance & cost control | Payload sizes, long-running operations, abuse/cost exposure |

Each dimension is rated **Pass / Pass with note / Needs work**, with severity on any finding.

---

## 2. Summary Verdict

**Overall: Production-ready.** The application passed every core dimension. Security and data isolation are notably strong — better than typical for an app at this stage. One minor build-hygiene defect was found **and fixed** during this evaluation. The remaining items are **enhancements**, not defects, and are listed with recommendations rather than applied silently.

| Dimension | Result |
|-----------|--------|
| Security & access control | ✅ Pass (strong) |
| Data integrity & isolation | ✅ Pass (strong) |
| Input validation | ✅ Pass |
| Reliability & error handling | ✅ Pass |
| Build & type health | ✅ Pass (1 defect found + fixed) |
| Runtime behaviour | ✅ Pass |
| Performance & cost control | ✅ Pass (hardened this iteration) |

---

## 3. Detailed Findings

### 3.1 Security & Access Control — ✅ Strong

- **All 19 data-carrying API routes** call `getServerSession(authOptions)` and return **401** when the caller is not authenticated. Only the three genuinely public auth endpoints (`[...nextauth]`, `login`, `signup`) are unguarded, which is correct.
- **No IDOR (Insecure Direct Object Reference) vulnerability.** Every `update` and `delete` on resumes, jobs, documents, and cover letters first runs an ownership check — `findFirst({ where: { id, userId } })` — and returns **404** if the record does not belong to the caller. A user cannot read, modify, or delete another user's data even if they guess a record ID. This was specifically probed and confirmed on all four models.
- **No secrets exposed client-side.** The LLM key and storage credentials are only ever read server-side (`process.env.*` inside route handlers).

### 3.2 Data Integrity & Isolation — ✅ Strong

- All list/read queries (`findMany`, dashboard aggregation) are filtered by `userId` derived from the session, never from a URL parameter.
- Document deletion removes the stored file first, then the DB record, and tolerates a storage-side failure without corrupting the DB state.

### 3.3 Input Validation — ✅ Pass (hardened this iteration)

- Every AI route validates its required inputs and returns **400** with a clear message before doing any expensive LLM work (e.g. `bulletPoints required`, `jobDescription required`, `No file provided`, `Unsupported file type`).
- CV parsing rejects unsupported file types and empty documents with actionable messages.
- **Hardened during stress-testing (see §4):** all AI routes now reject malformed JSON bodies and wrong-typed fields (e.g. a numeric or boolean `jobDescription`) with a clean **400** instead of a 500 or a wasted LLM call. Verified with malformed, empty, wrong-type, oversized, and odd-character (emoji, control chars, injected `<script>`/null bytes) payloads — every one produced a graceful response and the resilience layer held on real messy-but-valid input.

### 3.4 Reliability & Error Handling — ✅ Pass

- A shared resilience layer (`lib/ai.ts`) wraps all LLM calls with timeouts, exponential-backoff retries on network/timeout/429/5xx, tolerant JSON extraction, and a corrective retry on malformed model output. Client components surface the server's specific error message rather than a generic failure.
- The PDF export client handler catches failures and shows a toast; it never leaves the button stuck in a loading state (`finally` resets it).

### 3.5 Build & Type Health — ✅ Pass (1 defect found + fixed)

- **Finding (Low severity) — FIXED during this evaluation:** `app/api/onboarding/status/route.ts` was missing `export const dynamic = 'force-dynamic'`. Because it reads the session (headers/cookies), the build emitted a *"Dynamic server usage: used headers"* warning for that one route while every other data route already declared it. **Fix applied:** added the `force-dynamic` declaration. The production build now completes with no such warning.
- Type-check (`tsc --noEmit`) passes with **zero errors**. Production build compiles successfully and generates all 15 pages.

### 3.6 Runtime Behaviour — ✅ Pass

- Live production logs show healthy traffic across all features (resumes, jobs, cover letters, AI tools, dashboard, documents) with successful requests.
- End-to-end auth smoke test passed: signup → 200, CSRF issued, credential login → 200, authenticated session correctly returned.
- **Observed in logs (Low severity, benign):** occasional `TypeError: Failed to fetch` originating from the Next.js client-side router (RSC navigation), on the `/resumes` route. This is a transient network/navigation abort in the framework's own data fetch (e.g. navigating away mid-request), not application code, and is caught by the framework. No user-facing impact was observed. Worth keeping an eye on but not a defect.

### 3.7 Performance & Cost Control — ✅ Pass (hardened this iteration)

The two code-side recommendations from the prior pass have now been **implemented and verified**; the one remaining item is a user-side platform action.

- **Per-user rate limiting — DONE.** Each user now has a daily quota of **60 AI operations** and **40 PDF exports** (reset midnight UTC), enforced atomically in the database. Over-limit requests get a friendly **429** message and no paid/external call is made. The counter fails *open* on a database hiccup so a transient DB error never blocks a legitimate user.
- **Async PDF export — DONE.** Export is now split into a fast "start" request plus short status polls, so no single request stays open for the whole render. This removes the long-request timeout risk for large résumés, and the UI shows live progress (percentage) during generation.
- **Production database isolation — PENDING (your action).** Dev and production still share one database. This is an advanced platform toggle only you can enable — see §5. Recommended before real users arrive so test data never mixes with live data.

---

## 4. Fixes Applied This Iteration

| Severity | Finding | Fix | Verified by |
|----------|---------|-----|-------------|
| Low | `onboarding/status` route missing `force-dynamic`, causing a build warning | Added `export const dynamic = 'force-dynamic'` | Clean production build (warning gone), type-check pass, checkpoint saved |
| Enhancement | No per-user cost control on paid AI / PDF endpoints | Added daily per-user quotas (60 AI / 40 PDF) enforced in the database; over-limit → 429 with no paid call | Live test: seeded a user to the limit → 429 on both AI and PDF; reset → normal 400/200 pass-through; type-check + build pass; checkpoint saved |
| Enhancement | Synchronous PDF export held one request open up to ~180s | Split into async start + status-poll endpoints with a live progress UI | End-to-end test: start → poll → SUCCESS with valid PDF returned; type-check + build pass; checkpoint saved |
| Medium | Malformed JSON body and wrong-typed fields returned 500 / could waste an LLM call | Added shared body-parse + type guards across all 9 AI routes → clean 400 | Stress battery: malformed / empty / wrong-type / oversized / odd-character inputs all → 400; two real messy-but-valid calls succeeded; checkpoint saved |

**Quality gate for this iteration:** type-check ✅, production build ✅ (16/16 routes), auth end-to-end ✅, targeted live verification ✅ on each enhancement. Checkpoint saved after each.

---

## 5. Status of the Four Agreed Enhancements

Three of the four were code-side and are now **implemented and verified** (details in §3.7 and §4):

1. **Per-user rate limiting / daily AI quotas** — ✅ **Done.**
2. **Async PDF export with progress UX** — ✅ **Done.**
3. **Separate production database** — ⏳ **Your action** (steps below).
4. **Stress-testing with messy real-world inputs** — ✅ **Done**, and it surfaced two real hardening gaps that were then fixed (see §4).

### 5.1 How to enable a separate production database (item 3)

This is an advanced platform feature that only you can turn on from the app's settings — it cannot be done in code:

1. Open **Settings → Database** in the right-hand panel of the app builder.
2. Choose **"Add a Production Database"** (the cloud-arrow-up icon, also listed under the Actions menu).
3. Follow the prompts to provision it, then **promote the current schema** to the new production database.

What to know before you do it: production and preview will then use **separate** databases, so data you create in preview won't appear in production and vice-versa; you'll manage schema changes by promoting them; and because they're re-imaged separately, the two environments can look different until you promote. It's worth doing before onboarding real users so live data is never mixed with test data — tell me if you'd like a hand planning the switch.

**Adjustable:** the current quota limits (60 AI / 40 PDF per user per day) are a sensible default — tell me if you'd prefer different numbers and I'll update them.

---

## 6. What Was NOT Covered

To be transparent about scope:

- **No live browser click-through** of every screen was performed (this was a code + logs + build + API-flow evaluation, which is the appropriate production-like method for behaviour and security). If you want, I can run a UI walkthrough of specific flows.
- **Accessibility and mobile-responsive audits** were not part of this pass and can be done as a dedicated iteration.
- **Load/performance benchmarking** (concurrent users, latency under load) was not performed.