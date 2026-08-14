# Morain Mahj

React frontend for Morain Mahj. Talks to **morainmahj-backend** (Express + PostgreSQL) over named REST APIs.

## Local development

```bash
npm install
npm run dev
```

Configure API proxy in `.env` (see `.env.example`). Leave `VITE_API_URL` empty so the Vite proxy forwards `/api` to the backend.

## Build

```bash
npm run build
```

## Stack

- React + Vite
- Named REST: `/api/tournaments`, `/api/actions/...`, `/api/auth/...`
- Capacitor for iOS/Android (do not change `appId` without an app-store plan)
