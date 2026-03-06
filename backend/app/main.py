from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.api.auth import router as auth_router
from app.api.assignments import router as assignments_router
from app.api.calendar import router as calendar_router
from app.api.employees import router as employees_router
from app.api.projects import router as projects_router
from app.api.users import router as users_router
from app.config import settings
from app.database import engine


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    await engine.dispose()


app = FastAPI(title="Workforce Planner", version="1.0.0", lifespan=lifespan)

origins = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(employees_router)
app.include_router(projects_router)
app.include_router(assignments_router)
app.include_router(calendar_router)
app.include_router(users_router)


@app.get("/api/health")
async def health_check():
    return {"status": "ok"}


# Serve frontend static files in production
FRONTEND_DIST = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"

if FRONTEND_DIST.is_dir():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="static-assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        file_path = (FRONTEND_DIST / full_path).resolve()
        # Prevent path traversal outside FRONTEND_DIST
        if not str(file_path).startswith(str(FRONTEND_DIST.resolve())):
            return FileResponse(FRONTEND_DIST / "index.html")
        if file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(FRONTEND_DIST / "index.html")
