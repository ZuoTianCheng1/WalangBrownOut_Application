# WalangBrownout IMS — Laravel + MySQL backend

This package adds a Laravel 11 JSON API under `laravel-backend/`. The existing React/Vite frontend remains in the project root. Its API base defaults to `http://localhost:8000/api`.

## Requirements
- PHP 8.2+
- Composer 2
- MySQL 8+
- PHP extensions: `pdo_mysql`, `openssl`, `mbstring`, `tokenizer`, `xml`, `ctype`, `curl`, `fileinfo`

## 1. Create the MySQL database
From a MySQL shell:
```sql
CREATE DATABASE walangbrownout_ims CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'ims_app'@'localhost' IDENTIFIED BY 'choose-a-long-unique-password';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX ON walangbrownout_ims.* TO 'ims_app'@'localhost';
```

## 2. Configure Laravel
```powershell
cd laravel-backend
copy .env.example .env
composer install
php artisan key:generate
```
Edit `.env` and set DB credentials, `ADMIN_USERNAME`, and a strong `ADMIN_PASSWORD` (12+ characters). Then:
```powershell
php artisan migrate --seed
php artisan serve --host=127.0.0.1 --port=8000
```
The seeder creates the first admin only when ADMIN_PASSWORD is set to a non-placeholder value. No public signup is exposed.

## 3. Run the frontend
Open a second terminal at the repository root:
```powershell
npm install
copy .env.example .env
npm run dev
```
The root `.env` should contain `VITE_API_BASE_URL=http://localhost:8000/api`.

## API capabilities
- Bearer-token login and `/auth/me`; hashed passwords and hashed opaque access tokens.
- Role-checked item create/edit/archive and user management.
- Stock receipt creates a batch and computes expiry from shelf life when not supplied.
- Stock issue deducts FEFO (earliest expiry first), inside a database transaction and row locks; expired lots are excluded.
- Stock adjustments require a reason and prevent negative balances.
- Movement history and audit log record the actor.
- Supplier creation/listing and purchase order create/receipt endpoints.
- Dashboard summary and reorder suggestions.

## Endpoint summary
`POST /api/auth/login`, `GET /api/auth/me`, `GET/POST /api/items`, `PUT /api/items/{id}`, `POST /api/items/{id}/archive`, `GET /api/batches`, `POST /api/stock/receive`, `POST /api/stock/issue`, `POST /api/stock/adjust`, `GET /api/reports/movements`, `GET /api/reports/reorder-suggestions`, `GET/POST /api/suppliers`, `GET/POST /api/purchase-orders`, `POST /api/purchase-orders/{id}/receive`, `GET/POST/PATCH /api/users`, `GET/PATCH /api/alerts`, `GET /api/dashboard/summary`.

## Important integration note
The Laravel API is a backend implementation, but the existing React pages were originally written against the earlier API contract. The frontend currently reads the common item/batch/alert/dashboard endpoints; dedicated receive, FEFO issue, adjustment, supplier and purchase-order forms still need to be wired to these new endpoints in the UI before every requested workflow is available to warehouse users. Run tests and verify all workflows before production deployment. Configure HTTPS, backups, monitoring, least-privilege DB credentials and scheduled backup/restore drills before real use.
