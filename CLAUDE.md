# Workforce Planner

Internal web tool for IT workforce allocation planning (80+ employees). Replaces manual Excel tracking with an interactive timeline showing who works on what project, at what capacity, and for how long.

## Documentation

Detailed docs live in `docs/` — read these when you need deeper context:

- **[Architecture](docs/architecture.md)** — system design, component tree, frontend/backend structure, auth flow
- **[Infrastructure](docs/infrastructure.md)** — Docker setup (dev + prod), env vars, deployment, scripts
- **[API Reference](docs/api-reference.md)** — all endpoints, timeline contract, response formats
- **[Data Models](docs/data-models.md)** — SQLAlchemy models, relationships, business rules, allocation logic
- **[PRD](PRD.md)** — product requirements, user stories, success metrics

## Tech Stack

**Backend:** Python 3.12+ / FastAPI / SQLAlchemy 2.0 (async) / PostgreSQL 16 / Alembic / Pydantic v2
**Frontend:** React 19 / TypeScript 5.x / Vite / Tailwind CSS 4 / shadcn/ui / TanStack Query v5 / TanStack Router / dnd-kit / Zustand / date-fns

## Dev Commands

```bash
# Backend
cd backend && pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001

# Frontend
cd frontend && npm install
npm run dev  # port 5173

# Database
docker compose up -d db
cd backend && alembic upgrade head

# All services (Docker)
docker compose up -d

# Tests
cd backend && pytest
cd frontend && npm run test
```

## Code Conventions

### Backend (Python)

- Async everywhere (async def, await)
- Type hints on all functions
- Pydantic models for request/response (not dict)
- Dependency injection via FastAPI Depends()
- RESTful endpoints (GET /api/employees, POST /api/assignments, PATCH /api/assignments/{id})
- HTTP status codes: 200, 201, 204, 400, 401, 403, 404, 409, 422
- Error responses: `{"detail": "message"}`
- Docstrings on service functions

### Frontend (TypeScript/React)

- Strict TypeScript (no `any`)
- Functional components + hooks only
- TanStack Query for ALL API operations (queries + mutations)
- Colocation: component + hook + types in same directory when specific
- CSS: exclusively Tailwind utility classes + shadcn/ui
- Naming: PascalCase components, camelCase functions, SCREAMING_SNAKE constants

## Key Business Rules

- 1 FTE = 100% = 8h/day x working days/month
- Working days: Mon-Fri minus Polish public holidays (13/year)
- Overbooking > 100% = red warning, but system does NOT block
- Percentage allocation: `daily_hours = 8 x (percent / 100)`
- Monthly hours: `daily_hours = monthly_hours / working_days_in_month`
- Partial month: hours proportional to working days in that period
- Soft delete for employees and projects; hard delete for assignments
