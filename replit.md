# Robux Donation Hub

A Roblox gamepass discovery tool — search any Roblox username, browse all their on-sale gamepasses sorted by lowest price, and donate by opening the official Roblox purchase page.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/robux-hub run dev` — run the frontend (port assigned by Replit)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS (dark Roblox-inspired theme)
- API: Express 5
- Validation: Zod (`zod/v4`)
- API codegen: Orval (from OpenAPI spec)
- HTTP proxy: Axios (backend → Roblox/roproxy APIs)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — API contract source of truth
- `lib/api-client-react/src/generated/` — generated React Query hooks
- `lib/api-zod/src/generated/` — generated Zod schemas
- `artifacts/api-server/src/routes/roblox.ts` — Roblox proxy routes with caching + retry logic
- `artifacts/robux-hub/src/pages/home.tsx` — main search + gamepass display page

## Architecture decisions

- Backend proxies all Roblox API calls (frontend never hits Roblox directly) to avoid CORS issues
- Uses `roproxy.com` and `apis.roproxy.com` mirrors for reliable Roblox API access
- In-memory cache (5 min TTL) for user lookups and gamepass lists
- In-flight request deduplication prevents duplicate concurrent fetches
- Retry logic with 4x backoff on 429 rate-limit responses
- Up to 5 concurrent universe/gamepass fetch requests per user lookup
- Gamepasses are sorted ascending by price before being returned

## Product

- Search any Roblox username → view their profile (avatar, display name, bio)
- All public on-sale gamepasses fetched from all their games
- Gamepasses displayed as cards sorted by lowest price (R$ shown prominently)
- "Donate" button opens `https://www.roblox.com/game-pass/{id}/redirect` in a new tab
- No Robux are processed on the website — all purchases happen through official Roblox pages

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Roblox API rate-limits are real — the backend has retry logic but heavy usage may still hit limits
- The `apis.roproxy.com` gamepass endpoint returns either `gamePasses` or `data` depending on the universe; both are handled
- Avatar thumbnails are fetched separately from user lookup and fail silently if unavailable
- Do NOT add `DATABASE_URL` — this app has no database; remove it from any env check

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
