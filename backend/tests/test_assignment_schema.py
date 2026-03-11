"""Tests for assignment schema validation (date range checks)."""

from datetime import date
from decimal import Decimal

import pytest
from app.schemas.assignment import AssignmentCreate, AssignmentUpdate
from pydantic import ValidationError


class TestAssignmentCreateDateValidation:
    def _defaults(self, **overrides):
        base = {
            "employee_id": 1,
            "project_id": 1,
            "start_date": date(2026, 3, 2),
            "end_date": date(2026, 3, 31),
            "allocation_type": "percentage",
            "allocation_value": Decimal("100"),
        }
        base.update(overrides)
        return base

    def test_valid_date_range(self):
        a = AssignmentCreate(**self._defaults())
        assert a.start_date < a.end_date

    def test_single_day_assignment_allowed(self):
        a = AssignmentCreate(
            **self._defaults(
                start_date=date(2026, 3, 2),
                end_date=date(2026, 3, 2),
            )
        )
        assert a.start_date == a.end_date

    def test_end_before_start_rejected(self):
        with pytest.raises(ValidationError) as exc_info:
            AssignmentCreate(
                **self._defaults(
                    start_date=date(2026, 3, 15),
                    end_date=date(2026, 3, 1),
                )
            )
        assert "end_date must be greater than or equal to start_date" in str(
            exc_info.value
        )


class TestAssignmentUpdateDateValidation:
    def test_both_dates_valid(self):
        u = AssignmentUpdate(
            start_date=date(2026, 3, 1),
            end_date=date(2026, 3, 31),
        )
        assert u.start_date < u.end_date

    def test_both_dates_single_day_allowed(self):
        u = AssignmentUpdate(
            start_date=date(2026, 3, 1),
            end_date=date(2026, 3, 1),
        )
        assert u.start_date == u.end_date

    def test_both_dates_end_before_start_rejected(self):
        with pytest.raises(ValidationError) as exc_info:
            AssignmentUpdate(
                start_date=date(2026, 3, 15),
                end_date=date(2026, 3, 1),
            )
        assert "end_date must be greater than or equal to start_date" in str(
            exc_info.value
        )

    def test_only_start_date_no_validation_error(self):
        """Partial update with only start_date should pass schema validation."""
        u = AssignmentUpdate(start_date=date(2026, 3, 15))
        assert u.start_date == date(2026, 3, 15)
        assert u.end_date is None

    def test_only_end_date_no_validation_error(self):
        """Partial update with only end_date should pass schema validation."""
        u = AssignmentUpdate(end_date=date(2026, 3, 1))
        assert u.end_date == date(2026, 3, 1)
        assert u.start_date is None
