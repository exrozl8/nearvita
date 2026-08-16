# NearVita — Local Setup Guide

A practical reference for running NearVita locally on **Windows**.

---

## Prerequisites

| Tool | Required Version | Check |
|------|-----------------|-------|
| Python | 3.11+ | `python --version` |
| Node.js | 18+ | `node --version` |
| npm | 9+ | `npm.cmd --version` |
| Git | any | `git --version` |
| MongoDB Atlas | free tier | [mongodb.com/atlas](https://mongodb.com/atlas) |

> **MongoDB locally?** Install [MongoDB Community Server](https://www.mongodb.com/try/download/community) if you want a local DB instead of Atlas. The default `.env` already points to `localhost:27017`.

---

## One-time setup (already done for you)

The following was completed during initial project setup:

- [x] Python venv created at `backend/venv/`
- [x] All backend packages installed (`pip install -r requirements.txt`)
- [x] Frontend packages installed (`npm install` in `frontend/`)
- [x] `backend/.env` created from `.env.example`
- [x] `frontend/.env` created from `.env.example`
- [x] Git repo initialized with initial commit

---

## Running locally

### Option A — Double-click scripts (easiest)

1. **Start backend** — double-click `start-backend.bat`  
   API available at: http://localhost:8001  
   Docs (Swagger UI): http://localhost:8001/docs

2. **Start frontend** — double-click `start-frontend.bat`  
   App opens at: http://localhost:3000

> Run both in separate windows simultaneously.

### Option B — Manual terminal

**Backend:**
```powershell
cd backend
.\venv\Scripts\Activate.ps1    # or: .\venv\Scripts\activate.bat
uvicorn server:app --reload --port 8001
```

**Frontend** (new terminal):
```powershell
cd frontend
npm.cmd start
```

---

## Default login

The backend auto-seeds an admin account on first startup:

| Field | Value |
|-------|-------|
| Email | `admin@nearvita.health` |
| Password | `Admin@1234` |
| Role | `donor` |

---

## Environment Variables

### `backend/.env`

| Variable | Description |
|----------|-------------|
| `MONGO_URL` | MongoDB connection string (local or Atlas) |
| `DB_NAME` | Database name (`nearvita`) |
| `JWT_SECRET` | Long random secret for signing JWTs |
| `CORS_ORIGINS` | Frontend URL(s) allowed to call the API |
| `FRONTEND_URL` | Same as above (fallback) |
| `ADMIN_EMAIL` | Seeded admin email |
| `ADMIN_PASSWORD` | Seeded admin password |

### `frontend/.env`

| Variable | Description |
|----------|-------------|
| `REACT_APP_BACKEND_URL` | Backend URL **without** trailing slash or `/api` |

---

## Deploying to production

See [README.md](./README.md) for the full Render + Vercel + Atlas deployment walkthrough.

### Quick summary:
1. Push to GitHub
2. Deploy backend to **Render** (reads `render.yaml` automatically)
3. Set env vars in Render dashboard
4. Deploy frontend to **Vercel** (root dir: `frontend`)
5. Set `REACT_APP_BACKEND_URL` in Vercel
6. Update `CORS_ORIGINS` in Render → redeploy

---

## GitHub Actions CI

Two workflows run automatically on push:

- `.github/workflows/backend.yml` — syntax-checks Python, verifies FastAPI loads
- `.github/workflows/frontend.yml` — `npm ci` + `npm run build` for React

---

## Known issues / Windows tips

- **npm scripts blocked by PowerShell execution policy** — use `npm.cmd` instead of `npm`, or run: `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser`
- **pip TLS errors** — the venv was installed with `--trusted-host pypi.org`. If re-installing, add those flags or use the included `pip.ini`
- **Port already in use** — kill with: `netstat -ano | findstr :8001` then `taskkill /PID <pid> /F`
