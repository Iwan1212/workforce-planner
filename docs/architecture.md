# Architecture

## System Overview

Workforce Planner is a full-stack web app for IT workforce allocation planning (~80+ employees). It replaces manual Excel-based tracking with an interactive timeline.

```
                    +-----------+
                    |  Browser  |
                    | (React)   |
                    +-----+-----+
                          |
                   HTTP / WebSocket
                          |
               +----------+----------+
               |    Vite Dev Server   |  (dev: port 5173)
               |    Nginx             |  (prod: port 80)
               +----------+----------+
                          |
                    /api/* proxy
                          |
               +----------+----------+
               |   FastAPI Backend    |  (port 8001)
               |   (uvicorn ASGI)    |
               +----------+----------+
                          |
                 async SQLAlchemy
                          |
               +----------+----------+
               |   PostgreSQL 16     |  (port 5433)
               +---------------------+
```

## Frontend Architecture

**React 19 + TypeScript 5.x + Vite**

```
frontend/src/
├── api/              # Fetch wrappers with JWT interceptor
│   ├── client.ts     # Base fetch — auto-attaches Bearer token, handles 401 refresh
│   ├── auth.ts
│   ├── employees.ts
│   ├── projects.ts
│   ├── assignments.ts
│   ├── users.ts      # User management API
│   └── settings.ts   # App settings API (Calamari config)
├── components/
│   ├── ui/           # shadcn/ui primitives (Button, Dialog, Select, etc.)
│   ├── layout/       # Sidebar + Layout shell
│   ├── auth/         # LoginForm + GoogleSignInButton
│   ├── common/       # Shared components (TeamFilterChips)
│   ├── employees/    # EmployeeList, EmployeeForm
│   ├── projects/     # ProjectList, ProjectForm
│   ├── users/        # UserManagement, UserFormDialog
│   ├── settings/     # SettingsPage
│   ├── assignments/  # AssignmentModal + form sub-components
│   ├── dashboard/    # Podsumowanie tab — monthly totals + per-team breakdown
│   └── timeline/     # Core timeline components (see below)
├── hooks/            # Custom hooks (useTimeline, useCrudList, useTeamSelection, useUserCrud, useDebouncedValue)
├── stores/           # Zustand stores (authStore, timelineStore, projectTimelineStore, dashboardStore)
├── lib/              # Utilities (workingDays.ts mirrors backend logic, utils.ts)
└── types/            # Shared TypeScript types (index.ts)
```

### Timeline Component Tree

```
Timeline.tsx                      # Main container — orchestrates layout + data
├── TimelineFilters.tsx           # Team multi-select, view mode toggle (monthly/weekly)
├── TimelineHeader.tsx            # Date columns (months or weeks), holiday markers
├── TimelineEmptyState.tsx        # Empty state when no employees match filters
├── EmployeeOccupancyPanel.tsx    # Detailed occupancy breakdown panel
├── VacationDialog.tsx            # Vacation details dialog
└── TimelineRow.tsx               # One row per employee — sticky name column
    ├── OccupancyBadge.tsx        # Per-period % occupancy (green/yellow/red)
    └── TimelineBar.tsx           # Assignment bar — draggable (dnd-kit) + resizable edges
```

### State Management

- **Server state**: TanStack Query v5 — all API calls go through queries/mutations with automatic cache invalidation
- **Client state**: Zustand — timeline view mode, active filters, visible date range
- **No prop drilling** — components read from query cache or Zustand store directly

### Key Frontend Libraries

| Library | Role |
|---|---|
| TanStack Query v5 | Server state, caching, optimistic updates |
| TanStack Router | File-based routing |
| dnd-kit | Drag & drop (move assignments between employees) + resize (change dates) |
| date-fns | Date arithmetic with Polish locale |
| Zustand | Lightweight client state |
| shadcn/ui + Tailwind CSS 4 | UI components + styling |

## Backend Architecture

**FastAPI + async SQLAlchemy 2.0 + PostgreSQL 16**

```
backend/app/
├── main.py             # FastAPI app factory, CORS, lifespan events
├── config.py           # Pydantic BaseSettings (env vars)
├── database.py         # Async engine + session factory
├── models/             # SQLAlchemy ORM models (User, Employee, Project, Assignment, Vacation, AppSettings)
├── schemas/            # Pydantic v2 request/response schemas
├── api/                # FastAPI routers (auth, employees, projects, assignments, calendar, dashboard, users, settings)
├── services/           # Business logic layer
│   ├── auth_service.py
│   ├── assignment_service.py       # FTE/hours calculation engine
│   ├── capacity_service.py         # Effective-dated contracted capacity
│   ├── occupancy_service.py        # Per-period occupancy (shared by timeline + dashboard)
│   ├── dashboard_service.py        # Monthly roll-up per team, confirmed vs tentative
│   ├── calamari_service.py         # External Calamari API integration
│   └── vacation_sync_service.py    # Vacation sync logic
├── core/
│   ├── security.py     # JWT creation/verification
│   ├── rate_limit.py   # Rate limiting
│   └── dependencies.py # FastAPI Depends() — get_db session, get_current_user
└── utils/
    ├── working_days.py     # Working day calculations (Mon-Fri minus holidays)
    └── polish_holidays.py  # 13 Polish holidays (9 fixed + 4 Easter-based)
```

### Request Flow

1. Request hits FastAPI router (`api/`)
2. Dependencies inject DB session + authenticated user (`core/dependencies.py`)
3. Router delegates to service layer (`services/`)
4. Service uses SQLAlchemy models for DB operations (`models/`)
5. Response serialized via Pydantic schemas (`schemas/`)

### Database Migrations

Alembic manages schema migrations. Auto-run on backend startup in Docker.

```bash
cd backend && alembic upgrade head     # Apply migrations
cd backend && alembic revision --autogenerate -m "description"  # Create migration
```

## Authentication Flow

Sign-in is Google only; there are no passwords. Google proves who the person is, the app decides whether they may come in.

1. The login screen reads `GET /api/auth/config` for the Google OAuth client ID and renders Google's own button (Google Identity Services script, loaded on the login screen only).
2. Google hands the browser an ID token, which goes to `POST /api/auth/google`.
3. The backend verifies the token with `google-auth` (signature, issuer, audience = `GOOGLE_CLIENT_ID`, expiry), then requires:
   - `email_verified` is true,
   - the `hd` (Workspace domain) claim is in `GOOGLE_ALLOWED_DOMAINS`, when that is set,
   - an **active user an admin already created** has that email, compared ignoring case. Nobody is created on first sign-in.
4. On success it returns the app's own JWT access + refresh tokens; from here on Google is not involved.
5. Frontend keeps the tokens in `localStorage` and attaches the access token as `Authorization: Bearer <token>` via the `client.ts` interceptor
6. On 401, client automatically attempts `POST /api/auth/refresh` with refresh token; on failure, redirects to login
7. Backend validates token via `get_current_user` dependency on every protected route
8. User roles: `admin`, `user`, `viewer`

Deactivating someone in Google Workspace does not end their session here: their tokens stay valid until they expire (access 24h, refresh 7 days by default). Deactivate the user in the app as well.
