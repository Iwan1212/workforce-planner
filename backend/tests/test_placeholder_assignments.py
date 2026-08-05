"""Tests for placeholder assignments (assignments with employee_id = NULL).

Schema-level tests (no DB), matching the conventions of the other test modules:
- AssignmentCreate accepts an explicit null / missing employee_id
- AssignmentUpdate distinguishes "field absent" from "explicit null" via
  model_fields_set (used by PATCH to un-assign an employee)
- AssignmentResponse serializes placeholders (employee_id null)
- The timeline serialization helper handles placeholder assignments
"""

from datetime import date, datetime
from decimal import Decimal

import pytest
from pydantic import ValidationError

from app.api.calendar import _serialize_timeline_assignment
from app.models.assignment import AllocationType, Assignment
from app.schemas.assignment import (
    AssignmentCreate,
    AssignmentResponse,
    AssignmentUpdate,
)


def _create_defaults(**overrides):
    base = {
        "project_id": 1,
        "start_date": date(2026, 3, 2),
        "end_date": date(2026, 3, 31),
        "allocation_type": "percentage",
        "allocation_value": Decimal("100"),
    }
    base.update(overrides)
    return base


class TestAssignmentCreatePlaceholder:
    def test_explicit_null_employee_id_accepted(self):
        a = AssignmentCreate(**_create_defaults(employee_id=None))
        assert a.employee_id is None

    def test_missing_employee_id_defaults_to_none(self):
        a = AssignmentCreate(**_create_defaults())
        assert a.employee_id is None

    def test_integer_employee_id_still_accepted(self):
        a = AssignmentCreate(**_create_defaults(employee_id=7))
        assert a.employee_id == 7

    def test_placeholder_still_validates_dates(self):
        """Placeholder creation keeps the regular date-range validation."""
        with pytest.raises(ValidationError):
            AssignmentCreate(
                **_create_defaults(
                    employee_id=None,
                    start_date=date(2026, 3, 15),
                    end_date=date(2026, 3, 1),
                )
            )


class TestAssignmentUpdateFieldsSet:
    """PATCH semantics: 'field absent' vs 'explicit null' via model_fields_set."""

    def test_absent_employee_id_not_in_fields_set(self):
        u = AssignmentUpdate(start_date=date(2026, 3, 1))
        assert "employee_id" not in u.model_fields_set
        assert u.employee_id is None

    def test_explicit_null_employee_id_in_fields_set(self):
        """Explicit null (un-assign to placeholder) is distinguishable from absent."""
        u = AssignmentUpdate(employee_id=None)
        assert "employee_id" in u.model_fields_set
        assert u.employee_id is None

    def test_explicit_employee_id_in_fields_set(self):
        u = AssignmentUpdate(employee_id=5)
        assert "employee_id" in u.model_fields_set
        assert u.employee_id == 5

    def test_json_payload_with_explicit_null(self):
        """Explicit null survives model_validate of a JSON-style payload."""
        u = AssignmentUpdate.model_validate({"employee_id": None})
        assert "employee_id" in u.model_fields_set
        assert u.employee_id is None

    def test_json_payload_without_employee_id(self):
        u = AssignmentUpdate.model_validate({"note": "x"})
        assert "employee_id" not in u.model_fields_set


class TestAssignmentResponsePlaceholder:
    def test_response_accepts_null_employee_id(self):
        r = AssignmentResponse(
            id=1,
            employee_id=None,
            project_id=2,
            project_name="Projekt Alpha",
            project_color="#3B82F6",
            start_date=date(2026, 3, 2),
            end_date=date(2026, 3, 31),
            allocation_type="percentage",
            allocation_value=100.0,
            daily_hours=8.0,
            created_at=datetime(2026, 3, 1, 12, 0, 0),
        )
        assert r.employee_id is None


class TestSerializeTimelineAssignment:
    def _placeholder(self, **overrides):
        base = {
            "id": 10,
            "employee_id": None,
            "project_id": 5,
            "start_date": date(2026, 3, 2),
            "end_date": date(2026, 3, 31),
            "allocation_type": AllocationType.percentage,
            "allocation_value": Decimal("50"),
            "note": None,
            "is_tentative": False,
        }
        base.update(overrides)
        return Assignment(**base)

    def test_placeholder_serialization(self):
        a = self._placeholder()
        result = _serialize_timeline_assignment(a, date(2026, 3, 1))
        assert result == {
            "id": 10,
            "project_id": 5,
            "project_name": "",
            "project_color": "#000000",
            "start_date": "2026-03-02",
            "end_date": "2026-03-31",
            "allocation_type": "percentage",
            "allocation_value": 50.0,
            "note": None,
            "is_tentative": False,
            "daily_hours": 4.0,
        }

    def test_daily_hours_uses_range_start_when_assignment_starts_earlier(self):
        """monthly_hours daily rate depends on the first visible month."""
        a = self._placeholder(
            allocation_type=AllocationType.monthly_hours,
            allocation_value=Decimal("30"),
            start_date=date(2026, 1, 1),
            end_date=date(2026, 3, 31),
        )
        # Range starts in Feb 2026 (20 working days) => 30h / 20d = 1.5h/day
        result = _serialize_timeline_assignment(a, date(2026, 2, 1))
        assert result["daily_hours"] == 1.5
