# Robux Donation Hub

Search any Roblox username, browse all their public on-sale gamepasses sorted by lowest price, and donate via the official Roblox purchase page. No Robux are processed on this site — all purchases happen through Roblox directly.

## Project structure

```
/client   — React + Vite frontend
/server   — Express + TypeScript backend
```

---

## Local development

### 1 — Start the backend

```bash
cd server
npm install
npm run dev
# API available at http://localhost:3001
```

### 2 — Start the frontend (new terminal)

```bash
cd client
npm install
npm run dev
# App available at http://localhost:5173
```

Vite proxies all `/api/*` requests to `http://localhost:3001` automatically, so no environment variables are needed for local dev.

---

## Render deployment

### Option A — Two separate services (recommended)

**Backend — Web Service**

| Setting | Value |
|---|---|
| Root directory | `server` |
| Build command | `npm install && npm run build` |
| Start command | `node dist/index.js` |
| Environment variable | `PORT` — Render sets this automatically |

**Frontend — Static Site**

| Setting | Value |
|---|---|
| Root directory | `client` |
| Build command | `npm install && npm run build` |
| Publish directory | `dist` |

In `client/vite.config.ts`, the `/api` proxy only applies during local dev. In production (static site), the frontend makes requests to the same origin (Render serves the static site and the backend is a separate service — you may need to set `VITE_API_BASE` if using a different domain).

> **Easiest production setup:** use Option B so frontend and backend share the same domain, no CORS config needed.

### Option B — Single service (simplest for Render)

The server can serve the built frontend files. Add this to `server/src/app.ts` **after** all API routes:

```ts
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.join(__dirname, "..", "..", "client", "dist");

app.use(express.static(clientDist));
app.get("*", (_req, res) => {
  res.sendFile(path.join(clientDist, "index.html"));
});
```

Then on Render create a single **Web Service**:

| Setting | Value |
|---|---|
| Root directory | *(repo root)* |
| Build command | `cd client && npm install && npm run build && cd ../server && npm install && npm run build` |
| Start command | `cd server && node dist/index.js` |
| Environment variable | `PORT` — set by Render automatically |

---

## How it works

1. User types a Roblox username and clicks **Search**
2. Frontend calls `GET /api/user/:username` — backend resolves the userId via Roblox API
3. Frontend calls `GET /api/gamepasses/:userId` — backend fetches all public gamepasses from all the user's games
4. Results are deduplicated, filtered (on sale, price > 0), and sorted ascending by price
5. Each **Donate** button opens `https://www.roblox.com/game-pass/{id}/redirect` — the official Roblox purchase page

## Backend features

- 5-minute in-memory cache per user and per gamepass set
- In-flight deduplication — concurrent lookups for the same user share one request
- Retry with 4× backoff on Roblox 429 responses
- Up to 5 concurrent universe fetches per user lookup
- Uses `roproxy.com` mirrors for reliable Roblox API access
