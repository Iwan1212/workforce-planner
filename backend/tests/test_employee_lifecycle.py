"""Contract tests for the employee lifecycle rework.

The wind-down rules themselves are shared with projects and covered in
test_lifecycle_wind_down.py. What is pinned here is the API surface that
changed: the response now reports `is_archived` and no longer `is_deleted`,
and the list filter is a tri-state status rather than a boolean.
"""

from datetime import datetime

import pytest
from pydantic import ValidationError

from app.schemas.employee import EmployeeResponse

BASE = {
    "id": 1,
    "first_name": "Anna",
    "last_name": "Kowalska",
    "created_at": datetime(2026, 1, 1),
}


class TestEmployeeResponseArchiveFlag:
    def test_is_archived_is_reported(self):
        emp = EmployeeResponse(**BASE, is_archived=True)
        assert emp.is_archived is True

    def test_is_archived_is_required(self):
        with pytest.raises(ValidationError):
            EmployeeResponse(**BASE)

    def test_is_deleted_is_gone_from_the_contract(self):
        # An old client sending is_deleted gets it ignored rather than echoed.
        emp = EmployeeResponse(**BASE, is_archived=False, is_deleted=True)
        assert not hasattr(emp, "is_deleted")
        assert emp.is_archived is False


class TestStatusFilterValues:
    """The list endpoint accepts exactly active / archived / all."""

    def test_accepted_values_match_projects(self):
        from typing import get_args, get_type_hints

        from app.api.employees import list_employees

        hints = get_type_hints(list_employees)
        assert set(get_args(hints["employee_status"])) == {
            "active",
            "archived",
            "all",
        }
