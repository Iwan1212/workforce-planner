from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from typing import List, Optional


@dataclass
class Leave:
    """Represents an approved leave from Calamari."""

    employee_email: str
    start_date: date
    end_date: date
    leave_type: str  # "urlop", "chorobowe", "inne"


class CalamariClient:
    """Client for Calamari API integration.

    Currently a mock implementation that returns empty lists.
    To activate, set CALAMARI_API_KEY in environment and implement
    the actual HTTP calls.
    """

    def __init__(self, api_key: Optional[str] = None, base_url: Optional[str] = None):
        self.api_key = api_key
        self.base_url = base_url or "https://api.calamari.io"

    async def get_approved_leaves(
        self, start_date: date, end_date: date
    ) -> List[Leave]:
        """Fetch approved leaves for a date range.

        Returns empty list in mock mode. When API key is configured,
        will call Calamari API to fetch real leave data.
        """
        if not self.api_key:
            return []

        # TODO: Implement actual Calamari API call
        # Example:
        # async with httpx.AsyncClient() as client:
        #     response = await client.get(
        #         f"{self.base_url}/api/leave/v1/request",
        #         headers={"Authorization": f"Bearer {self.api_key}"},
        #         params={"from": start_date.isoformat(), "to": end_date.isoformat()},
        #     )
        #     response.raise_for_status()
        #     data = response.json()
        #     return [
        #         Leave(
        #             employee_email=item["employee"]["email"],
        #             start_date=date.fromisoformat(item["from"]),
        #             end_date=date.fromisoformat(item["to"]),
        #             leave_type=self._map_leave_type(item["leaveType"]),
        #         )
        #         for item in data.get("requests", [])
        #         if item["status"] == "APPROVED"
        #     ]
        return []

    @staticmethod
    def _map_leave_type(calamari_type: str) -> str:
        """Map Calamari leave type to internal type."""
        mapping = {
            "VACATION": "urlop",
            "SICK_LEAVE": "chorobowe",
        }
        return mapping.get(calamari_type, "inne")


# Singleton instance — configure via environment
_client: Optional[CalamariClient] = None


def get_calamari_client() -> CalamariClient:
    """Get or create the Calamari client singleton."""
    global _client
    if _client is None:
        import os

        _client = CalamariClient(api_key=os.environ.get("CALAMARI_API_KEY"))
    return _client
