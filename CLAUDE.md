# Workforce Planner

## Opis projektu

Wewnętrzne narzędzie webowe do planowania obciążenia pracowników w firmie IT (80+ osób). Pozwala widzieć kto, na jakim projekcie, w jakim wymiarze i w jakim okresie pracuje. Zastępuje ręczne śledzenie alokacji w Excelu.

## Stack technologiczny

### Backend

- **Python 3.12+** z **FastAPI**
- **SQLAlchemy 2.0** (async, ORM) + **Alembic** (migracje)
- **PostgreSQL 16** (baza danych)
- **Pydantic v2** (walidacja, schematy API)
- **python-jose** + **passlib[bcrypt]** (JWT auth, hashing haseł)
- **uvicorn** (serwer ASGI)
- **httpx** (klient HTTP do integracji Calamari)
- **pytest** + **pytest-asyncio** (testy)

### Frontend

- **React 19** z **TypeScript 5.x**
- **Vite** (bundler)
- **Tailwind CSS 4** + **shadcn/ui** (komponenty UI)
- **TanStack Query v5** (fetching, cache)
- **TanStack Router** (routing)
- **dnd-kit** (drag & drop, resize)
- **date-fns** (operacje na datach, lokalizacja PL)
- **Zustand** (lightweight state management)
- **Vitest** + **Testing Library** (testy)

## Struktura projektu

```
workforce-planner/
├── backend/
│   ├── app/
│   │   ├── main.py                # FastAPI app, CORS, lifespan
│   │   ├── config.py              # Settings (Pydantic BaseSettings)
│   │   ├── database.py            # Async engine, session factory
│   │   ├── models/                # SQLAlchemy models
│   │   │   ├── user.py            # User (login accounts)
│   │   │   ├── employee.py        # Employee
│   │   │   ├── project.py         # Project
│   │   │   └── assignment.py      # Assignment
│   │   ├── schemas/               # Pydantic schemas (request/response)
│   │   │   ├── auth.py
│   │   │   ├── employee.py
│   │   │   ├── project.py
│   │   │   └── assignment.py
│   │   ├── api/                   # FastAPI routers
│   │   │   ├── auth.py
│   │   │   ├── employees.py
│   │   │   ├── projects.py
│   │   │   ├── assignments.py
│   │   │   ├── calendar.py        # Endpoint do timeline data
│   │   │   └── holidays.py        # Święta polskie
│   │   ├── services/              # Business logic
│   │   │   ├── auth_service.py
│   │   │   ├── assignment_service.py  # Kalkulacja godzin, FTE
│   │   │   ├── calendar_service.py    # Working days, holidays
│   │   │   └── calamari_service.py    # Integracja Calamari
│   │   ├── core/
│   │   │   ├── security.py        # JWT, password hashing
│   │   │   └── dependencies.py    # FastAPI dependencies (get_db, get_current_user)
│   │   └── utils/
│   │       ├── working_days.py    # Obliczanie dni roboczych
│   │       └── polish_holidays.py # Lista świąt polskich
│   ├── alembic/                   # Migracje bazy danych
│   ├── tests/
│   ├── alembic.ini
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── api/                   # API client (fetch wrappers)
│   │   │   ├── client.ts          # Base fetch z JWT interceptor
│   │   │   ├── auth.ts
│   │   │   ├── employees.ts
│   │   │   ├── projects.ts
│   │   │   └── assignments.ts
│   │   ├── components/
│   │   │   ├── ui/                # shadcn/ui components
│   │   │   ├── layout/
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   └── Layout.tsx
│   │   │   ├── auth/
│   │   │   │   └── LoginForm.tsx
│   │   │   ├── employees/
│   │   │   │   ├── EmployeeList.tsx
│   │   │   │   └── EmployeeForm.tsx
│   │   │   ├── projects/
│   │   │   │   ├── ProjectList.tsx
│   │   │   │   └── ProjectForm.tsx
│   │   │   ├── assignments/
│   │   │   │   └── AssignmentModal.tsx
│   │   │   └── timeline/
│   │   │       ├── Timeline.tsx           # Główny komponent
│   │   │       ├── TimelineHeader.tsx     # Nagłówki dat
│   │   │       ├── TimelineRow.tsx        # Wiersz pracownika
│   │   │       ├── TimelineBar.tsx        # Pasek assignmentu (draggable, resizable)
│   │   │       ├── TimelineFilters.tsx    # Filtry zespołów, przełącznik widoków
│   │   │       └── UtilizationBadge.tsx   # Badge z % obłożenia
│   │   ├── hooks/
│   │   │   ├── useAssignments.ts
│   │   │   ├── useTimeline.ts
│   │   │   └── useWorkingDays.ts
│   │   ├── stores/
│   │   │   └── timelineStore.ts   # Zustand: viewMode, filters, dateRange
│   │   ├── lib/
│   │   │   ├── workingDays.ts     # Kalkulacja dni roboczych (mirror backendu)
│   │   │   └── utils.ts
│   │   └── types/
│   │       └── index.ts           # Shared TypeScript types
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   └── package.json
├── docker-compose.yml             # PostgreSQL + backend + frontend
├── CLAUDE.md                      # Ten plik
└── PRD.md                         # Dokument wymagań
```

## Modele danych (SQLAlchemy)

```
User: id, email, password_hash, full_name, role(admin|user), is_active, failed_login_attempts, locked_until, created_at
Employee: id, first_name, last_name, team(enum: nullable), is_deleted, created_at
Project: id, name(unique), color, is_deleted, created_at
Assignment: id, employee_id(FK), project_id(FK), start_date, end_date, allocation_type(enum: percentage|monthly_hours), allocation_value(Decimal), note, created_at, updated_at
```

## Kluczowe reguły biznesowe

- 1 FTE = 100% = 8h/dzień × dni robocze w miesiącu
- Minimalna jednostka: 1h (nie minuty)
- Pracujemy pon-pt; soboty i niedziele widoczne ale bez assignmentów
- Tydzień zaczyna się od poniedziałku
- Alokacja procentowa: godziny_dziennie = 8 × (procent / 100)
- Godziny miesięczne: godziny_dziennie = godziny_msc / dni_robocze_w_msc
- Przy niepełnym miesiącu w assignmencie: godziny proporcjonalnie do dni roboczych w tym okresie
- Obłożenie > 100% FTE = czerwone wyróżnienie, ale system NIE blokuje
- Święta polskie (stałe + ruchome) pomniejszają dni robocze
- Usunięty pracownik z aktywnymi assignmentami: ostrzeżenie, przyszłe assignmenty usuwane, historyczne archiwizowane (soft delete + flag)
- Usunięty projekt: kaskadowe usunięcie assignmentów (po potwierdzeniu)

## Konwencje kodu

### Backend (Python)

- Async everywhere (async def, await)
- Type hints na wszystkich funkcjach
- Pydantic models dla request/response (nie dict)
- Dependency injection przez FastAPI Depends()
- Nazwy endpointów: RESTful (GET /api/employees, POST /api/assignments, PATCH /api/assignments/{id})
- Statusy HTTP: 200, 201, 204, 400, 401, 403, 404, 409, 422
- Error responses: {"detail": "message"}
- Docstrings na service functions

### Frontend (TypeScript/React)

- Strict TypeScript (no `any`)
- Functional components + hooks only
- TanStack Query do WSZYSTKICH operacji API (queries + mutations)
- Colocation: komponent + hook + types w tym samym katalogu gdy specyficzne
- CSS: wyłącznie Tailwind utility classes + shadcn/ui
- Nazewnictwo: PascalCase komponenty, camelCase funkcje, SCREAMING_SNAKE stałe

## Polecenia dev

```bash
# Backend
cd backend && pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Frontend
cd frontend && npm install
npm run dev  # port 5173

# Database
docker compose up -d db
cd backend && alembic upgrade head

# Testy
cd backend && pytest
cd frontend && npm run test
```

## API Endpoints (szkic)

```
POST   /api/auth/login          # Login, zwraca JWT
POST   /api/auth/refresh        # Refresh token

GET    /api/employees           # Lista (z filtrowaniem po team)
POST   /api/employees           # Dodaj
PATCH  /api/employees/{id}      # Edytuj
DELETE /api/employees/{id}      # Usuń (soft delete)

GET    /api/projects            # Lista
POST   /api/projects            # Dodaj
PATCH  /api/projects/{id}       # Edytuj
DELETE /api/projects/{id}       # Usuń

GET    /api/assignments                    # Lista (filtry: employee_id, project_id, date_from, date_to)
GET    /api/assignments/timeline           # Dane do timeline (zakres dat, filtr team)
POST   /api/assignments                    # Utwórz
PATCH  /api/assignments/{id}               # Edytuj (w tym zmiana pracownika przez D&D)
DELETE /api/assignments/{id}               # Usuń

GET    /api/calendar/working-days          # Dni robocze w zakresie dat
GET    /api/calendar/holidays/{year}       # Święta polskie
GET    /api/calendar/vacations             # Urlopy z Calamari (P1)
```

## Timeline endpoint — kontrakt

`GET /api/assignments/timeline?start_date=2026-01-01&end_date=2026-06-30&teams=Frontend,Backend`

Response:
```json
{
  "employees": [
    {
      "id": 1,
      "name": "Kowalski Jan",
      "team": "Frontend",
      "assignments": [
        {
          "id": 10,
          "project_id": 5,
          "project_name": "Projekt Alpha",
          "project_color": "#3B82F6",
          "start_date": "2026-01-15",
          "end_date": "2026-03-31",
          "allocation_type": "percentage",
          "allocation_value": 50,
          "note": "Lead developer",
          "daily_hours": 4.0
        }
      ],
      "utilization": {
        "2026-01": { "percentage": 75, "hours": 126, "available_hours": 168, "is_overbooked": false },
        "2026-02": { "percentage": 110, "hours": 176, "available_hours": 160, "is_overbooked": true }
      }
    }
  ],
  "holidays": ["2026-01-01", "2026-01-06", "2026-05-01", "2026-05-03"],
  "working_days_per_month": { "2026-01": 21, "2026-02": 20, "2026-03": 22 }
}
```
