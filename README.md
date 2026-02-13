<div align="center">

# Workforce Planner

**Open-source workforce allocation tool for IT companies.**

Replace your Excel spreadsheets with an interactive timeline that shows who works on what project, at what capacity, and for how long.

[![MIT License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.9+-3776AB?logo=python&logoColor=white)](https://python.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](https://postgresql.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://typescriptlang.org)

</div>

---

## Overview

Workforce Planner is a full-stack web application designed for IT companies managing teams of 80+ people across multiple projects. It provides a visual timeline to plan and track employee allocation, detect overbooking, and manage resources efficiently.

### Key Features

- **Interactive Timeline** — Monthly and weekly views with drag & drop assignment management
- **Drag & Drop** — Move assignments between employees by dragging bars across rows
- **Resize to Reschedule** — Drag assignment edges to change start/end dates in real time
- **Overbooking Detection** — Per-period utilization with color-coded indicators (green / yellow / red)
- **Polish Holidays** — Built-in calendar with all Polish public holidays (fixed + Easter-based)
- **Flexible Allocation** — Assign by percentage (e.g. 50% FTE) or monthly hours (e.g. 120h/month)
- **Team Filtering** — Filter timeline by team: Frontend, Backend, QA, PM, Mobile, UX/UI, DevOps
- **Soft Delete** — Employees and projects are archived, not permanently removed
- **JWT Authentication** — Secure login with account lockout and password reset

## Screenshots

> To add screenshots, run the app locally and capture the timeline view, then place images in a `docs/` folder.

## Tech Stack

### Backend

| Technology | Purpose |
|---|---|
| **FastAPI** | Async REST API framework |
| **SQLAlchemy 2.0** | Async ORM with relationship loading |
| **PostgreSQL 16** | Primary database |
| **Alembic** | Database migrations |
| **Pydantic v2** | Request/response validation |
| **python-jose** | JWT token handling |
| **passlib + bcrypt** | Password hashing |

### Frontend

| Technology | Purpose |
|---|---|
| **React 19** | UI framework |
| **TypeScript 5.9** | Type safety |
| **Vite 7** | Build tool & dev server |
| **Tailwind CSS 4** | Utility-first styling |
| **shadcn/ui** | Accessible component library |
| **TanStack Query v5** | Server state & caching |
| **dnd-kit** | Drag & drop interactions |
| **Zustand** | Client state management |
| **date-fns** | Date manipulation with PL locale |

## Getting Started

### Prerequisites

- **Docker** & **Docker Compose**

### 1. Clone and run

```bash
git clone https://github.com/Iwan1212/workforce-planner.git
cd workforce-planner
docker compose up -d
```

This starts all three services:

| Service | URL | Description |
|---|---|---|
| **Frontend** | http://localhost:5173 | React dev server with hot reload |
| **Backend** | http://localhost:8001 | FastAPI with auto-reload |
| **Database** | localhost:5433 | PostgreSQL 16 |

Database migrations and admin user creation happen automatically on backend startup.

### 2. Open the app

Navigate to **http://localhost:5173** and log in:

| Field | Value |
|---|---|
| Email | `admin@workforce.local` |
| Password | `Admin123!` |

### Manual setup (without Docker)

<details>
<summary>Click to expand</summary>

**Prerequisites:** Python 3.9+, Node.js 18+, Docker (for PostgreSQL only)

```bash
# Start database
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

Optionally, seed demo data (15 employees, 5 projects, 20 assignments):

```bash
cd backend
python scripts/seed_demo_data.py
```

</details>

## Project Structure

```
workforce-planner/
├── backend/
│   ├── app/
│   │   ├── api/                # FastAPI routers
│   │   │   ├── auth.py         # Login, password reset
│   │   │   ├── employees.py    # Employee CRUD
│   │   │   ├── projects.py     # Project CRUD
│   │   │   ├── assignments.py  # Assignment CRUD
│   │   │   └── calendar.py     # Timeline data, holidays
│   │   ├── models/             # SQLAlchemy models
│   │   ├── schemas/            # Pydantic schemas
│   │   ├── services/           # Business logic
│   │   │   ├── assignment_service.py
│   │   │   ├── auth_service.py
│   │   │   └── calamari_service.py  # Vacation integration (mock)
│   │   ├── utils/
│   │   │   ├── polish_holidays.py   # 13 holidays with Easter algorithm
│   │   │   └── working_days.py      # Working day calculations
│   │   ├── core/               # Security, dependencies
│   │   ├── config.py
│   │   ├── database.py
│   │   └── main.py
│   ├── alembic/                # Database migrations
│   ├── tests/                  # 22 unit tests
│   └── scripts/
│       ├── create_admin.py
│       └── seed_demo_data.py
├── frontend/
│   └── src/
│       ├── api/                # API client with JWT interceptor
│       ├── components/
│       │   ├── timeline/       # Timeline, TimelineRow, TimelineBar, etc.
│       │   ├── assignments/    # AssignmentModal
│       │   ├── employees/      # EmployeeList, EmployeeForm
│       │   ├── projects/       # ProjectList, ProjectForm
│       │   ├── auth/           # LoginForm with password reset
│       │   ├── layout/         # Sidebar, Layout
│       │   └── ui/             # shadcn/ui components
│       ├── hooks/              # useTimeline
│       └── stores/             # Zustand stores
├── docker-compose.yml
└── LICENSE
```

## API Reference

### Authentication

```
POST   /api/auth/login                  # Returns JWT access token
GET    /api/auth/me                     # Current user info
POST   /api/auth/reset-password-request # Request password reset (token logged to console)
POST   /api/auth/reset-password         # Reset password with token
```

### Resources

```
GET    /api/employees                   # List employees (filter: ?team=Frontend)
POST   /api/employees                   # Create employee
PATCH  /api/employees/{id}              # Update employee
DELETE /api/employees/{id}              # Soft delete (with active assignment check)

GET    /api/projects                    # List projects
POST   /api/projects                    # Create project (unique name)
PATCH  /api/projects/{id}              # Update project
DELETE /api/projects/{id}              # Delete with cascade

GET    /api/assignments                 # List assignments
POST   /api/assignments                 # Create assignment
PATCH  /api/assignments/{id}            # Update (dates, allocation, employee)
DELETE /api/assignments/{id}            # Delete assignment
```

### Timeline

```
GET    /api/assignments/timeline?start_date=2026-01-01&end_date=2026-06-30&teams=Frontend,Backend
```

Returns employees with assignments, per-month utilization, holidays, and working days per month.

### Calendar

```
GET    /api/calendar/holidays/{year}    # Polish holidays [{date, name}]
GET    /api/calendar/working-days       # Working days in date range
```

## Business Rules

| Rule | Details |
|---|---|
| **1 FTE** | 100% = 8 hours/day x working days/month |
| **Allocation types** | Percentage (e.g. 50%) or monthly hours (e.g. 120h) |
| **Overbooking** | Allowed but highlighted in red (>100% FTE) |
| **Working days** | Monday-Friday, excluding Polish public holidays |
| **Week start** | Monday (ISO standard) |
| **Minimum unit** | 1 hour |
| **Polish holidays** | 13 per year: 9 fixed + 4 Easter-based movable |
| **Soft delete** | Employees/projects archived; future assignments removed |

## Running Tests

```bash
cd backend
source venv/bin/activate
pytest tests/ -v
```

```
22 passed — holidays, working days, assignment calculations
```

## Configuration

Environment variables (with defaults):

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql+asyncpg://workforce:workforce_dev@localhost:5433/workforce_planner` | Database connection |
| `SECRET_KEY` | `change-me-in-production` | JWT signing key |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `60` | JWT token lifetime |
| `CALAMARI_API_KEY` | — | Optional: Calamari API key for vacation sync |

## Roadmap

- [ ] Calamari API integration for vacation sync
- [ ] Email notifications for password reset
- [ ] Export timeline to PDF/PNG
- [ ] Role-based access control (viewer / editor / admin)
- [ ] Employee availability calendar
- [ ] Project budget tracking
- [ ] Dark mode

## Contributing

Contributions are welcome! Feel free to:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

Please make sure your code passes the existing tests and follows the project conventions.

## License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<div align="center">

Built with [FastAPI](https://fastapi.tiangolo.com) + [React](https://react.dev) + [Claude Code](https://claude.ai/claude-code)

</div>
