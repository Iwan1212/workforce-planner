from __future__ import annotations

from fastapi import HTTPException


def parse_id_csv(raw: str) -> list[int]:
    """Parse a comma-separated list of integer ids, raising 400 on bad input."""
    ids: list[int] = []
    for part in raw.split(","):
        part = part.strip()
        if not part:
            continue
        try:
            ids.append(int(part))
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid id value: {part}")
    return ids
