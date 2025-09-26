# Scholaris UI Plan (Next.js + Tailwind + shadcn/ui + React Query + Framer Motion)

A focused plan to implement the full front-end UX: first login → “cozy” onboarding → first Classroom sync running in background → role request → WhatsApp opt-in → role-aware dashboards (courses → detail). Includes what to use in each step (endpoints, components, state, events, validations).

---

## 0) Tech Baseline

* **Framework**: Next.js App Router (TypeScript)
* **UI**: TailwindCSS + shadcn/ui (Dialog, Sheet, Tabs, Badge, Select, Input, Button, Toast, Skeleton, Progress)
* **State/Data**: React Query (tanstack), Zod (validation), Zustand (light UI state), React Hook Form
* **Animations**: framer-motion (subtle fades/slides)
* **Auth**: JWT from backend; `Authorization: Bearer <jwt>`
* **Env**:

  * `NEXT_PUBLIC_API_BASE=http://localhost:8000`
  * `NEXT_PUBLIC_WA_BASE=http://localhost:3001`

---

## 1) Routes & Shell

```
/app
  /autenticacion/page.tsx               # login (email/pass + "continue with Google")
  /onboarding/page.tsx                  # wizard (role -> phone -> consent -> first sync status)
  /panel/layout.tsx                     # AppShell (sidebar/topbar)
  /panel/admin/page.tsx
  /panel/cohortes/page.tsx
  /panel/cursos/page.tsx
  /panel/mis-cursos/page.tsx
  /cursos/[id]/page.tsx                 # Course detail (role-aware)
  /whatsapp/page.tsx                    # Status/QR
/components                             
  AppShell.tsx, TopbarUserMenu.tsx
  RoleGuard.tsx, Protected.tsx
  DataTable.tsx, EmptyState.tsx
  CourseCard.tsx, CourseHeader.tsx
  StudentRow.tsx, SubmissionChips.tsx
  AttendanceMiniChart.tsx               # simple bar/radial chart (local calc or API)
  NotificationComposer.tsx
  SyncButton.tsx
  Wizard.tsx (generic steps)
/lib
  api.ts (fetch wrapper + interceptors)
  rq.ts (react-query client)
  auth.ts (me(), hasRole)
  utils.ts (formatters, date)
/hooks
  useAuth.ts, useClassroom.ts, useWhatsApp.ts
  useCourses.ts, useStudents.ts, useNotifications.ts
```

---

## 2) First Login → Onboarding Wizard

### 2.1 Login (`/autenticacion`)

**UI**

* Email, Password, Submit
* Button: “Continue with Google” → backend OAuth URL
* Error toasts; disabled state; basic motion fade-in

**Endpoints**

* `POST /api/v1/auth/login`
* `GET /api/v1/auth/me`

**State**

* Store JWT (interceptor attaches header)
* Cache `me` in React Query

**Acceptance**

* On success:

  * If `me.role` exists → skip role step and go to `/onboarding` if first time; else redirect by role
  * If no role → `/onboarding`

---

### 2.2 Onboarding Wizard (`/onboarding`)

Steps: (1) Role → (2) WhatsApp → (3) Consent & First Sync → (4) Done

**Common Components**

* `<Wizard>` with numbered steps and progress
* Shadcn: `Dialog`, `Select`, `Input`, `Switch`, `Toast`, `Progress`

#### Step 1: Select Role

* **UI**: Radio cards: **Teacher**, **Student**, **Coordinator**
* **Why**: Classroom only exposes teacher/student; **Coordinator** is our local system role (super-teacher).
* **Endpoint**: `PATCH /api/v1/users/{id}` (admin-only by spec). If self-service is not exposed, call a lightweight endpoint you expose for self-role request, e.g. `POST /api/v1/users/me/role-request { role }` (❗if not available yet, store locally and show banner “Awaiting approval”).
* **Validation (Zod)**: role ∈ {teacher, student, coordinator}
* **State**: `onboarding.role`

#### Step 2: WhatsApp Opt-In

* **UI**: Phone input `+<country><number>`, “Send test message” (optional)
* **Endpoints**:

  * Our API: `POST /api/v1/notifications/test` { phone, text }
  * WhatsApp service (optional read-only status): `GET {WA}/status`
* **Validation**: E.164 format
* **State**: `onboarding.phone`, `onboarding.whatsappOptIn:boolean`

#### Step 3: Consent & First Sync (runs background)

* **UI**: Checkbox “Allow Scholaris to read my Classroom courses…” (copy)
* **Action**:

  * Call **Classroom delta sync** to warm the cache:

    * `POST /api/v1/classroom/sync/delta` (BE uses stored Google token)
  * Show `Progress` + logs region:

    * “Fetching courses…”
    * “Fetching participants…”
    * “Fetching assignments…”
    * “Fetching submissions…”
* **Polling**: After triggering, poll course list until non-empty or time cap (e.g., 20s)

  * `GET /api/v1/courses/?page=1&size=12`
* **Fallback**: If still empty, show CTA “Go to panel — data will appear soon”.

#### Step 4: Done

* **Route by role**

  * admin → `/panel/admin`
  * coordinator → `/panel/cohortes`
  * teacher → `/panel/cursos`
  * student → `/panel/mis-cursos`

**Acceptance**

* Wizard state persists if page reloads (Zustand or URL query).
* Sync trigger returns 200; polling finds courses or times out gracefully.

---

## 3) Panel Shell & Navigation

### 3.1 AppShell (`/panel/layout.tsx`)

* **Topbar**: Product logo, Search (non-blocking TODO), `SyncButton`, User menu (name, role badge, logout)
* **Sidebar (role-aware)**:

  * **Admin**: Dashboard, Users, Courses, Config, WhatsApp
  * **Coordinator**: Cohorts, Courses, Notifications
  * **Teacher**: My Courses, Students (filtered), Notifications
  * **Student**: My Courses, Notifications
* **Components**: `Skeleton` for initial loads

### 3.2 RoleGuard

* Reads `me.role`; redirects if unauthorized.
* Shows `EmptyState` with “Insufficient permissions” if blocked.

---

## 4) Courses (List → Detail)

### 4.1 Courses List

**Routes**

* Teacher: `/panel/cursos` (auto-filter “my courses”)
* Coordinator: `/panel/cohortes` (all courses + filters)
* Student: `/panel/mis-cursos` (my enrolled courses)

**UI**

* Grid of `CourseCard` (name, teacher, student count, last sync time)
* Filters (`FiltersBar`): teacher, activity status (has late, etc.)
* Server pagination

**Endpoints**

* `GET /api/v1/courses/?page&size`
* Coordinator filter (by teacher) done client-side or via query if API supports.

**State**

* React Query: `courses:list:{role}:{filters}`

**Acceptance**

* Cards reflect role scope:

  * Teacher sees only theirs
  * Student: only enrolled
  * Coordinator: all

---

### 4.2 Course Detail (`/cursos/[id]`)

**Header**

* Course title, teacher avatar, “Sync” (delta)
* Tabs: Overview | Participants | Assignments | Submissions | Attendance | Notifications

**Tab: Overview**

* Quick stats (counts, not heavy charts)
* `AttendanceMiniChart` (if API lacks, compute from local `attendance` records; otherwise call `/api/v1/attendance/?course_id=...`)
* Alerts list:

  * Students with **late/missing** submissions (derive from submissions data)

**Tab: Participants**

* Teachers, Students:

  * endpoint: `/api/v1/students/?course_id=...` for students
  * display email, name, attendance rate, alerts
  * **Coordinator/Teacher**: row actions → “Notify”, “Mark attendance today”
* For Google profile photos, use `photo_url` if available.

**Tab: Assignments**

* endpoint: `/api/v1/classroom/{course_id}/assignments`
* Columns: Title, Type, State, Due date, Max points, Assignee mode
* Chips for `work_type` and `state`

**Tab: Submissions**

* endpoint: `/api/v1/classroom/{course_id}/submissions`
* Columns: Student, Assignment, State (DELIVERED/LATE/MISSING/RESUBMISSION), Updated, Grade
* Filters: by state
* Coordinator/Teacher: select students → “Notify” (opens `NotificationComposer`)

**Tab: Attendance**

* If API **exists**:

  * `GET /api/v1/attendance/?course_id=...`
  * `POST /api/v1/attendance/` to mark today
* If API **missing**:

  * Show banner “Attendance API not enabled. Toggle local markers will be stored later.”
  * Implement optimistic UI + TODO markers.

**Tab: Notifications**

* endpoint: `/api/v1/notifications/?page&size`
* Compose new: `POST /api/v1/notifications/`
* Test WA: `POST /api/v1/notifications/test`

**Acceptance**

* Role rules:

  * **Teacher**: can see their students & send notifications
  * **Student**: read-only view, only their submissions; hide attendance authoring
  * **Coordinator**: can see all, can notify any

---

## 5) WhatsApp Status (`/whatsapp`)

**UI**

* Status tiles (online/paired/queue size)
* If needs QR, render QR image from `{WA}/qr`
* Health badge

**Endpoints**

* `GET {WA}/health`
* `GET {WA}/status`
* `GET {WA}/qr`

---

## 6) Components & Behaviors

### 6.1 SyncButton

* Calls `POST /api/v1/classroom/sync/delta`
* Disabled while in-flight
* Emits toast result
* Optional: show small log drawer (collapsible)

### 6.2 NotificationComposer

* Textarea, “Select recipients” (students multi-select or phone field), preview
* `POST /api/v1/notifications/` or `/notifications/test`
* Show delivery status from `/notifications/` as badges (PENDING/SENT/READ)

### 6.3 AttendanceMiniChart

* Simple horizontal bars or radial showing present vs absent (%)
* Data source:

  * Preferred: `/api/v1/attendance/?course_id=...`
  * Fallback: compute from submissions (heuristic) with disclaimer

### 6.4 DataTable

* Server pagination model: `{ items, pagination: { total, page, size } }`
* Debounced search
* Empty, loading, and error states

---

## 7) Data Fetching & Caching

* **React Query keys**

  * `["me"]`
  * `["courses", { page, size, filters }]`
  * `["course", id]`
  * `["course-assignments", id]`
  * `["course-submissions", id, filters]`
  * `["students", { courseId, page, size }]`
  * `["notifications", { page, size }]`
  * `["wa-status"]`
* **Stale Times**

  * Courses & assignments: 15–30s
  * WA status: 10s
* **Error mapping**

  * 401 → logout
  * 403 → toast “Insufficient permissions”
  * Network → retry with backoff

---

## 8) Validation (Zod)

* **Role form**: `{ role: z.enum(["teacher","student","coordinator"]) }`
* **Phone**: E.164 pattern
* **Composer**: `{ text: z.string().min(1).max(1000), studentIds?: z.array(z.string()), phone?: z.string().regex(e164) }`
* **Attendance**: `{ student_id: z.string(), date: z.string(), present: z.boolean() }`

---

## 9) UX Copy & Micro-Animations

* **Onboarding tone**: short, friendly, action-oriented.
* **Animations**: `motion.div` fade/slide on step transitions (<150ms), buttons hover micro-scale (≤1.02).

**Sample microcopy**

* Step 1: “Tell us how you’ll use Scholaris”
* Step 2: “Add a WhatsApp number to get reminders (optional)”
* Step 3: “Warming up your data from Classroom…”
* Done: “You’re set! Let’s work on your courses.”

---

## 10) Role Redirects & Guards

* After login or onboarding:

  * admin → `/panel/admin`
  * coordinator → `/panel/cohortes`
  * teacher → `/panel/cursos`
  * student → `/panel/mis-cursos`
* `Protected` HOC/layout checks `me`; renders `Skeleton` until known.

---

## 11) Accessibility & SEO

* Proper heading order (h1 on page hero/title, h2 for sections)
* All buttons/inputs labelled
* Focus outlines enabled
* Color contrast verified (primary on gradients)
* Meta titles per page; canonical/basic OG tags on landing

---

## 12) Performance

* Use `next/image` for hero art/screenshots (priority on hero)
* Keep framer-motion wrappers minimal (only animated sections)
* Code-split routes naturally; avoid heavy client components
* Cache GETs with React Query; avoid unnecessary re-fetch

---

## 13) Observability

* Toast on every mutating action (success/error)
* Optional event log (debug panel) for sync actions
* Console warnings for missing attendance API (so we remember to add it)

---

## 14) Gaps & TODOs (Backend Alignment)

* **Self-service role selection**: if `PATCH /users/{id}` is admin-only, expose `POST /api/v1/users/me/role-request`
* **Attendance API**: confirm endpoints; if missing, spec:

  * `GET /api/v1/attendance/?course_id&date_from&date_to`
  * `POST /api/v1/attendance/ { student_id, date, present }`
* **Notifications stream**: if WS not ready, keep polling `/notifications/`
* **Classroom sync job status**: optional `GET /api/v1/classroom/sync/status` for richer progress UI

---

## 15) Acceptance Criteria (End-to-End)

* First login always leads to wizard unless profile has role + wa preference stored.
* Pressing **Start Sync** in onboarding triggers delta sync and the course list appears (or times out gracefully).
* Role-aware navigation shows the correct menus and data scope.
* Course detail tabs render without 404s; each tab fetches and displays real data.
* Coordinator can filter across all courses and notify cohorts.
* Teacher can notify selected students and mark attendance (when API present).
* Student sees only own assignments and notifications.
* WhatsApp page accurately reflects `{WA}` status and QR when needed.
* Lighthouse (prod build) shows good LCP/TBT; no heading jumps; contrast ok.

---

## 16) Implementation Order (Sprint-Style)

1. **Auth & Shell**: `/autenticacion`, `RoleGuard`, `/panel/layout`, `/panel/*` empty pages
2. **Onboarding**: steps, role selection (temp local), WA opt-in (test send), trigger sync + polling
3. **Courses List (role-aware)**: cards, filters, pagination
4. **Course Detail Tabs**: overview → participants → assignments → submissions → notifications
5. **Attendance**: API integration or fallback
6. **WhatsApp Status/QR**: `/whatsapp`
7. **Polish**: a11y, micro-animations, empty/error states, copy, performance

---

## 17) Design Tokens

* **Palette**: primary `#3B82F6`, success/trust `#10B981`, neutrals (Tailwind gray 50–900)
* **Typography**: Roboto; h (≈20px), body (16px), small (14px)
* **Radius**: `rounded-2xl` for cards; `shadow-sm` default; `hover:shadow-md` on interactive

