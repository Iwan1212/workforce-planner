"""Tests for team/technology schema validation and employee id-csv parsing."""

import pytest
from pydantic import ValidationError

from app.utils.query_params import parse_id_csv
from app.schemas.employee import EmployeeCreate, EmployeeUpdate
from app.schemas.team import TeamCreate, TeamUpdate
from app.schemas.technology import TechnologyCreate


class TestTeamSchemaValidation:
    def test_valid_name_trimmed(self):
        assert TeamCreate(name="  Platform  ").name == "Platform"

    def test_blank_name_rejected(self):
        with pytest.raises(ValidationError):
            TeamCreate(name="   ")

    def test_update_blank_name_rejected(self):
        with pytest.raises(ValidationError):
            TeamUpdate(name="")


class TestTechnologySchemaValidation:
    def test_valid_name_trimmed(self):
        assert TechnologyCreate(name="  React  ").name == "React"

    def test_blank_name_rejected(self):
        with pytest.raises(ValidationError):
            TechnologyCreate(name="")


class TestEmployeeSchemaWithTechnologies:
    def test_defaults_no_team_empty_technologies(self):
        e = EmployeeCreate(first_name="Jan", last_name="Kowalski")
        assert e.team_id is None
        assert e.technology_ids == []

    def test_team_and_technologies_accepted(self):
        e = EmployeeCreate(
            first_name="Jan",
            last_name="Kowalski",
            team_id=3,
            technology_ids=[1, 2, 5],
        )
        assert e.team_id == 3
        assert e.technology_ids == [1, 2, 5]

    def test_blank_name_rejected(self):
        with pytest.raises(ValidationError):
            EmployeeCreate(first_name="  ", last_name="Kowalski")

    def test_update_team_id_presence_tracked(self):
        """Setting team_id=None explicitly must be distinguishable from omission."""
        omitted = EmployeeUpdate(first_name="Jan")
        assert "team_id" not in omitted.model_fields_set

        cleared = EmployeeUpdate(team_id=None)
        assert "team_id" in cleared.model_fields_set

    def test_update_technology_ids_optional(self):
        assert EmployeeUpdate().technology_ids is None
        assert EmployeeUpdate(technology_ids=[]).technology_ids == []


class TestParseIdCsv:
    def test_basic(self):
        assert parse_id_csv("1,2,3") == [1, 2, 3]

    def test_whitespace_and_empty_parts(self):
        assert parse_id_csv(" 1 , ,2, ") == [1, 2]

    def test_invalid_value_raises(self):
        from fastapi import HTTPException

        with pytest.raises(HTTPException) as exc:
            parse_id_csv("1,abc")
        assert exc.value.status_code == 400
