# WalangBrownout Inventory Management System

## Production-oriented API setup

The frontend now uses the API by default; it no longer silently falls back to mock data. The Express API uses SQLite persistence, bcrypt password hashes, short-lived JWTs, server-side role authorization, request rate limiting on login, Helmet security headers, validation for inventory operations, and an audit log.

### 1. Configure backend

```bash
cd backend
cp .env.example .env
```
Set `JWT_SECRET` to a random secret of at least 32 characters and set a strong `ADMIN_PASSWORD` before first startup. Never commit `.env`. Then run:

```bash
npm install
npm run start
```

The SQLite database is created under `backend/data/` by default. The admin user is seeded only when `ADMIN_PASSWORD` is configured and no admin account exists. Create other accounts through a controlled administrative provisioning process; do not expose public signup.

### 2. Start frontend

In the project root:

```bash
npm install
cp .env.example .env
npm run dev
```

Set `VITE_API_BASE_URL` for your deployment. The screenshot-related navbar issue is addressed with responsive wrapping and a horizontally scrollable navigation row. Dashboard charts use batch expiry data and valuation by category/class.

## Important deployment notes

This is a production-oriented backend foundation, not a claim of completed production certification. Before public deployment, add an administrator-only user management endpoint/workflow, CSRF strategy if moving tokens to cookies, HTTPS, backups and restore tests, monitoring, database migrations, automated tests, and verify every UI action against the live API. Existing demo data is not automatically imported into SQLite. API endpoints for batch receiving and full report generation should be added before replacing any remaining mock-only features in the UI. The frontend's existing report/export screens may require endpoint alignment.
