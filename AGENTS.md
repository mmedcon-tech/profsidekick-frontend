# AGENTS.md — ProfSidekick Frontend

> Cross-reference: See [backend-main/AGENTS.md](../backend-main/AGENTS.md) for backend conventions.
> The shared **API contract** (§5) and **commit/PR standards** (§6) are authoritative in this file and referenced from the backend.

---

## 1. Project Overview

ProfSidekick is an AI-powered teaching assistant platform. This repository is the **frontend**: a Next.js 15 application that:

- Lets teachers upload presentations (PDF/PPTX) and configure interactive classes
- Delivers voice-based AI tutoring via the OpenAI Realtime API over WebRTC
- Provides a dashboard for managing courses, sessions, prompts, and course materials
- Proxies all backend calls through Next.js API route handlers (BFF pattern), keeping credentials server-side

The frontend communicates with the backend described in [backend-main/AGENTS.md](../backend-main/AGENTS.md) via HTTP REST. It communicates with OpenAI directly for voice via WebRTC using ephemeral tokens vended by the backend.

---

## 2. Repository Structure

```
profsidekick-frontend-main/
├── public/                          # Static assets — do not add secrets here
│   ├── audio/voice_samples/         # Sample voice clips for UI demos
│   ├── images/                      # Logos and team photos
│   └── prompts/                     # Baseline AI prompt text files (ai_prompt.txt, core_prompt.txt)
└── src/
    ├── app/                         # Next.js App Router root
    │   ├── (auth)/                  # Route group: login, register — unauthenticated access
    │   ├── (dashboard)/             # Route group: all protected teacher/student routes
    │   ├── about/                   # Public about page
    │   ├── contact/                 # Public contact page
    │   ├── api/                     # Next.js route handlers — BFF proxy layer only, no business logic
    │   │   ├── chat/completions/    # Proxies to OpenAI chat completions
    │   │   ├── prompts/             # CRUD for saved prompts
    │   │   └── sessions/            # Session & session-run CRUD + ephemeral token
    │   ├── globals.css              # Global CSS: Tailwind base + CSS custom properties
    │   ├── layout.tsx               # Root layout — context providers are mounted here
    │   ├── page.tsx                 # Public landing page
    │   ├── error.tsx                # Root error boundary
    │   ├── loading.tsx              # Root loading state
    │   └── not-found.tsx            # 404 page
    ├── components/                  # React components — presentational, no direct API calls
    │   ├── auth/                    # ProtectedRoute redirect guard
    │   ├── courses/                 # CourseMaterials, CourseSettingsTabs
    │   ├── layout/                  # ConditionalHeader, NavigationHeader
    │   ├── sessions/                # ClassCreation, UnifiedDashboard, SessionRuns, SlidesPreview,
    │   │                            #   AISettings, PromptCreationModal, PromptLibrary, etc.
    │   └── teaching/                # TeachingInterface, BottomToolbar, Transcript, Events, GuardrailChip
    ├── constants/                   # Static configuration — AI agent definitions live here
    │   ├── teachingAssistant.ts     # Primary AgentConfig for the teaching assistant
    │   ├── simpleHandoff.ts         # Reference example for multi-agent handoff pattern
    │   └── utils.ts                 # injectTransferTools() helper
    ├── contexts/                    # React context providers
    │   ├── AuthContext.tsx          # Auth state: login / logout / refresh / checkAuth
    │   ├── EventContext.tsx         # Realtime API event log (debugging tool)
    │   └── TranscriptContext.tsx    # Conversation transcript state
    ├── hooks/                       # Custom React hooks — data fetching and event handling
    │   ├── useCourses.ts
    │   ├── useHandleServerEvent.ts  # Core Realtime API event handler — critical path
    │   ├── usePrompts.ts
    │   ├── useSessionRuns.ts
    │   └── useUserSessions.ts
    ├── lib/                         # Pure utility functions — no React, no module-level side effects
    │   ├── config.ts                # Backend URL resolution from env vars
    │   ├── realtimeConnection.ts    # WebRTC + RTCPeerConnection setup for OpenAI Realtime
    │   ├── audioUtils.ts            # WAV encoding helpers
    │   └── tagUtils.ts              # Comma-separated tag string helpers
    └── types/                       # TypeScript type definitions
        ├── types.ts                 # All shared types — primary source of truth
        ├── materials.ts             # Course material types
        └── index.ts                 # Re-exports
```

### Directories That Must Not Be Modified Without Justification

| Directory / File | Reason |
|---|---|
| `src/app/api/` | BFF proxy layer — changes here must be mirrored in the §5 API contract |
| `src/lib/realtimeConnection.ts` | WebRTC negotiation — breakage silently kills voice sessions |
| `src/constants/teachingAssistant.ts` | Tool names must stay in sync with `useHandleServerEvent.ts` |
| `src/app/layout.tsx` | Root layout changes affect all pages and context providers |

---

## 3. Development Standards

### 3.1 Naming Conventions

| Artifact | Convention | Example |
|---|---|---|
| React components | PascalCase `.tsx` | `TeachingInterface.tsx` |
| Custom hooks | camelCase, `use` prefix, `.ts` | `useSessionRuns.ts` |
| Context files | PascalCase, `Context` suffix, `.tsx` | `AuthContext.tsx` |
| Utility / lib files | camelCase `.ts` | `realtimeConnection.ts` |
| Constants / config | camelCase `.ts` | `teachingAssistant.ts` |
| Type definition files | camelCase `.ts` | `materials.ts` |
| TypeScript interfaces / types | PascalCase | `SessionDetails`, `AgentConfig` |
| TypeScript enums | PascalCase, SCREAMING_SNAKE_CASE members | `SessionStatus.DISCONNECTED` |
| Next.js API route dirs | kebab-case segments | `sessions/[sessionId]/run/start/` |
| CSS classes | Tailwind utility classes inline; no custom names outside `globals.css` | |

### 3.2 TypeScript

- `strict: true` is enabled in `tsconfig.json` — do not disable it.
- Prefer explicit return types on all exported functions.
- `@typescript-eslint/no-explicit-any` is administratively disabled in `eslint.config.mjs`. That is not an invitation to use `any` — use `unknown` with type narrowing, or define a proper interface.
- Use `zod` for runtime validation of external data (API responses, user form inputs).
- All shared types belong in `src/types/types.ts`. Add narrowly-scoped types co-located with their component only when they are never reused.

### 3.3 React & Next.js

- Use the App Router (`app/` directory). Do not use the Pages Router.
- Route groups `(auth)` and `(dashboard)` do not add URL segments; they exist for layout separation.
- All data fetching goes through custom hooks in `src/hooks/`. Components must not call `fetch` or any API client directly.
- API calls from the browser must go through `src/app/api/` route handlers — never hit the backend directly from client-side code.
- Context providers are mounted in `src/app/layout.tsx`. Add new providers there; do not create ad-hoc providers inside component trees.
- Apply `'use client'` only when a component requires browser APIs or React state. Prefer server components where there is no interactivity.

### 3.4 Styling

- Tailwind CSS only. Do not introduce a CSS-in-JS library.
- CSS custom properties (`--background`, `--foreground`) are defined in `globals.css`. Reference them in Tailwind via `bg-[var(--background)]`.
- Use Tailwind's responsive prefixes (`sm:`, `md:`, `lg:`, `xl:`) for all breakpoints.

### 3.5 AI Agent Configuration

- All `AgentConfig` objects must be declared in `src/constants/`. Never inline agent configs inside components or hooks.
- Tool names in `AgentConfig.tools[]` must exactly match the keys in `AgentConfig.toolLogic` and the `case` branches handled in `useHandleServerEvent.ts`.
- When adding a new tool: update the `tools` array, `toolLogic`, and the event handler atomically in a single commit.

### 3.6 Anti-Patterns

- **Do not call `fetch` directly in components.** Use hooks or route handlers.
- **Do not expose `OPENAI_API_KEY` to the browser.** It must stay server-side. Never create a `NEXT_PUBLIC_OPENAI_API_KEY` variable.
- **Do not bypass `ProtectedRoute`.** All dashboard pages must render inside `ProtectedRoute`.
- **Do not import from `src/app/api/` in client components.** Route handlers are server-only.
- **Do not add business logic to API route handlers.** They are a thin proxy; logic belongs in the backend or in hooks.
- **Do not use `localStorage` for auth tokens outside `AuthContext`.** The context is the single owner.

---

## 4. Testing Requirements

**Current state: no tests exist in this repository.** Every new feature and every bug fix must ship with tests before the PR can merge.

### Testing Stack

Install:
```bash
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom
```

Add to `package.json`:
```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

### Test File Locations

Co-locate tests with the file under test:

| Source file | Test file |
|---|---|
| `src/lib/audioUtils.ts` | `src/lib/audioUtils.test.ts` |
| `src/hooks/useCourses.ts` | `src/hooks/useCourses.test.ts` |
| `src/components/sessions/ClassCreation.tsx` | `src/components/sessions/ClassCreation.test.tsx` |

### Required Test Types

| Type | Scope | Examples |
|---|---|---|
| Unit | Pure utility functions in `src/lib/` | `tagUtils` add/remove, `config` URL building, `audioUtils` encoding |
| Unit | Agent tool logic in `src/constants/` | `nextSlide`, `goToSlide` return values and edge cases |
| Component | Rendered output and user interactions | Form submission in `ClassCreation`; voice controls in `TeachingInterface` |
| Hook | State transitions and API call behaviour | `useCourses` loading / error / success states |
| Integration | Auth flow end-to-end | `AuthContext` + `ProtectedRoute` redirect on unauthenticated access |

### Mandatory Coverage — Critical Path Files

These files **must** have tests before any PR touching them is merged:

- `src/lib/realtimeConnection.ts`
- `src/hooks/useHandleServerEvent.ts`
- `src/contexts/AuthContext.tsx`
- `src/constants/teachingAssistant.ts`
- Any new file added to `src/app/api/`

Run before every commit:
```bash
npm test
```

---

## 5. API Contract (Frontend ↔ Backend)

> This section is the **authoritative reference** for the shared interface. The backend AGENTS.md references this section.

### Base URL

Resolved at runtime by `src/lib/config.ts`:

```
NEXT_PUBLIC_BACKEND_URL   # e.g. https://api.profsidekick.com  (no trailing slash)
NEXT_PUBLIC_IS_LOCAL      # "true" → use http://localhost:8000
```

`NEXT_PUBLIC_BACKEND_URL` must not have a trailing slash. `config.getApiUrl()` prepends `/` — double slashes break URL resolution.

### Authentication

All authenticated requests carry:

```
Authorization: Bearer <jwt_token>
```

The token is issued by `POST /api/auth/login` and stored in `localStorage` by `AuthContext`. It expires in 24 hours. Refresh via `POST /api/auth/refresh`.

### Error Response Shape

```json
{ "detail": "Human-readable message or structured object" }
```

Always check `response.ok` and read `detail` for user-facing messages. Do not assume a `message` key.

### Endpoint Inventory

| Method | Backend Path | Auth | Frontend Caller |
|---|---|---|---|
| POST | `/api/auth/register` | No | Auth pages (direct backend via `config.getApiUrl`) |
| POST | `/api/auth/login` | No | BFF `POST /api/auth/login` → `AuthContext.login()` |
| GET | `/api/auth/verify-token` | Yes | BFF `GET /api/auth/verify` → `AuthContext.checkAuth()` |
| POST | `/api/auth/refresh` | Yes | BFF `POST /api/auth/refresh` → `AuthContext.refreshToken()` |
| POST | `/api/auth/logout` | Yes | BFF `POST /api/auth/logout` → `AuthContext.logout()` |
| GET | `/api/sessions` | Yes | `useUserSessions` |
| POST | `/api/sessions/create` | Yes | `ClassCreation` |
| GET | `/api/sessions/{id}` | Yes | `TeachingInterface` |
| POST | `/api/sessions/{id}/update` | Yes | `AISettings` |
| GET | `/api/sessions/{id}/runs` | Yes | `useSessionRuns` |
| POST | `/api/sessions/{id}/run/start` | Yes | `TeachingInterface` |
| POST | `/api/sessions/{id}/run/{runId}/stop` | Yes | `TeachingInterface` |
| GET | `/api/session/ephemeral` | Yes | `TeachingInterface` (Realtime token) |
| GET | `/api/prompts` | Yes | `usePrompts` |
| POST | `/api/prompts` | Yes | `PromptCreationModal` |
| PUT | `/api/prompts/{id}` | Yes | `PromptLibrary` |
| DELETE | `/api/prompts/{id}` | Yes | `PromptLibrary` |
| GET | `/api/courses` | Yes | `useCourses` |
| POST | `/api/courses` | Yes | `UnifiedDashboard` |
| GET | `/api/courses/{id}` | Yes | `useCourses` |
| PUT | `/api/courses/{id}` | Yes | `useCourses` |
| DELETE | `/api/courses/{id}` | Yes | `useCourses` |
| GET | `/api/billing/balance` | Yes | `useBilling` |
| POST | `/api/billing/redeem` | Yes | `billing/redeem/page.tsx` |
| POST | `/api/billing/add-credits` | Yes | `billing/add-credits/page.tsx` |
| GET | `/api/billing/usage` | Yes | `billing/usage/page.tsx` |
| POST | `/api/admin/billing/access-codes` | Admin | Admin tooling only |
| GET | `/api/admin/billing/access-codes` | Admin | Admin tooling only |
| PATCH | `/api/admin/billing/access-codes/{id}/deactivate` | Admin | Admin tooling only |
| GET | `/api/admin/billing/pricing/{op_type}` | Admin | Admin tooling only |
| PATCH | `/api/admin/billing/pricing/{op_type}` | Admin | Admin tooling only |

Admin endpoints require `X-Admin-Secret: <value>` header instead of JWT Bearer. The secret is set via `ADMIN_SECRET` env var on the backend. Frontend never calls these directly.

### Schema Change Protocol

1. Update TypeScript types in `src/types/types.ts` first.
2. Update the affected hook or component.
3. Update the table above if the path or method changes.
4. Ensure the backend `AGENTS.md` is updated in the same PR.

---

## 6. Git and PR Standards

### Commit Message Format

```
<type>(<scope>): <short description>

[optional body — explain WHY, not WHAT]
```

**Types:** `feat`, `fix`, `chore`, `refactor`, `test`, `docs`, `style`

**Scope:** the component or area changed, e.g. `teaching`, `auth`, `api`, `hooks`, `contexts`

```
feat(teaching): add mute toggle to voice controls
fix(auth): handle 401 during token refresh without infinite loop
test(hooks): add useCourses fetch error state coverage
chore(deps): bump openai to 4.78.0
```

### Branch Naming

```
<type>/<short-description>
```

Examples: `feat/slide-reorder`, `fix/auth-refresh-loop`, `chore/upgrade-nextjs`

### PR Merge Checklist

A PR is not ready to merge until all items are checked:

- [ ] All existing tests pass (`npm test`)
- [ ] New tests written for all new code (§4)
- [ ] No ESLint errors (`npm run lint`)
- [ ] TypeScript compiles cleanly (`npx tsc --noEmit`)
- [ ] No secrets committed (`OPENAI_API_KEY`, credentials, etc.)
- [ ] API contract table (§5) updated if endpoints changed
- [ ] Manually tested in browser for any UI change

---

## 7. Agent Workflow Checklist

Before marking any task done:

- [ ] **Code written** — feature or fix implemented
- [ ] **Types updated** — `src/types/types.ts` reflects any new shapes
- [ ] **ESLint clean** — `npm run lint` exits 0
- [ ] **TypeScript clean** — `npx tsc --noEmit` exits 0
- [ ] **Tests written** — new logic has test coverage (§4)
- [ ] **Tests passing** — `npm test` exits 0
- [ ] **API contract** — §5 updated if any endpoint changed
- [ ] **No secrets** — no API keys or credentials in committed files
- [ ] **Manual smoke test** — for UI changes, verified in browser with backend running
- [ ] **No regressions** — all previously passing tests still pass

---

## 8. Known Constraints and Gotchas

1. **ESLint rules intentionally disabled.** `@typescript-eslint/no-explicit-any` and `react-hooks/exhaustive-deps` are globally off in `eslint.config.mjs`. Do not rely on ESLint to catch these — review manually.

2. **No Prettier config.** Formatting is not enforced by tooling. If adding Prettier, match the existing style and do not reformat the whole codebase in a feature PR.

3. **BFF proxy pattern.** Browser traffic hits `src/app/api/` route handlers first. The backend URL and JWT forwarding happen server-side. Do not add CORS headers or backend credentials in client-side code.

4. **WebRTC requires HTTPS in production.** `getUserMedia()` in `realtimeConnection.ts` fails on non-localhost HTTP. Local dev on `http://localhost:3000` is fine; staging and production must be HTTPS.

5. **Ephemeral token expiry.** The OpenAI Realtime API token (`GET /api/session/ephemeral`) expires in 60 minutes. Teaching sessions longer than 60 minutes will silently lose voice functionality. There is currently no token refresh mechanism in `TeachingInterface`.

6. **Tool name coupling.** Tool names in `constants/teachingAssistant.ts` must exactly match the handlers in `useHandleServerEvent.ts`. Adding a tool in only one place causes silent function-call drops with no error.

7. **`react-hooks/exhaustive-deps` disabled.** Some hooks deliberately omit dependencies to avoid re-render loops. When modifying hooks, reason about stale closures rather than adding all flagged dependencies blindly.

8. **No server-side auth guard.** Route protection is client-side only via `ProtectedRoute`. Server-rendered HTML of protected pages is visible before the client-side redirect fires. This is a known limitation of the current architecture.

9. **`NEXT_PUBLIC_BACKEND_URL` must not have a trailing slash.** `config.getApiUrl()` prepends `/` — double slashes silently break all API requests.

10. **Auth token is in `localStorage`.** It persists across tabs and browser restarts. Multiple open tabs share auth state. Consider this before changing storage strategy.
