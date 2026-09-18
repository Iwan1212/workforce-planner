<div align="center">

# Workforce Planner

**Open-source workforce allocation tool for IT companies.**

Replace spreadsheets with an interactive timeline that shows who works on which project, at what capacity, and for how long, plus a monthly summary of where the planned hours go.

[![MIT License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](https://postgresql.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://typescriptlang.org)

</div>

---

## Overview

Workforce Planner is a self-hosted web application for companies that staff tens of people across many projects at once. It keeps one source of truth for allocation, shows overbooking and free capacity per person and per team, and reports how the month's hours split between confirmed and tentative work and between client and internal projects.

The UI is in Polish. Working-day logic is built around the Polish public holiday calendar.

### Features

**Planning**
- **Employee timeline**: monthly and weekly views, one row per person, assignments as colour-coded bars.
- **Project timeline**: the same data grouped by project.
- **Drag & drop and resize**: move an assignment to another person or change its dates directly on the bars.
- **Split and duplicate**: cut an assignment at a date or copy it to another period.
- **Percentage or hours**: allocate as a share of FTE (e.g. 50%) or as monthly hours (e.g. 120 h).
- **Confirmed vs tentative**: every assignment carries a certainty flag that flows through all occupancy figures.
- **Unassigned demand**: placeholder assignments record work a project needs before anyone is staffed on it.

**Capacity**
- **Per-employee capacity history**: full-time, part-time or fixed weekly hours, valid from a given date.
- **Occupancy per period** measured against workable hours (capacity minus vacation), with green / yellow / red indicators. Overbooking is highlighted, never blocked.
- **Vacations** synced from Calamari (optional) and shown on the timeline.
- **Polish public holidays**: 13 per year, fixed and Easter-based, excluded from working days.

**Summary**
- **Monthly dashboard** per team and for the whole company: capacity, workable, confirmed, tentative, remaining hours and utilisation.
- **Client vs internal split**: projects can be marked internal (recruitment, own product, sales, PM time), and the summary reports how much planned time never reaches a client.
- **Team drill-down**: click a team in the summary to open the employee timeline filtered to it.

**Organisation**
- **Teams and technologies** as managed dictionaries, used to filter every view.
- **Employee lifecycle**: archive with wind-down of future assignments, unarchive, or hard delete.
- **Project archive** with the same soft-delete semantics.

**Accounts**
- **JWT authentication** with refresh tokens, login rate limiting and password reset.
- **Roles**: admin, user, viewer.
- **User management** screen for admins.
- **Light and dark theme**, stored per user.

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.12, FastAPI, SQLAlchemy 2.0 (async), asyncpg, Alembic, Pydantic v2, PyJWT, passlib + bcrypt |
| Database | PostgreSQL 16 |
| Frontend | React 19, TypeScript 5.9, Vite 7, Tailwind CSS 4, shadcn/ui, TanStack Query v5, TanStack Router, dnd-kit, Zustand, date-fns |
| Infrastructure | Docker Compose (dev and prod), Traefik with Let's Encrypt (prod), Nginx (frontend prod image), GitHub Actions |

## Getting Started

### Prerequisites

Docker and Docker Compose.

### Run with Docker

```bash
git clone https://github.com/Iwan1212/workforce-planner.git
cd workforce-planner
docker compose up -d
```

| Service | URL |
|---|---|
| Frontend (Vite dev server, hot reload) | http://localhost:5173 |
| Backend (FastAPI, auto-reload) | http://localhost:8001 |
| API docs (Swagger) | http://localhost:8001/docs |
| PostgreSQL | localhost:5433 |

Migrations and the initial admin account are created automatically when the backend starts.

### Log in

| Field | Value |
|---|---|
| Email | `admin@workforce.local` |
| Password | `Admin123!` |

Change the password after the first login.

### Manual setup (without Docker)

<details>
<summary>Click to expand</summary>

**Prerequisites:** Python 3.12+, Node.js 20+, Docker for PostgreSQL only.

```bash
# Database
docker compose up -d db

# Backend
cd backend
python3 -m venv venv
source venv/bin/activate    # Windows: venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
python scripts/create_admin.py
uvicorn app.main:app --reload --port 8001

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

Optional demo data (15 employees, 5 projects, 20 assignments):

```bash
cd backend
python scripts/seed_demo_data.py
```

</details>

## Documentation

Detailed documentation lives in [`docs/`](docs/):

| Document | Contents |
|---|---|
| [Architecture](docs/architecture.md) | System design, component tree, auth flow |
| [API Reference](docs/api-reference.md) | Every endpoint, the timeline contract, response formats |
| [Data Models](docs/data-models.md) | SQLAlchemy models, relationships, allocation and occupancy rules |
| [Infrastructure](docs/infrastructure.md) | Docker setup for dev and prod, environment variables, deployment, scripts |
| [PRD](PRD.md) | Product requirements, user stories, success metrics (Polish) |

## Project Structure

```
workforce-planner/
├── backend/
│   ├── app/
│   │   ├── api/                 # FastAPI routers
│   │   │   ├── auth.py          # Login, refresh, password reset, theme
│   │   │   ├── users.py         # User management (admin)
│   │   │   ├── employees.py     # Employees, capacities, archive
│   │   │   ├── teams.py         # Team dictionary
│   │   │   ├── technologies.py  # Technology dictionary
│   │   │   ├── projects.py      # Projects, archive
│   │   │   ├── assignments.py   # Assignments, split, duplicate
│   │   │   ├── calendar.py      # Timeline, vacations, holidays, working days
│   │   │   ├── project_timeline.py
│   │   │   ├── dashboard.py     # Monthly summary
│   │   │   └── settings.py      # Calamari configuration
│   │   ├── models/              # SQLAlchemy models
│   │   ├── schemas/             # Pydantic schemas
│   │   ├── services/            # Occupancy engine, capacity, dashboard, lifecycle, vacation sync
│   │   ├── utils/               # Polish holidays, working days
│   │   └── core/                # Security, dependencies
│   ├── alembic/                 # Database migrations
│   ├── tests/                   # pytest suite
│   └── scripts/                 # create_admin.py, seed_demo_data.py
├── frontend/
│   └── src/
│       ├── api/                 # API client with JWT refresh
│       ├── components/          # timeline, project-timeline, dashboard, assignments,
│       │                        # employees, projects, settings, users, auth, layout, ui
│       ├── hooks/               # TanStack Query hooks
│       ├── stores/              # Zustand stores
│       ├── lib/                 # Capacity maths, layout, formatting
│       └── types/
├── docs/
├── docker-compose.yml           # Development
├── docker-compose.prod.yml      # Production (Traefik + Let's Encrypt)
└── deploy.sh                    # Manual deploy over SSH
```

## API Overview

All endpoints are under `/api` and require a bearer token except the auth routes. Full contract in [docs/api-reference.md](docs/api-reference.md); interactive docs at `/docs` when the backend is running.

```
Auth          POST /auth/login · POST /auth/refresh · GET /auth/me · PATCH /auth/me/theme
              POST /auth/reset-password-request · POST /auth/reset-password
Users         GET/POST /users · PATCH/DELETE /users/{id}
Employees     GET/POST /employees · PATCH/DELETE /employees/{id}
              POST /employees/{id}/archive · POST /employees/{id}/unarchive
              GET/POST /employees/{id}/capacities · PATCH/DELETE /employees/{id}/capacities/{cid}
Teams         GET/POST /teams · PATCH/DELETE /teams/{id}
Technologies  GET/POST /technologies · PATCH/DELETE /technologies/{id}
Projects      GET/POST /projects · PATCH/DELETE /projects/{id}
              POST /projects/{id}/archive · POST /projects/{id}/unarchive
              GET /projects/timeline
Assignments   GET/POST /assignments · PATCH/DELETE /assignments/{id}
              POST /assignments/{id}/split · POST /assignments/{id}/duplicate
              GET /assignments/timeline?start_date&end_date&team_ids&technology_ids
Calendar      GET /calendar/holidays/{year} · GET /calendar/working-days
              GET /calendar/vacations · POST /calendar/vacations/sync
Dashboard     GET /dashboard/monthly
Settings      GET/PUT/DELETE /settings/calamari
```

## Business Rules

| Rule | Details |
|---|---|
| 1 FTE | 100% = 8 h/day × working days in the month |
| Allocation types | Percentage of FTE, or fixed monthly hours spread over working days |
| Capacity | Per employee, with history: full-time, part-time percentage or fixed weekly hours |
| Occupancy | Allocated hours / workable hours, where workable = capacity minus vacation |
| Overbooking | Allowed, highlighted in red above 100% |
| Certainty | Each assignment is confirmed or tentative; both are reported separately |
| Internal work | A project flag; internal hours are a second cut through allocated hours, independent of certainty |
| Unassigned demand | Placeholder assignments count as demand, not as allocation |
| Working days | Monday to Friday minus Polish public holidays, week starts Monday |
| Soft delete | Employees and projects are archived; assignments are hard-deleted |

## Running Tests

```bash
cd backend
source venv/bin/activate
pytest tests/ -v
```

Frontend checks:

```bash
cd frontend
npx tsc -b && npx eslint . && npm run build
```

CI runs both on every pull request and push to `main`.

## Configuration

Backend environment variables (see `backend/.env.example`):

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql+asyncpg://workforce:workforce_dev@localhost:5433/workforce_planner` | Database connection |
| `SECRET_KEY` | `dev-secret-key-change-in-production` | JWT signing key. The app refuses to start with the default outside development. |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `1440` | Access token lifetime |
| `REFRESH_TOKEN_EXPIRE_MINUTES` | `10080` | Refresh token lifetime |
| `CORS_ORIGINS` | `http://localhost:5173` | Comma-separated allowed origins |
| `ENVIRONMENT` | `development` | `development` or `production` |

Calamari credentials are not environment variables. They are entered in the Settings screen and stored in the database.

## Deployment

`docker-compose.prod.yml` runs the stack behind Traefik with automatic Let's Encrypt certificates. Set `DOMAIN`, `ACME_EMAIL`, `POSTGRES_*`, `SECRET_KEY` and `CORS_ORIGINS` in a `.env` file on the server, then:

```bash
docker compose -f docker-compose.prod.yml up -d
```

The frontend is served at `app.${DOMAIN}` and the API at `api.${DOMAIN}`.

Two ways to ship a new version:

- **GitHub Actions**: `.github/workflows/deploy.yml` runs on every push to `main`. It needs three repository secrets: `DEPLOY_HOST`, `DEPLOY_USER` and `SSH_PRIVATE_KEY`.
- **Manually**: `DEPLOY_HOST=... DEPLOY_USER=... ./deploy.sh` syncs the repo over SSH and rebuilds the containers.

Details in [docs/infrastructure.md](docs/infrastructure.md).

## Contributing

1. Fork the repository and create a branch (`git checkout -b feat/your-feature`).
2. Keep the backend tests green and the frontend type-check, lint and build passing.
3. Open a pull request against `main`. CI runs on every PR.

Conventions for both codebases are described in [CLAUDE.md](CLAUDE.md).

## License

MIT. See [LICENSE](LICENSE).
