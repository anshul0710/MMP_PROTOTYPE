# Buddy Board — IIIT Kota

A campus peer-help platform for students of the **Indian Institute of Information Technology Kota**. Buddy Board lets students create requests, offer help, and build a supportive campus community.

## Live application

**[Open Buddy Board](https://buddy-board-iiit-kota.onrender.com)**

The application is hosted on Render. PostgreSQL data is stored in Neon.

## Features

- Student account registration and login
- Persistent user accounts and sessions
- Create and browse help requests
- Respond to requests and record help activity
- Track points earned through helping
- Submit feedback after help interactions

> The exact features available depend on the current frontend and backend implementation.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React |
| Frontend tooling | Vite |
| Backend | Node.js |
| Database | PostgreSQL |
| Database hosting | Neon |
| Application hosting | Render |

## Project structure

```text
MMP_PROTOTYPE/
├── migration/
│   ├── migrate-sqlite-to-postgres.js
│   └── schema.sql
├── public/
├── server/
│   ├── index.js
│   └── dev.js
├── src/
├── index.html
├── package.json
├── package-lock.json
└── render.yaml
```

## Run locally

### Requirements

- Node.js (use a version compatible with the `engines` field in `package.json`)
- npm
- A PostgreSQL database, such as a Neon project

### 1. Clone the repository

```bash
git clone https://github.com/anshul0710/MMP_PROTOTYPE.git
cd MMP_PROTOTYPE
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure the database

Set `DATABASE_URL` to your PostgreSQL connection string.

**PowerShell:**

```powershell
$env:DATABASE_URL = "YOUR_POSTGRESQL_CONNECTION_STRING"
```

**macOS/Linux:**

```bash
export DATABASE_URL="YOUR_POSTGRESQL_CONNECTION_STRING"
```

Do not commit your connection string or put it directly in source code. Keep secrets in environment variables.

### 4. Start the application

```bash
npm start
```

Open:

- Website: http://localhost:4000
- Health check: http://localhost:4000/api/health

Keep the terminal running while using the local application. Press `Ctrl + C` to stop the server.

## Database

Buddy Board uses PostgreSQL for persistent application data. The database stores:

- `users` — student accounts and password hashes
- `sessions` — authenticated sessions
- `requests` — help requests posted by students
- `help_events` — responses and completed help activity
- `feedback` — feedback associated with help interactions

The schema is maintained in `migration/schema.sql`.

### Migrating an existing SQLite database

The repository includes a migration utility at `migration/migrate-sqlite-to-postgres.js`.

If you have an existing SQLite database to migrate:

1. Back up the SQLite database and its related WAL/SHM files.
2. Set `DATABASE_URL` to the destination PostgreSQL database.
3. Set `SQLITE_FILE` to the path of the SQLite database file.
4. Run:

```bash
npm run migrate:postgres
```

5. Verify the migrated table counts in PostgreSQL before switching production traffic.

Do not upload SQLite database files, database backups, `.env` files, or credentials to GitHub.

## Deployment

The project includes a `render.yaml` Blueprint configuration for deploying the Node.js web service on Render.

1. Push the project to GitHub.
2. In Render, create a new **Blueprint** and select this repository.
3. Review the service configuration from `render.yaml`.
4. Add `DATABASE_URL` in the Render service's environment settings using your Neon PostgreSQL connection string.
5. Deploy and wait for the health check to pass.

### Production URLs

- Application: https://buddy-board-iiit-kota.onrender.com
- Health check: https://buddy-board-iiit-kota.onrender.com/api/health

The health endpoint should return a successful response and identify PostgreSQL as the connected database.

### Free-tier notes

- Render free web services may spin down after a period without traffic and can take time to wake up.
- The application uses Neon PostgreSQL for persistent data; do not rely on the Render service's local filesystem for durable database storage.
- Free-tier limits and provider policies can change. Check the providers' current plan details before relying on them for production use.

## Security notes

- Never commit `DATABASE_URL`, passwords, API keys, `.env` files, or database backups.
- Keep `.env` and local database files excluded through `.gitignore`.
- Use environment variables for deployment secrets.
- Do not share database credentials in screenshots, logs, issues, or chat messages.
- Rotate any credential that may have been exposed.

## Useful commands

```bash
npm install       # Install dependencies
npm start         # Start the backend and serve the application
npm run build     # Build the frontend for production
npm run migrate:postgres  # Migrate an existing SQLite database to PostgreSQL
```

## Repository

[GitHub — anshul0710/MMP_PROTOTYPE](https://github.com/anshul0710/MMP_PROTOTYPE)
