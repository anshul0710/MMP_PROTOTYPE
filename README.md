# Buddy Board — IIIT Kota

A campus kindness board for small asks, tiny missions, and student skill swaps.

## Run locally

Use Node.js 22.13 or newer, open this folder in VS Code, then run:

```powershell
npm install
npm run dev
```

Open the Vite URL shown in the terminal (normally `http://127.0.0.1:5173`). `npm run dev` starts both the frontend and local API. If API port 4000 is already occupied, the launcher selects a free port and configures the Vite proxy to match. Press **Ctrl+C** to stop both.

## Features

- Browse and search asks by category.
- Post a request, company invite, skill swap, tiny mission, or offer to help.
- Claim a tiny mission and mark it complete.
- Propose a trade on a skill swap; the post author can accept one offer.
- Jump to a random open ask with **Surprise me**.
- View and complete your own asks in **My ripple**.
- See live counts for open asks, active helpers, and completed asks.
- Register/sign in with your name, student ID, branch, year, email, and password.
- Gain 10 points when the asker confirms your help; feedback adds 2 points per star.
- Track your help history, points, rank, and campus leaderboard position.

## Local data

The API uses Node.js and SQLite. Its database (`server/data/buddyboard.sqlite`) is created on first launch. Passwords are stored as salted hashes. The local development database is on the computer running the app; making it available to all students requires deploying the app and database to a shared server.

## Deploy to Render

This folder includes `render.yaml` for a single Node web service that builds the React frontend, serves the API and site from one origin, and stores SQLite under `/var/data`. Connect a Git repository containing this project folder to Render and create a Blueprint from `render.yaml`. The blueprint attaches a persistent disk so student accounts, asks, help history, feedback, and points survive restarts. Render's free web services do not support persistent disks, so this data-preserving setup uses a paid service. See [Render persistent disks](https://render.com/docs/disks) and [Render free service limits](https://render.com/docs/free).
# MMP_PROTOTYPE
