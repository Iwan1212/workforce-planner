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
GET    /api/projects                        # List projects (200)
POST   /api/projects                        # Create project, unique name (201)
PATCH  /api/projects/{id}                   # Update project (200)
DELETE /api/projects/{id}                   # Delete with cascade (200, see below)
```

**Delete behavior:** Same two-step pattern as employees — returns active assignment info if `?confirm=true` is not passed.

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
      "utilization": {
        "2026-01": {
          "percentage": 75,
          "hours": 126,
          "available_hours": 168,
          "vacation_days": 0,
          "is_overbooked": false
        },
        "2026-02": {
          "percentage": 110,
          "hours": 176,
          "available_hours": 160,
          "vacation_days": 2,
          "is_overbooked": true
        }
      }
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
| `utilization` | object | Per-month utilization keyed by "YYYY-MM" |

**Assignment object (in timeline):**

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

**Utilization object (per month):**

| Field | Type | Description |
|---|---|---|
| `percentage` | int | Sum of all assignment percentages |
| `hours` | float | Total allocated hours |
| `available_hours` | float | Working days x 8h |
| `vacation_days` | int | Working days covered by vacations |
| `is_overbooked` | bool | True if percentage > 100 |

**Vacation sync status:**

| Field | Type | Description |
|---|---|---|
| `last_synced_at` | datetime\|null | Last successful sync timestamp |
| `is_configured` | bool | Whether Calamari integration is configured |

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
