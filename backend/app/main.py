from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.auth import router as auth_router
from app.api.assignments import router as assignments_router
from app.api.calendar import router as calendar_router
from app.api.employees import router as employees_router
from app.api.projects import router as projects_router
from app.database import engine


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    await engine.dispose()


app = FastAPI(title="Workforce Planner", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(employees_router)
app.include_router(projects_router)
app.include_router(assignments_router)
app.include_router(calendar_router)


@app.get("/api/health")
async def health_check():
    return {"status": "ok"}
