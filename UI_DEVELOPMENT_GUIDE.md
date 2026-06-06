# ProfSidekick Frontend — UI Development Guide

> **Purpose:** This document is the single source of truth for how the frontend is structured and how new UI features must be built. Read this before touching any page, layout, or navigation. Deviating from these patterns is what caused the dashboard fragmentation we had to repair.

---

## 1. The Three-Role System

Every authenticated user has exactly one role. That role determines which layout they see and which routes they can access.

| Role | Who | Entry route after login | Layout |
|---|---|---|---|
| `publisher` | Professors / content creators | `/publisher/dashboard` | Sidebar with `publisherNav` |
| `subscriber` | Students / learners | `/subscriber/marketplace` | Sidebar with `subscriberNav` |
| `admin` | Platform administrators | `/admin/dashboard` | Sidebar with `adminNav` |

Roles are stored in `AuthContext` and read from the JWT. Never hardcode a role check outside of a layout or the `ProtectedRoute` component.

---

## 2. Route Architecture

```
src/app/
├── (auth)/                     ← Public: login, register, verify
├── (dashboard)/                ← Legacy protected routes (no sidebar)
│   ├── dashboard/              →  /dashboard  (UnifiedDashboard — course list)
│   ├── courses/[courseId]/     →  course detail, settings, students, sessions
│   ├── billing/                →  add-credits, redeem, usage
│   └── profile/
├── publisher/                  ← Publisher role (has sidebar)
│   ├── layout.tsx              ← Role gate: redirects non-publishers
│   ├── dashboard/              →  avatar overview
│   ├── courses/                →  UnifiedDashboard (courses & sessions)
│   ├── avatars/                →  avatar CRUD
│   ├── sessions/[id]/chat/     →  focus-mode teaching interface
│   ├── analytics/
│   └── history/
├── subscriber/                 ← Subscriber role (has sidebar)
│   ├── layout.tsx              ← Role gate: redirects non-subscribers
│   ├── marketplace/            →  browse avatars
│   ├── my-avatars/             →  subscribed avatars
│   ├── courses/                →  StudentDashboard (enrolled courses)
│   ├── history/
│   └── profile/
└── admin/                      ← Admin role only (has sidebar)
    ├── layout.tsx              ← Strict admin-only gate
    ├── dashboard/
    ├── templates/
    ├── marketplace/
    ├── publishers/
    ├── subscribers/
    └── analytics/
```

### The `(dashboard)` route group

This group has **no layout file**. Pages inside it use `<ProtectedRoute>` directly and show no sidebar. It exists as a legacy holdover and for routes that are accessed from inside a course (deep links from the sidebar layouts). Do **not** put new primary pages here — put them under the appropriate role folder.

---

## 3. The Sidebar — How It Works

All sidebar navigation is defined in one file:

**[src/components/layout/DashboardLayout.tsx](src/components/layout/DashboardLayout.tsx)**

It exports three nav configs:

```typescript
publisherNav   // used by publisher/layout.tsx
subscriberNav  // used by subscriber/layout.tsx
adminNav       // used by admin/layout.tsx
```

Each nav config is an array of `NavItem` (flat link) or `NavSection` (grouped links with a label).

### Adding a nav link — the required step

**Any new page under a role folder MUST have a corresponding entry in the nav config.** If you create `/publisher/rubrics/page.tsx` but do not add it to `publisherNav`, users have no way to reach it from the UI.

```typescript
// In DashboardLayout.tsx — publisherNav example
{
  label: 'Content',
  items: [
    { label: 'My Avatars',   href: '/publisher/avatars',  icon: <Bot size={18} /> },
    { label: 'My Courses',   href: '/publisher/courses',  icon: <BookOpen size={18} /> },
    { label: 'Rubrics',      href: '/publisher/rubrics',  icon: <ClipboardList size={18} /> }, // ← new
  ],
},
```

Import the icon from `lucide-react`. Do not install a different icon library.

---

## 4. How to Add a New Feature Page

Follow these steps every time, in order:

### Step 1 — Decide which role owns this page

- Is it for content creators managing their material? → `publisher/`
- Is it for learners browsing or accessing content? → `subscriber/`
- Is it a platform management/admin feature? → `admin/`
- Does it need to be reached by multiple roles with different views? → put the component in `src/components/`, create a page under each role folder that renders the component.

### Step 2 — Create the page file

```
src/app/<role>/<feature-name>/page.tsx
```

Use the role layout automatically — do not wrap the page in another `<ProtectedRoute>`. The layout already handles authentication and role gating.

```typescript
// src/app/publisher/rubrics/page.tsx
"use client";

import React from 'react';
import RubricsPanel from '@/components/rubrics/RubricsPanel';

export default function RubricsPage() {
  return <RubricsPanel />;
}
```

### Step 3 — Add the nav entry

Edit `DashboardLayout.tsx`. Add a `NavItem` or a new `NavSection` under the correct role nav.

### Step 4 — Build the component

Put business UI in `src/components/<domain>/`. Pages should be thin wrappers. Do not put logic directly in `page.tsx`.

### Step 5 — Add the API route handler (if backend calls needed)

Add a route handler under `src/app/api/<domain>/route.ts`. This is the BFF proxy layer — it forwards the request to the backend with the auth token. Never call the backend directly from client components.

```typescript
// src/app/api/rubrics/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getApiUrl } from '@/lib/config';

export async function GET(request: NextRequest) {
  const token = request.headers.get('authorization');
  const res = await fetch(getApiUrl('/api/rubrics'), {
    headers: { Authorization: token ?? '' },
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
```

### Step 6 — Add a hook (if the data is reused)

If more than one component needs this data, put the fetching logic in `src/hooks/useRubrics.ts`. Components call the hook; they never call `fetch` directly.

---

## 5. Existing Core Components — Use These, Don't Rebuild

| What you need | Use this |
|---|---|
| Course list for a publisher | `<UnifiedDashboard />` from `src/components/sessions/UnifiedDashboard.tsx` |
| Course list for a subscriber | `<StudentDashboard />` from `src/components/sessions/StudentDashboard.tsx` |
| Auth state (user, role, token) | `useAuth()` from `src/contexts/AuthContext.tsx` |
| Course data | `useCourses()` from `src/hooks/useCourses.ts` |
| Session data | `useUserSessions()` from `src/hooks/useUserSessions.ts` |
| Session run history | `useSessionRuns()` from `src/hooks/useSessionRuns.ts` |
| Saved prompts | `usePrompts()` from `src/hooks/usePrompts.ts` |
| Backend URL | `getApiUrl()` from `src/lib/config.ts` |

Do not re-fetch courses, sessions, or prompts from scratch inside a component. Extend the existing hooks if new fields are needed.

---

## 6. Focus Mode (Teaching Interface)

The URL pattern `/publisher/sessions/[sessionId]/chat` triggers **focus mode** in `DashboardLayout`. In focus mode:

- The sidebar is hidden by default
- A hover-reveal toggle lets the publisher slide it open if needed
- No header chrome is shown — the teaching interface occupies the full viewport

If you add a new full-screen experience (e.g., a student session view), match this pattern:

1. Put the route under the appropriate role folder (e.g., `/subscriber/sessions/[id]/learn`)
2. Add it to the `isFocusRoute()` function in `DashboardLayout.tsx`
3. Do not add it to the role nav (it's reached by clicking a course card, not the sidebar)

---

## 7. What Caused the Last Breakage — And How to Avoid It

The fragmentation we fixed was caused by one pattern: **building a new dashboard independently without connecting it to the existing navigation.**

The collaborator added publisher, subscriber, and admin dashboards (good — we needed those) but:
- Created them as isolated pages with no link from the existing course management dashboard
- Did not add entries in the sidebar nav for courses/sessions
- The avatar dashboard linked to `/dashboard` (no sidebar) instead of `/publisher/courses` (sidebar)

**Rules to prevent this happening again:**

1. **Never create a dashboard that lives outside the role route tree.** If publishers need to see something, it goes under `/publisher/`.
2. **Always add a nav entry the same day you create a page.** A page with no nav entry is unreachable and invisible.
3. **Before building a new page, search for an existing component.** `UnifiedDashboard`, `StudentDashboard`, and the hooks already cover courses, sessions, and prompts.
4. **If you move or rename a route, update every link to it.** Use `grep -r "old-path" src/` before committing.
5. **Coordinate before restructuring layouts.** Changes to `DashboardLayout.tsx`, `AuthContext.tsx`, or the layout files affect every page. Post in the team channel first.

---

## 8. Layout Files — Touch With Caution

| File | What it controls | Risk if broken |
|---|---|---|
| `src/app/layout.tsx` | Root layout, `AuthProvider`, `ConditionalHeader` | Every page, all roles |
| `src/components/layout/DashboardLayout.tsx` | Sidebar, nav configs, focus mode | All protected pages |
| `src/app/publisher/layout.tsx` | Publisher role gate + sidebar mount | All publisher pages |
| `src/app/subscriber/layout.tsx` | Subscriber role gate + sidebar mount | All subscriber pages |
| `src/app/admin/layout.tsx` | Admin-only gate | All admin pages |
| `src/contexts/AuthContext.tsx` | Auth state, token, logout | Every protected feature |

Changes to these files require a manual smoke test across all three roles before merging.

---

## 9. API Contract

All backend endpoints are listed in the API contract table in `AGENTS.md §5`. When you add a new endpoint:

1. Add the route handler in `src/app/api/`
2. Add the row to the endpoint table in `AGENTS.md §5`
3. Confirm with the backend team that the endpoint exists and returns the expected shape

The backend URL is resolved by `src/lib/config.ts` from `NEXT_PUBLIC_BACKEND_URL`. Never hardcode it.

---

## 10. Pre-Merge Checklist

Before opening a PR that touches the UI:

- [ ] New page has a nav entry in `DashboardLayout.tsx`
- [ ] Page lives under the correct role folder (`publisher/`, `subscriber/`, `admin/`)
- [ ] Data fetching goes through a hook in `src/hooks/`, not raw `fetch` in a component
- [ ] Backend calls go through `src/app/api/` route handlers, not direct from client
- [ ] Manually opened the browser and tested: login → correct dashboard → navigate to new feature → back navigation works
- [ ] Tested all three roles to confirm no regressions
- [ ] `npm run lint` and `npx tsc --noEmit` both exit 0
- [ ] `AGENTS.md §5` updated if any API endpoint changed
