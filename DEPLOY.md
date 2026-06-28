# Deploying WaguriGBA

WaguriGBA is a TanStack Start (React + Vite) app backed by MongoDB Atlas. It can be deployed to:

- **Render** — one-click via `render.yaml` blueprint
- **Docker / Fly.io / Railway / VPS** — via the included `Dockerfile`
- **Any Node host** — build with `DEPLOY_TARGET=node`, serve `.output/server/index.mjs`

---

## Environment variables

Set these on your host before building. All are required.

| Variable | Description |
|---|---|
| `MONGODB_URI` | MongoDB Atlas connection string (e.g. `mongodb+srv://user:pass@cluster.mongodb.net/`) |
| `JWT_SECRET` | Any long random string used to sign auth tokens |
| `IMGBB_API_KEY` | Free key from https://api.imgbb.com — used for ROM cover and avatar uploads |
| `DEPLOY_TARGET` | Set to `node` for all non-Cloudflare hosts |

> **Node.js version:** This app requires Node.js **22** (or 20.19+) and npm 10+. Vite 8 will crash on older Node releases.

Generate a secure `JWT_SECRET`:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 1. Render (recommended)

1. Push this repo to GitHub.
2. On Render: **New + → Blueprint**, point at the repo — it reads `render.yaml` automatically.
3. In the Render dashboard, set the four env vars above under **Environment**.
4. Deploy. Render runs `npm ci && npm run build:node` then `npm run start`.

The app will be live at your Render URL.

---

## 2. Docker (Fly.io, Railway, VPS, etc.)

Build and run:
```bash
docker build -t waguri-gba .
docker run -p 3000:3000 \
  -e MONGODB_URI="..." \
  -e JWT_SECRET="..." \
  -e IMGBB_API_KEY="..." \
  -e DEPLOY_TARGET=node \
  waguri-gba
```

Or use an `.env` file:
```bash
docker run -p 3000:3000 --env-file .env waguri-gba
```

The server listens on port `3000` by default. Set the `PORT` env var to change it.

---

## 3. Any Node.js host (manual)

```bash
npm ci
DEPLOY_TARGET=node npm run build:node
npm run start   # runs: node .output/server/index.mjs
```

Output is in `.output/server/index.mjs`. The process reads env vars at runtime.

---

## Admin account

On first startup the server automatically creates (or resets) the admin account:

- **Email:** `sksajidul01952411@gmail.com`
- **Password:** set at build time in `src/lib/mongodb.ts`

Sign in with those credentials to access the **Admin** tab on `/profile`, where you can manage users, grant/revoke admin, and ban accounts.

---

## MongoDB Atlas setup

1. Create a free cluster at https://cloud.mongodb.com.
2. Under **Database Access**, create a user with read/write access.
3. Under **Network Access**, allow `0.0.0.0/0` (or your host's IP).
4. Copy the connection string from **Connect → Drivers** and set it as `MONGODB_URI`.

Collections are created automatically on first use. No migrations needed.

---

## ImgBB setup

1. Register at https://api.imgbb.com.
2. Go to **API** and copy your key.
3. Set it as `IMGBB_API_KEY`.

Used for: ROM cover image uploads (admin) and user profile picture uploads.
