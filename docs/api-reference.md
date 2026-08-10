# API Reference

Base URL: `/api`

All endpoints (except login and health) require `Authorization: Bearer <jwt_token>` header.

## Health

```
GET    /api/health                          # Health check
```

## Authentication

```
POST   /api/auth/login                      # Returns JWT access + refresh token (201)
POST   /api/auth/refresh                    # Refresh access token using refresh token (201)
GET    /api/auth/me                         # Current user info (200)
PATCH  /api/auth/me/theme                   # Update user theme preference (200)
POST   /api/auth/reset-password-request     # Request password reset (token logged to console in dev)
POST   /api/auth/reset-password             # Reset password with token
```

Login response includes `access_token`, `refresh_token`, and `token_type: "bearer"`.

## Employees

```
GET    /api/employees                       # List employees (filter: ?team=Frontend&search=name)
POST   /api/employees                       # Create employee (201)
PATCH  /api/employees/{id}                  # Update employee (200)
DELETE /api/employees/{id}                  # Soft delete (200, see below)
```

**Delete behavior:** If the employee has active assignments and `?confirm=true` is not passed, returns 200 with:
```json
{
  "has_active_assignments": true,
  "active_assignments_count": 3,
  "active_assignments": [{"id": 1, "project_id": 5, "start_date": "...", "end_date": "..."}],
  "message": "Employee has active assignments. Pass ?confirm=true to proceed."
}
```
On successful deletion: `{"deleted": true}` (200).

## Projects

```
GET    /api/projects                        # List projects (200, ?status=active|archived|all, default active)
GET    /api/projects/timeline               # Timeline grouped by project (200, see below)
POST   /api/projects                        # Create project, unique name (201)
PATCH  /api/projects/{id}                   # Update project (200)
POST   /api/projects/{id}/archive           # Archive + wind down assignments (200, see below)
POST   /api/projects/{id}/unarchive         # Re-enable for new assignments (200)
DELETE /api/projects/{id}                   # Permanent delete with all assignments (200, see below)
```

A project is either **active**, **archived**, or gone. There is no soft-deleted state.

**Archive** is a reversible wind-down. Every assignment on the project is classified relative to today:

| Category | Condition | Action |
|---|---|---|
| Past | `end_date < today` | kept untouched — historical occupancy is preserved |
| Ongoing | `start_date <= today <= end_date` | `end_date` trimmed to today |
| Future | `start_date > today` | deleted |

Boundary rules: an assignment with `start_date == today` is *ongoing* (trimmed to a single day), not future; one with `end_date == today` is ongoing and needs no change.

Archived projects are hidden from `GET /api/projects/timeline` but their assignments still appear in `GET /api/assignments/timeline`, so per-person history stays intact. Creating or patching an assignment onto an archived project returns 409, as does duplicating one.

**Unarchive** re-enables the project for new assignments. It does **not** restore assignments that archiving trimmed or deleted.

**Delete** is permanent: the project row and **all** of its assignments (past, ongoing and future) are removed. Two-step confirmation — without `?confirm=true`, a project that has any assignments returns them for confirmation instead of deleting:

```json
{"has_assignments": true, "assignments_count": 12, "message": "..."}
```

With `?confirm=true` (or when the project has no assignments): `{"deleted": true, "deleted_assignments": 12}`.

## Assignments

```
GET    /api/assignments                     # List (filters: employee_id, project_id, date_from, date_to)
POST   /api/assignments                     # Create assignment (201)
PATCH  /api/assignments/{id}                # Update (dates, allocation, employee) (200)
POST   /api/assignments/{id}/split          # Split assignment at a given date (200)
POST   /api/assignments/{id}/duplicate      # Duplicate an assignment (201)
DELETE /api/assignments/{id}                # Delete assignment (204)
```

Assignment response includes: `id`, `employee_id`, `project_id`, `project_name`, `project_color`, `start_date`, `end_date`, `allocation_type`, `allocation_value`, `daily_hours`, `note`, `is_tentative`, `created_at`.

**Placeholder assignments:** `employee_id` is nullable (`int|null`) on create and in responses. `null` marks a *placeholder* — planned work on a project not yet allocated to a specific person. On PATCH, sending an explicit `"employee_id": null` un-assigns the employee (turns the assignment back into a placeholder); omitting the field leaves the employee unchanged.

## Users (Admin)

```
GET    /api/users                           # List all users (200)
POST   /api/users                           # Create user (201)
PATCH  /api/users/{id}                      # Update user (200)
DELETE /api/users/{id}                      # Delete user (204)
```

## Settings

```
GET    /api/settings/calamari               # Get Calamari configuration status (200)
PUT    /api/settings/calamari               # Update Calamari configuration (200)
DELETE /api/settings/calamari               # Remove Calamari configuration (200)
```

## Calendar

```
GET    /api/calendar/holidays/{year}        # Polish holidays [{date, name}] (200)
GET    /api/calendar/working-days           # Working days in date range (200)
GET    /api/calendar/vacations              # Vacations from Calamari (200)
POST   /api/calendar/vacations/sync         # Trigger manual vacation sync (200)
```

## Timeline Endpoint

The main data endpoint powering the timeline view.

### Request

```
GET /api/assignments/timeline?start_date=2026-01-01&end_date=2026-06-30&teams=Frontend,Backend&search=Kowalski
```

| Parameter | Type | Required | Description |
|---|---|---|---|
| `start_date` | date | yes | Range start (YYYY-MM-DD) |
| `end_date` | date | yes | Range end (YYYY-MM-DD) |
| `teams` | string | no | Comma-separated team filter |
| `search` | string | no | Filter employees by first/last name |
| `granularity` | enum | no | `monthly` (default) or `weekly` — period size for occupancy |

### Response

```json
{
  "employees": [
    {
      "id": 1,
      "name": "Kowalski Jan",
      "team": "Frontend",
      "assignments": [
        {
          "id": 10,
          "project_id": 5,
          "project_name": "Projekt Alpha",
          "project_color": "#3B82F6",
          "start_date": "2026-01-15",
          "end_date": "2026-03-31",
          "allocation_type": "percentage",
          "allocation_value": 50,
          "note": "Lead developer",
          "is_tentative": false,
          "daily_hours": 4.0
        }
      ],
      "vacations": [
        {
          "start_date": "2026-02-02",
          "end_date": "2026-02-03",
          "leave_type": "vacation",
          "employee_email": "jan.kowalski@example.com",
          "synced_at": "2026-04-07T14:30:00Z"
        }
      ],
      "occupancy": {
        "2026-01": {
          "percentage": 75,
          "hours": 126,
          "available_hours": 168,
          "is_overbooked": false
        },
        "2026-02": {
          "percentage": 110,
          "hours": 167.2,
          "available_hours": 152,
          "is_overbooked": true
        }
      }
    }
  ],
  "placeholders": [
    {
      "id": 12,
      "project_id": 5,
      "project_name": "Projekt Alpha",
      "project_color": "#3B82F6",
      "start_date": "2026-02-01",
      "end_date": "2026-02-28",
      "allocation_type": "percentage",
      "allocation_value": 100,
      "note": "Potrzebny drugi frontend developer",
      "is_tentative": false,
      "daily_hours": 8.0
    }
  ],
  "holidays": [
    {"date": "2026-01-01", "name": "Nowy Rok"},
    {"date": "2026-01-06", "name": "Trzech Króli"}
  ],
  "working_days_per_month": {
    "2026-01": 21,
    "2026-02": 20,
    "2026-03": 22
  },
  "vacation_sync_status": {
    "last_synced_at": "2026-04-07T14:30:00Z",
    "is_configured": true
  }
}
```

### Response Fields

**Employee object:**

| Field | Type | Description |
|---|---|---|
| `id` | int | Employee ID |
| `name` | string | "Last First" format |
| `team` | string\|null | Team enum value |
| `assignments` | array | Assignments within requested date range |
| `vacations` | array | Vacations within requested date range |
| `occupancy` | object | Per-period occupancy keyed by "YYYY-MM" (monthly) or "w-YYYY-WW" (weekly) |

**Placeholders:**

`placeholders` is a list of placeholder assignments (`employee_id` is null — planned work not yet allocated to a person) within the requested date range. Each entry has the same shape as the assignment object below. Placeholders are returned regardless of employee filters (`teams`, `search`) since they belong to no employee.

**Assignment object (in timeline and in `placeholders`):**

| Field | Type | Description |
|---|---|---|
| `id` | int | Assignment ID |
| `project_id` | int | Project ID |
| `project_name` | string | Project name |
| `project_color` | string | Hex color |
| `start_date` | date | Assignment start |
| `end_date` | date | Assignment end |
| `allocation_type` | enum | `percentage`, `monthly_hours`, or `total_hours` |
| `allocation_value` | decimal | The raw allocation value |
| `note` | string\|null | Optional note |
| `is_tentative` | bool | Whether assignment is tentative |
| `daily_hours` | float | Computed daily hours |

**Occupancy object (per period — month or week):**

| Field | Type | Description |
|---|---|---|
| `percentage` | float | Allocated hours / net available hours x 100 |
| `hours` | float | Total allocated hours in the period |
| `available_hours` | float | Net available hours: (working days − vacation days) x 8h |
| `is_overbooked` | bool | True if percentage > 100 |

**Vacation sync status:**

| Field | Type | Description |
|---|---|---|
| `last_synced_at` | datetime\|null | Last successful sync timestamp |
| `is_configured` | bool | Whether Calamari integration is configured |

## Project Timeline Endpoint

Timeline data grouped by project (instead of by employee). Powers the Project Timeline view.

### Request

```
GET /api/projects/timeline?start_date=2026-01-01&end_date=2026-06-30&search=Alpha
```

| Parameter | Type | Required | Description |
|---|---|---|---|
| `start_date` | date | yes | Range start (YYYY-MM-DD) |
| `end_date` | date | yes | Range end (YYYY-MM-DD) |
| `search` | string | no | Filter projects by name (case-insensitive substring) |

### Response

```json
{
  "projects": [
    {
      "id": 5,
      "name": "Projekt Alpha",
      "color": "#3B82F6",
      "assignments": [
        {
          "id": 10,
          "employee_id": 1,
          "employee_name": "Kowalski Jan",
          "employee_team": "Frontend",
          "start_date": "2026-01-15",
          "end_date": "2026-03-31",
          "allocation_type": "percentage",
          "allocation_value": 50,
          "note": "Lead developer",
          "is_tentative": false,
          "daily_hours": 4.0
        }
      ]
    }
  ],
  "holidays": [
    {"date": "2026-01-01", "name": "Nowy Rok"},
    {"date": "2026-01-06", "name": "Trzech Króli"}
  ],
  "working_days_per_month": {
    "2026-01": 21,
    "2026-02": 20,
    "2026-03": 22
  }
}
```

### Response Fields

**Project object:**

| Field | Type | Description |
|---|---|---|
| `id` | int | Project ID |
| `name` | string | Project name |
| `color` | string | Hex color |
| `assignments` | array | Assignments within requested date range — held by non-deleted employees, plus placeholders (`employee_id` null), which ARE included; assignments of deleted employees are excluded |

Non-deleted projects are always returned (sorted by name), even when they have no assignments in the range.

**Assignment object (in project timeline):**

| Field | Type | Description |
|---|---|---|
| `id` | int | Assignment ID |
| `employee_id` | int\|null | Employee ID (`null` for placeholder assignments) |
| `employee_name` | string\|null | "Last First" format (`null` for placeholder assignments) |
| `employee_team` | string\|null | Team enum value |
| `start_date` | date | Assignment start |
| `end_date` | date | Assignment end |
| `allocation_type` | enum | `percentage`, `monthly_hours`, or `total_hours` |
| `allocation_value` | decimal | The raw allocation value |
| `note` | string\|null | Optional note |
| `is_tentative` | bool | Whether assignment is tentative |
| `daily_hours` | float | Computed daily hours |

`holidays` and `working_days_per_month` have the same shape as in the employee timeline endpoint. This endpoint does not return `utilization` or `vacation_sync_status`.

## HTTP Status Codes

| Code | Usage |
|---|---|
| 200 | Success (GET, PATCH, DELETE employees/projects) |
| 201 | Created (POST login, POST create) |
| 204 | Deleted (DELETE assignments, DELETE users) |
| 400 | Bad request |
| 401 | Unauthorized / invalid token |
| 403 | Forbidden / insufficient role |
| 404 | Resource not found |
| 409 | Conflict (e.g. duplicate project name) |
| 422 | Validation error (Pydantic) |

## Error Response Format

```json
{"detail": "Human-readable error message"}
```
