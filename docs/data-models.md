# Data Models & Business Rules

## SQLAlchemy Models

### User (login accounts)

| Column | Type | Constraints |
|---|---|---|
| id | Integer | PK |
| email | String | unique, not null |
| password_hash | String | not null |
| full_name | String | not null |
| role | Enum | `admin` \| `user` \| `viewer` |
| is_active | Boolean | default true |
| failed_login_attempts | Integer | default 0 |
| locked_until | DateTime | nullable |
| theme | String | default "light" |
| created_at | DateTime | auto |

### Employee

| Column | Type | Constraints |
|---|---|---|
| id | Integer | PK |
| first_name | String | not null |
| last_name | String | not null |
| email | String | nullable, unique |
| team | Enum | nullable — BA, Backend, DevOps, Frontend, ML, Mobile, PM, QA, UX_UI_Designer |
| is_archived | Boolean | default false (wind-down state) |
| created_at | DateTime | auto |

### EmployeeCapacity (contracted capacity, effective-dated)

| Column | Type | Constraints |
|---|---|---|
| id | Integer | PK |
| employee_id | Integer | FK -> Employee, ON DELETE CASCADE, indexed |
| valid_from | Date | not null, unique together with employee_id |
| capacity_type | Enum | `percentage` \| `monthly_hours` |
| capacity_value | Numeric(7,2) | not null, > 0 |
| created_at | DateTime | auto |

Rows carry a **start date only**: each stays in force until the next one
begins, so the timeline is gap-free and overlaps are impossible. Returning to
full time is just another row.

### Project

| Column | Type | Constraints |
|---|---|---|
| id | Integer | PK |
| name | String | unique, not null |
| color | String(7) | not null (hex color) |
| is_archived | Boolean | default false (wind-down state) |
| created_at | DateTime | auto |

### Assignment

| Column | Type | Constraints |
|---|---|---|
| id | Integer | PK |
| employee_id | Integer | FK -> Employee |
| project_id | Integer | FK -> Project |
| start_date | Date | not null |
| end_date | Date | not null |
| allocation_type | Enum | `percentage` \| `monthly_hours` \| `total_hours` |
| allocation_value | Numeric(7,2) | not null |
| note | String | nullable |
| is_tentative | Boolean | default false |
| created_at | DateTime | auto |
| updated_at | DateTime | auto on update |

### Vacation (synced from Calamari)

| Column | Type | Constraints |
|---|---|---|
| id | Integer | PK |
| employee_id | Integer | nullable, indexed (not FK) |
| employee_email | String | not null |
| start_date | Date | not null |
| end_date | Date | not null |
| leave_type | String | not null |
| calamari_id | String | unique, not null |
| synced_at | DateTime | auto |

### AppSettings (key-value config store)

| Column | Type | Constraints |
|---|---|---|
| key | String(255) | PK |
| value | String(2000) | not null |
| updated_at | DateTime | auto on update |

## Relationships

```
User (standalone — login accounts, not linked to Employee)

Employee  1 ──→ N  EmployeeCapacity  (cascade delete)
Employee  1 ──→ N  Assignment
Project   1 ──→ N  Assignment

Vacation.employee_id references Employee.id but is NOT a formal FK
  (vacations are synced from external system, employee matching is best-effort)

AppSettings (standalone — stores Calamari config etc.)
```

## Business Rules

### FTE & Allocation

- **1 FTE = 100% = 8h/day x working days in month**
- Minimum unit: 1 hour (not minutes)
- Working days: Mon-Fri, excluding Polish public holidays
- Week starts on Monday (ISO standard)

### Contracted Capacity (part time)

Every employee has one or more `EmployeeCapacity` periods. Capacity sets the
**denominator** of every occupancy figure and the **meaning of 100%** for that
person.

| Capacity type | Daily hours formula |
|---|---|
| Percentage | `8 x (percentage / 100)` — fixed daily hours |
| Monthly hours | `monthly_hours / working_days_in_month` — fixed monthly total, daily hours move with the calendar |

The two are genuinely different contracts: 25% is always 2h/day (40–46h per
month), while 40h/month is always 40h (1.7–2.0h/day). Both are offered because
part-time employment contracts behave like the first and hour-capped B2B
arrangements like the second.

**Days outside any period count as zero availability**, which is how an
employment start is recorded: move the earliest period's `valid_from` to the
joining date and everything before it is uncovered. Consequences:

- A period whose availability is zero but which has hours booked is reported as
  **overbooked**, not as a quiet 0% — the ratio is undefined and hiding it would
  hide mis-planned work.
- Percentage allocations fall back to the full-time norm on uncovered days, so
  those hours stay visible instead of evaporating to zero.
- The last remaining period of an employee cannot be deleted.

### Allocation Calculation

| Type | Daily hours formula |
|---|---|
| Percentage | `base_daily_hours x (percentage / 100)` |
| Monthly hours | `monthly_hours / working_days_in_month` |
| Total hours | `total_hours / working_days(start_date, end_date)` |
| Partial month | Hours proportional to working days in the assignment's overlap with that month |

`base_daily_hours` is the assignee's contracted daily hours, i.e. a full-time
day for the full-time majority. **A percentage is a share of that person's own
time**, so 100% means a full plate whether they work 8h or 2h a day. Two
consequences worth knowing:

- Moving a percentage assignment between employees changes its hours; hours-based
  allocations are absolute and do not change.
- Placeholder assignments (no assignee) use the full-time norm.

### Overbooking

- Occupancy > 100% FTE = red highlight on timeline
- System does **NOT** block overbooking — it only warns visually

### Tentative Assignments

- Assignments can be marked as `is_tentative` for planning purposes
- Visually distinguished on timeline

### Polish Holidays

13 per year: 9 fixed dates + 4 Easter-based movable holidays. Holidays reduce working days in their month.

### Vacation Integration

- Vacations synced from Calamari API (manual or scheduled sync)
- Vacation days reduce net available hours in occupancy calculations, by the
  employee's own contracted hours rather than a flat 8h
- Percentage allocations skip vacation days entirely; hours-based commitments stay fixed, so vacations can push occupancy above 100%

### Lifecycle Rules

| Entity | Behavior |
|---|---|
| **Employee** | Archive (reversible wind-down) or delete (permanent, takes all assignments). No soft-delete state. |
| **Project** | Archive (reversible wind-down) or delete (permanent, takes all assignments). No soft-delete state. |
| **Assignment** | Hard delete. Supports split and duplicate operations. |

**Archive vs delete.** Archiving winds an entity down: past assignments are kept, ongoing ones are trimmed to end today, future ones are deleted, and no new assignments can reference it (409). Unarchiving re-enables new assignments but does not restore what the wind-down removed.

Deleting is permanent and removes the entity together with **all** of its assignments, history included.

The rules live in `app/services/lifecycle_service.py` and are identical for both entities.

**Visibility.** Archiving hides the entity from its own timeline while keeping it in the other one, so history is never lost from both views at once:

| State | Employee timeline | Project timeline |
|---|:--:|:--:|
| Active project | shown | shown |
| Archived project | shown | hidden |
| Active employee | shown | shown |
| Archived employee | hidden | shown |
