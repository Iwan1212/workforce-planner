"""Seed demo data: 15 employees, 5 projects, 20 assignments."""
import asyncio
import sys
import os
from datetime import date
from decimal import Decimal

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import select

from app.database import async_session_factory
from app.models.employee import Employee, Team
from app.models.project import Project
from app.models.assignment import Assignment, AllocationType


EMPLOYEES = [
    ("Jan", "Kowalski", Team.Frontend),
    ("Anna", "Nowak", Team.Frontend),
    ("Piotr", "Wiśniewski", Team.Backend),
    ("Maria", "Wójcik", Team.Backend),
    ("Tomasz", "Kamiński", Team.Backend),
    ("Katarzyna", "Lewandowska", Team.QA),
    ("Michał", "Zieliński", Team.QA),
    ("Agnieszka", "Szymańska", Team.PM),
    ("Robert", "Woźniak", Team.PM),
    ("Ewa", "Dąbrowska", Team.UX_UI_Designer),
    ("Paweł", "Kozłowski", Team.Mobile),
    ("Joanna", "Jankowska", Team.Mobile),
    ("Krzysztof", "Mazur", Team.DevOps),
    ("Magdalena", "Krawczyk", Team.Frontend),
    ("Łukasz", "Piotrowski", Team.Backend),
]

PROJECTS = [
    ("Projekt Alpha", "#3B82F6"),
    ("Projekt Beta", "#EF4444"),
    ("Projekt Gamma", "#10B981"),
    ("Projekt Delta", "#F59E0B"),
    ("Projekt Epsilon", "#8B5CF6"),
]


async def main():
    async with async_session_factory() as db:
        # Check if demo data already exists
        result = await db.execute(select(Employee).limit(1))
        if result.scalar_one_or_none():
            print("Data already exists. Delete existing data first or use a fresh DB.")
            return

        # Create employees
        employees = []
        for first, last, team in EMPLOYEES:
            emp = Employee(first_name=first, last_name=last, team=team)
            db.add(emp)
            employees.append(emp)
        await db.flush()
        print(f"Created {len(employees)} employees")

        # Create projects
        projects = []
        for name, color in PROJECTS:
            proj = Project(name=name, color=color)
            db.add(proj)
            projects.append(proj)
        await db.flush()
        print(f"Created {len(projects)} projects")

        # Create assignments (20 total, some overbookings)
        assignments_data = [
            # Jan Kowalski - Frontend, 2 projects = overbooked
            (0, 0, date(2026, 1, 1), date(2026, 6, 30), "percentage", 80),
            (0, 2, date(2026, 3, 1), date(2026, 5, 31), "percentage", 50),
            # Anna Nowak - Frontend
            (1, 0, date(2026, 2, 1), date(2026, 7, 31), "percentage", 100),
            # Piotr Wiśniewski - Backend
            (2, 1, date(2026, 1, 15), date(2026, 4, 30), "percentage", 75),
            (2, 3, date(2026, 5, 1), date(2026, 8, 31), "percentage", 60),
            # Maria Wójcik - Backend, overbooked
            (3, 1, date(2026, 2, 1), date(2026, 5, 31), "percentage", 70),
            (3, 4, date(2026, 3, 1), date(2026, 6, 30), "percentage", 50),
            # Tomasz Kamiński - Backend
            (4, 3, date(2026, 1, 1), date(2026, 3, 31), "monthly_hours", 120),
            # Katarzyna Lewandowska - QA
            (5, 0, date(2026, 2, 1), date(2026, 6, 30), "percentage", 50),
            (5, 1, date(2026, 2, 1), date(2026, 4, 30), "percentage", 50),
            # Michał Zieliński - QA
            (6, 2, date(2026, 3, 1), date(2026, 7, 31), "percentage", 80),
            # Agnieszka Szymańska - PM
            (7, 0, date(2026, 1, 1), date(2026, 6, 30), "percentage", 40),
            (7, 1, date(2026, 1, 1), date(2026, 4, 30), "percentage", 30),
            (7, 2, date(2026, 3, 1), date(2026, 7, 31), "percentage", 30),
            # Robert Woźniak - PM
            (8, 3, date(2026, 2, 1), date(2026, 8, 31), "percentage", 60),
            # Ewa Dąbrowska - UX/UI
            (9, 0, date(2026, 1, 15), date(2026, 3, 31), "percentage", 100),
            (9, 4, date(2026, 4, 1), date(2026, 6, 30), "percentage", 100),
            # Paweł Kozłowski - Mobile
            (10, 4, date(2026, 2, 1), date(2026, 7, 31), "percentage", 100),
            # Joanna Jankowska - Mobile
            (11, 4, date(2026, 3, 1), date(2026, 6, 30), "percentage", 80),
            # Krzysztof Mazur - DevOps, overbooked
            (12, 0, date(2026, 1, 1), date(2026, 6, 30), "percentage", 30),
        ]

        for emp_idx, proj_idx, start, end, alloc_type, alloc_val in assignments_data:
            a = Assignment(
                employee_id=employees[emp_idx].id,
                project_id=projects[proj_idx].id,
                start_date=start,
                end_date=end,
                allocation_type=AllocationType(alloc_type),
                allocation_value=Decimal(str(alloc_val)),
                note=f"Demo assignment - {PROJECTS[proj_idx][0]}",
            )
            db.add(a)
        await db.flush()
        print(f"Created {len(assignments_data)} assignments")

        await db.commit()
        print("Done! Demo data seeded successfully.")


if __name__ == "__main__":
    asyncio.run(main())
