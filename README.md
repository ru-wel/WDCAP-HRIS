# ARISE HRIS

A web-based Human Resource Information System built for **Arise Construction and Development Corporation (ACDC)**, a construction firm in the Philippines. It replaces paper 201 folders, scattered spreadsheets, and informal messages with one system for employee records, site assignments, leave, onboarding, and performance evaluations.

Built as our Web Development capstone project.

**Live:** [arise-hris.vercel.app](https://arise-hris.vercel.app/)

## Features

**Employee records**
- Employee profiles with departments, positions, and personnel types (Regular, Probationary, Project-Based)
- Digital 201 files: upload and download employee documents (contracts, government IDs like SSS, PhilHealth, Pag-IBIG, and more), with file type and size checks
- Onboarding checklists that employees submit and HR reviews
- Regularization workflow for probationary employees

**Projects and sites**
- Construction projects with statuses, and employee-to-project assignments

**Leave management**
- Philippine leave types (Service Incentive, Maternity, Paternity, Solo Parent, VAWC, and more)
- Leave requests with approval flow, yearly credit generation, balances, and history
- Email notifications for requests and decisions

**Performance evaluations**
- Evaluations scheduled automatically from each employee's hire date and personnel type
- Dynamic, versioned evaluation templates per position
- Daily scheduled job that emails reminders for evaluations due within 7 days

**Insights and accountability**
- Role-specific dashboards and an analytics page with charts
- Company calendar with leaves, evaluations, birthdays, holidays, events, and project dates
- Audit logs for every create, update, delete, login, and export
- Export reports to CSV, Excel, and PDF

**Access and security**
- Four roles (Executive, HR, Manager, Employee), enforced on both the API and the UI
- Employees can see and change only their own records ("My Leaves", "My Documents", "My Evaluations")
- Supabase Auth login with password reset by email
- Request validation on every route (Joi), rate limiting, and security headers (Helmet)

## Tech stack

| Layer | Tools |
|-|-|
| Frontend | React 19, Vite, Tailwind CSS v4, React Router, React Hook Form, Recharts, FullCalendar |
| Backend | Node.js, Express 5 (ES modules), Joi, Multer, Nodemailer, Winston |
| Database and auth | PostgreSQL on Supabase, Supabase Auth, Supabase Storage |
| Hosting | Vercel (frontend and backend in one project, with Vercel Cron) |

## Architecture

```
Browser (React SPA)
   │  /api/*  (same domain, JWT in Authorization header)
   ▼
Express API on Vercel Functions
   routes → validate (Joi) → controllers → services
   │
   ▼
Supabase: PostgreSQL · Auth · Storage
```

- **Routes** apply authentication, role checks, and validation.
- **Controllers** read the request and return a standard `{ success, message, data }` response.
- **Services** hold the business logic and database queries, and write audit log entries.
- Errors use typed classes (`BadRequestError`, `ForbiddenError`, and so on) and one global error handler.

## Project structure

```
backend/
  src/
    routes/          One router per module (employees, leave, evaluations, ...)
    controllers/     Request handling
    services/        Business logic and Supabase queries
    validations/     Joi schemas
    middleware/      Auth, role checks, validation, rate limits, errors
  migrations/        SQL migrations
frontend/
  src/
    pages/           Screens per module (self/ folders hold employee self-service pages)
    components/      Shared UI and evaluation forms
    services/api.js  API client
    utils/           CSV, Excel, and PDF exports
vercel.json          Deploys both apps as Vercel services, plus the cron job
```

## Running locally

You need Node.js 20+ and a Supabase project.

```bash
# backend (http://localhost:3000)
cd backend
npm install
npm run dev            # needs a .env file, see below

# frontend (http://localhost:5173), in a second terminal
cd frontend
npm install
npm run dev
```

**Backend `.env`:** `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `SUPABASE_ANON_KEY`, `STORAGE_BUCKET_DOCUMENTS`, `FRONTEND_URL`, `CRON_SECRET`, and `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` for email.

**Frontend `.env`:** `VITE_API_BASE_URL=http://localhost:3000/api`.

## Contributors

| Roles | Names | Links |
|-|-|-|
| Frontend Developer | Lance Paolo Cabe | [@Lanshissh](https://github.com/Lanshissh) |
| Frontend Developer & UI/UX Developer | Gabrielle Mae Rose Delos Santos | [@gabbie-mrds](https://github.com/gabbie-mrds) |
| Backend Developer | Carl Lester Paldeng | [@notPaldengCarl](https://github.com/notPaldengCarl) |
| Backend Developer | Reuel Christian Sundiam | [@ru-wel](https://github.com/ru-wel) |
