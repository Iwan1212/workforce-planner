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
| is_deleted | Boolean | default false (soft delete) |
| created_at | DateTime | auto |

### Project

| Column | Type | Constraints |
|---|---|---|
| id | Integer | PK |
| name | String | unique, not null |
| color | String(7) | not null (hex color) |
| is_deleted | Boolean | default false (soft delete) |
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

### Allocation Calculation

| Type | Daily hours formula |
|---|---|
| Percentage | `8 x (percentage / 100)` |
| Monthly hours | `monthly_hours / working_days_in_month` |
| Partial month | Hours proportional to working days in the assignment's overlap with that month |

### Overbooking

- Utilization > 100% FTE = red highlight on timeline
- System does **NOT** block overbooking — it only warns visually

### Tentative Assignments

- Assignments can be marked as `is_tentative` for planning purposes
- Visually distinguished on timeline

### Polish Holidays

13 per year: 9 fixed dates + 4 Easter-based movable holidays. Holidays reduce working days in their month.

### Vacation Integration

- Vacations synced from Calamari API (manual or scheduled sync)
- Vacation days reduce available hours in utilization calculations
- `vacation_days` field in per-month utilization shows working days covered by vacations

### Deletion Rules

| Entity | Behavior |
|---|---|
| **Employee** | Soft delete. Warning if active assignments exist. Future assignments removed, historical archived. |
| **Project** | Soft delete. Cascade deletes all linked assignments (after confirmation). |
| **Assignment** | Hard delete. Supports split and duplicate operations. |
