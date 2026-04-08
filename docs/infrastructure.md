# Infrastructure

## Services

| Service | Dev Port | Prod Port | Image/Build |
|---|---|---|---|
| **Frontend** | 5173 | 80 (via Traefik) | `./frontend` (Vite dev / Nginx prod) |
| **Backend** | 8001 | 8001 (via Traefik) | `./backend` (uvicorn) |
| **PostgreSQL** | 5433 | internal only | `postgres:16` |
| **Traefik** | — | 80, 443 | `traefik:v3.6` (prod only) |

## Docker Compose — Development

`docker-compose.yml` — all-in-one local setup:

```bash
docker compose up -d          # Start all services
docker compose up -d db       # Start only PostgreSQL
docker compose logs -f backend  # Follow backend logs
```

- Backend hot-reloads via volume mount (`./backend/app` -> `/app/app`)
- Frontend hot-reloads via volume mount (`./frontend/src` -> `/app/src`)
- DB data persists in `pgdata` Docker volume
- Migrations + admin user creation run automatically on backend startup

### Dev Database Credentials

| Variable | Value |
|---|---|
| Host | `localhost:5433` |
| Database | `workforce_planner` |
| User | `workforce` |
| Password | `workforce_dev` |

### Default Login

| Field | Value |
|---|---|
| Email | `admin@workforce.local` |
| Password | `Admin123!` |

## Docker Compose — Production

`docker-compose.prod.yml` — production setup with Traefik reverse proxy + Let's Encrypt TLS.

### Prod Architecture

```
Internet
  │
  ├── :80  ──→ Traefik ──→ redirect to :443
  └── :443 ──→ Traefik
                ├── app.${DOMAIN}  ──→ Frontend (Nginx, port 80)
                └── api.${DOMAIN}  ──→ Backend  (uvicorn, port 8001)
                                          │
                                          └──→ PostgreSQL (internal, port 5432)
```

### Required Environment Variables (prod)

| Variable | Description |
|---|---|
| `DOMAIN` | Base domain (e.g. `workforce.example.com`) |
| `ACME_EMAIL` | Email for Let's Encrypt certificate registration |
| `POSTGRES_DB` | Database name |
| `POSTGRES_USER` | Database user |
| `POSTGRES_PASSWORD` | Database password |
| `SECRET_KEY` | JWT signing key — **must be changed from default** |
| `CORS_ORIGINS` | Allowed origins (e.g. `https://app.workforce.example.com`) |

### Optional Environment Variables

| Variable | Default | Description |
|---|---|---|
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `1440` (24h) | JWT access token lifetime |
| `REFRESH_TOKEN_EXPIRE_MINUTES` | `10080` (7d) | JWT refresh token lifetime |
| `ENVIRONMENT` | — | Environment name |
| `RELOAD` | — | Enable uvicorn auto-reload (used in entrypoint.sh, set to "true" in dev compose) |

Note: Calamari API configuration is managed via the `/api/settings/calamari` endpoint and stored in the AppSettings table, not via env vars. See `backend/.env.example` for a reference of all variables.

### Prod Deployment

```bash
# Create .env with all required variables, then:
docker compose -f docker-compose.prod.yml up -d
```

- Frontend uses `Dockerfile.prod` (multi-stage build → Nginx)
- Traefik auto-provisions Let's Encrypt TLS certificates
- TLS certs stored in `letsencrypt` Docker volume
- No ports exposed directly — all traffic routed through Traefik

## Manual Setup (without Docker)

**Prerequisites:** Python 3.12+, Node.js 20+, Docker (for PostgreSQL only)

```bash
# 1. Start database
docker compose up -d db

# 2. Backend
cd backend
python3 -m venv venv
source venv/bin/activate    # Windows: venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
python scripts/create_admin.py
uvicorn app.main:app --reload --port 8001

# 3. Frontend (new terminal)
cd frontend
npm install
npm run dev
```

### Seed Demo Data

```bash
cd backend
python scripts/seed_demo_data.py
# Creates: 15 employees, 5 projects, 20 assignments
```

## Scripts

| Script | Purpose |
|---|---|
| `backend/scripts/create_admin.py` | Create initial admin user |
| `backend/scripts/seed_demo_data.py` | Seed demo employees, projects, assignments |

## CI/CD

Two GitHub Actions workflows in `.github/workflows/`:

| Workflow | Trigger | What it does |
|---|---|---|
| `ci.yml` | PRs + pushes to main | Runs tests, type checking, linting, builds (Python 3.12, Node 20) |
| `deploy.yml` | Pushes to main | Deploys to staging server |
