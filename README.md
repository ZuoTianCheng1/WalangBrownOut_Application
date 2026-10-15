# WalangBrownout Inventory Management System

An inventory management system with batch/expiry tracking, valuation by category and class, role-based access, and an audit log. It consists of a **Laravel (PHP) API backend** backed by **MySQL**, and a **Vite-based frontend** that talks to the API.

> **Course / Subject:** _<fill in>_
> **Instructor:** _<fill in>_
> **Group members:** _<fill in names and roles>_
> **Submission date:** _<fill in>_

---

## Table of Contents

1. [Features](#features)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Requirements](#requirements)
5. [Installation Guide](#installation-guide)
6. [Running the System](#running-the-system)
7. [Default Login](#default-login)
8. [Setting Up on a New Device (Checklist)](#setting-up-on-a-new-device-checklist)
9. [Troubleshooting](#troubleshooting)
10. [Security Overview](#security-overview)
11. [Known Limitations](#known-limitations)
12. [Screenshots](#screenshots)

---

## Features

- Inventory management with validated stock operations
- Batch tracking with expiry dates
- Dashboard charts: batch expiry overview and inventory valuation by category and class
- Role-based access control enforced on the server
- Secure login with hashed passwords and short-lived tokens, with rate limiting on login
- Audit log of inventory and account activity
- Responsive navigation bar (wraps on small screens, with a horizontally scrollable row)
- The frontend uses the live API by default; it does not silently fall back to mock data

---

## Tech Stack

| Layer        | Technology                                  |
| ------------ | ------------------------------------------- |
| Backend      | Laravel (PHP), served with `php artisan serve` |
| Database     | MySQL 8.0                                   |
| Frontend     | Vite (Node.js)                              |
| Dependencies | Composer (PHP), npm (JavaScript)            |

---

## Project Structure

```
WalangBrownOut_Application-main/
├── laravel-backend/     # Laravel API (composer.json, artisan, .env.example)
├── ...                  # Frontend (package.json, .env.example) in the project root
└── README.md
```

> Adjust this tree if your frontend lives in a different folder.

---

## Requirements

Install these **before** cloning or running anything:

| Software          | Notes                                                                 |
| ----------------- | --------------------------------------------------------------------- |
| **Git**           | To clone the repository                                               |
| **PHP**           | 8.3 or newer (developed on 8.5). Check `composer.json` for the exact constraint |
| **Composer 2**    | PHP dependency manager                                                |
| **MySQL Server 8.0** | The **server**, not just MySQL Workbench (Workbench is only a client) |
| **Node.js 18+**   | Includes npm, needed for the frontend                                 |

### Required PHP extensions

`fileinfo`, `mbstring`, `openssl`, `curl`, `zip`, `pdo_mysql`, `mysqli`, `xml`

Windows users: PHP ships with these disabled. Open your `php.ini` (find it with `php --ini`) and:

1. Copy `php.ini-development` to `php.ini` if `php.ini` doesn't exist.
2. Remove the leading `;` from `extension_dir = "ext"` and from each extension line above.
3. Open a **new** terminal and verify:

```powershell
php -m | findstr /i "fileinfo mbstring openssl curl zip pdo_mysql"
```

### Verify your tools

```powershell
php -v
composer -V
node -v
npm -v
git --version
```

and confirm the MySQL service is running:

```powershell
Get-Service *mysql*
```

(`MySQL80` should show **Running**.)

---

## Installation Guide

### 1. Clone the repository

```bash
git clone <repository-url>
cd WalangBrownOut_Application-main
```

### 2. Set up the backend

```powershell
cd laravel-backend
composer install
```

Use `composer install` (not `composer update`) so you get the exact versions in `composer.lock`.

> You may see `Deprecated: PDO::MYSQL_ATTR_SSL_CA ...` on PHP 8.5. It is only a warning and does not affect the system.

### 3. Create the environment file

```powershell
copy .env.example .env
php artisan key:generate
```

(macOS/Linux: `cp .env.example .env`)

### 4. Create the database

Open MySQL Workbench (or any MySQL client), connect to `127.0.0.1:3306` as `root`, and run:

```sql
CREATE DATABASE walangbrownout_ims;
```

The database name must match `DB_DATABASE` in `.env`.

### 5. Configure `.env`

Open `laravel-backend\.env` (the one next to `artisan`) and set the database section.

**Option A: use the root account (simplest for local use)**

```
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=walangbrownout_ims
DB_USERNAME=root
DB_PASSWORD=your_mysql_root_password
```

**Option B: use the dedicated `ims_app` user from the example file**

Keep `DB_USERNAME=ims_app`, choose a password, and put the same one in `DB_PASSWORD`. Then create the user in MySQL:

```sql
CREATE USER 'ims_app'@'localhost' IDENTIFIED BY 'your_chosen_password';
GRANT ALL PRIVILEGES ON walangbrownout_ims.* TO 'ims_app'@'localhost';
FLUSH PRIVILEGES;
```

Then set the **admin account** that will be created when the database is seeded:

```
ADMIN_NAME="Your Name"
ADMIN_USERNAME=admin
ADMIN_PASSWORD=choose-a-strong-password
```

Do not leave the placeholder `change-this-password`. Save the file, and make sure the editor shows no unsaved marker.

> If a password contains `#`, `$` or spaces, wrap it in double quotes.

### 6. Create the tables and the admin account

```powershell
php artisan config:clear
php artisan migrate --seed
```

You should see the migrations listed as `DONE`. The admin user is created only when `ADMIN_PASSWORD` is set and no admin account exists yet.

### 7. Set up the frontend

From the project root (where the frontend's `package.json` is):

```powershell
npm install
copy .env.example .env
```

In that `.env`, point the frontend at the API:

```
VITE_API_BASE_URL=http://127.0.0.1:8000
```

(Match whatever base path the API uses, for example `/api`.)

---

## Running the System

Use two terminals.

**Terminal 1: backend** (inside `laravel-backend`)

```powershell
php artisan serve
```

The API runs at `http://127.0.0.1:8000`.

**Terminal 2: frontend** (project root)

```powershell
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`) in your browser.

---

## Default Login

Log in with the `ADMIN_USERNAME` and `ADMIN_PASSWORD` you set in `laravel-backend\.env` before seeding.

| Field    | Value                                 |
| -------- | ------------------------------------- |
| Username | _<value of `ADMIN_USERNAME`>_         |
| Password | _<value of `ADMIN_PASSWORD`>_         |

> For the teacher's demo, you may write the demo credentials here. Do not use a real or reused password.

Changing `.env` after the admin account has been created does **not** update the existing account. To reset it, change the password through the app or with `php artisan tinker`.

---

## Setting Up on a New Device (Checklist)

Files such as `vendor/`, `node_modules/` and `.env` are not stored in Git, so a fresh clone needs them recreated:

- [ ] Install Git, PHP (with extensions enabled), Composer, Node.js, MySQL Server
- [ ] `git clone` the repository
- [ ] `composer install` in `laravel-backend`
- [ ] Copy `.env.example` to `.env`, then `php artisan key:generate`
- [ ] Create the MySQL database and set the `DB_*` values
- [ ] Set `ADMIN_*` values
- [ ] `php artisan migrate --seed`
- [ ] `npm install` and create the frontend `.env`
- [ ] Start both servers

The database is **local to each device**. Accounts created on one computer do not exist on another unless you export the database (`mysqldump` or Workbench: Server → Data Export) and import it on the new device.

---

## Troubleshooting

| Problem | Cause and fix |
| ------- | ------------- |
| `Your requirements could not be resolved ... ext-fileinfo is missing` | A PHP extension is disabled. Enable it in `php.ini` (see [Requirements](#requirements)), open a new terminal, and run `composer install` again. Do not use `--ignore-platform-req`. |
| `SQLSTATE[HY000] [1045] Access denied for user ...` | `DB_USERNAME` / `DB_PASSWORD` in `.env` don't match a real MySQL user. Check the saved file with `type .env \| findstr DB_`, use `root` with your root password or create the user (Option B), then run `php artisan config:clear`. |
| `Unknown database` | The database in `DB_DATABASE` doesn't exist yet. Create it in MySQL with the same name. |
| `Connection refused` | MySQL isn't running. Check with `Get-Service *mysql*` and start it (`net start MySQL80` in an administrator terminal). |
| `.env` changes seem ignored | Run `php artisan config:clear`. Also check that no Windows environment variable such as `DB_USERNAME` overrides it (`echo $env:DB_USERNAME`). |
| Can't log in | The seeder may not have run, or `ADMIN_*` held placeholders when it did. Check the `users` table in Workbench, or reset the password with `php artisan tinker`. |
| Login works on one PC but not another | Each PC has its own database. Seed the new one or import an export from the first. |
| `composer` or `php artisan` fails with "not recognized" | Run commands inside `laravel-backend` (where `artisan` and `composer.json` are), and make sure PHP and Composer are on your PATH. |
| Frontend can't reach the API | The backend isn't running, or `VITE_API_BASE_URL` is wrong. Restart `npm run dev` after editing the frontend `.env`. |
| `Deprecated: PDO::MYSQL_ATTR_SSL_CA` on PHP 8.5 | A harmless warning. Ignore it, or update the constant in `config/database.php` if everyone uses PHP 8.5. |

---

## Security Overview

- Passwords are stored as bcrypt hashes
- Short-lived authentication tokens (JWT)
- Server-side role authorization on protected endpoints
- Rate limiting on login attempts
- Security headers on API responses
- Validation on inventory operations
- Audit log of activity
- Secrets live in `.env`, which is excluded from Git. **Never commit `.env`.**
- No public signup; accounts are provisioned by an administrator

---

## Known Limitations

This is a production-oriented foundation, not a completed production system. Before any public deployment, the following should be added or verified:

- An administrator-only user management workflow
- A CSRF strategy if tokens move to cookies
- HTTPS
- Backups and restore tests
- Monitoring
- Automated tests
- Verification of every UI action against the live API
- API endpoints for batch receiving and full report generation (some report/export screens may need endpoint alignment)
- Existing demo data is not imported automatically

---

## Screenshots

_<Add screenshots of the login page, dashboard, inventory list, batch/expiry view, and audit log here.>_

```
![Dashboard](docs/screenshots/dashboard.png)
```
