from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db, require_admin
from app.models.app_settings import AppSettings
from app.models.user import User
from app.models.vacation import Vacation
from app.services.vacation_sync_service import (
    _add_months,
    get_last_sync_timestamp,
    sync_vacations,
)

router = APIRouter(prefix="/api/settings", tags=["settings"])


class CalamariConfigResponse(BaseModel):
    subdomain: str | None = None
    is_configured: bool = False
    last_synced_at: str | None = None


class CalamariConfigUpdate(BaseModel):
    api_key: str
    subdomain: str


@router.get("/calamari", response_model=CalamariConfigResponse)
async def get_calamari_config(
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_admin),
):
    """Get Calamari integration status. Does not expose the API key."""
    result = await db.execute(
        select(AppSettings).where(
            AppSettings.key.in_(["calamari_api_key", "calamari_subdomain"])
        )
    )
    settings = {s.key: s.value for s in result.scalars().all()}

    is_configured = bool(settings.get("calamari_api_key"))

    return CalamariConfigResponse(
        subdomain=settings.get("calamari_subdomain"),
        is_configured=is_configured,
        last_synced_at=await get_last_sync_timestamp(db) if is_configured else None,
    )


@router.put("/calamari")
async def update_calamari_config(
    body: CalamariConfigUpdate,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_admin),
):
    """Save Calamari API key and subdomain, then trigger immediate sync."""
    if not body.api_key.strip() or not body.subdomain.strip():
        raise HTTPException(status_code=400, detail="API key and subdomain are required")

    for key, value in [
        ("calamari_api_key", body.api_key.strip()),
        ("calamari_subdomain", body.subdomain.strip()),
    ]:
        result = await db.execute(select(AppSettings).where(AppSettings.key == key))
        setting = result.scalar_one_or_none()
        if setting:
            setting.value = value
        else:
            db.add(AppSettings(key=key, value=value))

    await db.commit()

    # Trigger immediate sync
    today = date.today()
    start = _add_months(today, -1)
    end = _add_months(today, 6)
    try:
        count = await sync_vacations(db, start, end)
        return {"status": "ok", "message": f"Configuration saved. Synced {count} vacations."}
    except Exception:
        return {"status": "ok", "message": "Configuration saved. Initial sync will run shortly."}


@router.delete("/calamari")
async def delete_calamari_config(
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_admin),
):
    """Remove Calamari configuration and clear cached vacations."""
    await db.execute(
        delete(AppSettings).where(
            AppSettings.key.in_(["calamari_api_key", "calamari_subdomain"])
        )
    )
    await db.execute(delete(Vacation))
    await db.commit()
    return {"status": "ok", "message": "Calamari configuration removed and vacation cache cleared."}
