# LocoTrails Pro™ — Indian Railways Locomotive Trial & Traction Analytics Platform

**LocoTrails Pro** is a full-stack, enterprise-grade web application transformed from the original Python Tkinter desktop tool (`DailyLocoTrailsTool.py`). It ingests railway locomotive trial telemetry spreadsheets across divisional sections (e.g., Secunderabad, Kazipet, Vijayawada), applies automated zero-start filtration, reconciles locomotive numbers against OEM manufacturers (Medha Servo Drives, BHEL, Siemens, Alstom, etc.), and compiles official 4-sheet Microsoft Excel workbooks.

---

## 1. Preserved Python Functionality & Technical Workflow

All mathematical rules, filtration algorithms, and spreadsheet generation logic from the original Python script have been preserved:

1. **Locomotive ID Normalization (`normalize_loco`)**: Strips floating-point `.0` string artifacts (e.g. `30001.0` → `30001`) and trims whitespace.
2. **Direction Normalization (`normalize_direction`)**: Standardizes `NOM` / `Nominal` and `REV` / `Reverse`.
3. **Natural Locomotive Sorting (`loco_sort_key`)**: Extracts numeric components for strict locomotive number ordering.
4. **Header Detection (`find_column`)**: Scans the first 20 rows of each trial sheet to detect `Loco ID`, `Direction`, `Date`, `Station`, `From`, and `To` columns.
5. **Zero-Start Dead Start Filtration (`is_zero_start`)**:
   - Detects midnight test artifact runs where the departure timestamp is within `00:00:00` and `00:00:06` inclusive (`0 <= second <= 6`).
   - Automatically purges all `(loco, direction)` pairs associated with zero-start rows from the final report.
6. **Multi-Sheet Report Generation**:
   - **Sheet 1: Loco Details**: Side-by-side divisional section trial matrix. Includes merged purple headers (`#800080`) with white bold text, yellow column headers (`#FFFF00`), and gray divider columns (`#B2B2B2`).
   - **Sheet 2: Loco Trip Details**: Groups trials by `(Date, Loco ID)`, counts distinct tested directions, and highlights non-Medha manufacturers in OEM Amber (`#FFBF00`).
   - **Sheet 3: Date Wise Summary**: Aggregates daily trial volume, Medha trip share, and other OEM shares.
   - **Sheet 4: Not Found Locos**: Flags all locomotive numbers not found in the OEM catalogue.

---

## 2. Security & Role-Based Access Control (RBAC)

The application enforces server-side authentication and authorization:

- **Roles**:
  - `MASTER_ADMIN`: Full access to the entire application, user management directory, account provisioning, activation/suspension, password reset, audit log inspection, and system telemetry.
  - `USER` (Trial Officer): Access to trial processing, file uploads, sample runs, personal trial reports, locomotive fleet viewing, and personal password management. Blocked from administrative APIs (returns HTTP 403 Forbidden).
- **Password Security**: Passwords hashed with high-entropy salt using `bcryptjs` (compatible with Argon2id standards).
- **Session Security**: Server-managed session tokens stored in HTTP-only cookies and Bearer headers. Suspended accounts and password changes immediately invalidate all active sessions.
- **Master Admin Safeguard**: Centralized database guard prevents suspending, demoting, or deleting the last active Master Admin.
- **Audit Logging**: Every sensitive action (`LOGIN_SUCCESS`, `TRIAL_RUN_PROCESSED`, `USER_CREATED`, `USER_PASSWORD_RESET`, etc.) is recorded with timestamp, IP address, and status.

---

## 3. Initial Credentials & Demo Presets

On initial bootstrap, the system securely provisions:

| Role | Username | Email | Default Password |
|---|---|---|---|
| **Master Admin** | `masteradmin` | `admin@locotrails.railway.gov` | `Admin@LocoTrails2025!` |
| **Regular User** | `trialtester` | `engineer@railway.gov` | `Engineer@2025!` |

*Note: Quick 1-click credential buttons are provided on the login page for instant reviewer testing of both roles.*

---

## 4. Automated Testing

Both the original Python engine and the full-stack TypeScript backend include automated verification test suites:

### Running Python Core Logic Tests:
```bash
python3 engine/test_python_logic.py
```
*Verifies locomotive normalization, zero-start filtration (`00:00:00 - 00:00:06`), header detection, and grouping.*

### Running Backend Full-Stack Integration Tests:
```bash
npx tsx tests/backend_test.ts
```
*Verifies database initialization, Master Admin credentials, password rejection, last-admin demotion safeguard, multi-section sample trial ingestion, zero-start removal, and genuine 4-sheet Excel generation.*

---

## 5. Development & Production Commands

### Development Server:
```bash
npm run dev
```
*Starts the Express server with Vite middleware on `http://0.0.0.0:3000`.*

### Production Build:
```bash
npm run build
```

### Production Start:
```bash
npm start
```
*Executes the high-performance full-stack server serving optimized client assets and backend APIs.*

---

## 6. Project Structure

```
├── engine/
│   ├── DailyLocoTrailsTool.py     # Preserved original Python desktop script
│   └── test_python_logic.py       # Python automated test suite
├── server/
│   ├── auth.ts                    # Authentication, session tokens, RBAC middleware
│   ├── db.ts                      # Persistent JSON-backed storage with ACID atomic writes
│   ├── loco-engine.ts             # Locomotive trial processor & ExcelJS 4-sheet generator
│   └── routes/
│       ├── admin.routes.ts        # Master Admin user management & audit logs
│       ├── auth.routes.ts         # Login, logout, me, change-password
│       ├── fleet.routes.ts        # Locomotive OEM registry & spreadsheet import
│       └── trials.routes.ts       # File upload, sample runner, report downloads
├── src/
│   ├── components/                # Header, Sidebar, Toast components
│   ├── context/                   # React Authentication context
│   ├── services/                  # Frontend API client
│   ├── views/                     # Dashboard, TrialProcessor, Reports, Fleet, UserManagement, AuditLogs, Docs
│   ├── App.tsx                    # Root application component
│   └── main.tsx                   # Client entry point
├── tests/
│   └── backend_test.ts            # Full-stack backend automated verification suite
├── server.ts                      # Express server entry point mounting Vite & API routes
└── metadata.json                  # Application metadata
```
