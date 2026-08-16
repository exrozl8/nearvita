# NearVita — Near-Expiry Medicine Donor Network

Full-stack app: React (frontend) + FastAPI/MongoDB (backend). Connects donors
(pharmacies/households with near-expiry medicine) to verified receivers
(NGOs/clinics/patients).

```
nearvita/
├── backend/     FastAPI + MongoDB API
├── frontend/    React (CRA + craco + Tailwind)
└── render.yaml  One-click backend deploy config for Render
```

**Deploy plan:** Frontend on **Vercel**, backend on **Render** (or Railway),
database on **MongoDB Atlas** (free tier). Vercel can't run this backend
directly — it's a persistent FastAPI service with an open DB connection, not
a serverless function, so it needs a real host like Render/Railway.

---

## 1. Set up MongoDB Atlas (free)

1. Go to https://www.mongodb.com/cloud/atlas/register and create a free account.
2. Create a free **M0 cluster**.
3. **Database Access** → add a database user (username + password — save these).
4. **Network Access** → add IP `0.0.0.0/0` (allow from anywhere — fine for this project).
5. **Connect** → "Drivers" → copy the connection string. It looks like:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
   Replace `<username>`/`<password>` with what you created. This is your `MONGO_URL`.

## 2. Push to GitHub

```bash
cd nearvita
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

(`.gitignore` already excludes `node_modules`, `.env` files, and build output.)

## 3. Deploy the backend (Render)

1. Go to https://render.com → sign in with GitHub.
2. **New** → **Blueprint** → pick your repo. Render reads `render.yaml`
   automatically and creates the service. (No blueprint? **New** → **Web
   Service** → pick the repo → set **Root Directory** to `backend`, **Build
   Command** to `pip install -r requirements.txt`, **Start Command** to
   `uvicorn server:app --host 0.0.0.0 --port $PORT`.)
3. Set these environment variables on the service (Render dashboard →
   Environment):
   | Key | Value |
   |---|---|
   | `MONGO_URL` | your Atlas connection string from step 1 |
   | `DB_NAME` | `nearvita` |
   | `JWT_SECRET` | any long random string (Render can auto-generate one) |
   | `CORS_ORIGINS` | your Vercel URL, e.g. `https://nearvita.vercel.app` — fill this in **after** step 4, then redeploy |
   | `FRONTEND_URL` | same as above, as a fallback |
   | `ADMIN_EMAIL` | `admin@nearvita.health` (or your own) |
   | `ADMIN_PASSWORD` | pick a real password |
4. Deploy. Note the resulting URL, e.g. `https://nearvita-backend.onrender.com`.
   Test it: `https://nearvita-backend.onrender.com/api/` should return
   `{"service":"NearVita","status":"ok"}`.

   Free-tier Render services sleep after 15 min idle and take ~30s to wake on
   the next request — normal, not a bug.

## 4. Deploy the frontend (Vercel)

1. Go to https://vercel.com → sign in with GitHub → **Add New Project** →
   import your repo.
2. **Root Directory**: set to `frontend`.
3. Framework preset: Vercel should detect Create React App. Build command
   `npm run build`, output directory `build` (defaults are fine).
4. **Environment Variables** → add:
   | Key | Value |
   |---|---|
   | `REACT_APP_BACKEND_URL` | your Render backend URL from step 3, e.g. `https://nearvita-backend.onrender.com` (no trailing slash, no `/api`) |
5. Deploy. You'll get a URL like `https://nearvita.vercel.app`.
6. Go back to Render → update `CORS_ORIGINS` and `FRONTEND_URL` to this exact
   Vercel URL → redeploy the backend so it accepts requests from your
   frontend.

## 5. Test it

Visit your Vercel URL. Sign in with the seeded admin account (or whatever you
set `ADMIN_EMAIL`/`ADMIN_PASSWORD` to), or register a new donor/receiver
account and walk through: list a medicine → browse as a receiver → request it
→ accept as donor → chat in the claim thread → mark delivered.

---

## Local development (optional, before you deploy)

**Backend:**
```bash
cd backend
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# edit .env: set MONGO_URL to a local mongod (mongodb://localhost:27017) or your Atlas string
uvicorn server:app --reload --port 8001
```

**Frontend** (separate terminal):
```bash
cd frontend
npm install
cp .env.example .env
# .env should have: REACT_APP_BACKEND_URL=http://localhost:8001
npm start
```
Opens at `http://localhost:3000`.

---

## What's actually in here

- **Auth**: JWT in httpOnly cookies + localStorage bearer fallback, bcrypt password hashing, role-based (`donor` / `receiver`).
- **Medicines**: CRUD for donors, search/filter (category, city, text, days-to-expiry) for everyone.
- **Claims**: receiver requests → donor accepts/rejects → mark delivered. Medicine status auto-updates (`available` → `reserved` → `delivered`).
- **Messaging**: a private thread per claim (polls every 8s — no websockets, kept simple on purpose).
- **Stats**: live counts on the landing page.
- **Seeded admin** on first backend startup so you have a login immediately.

## Known limitations worth knowing about (for your med-student co-founder / project writeup)

- No file upload — medicine photos are pasted image URLs, not uploads. Fine for a demo; add S3/Cloudinary if you need real photo uploads.
- No NGO/receiver verification/KYC step — anyone can register as a receiver and claim. If this needs to be "real," that's the first thing to add: an `approved` flag on receiver accounts + an admin approval screen.
- No minimum-shelf-life-remaining validation on listings — currently accepts any expiry date, including ones that are almost expired. Worth adding a hard cutoff (e.g. reject listings expiring in under 30-60 days) since that's a genuine safety concern, not just a nice-to-have.
- Messaging polls instead of using websockets — fine for a college project, mention it as a "future work" item if asked.
