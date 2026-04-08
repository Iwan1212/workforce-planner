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
│   ├── auth/         # LoginForm with password reset
│   ├── common/       # Shared components (TeamFilterChips)
│   ├── employees/    # EmployeeList, EmployeeForm
│   ├── projects/     # ProjectList, ProjectForm
│   ├── users/        # UserManagement, UserFormDialog
│   ├── settings/     # SettingsPage
│   ├── assignments/  # AssignmentModal + form sub-components
│   └── timeline/     # Core timeline components (see below)
├── hooks/            # Custom hooks (useTimeline, useCrudList, useTeamSelection, useUserCrud, useDebouncedValue)
├── stores/           # Zustand stores (authStore, timelineStore)
├── lib/              # Utilities (workingDays.ts mirrors backend logic, utils.ts)
└── types/            # Shared TypeScript types (index.ts)
```

### Timeline Component Tree

```
Timeline.tsx                      # Main container — orchestrates layout + data
├── TimelineFilters.tsx           # Team multi-select, view mode toggle (monthly/weekly)
├── TimelineHeader.tsx            # Date columns (months or weeks), holiday markers
├── TimelineEmptyState.tsx        # Empty state when no employees match filters
├── TimelineSummaryRow.tsx        # Aggregated summary row
├── EmployeeUtilizationPanel.tsx  # Detailed utilization breakdown panel
├── VacationDialog.tsx            # Vacation details dialog
└── TimelineRow.tsx               # One row per employee — sticky name column
    ├── UtilizationBadge.tsx      # Per-period % utilization (green/yellow/red)
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
├── api/                # FastAPI routers (auth, employees, projects, assignments, calendar, users, settings)
├── services/           # Business logic layer
│   ├── auth_service.py
│   ├── assignment_service.py       # FTE/hours calculation engine
│   ├── calamari_service.py         # External Calamari API integration
│   └── vacation_sync_service.py    # Vacation sync logic
├── core/
│   ├── security.py     # JWT creation/verification, password hashing (bcrypt)
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

1. `POST /api/auth/login` — validates credentials, returns JWT access token + refresh token
2. Frontend stores tokens in memory, attaches access token as `Authorization: Bearer <token>` via `client.ts` interceptor
3. On 401, client automatically attempts `POST /api/auth/refresh` with refresh token; on failure, redirects to login
4. Backend validates token via `get_current_user` dependency on every protected route
5. Account lockout after 5 failed attempts (15 min cooldown)
6. Password reset via token (logged to console in dev, email in prod)
7. User roles: `admin`, `user`, `viewer`
