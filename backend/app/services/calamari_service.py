from __future__ import annotations

import base64
import logging
from dataclasses import dataclass
from datetime import date
from typing import List, Optional

import httpx

logger = logging.getLogger(__name__)


@dataclass
class Leave:
    """Represents an approved leave from Calamari."""

    employee_email: str
    start_date: date
    end_date: date
    leave_type: str  # "urlop", "chorobowe", "inne"
    calamari_id: str


class CalamariClient:
    """Client for Calamari API integration.

    Uses POST /api/leave/request/v1/find to fetch approved leaves.
    Auth: HTTP Basic with API key as password (user left blank).
    """

    def __init__(self, api_key: Optional[str] = None, subdomain: Optional[str] = None):
        self.api_key = api_key
        self.subdomain = subdomain

    @property
    def base_url(self) -> str:
        sub = self.subdomain or "app"
        return f"https://{sub}.calamari.io"

    def _auth_header(self) -> dict[str, str]:
        """Calamari uses HTTP Basic auth: 'calamari' as username, API key as password."""
        if not self.api_key:
            return {}
        credentials = base64.b64encode(f"calamari:{self.api_key}".encode()).decode()
        return {"Authorization": f"Basic {credentials}"}

    async def get_approved_leaves(
        self, start_date: date, end_date: date, employee_emails: List[str] | None = None,
    ) -> List[Leave]:
        """Fetch approved leaves for a date range from Calamari API.

        Calamari requires an `employee` field per request, so we query
        per employee email. If employee_emails is None/empty, returns [].
        """
        if not self.api_key or not employee_emails:
            return []

        url = f"{self.base_url}/api/leave/request/v1/find"
        all_leaves: List[Leave] = []

        async with httpx.AsyncClient(timeout=30.0) as http:
            for email in employee_emails:
                leaves = await self._fetch_leaves_for_employee(
                    http, url, start_date, end_date, email,
                )
                all_leaves.extend(leaves)

        logger.info("Fetched %d approved leaves from Calamari (%d employees)", len(all_leaves), len(employee_emails))
        return all_leaves

    async def _fetch_leaves_for_employee(
        self,
        http: httpx.AsyncClient,
        url: str,
        start_date: date,
        end_date: date,
        email: str,
    ) -> List[Leave]:
        """Fetch leaves for a single employee from Calamari."""
        payload = {
            "from": start_date.isoformat(),
            "to": end_date.isoformat(),
            "employee": email,
        }

        try:
            response = await http.post(
                url,
                json=payload,
                headers={
                    **self._auth_header(),
                    "Content-Type": "application/json",
                },
            )
            response.raise_for_status()
            data = response.json()
        except httpx.HTTPStatusError as e:
            logger.error("Calamari API HTTP error for %s: %s %s", email, e.response.status_code, e.response.text)
            return []
        except httpx.RequestError as e:
            logger.error("Calamari API request error for %s: %s", email, e)
            return []

        # Calamari may return a list directly or wrap in {"requests": [...]} / {"items": [...]}
        items = data if isinstance(data, list) else data.get("requests") or data.get("items") or []

        leaves: List[Leave] = []
        for item in items:
            status = item.get("status", "")
            if status not in ("APPROVED", "ACCEPTED", "PENDING"):
                continue

            try:
                # Calamari uses "from"/"to" or "startDate"/"endDate"
                raw_start = item.get("from") or item.get("startDate", "")
                raw_end = item.get("to") or item.get("endDate", "")
                leave_start = date.fromisoformat(raw_start[:10])
                leave_end = date.fromisoformat(raw_end[:10])
            except (KeyError, ValueError):
                continue

            leave_type_raw = (
                item.get("absenceTypeName")
                or item.get("leaveTypeName")
                or item.get("leaveType", "")
            )
            leaves.append(
                Leave(
                    employee_email=email,
                    start_date=leave_start,
                    end_date=leave_end,
                    leave_type=self._map_leave_type(leave_type_raw),
                    calamari_id=str(item.get("id", f"{email}_{leave_start}_{leave_end}")),
                )
            )

        return leaves

    @staticmethod
    def _map_leave_type(calamari_type: str) -> str:
        """Map Calamari leave type to internal type."""
        calamari_lower = calamari_type.lower()
        if any(kw in calamari_lower for kw in ("vacation", "urlop", "wypoczyn", "wolne", "timeoff", "time off")):
            return "urlop"
        if any(kw in calamari_lower for kw in ("sick", "chorobow", "l4")):
            return "chorobowe"
        return "inne"
