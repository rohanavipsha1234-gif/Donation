import { Router, type IRouter } from "express";
import axios, { type AxiosInstance } from "axios";

const router: IRouter = Router();

// ── Cache ────────────────────────────────────────────────────────────────────

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const userCache = new Map<string, CacheEntry<RobloxUserData>>();
const gamepassCache = new Map<number, CacheEntry<GamepassData[]>>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getCached<T>(cache: Map<string | number, CacheEntry<T>>, key: string | number): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache<T>(cache: Map<string | number, CacheEntry<T>>, key: string | number, data: T) {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

// ── Request debounce / in-flight dedup ───────────────────────────────────────

const inFlightUser = new Map<string, Promise<RobloxUserData>>();
const inFlightGamepasses = new Map<number, Promise<GamepassData[]>>();

// ── Axios client with timeout ────────────────────────────────────────────────

const http: AxiosInstance = axios.create({
  timeout: 10_000,
  headers: { "Accept-Encoding": "gzip" },
});

// ── Retry helper ─────────────────────────────────────────────────────────────

async function withRetry<T>(fn: () => Promise<T>, retries = 3, delayMs = 500): Promise<T> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      const isLast = attempt === retries - 1;
      if (isLast) throw err;
      const isRateLimit =
        axios.isAxiosError(err) && (err.response?.status === 429 || err.response?.status === 503);
      const wait = isRateLimit ? delayMs * 4 : delayMs;
      await new Promise((r) => setTimeout(r, wait * (attempt + 1)));
    }
  }
  throw new Error("Unreachable");
}

// ── Types ────────────────────────────────────────────────────────────────────

interface RobloxUserData {
  id: number;
  name: string;
  displayName: string;
  description: string | null;
  avatarUrl: string | null;
}

interface GamepassData {
  id: number;
  name: string;
  price: number;
  iconUrl: string | null;
  sellerName: string | null;
  gameId: number;
  gameName: string | null;
}

// ── Internal fetch helpers ───────────────────────────────────────────────────

async function fetchRobloxUser(username: string): Promise<RobloxUserData> {
  // Use Roblox API to get user by username
  const usersRes = await withRetry(() =>
    http.post("https://users.roblox.com/v1/usernames/users", {
      usernames: [username],
      excludeBannedUsers: false,
    })
  );

  const users: Array<{ id: number; name: string; displayName: string }> =
    usersRes.data?.data ?? [];

  if (!users.length) throw Object.assign(new Error("User not found"), { statusCode: 404 });

  const user = users[0]!;

  // Fetch avatar thumbnail
  let avatarUrl: string | null = null;
  try {
    const avatarRes = await withRetry(() =>
      http.get(
        `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${user.id}&size=150x150&format=Png&isCircular=false`
      )
    );
    avatarUrl = avatarRes.data?.data?.[0]?.imageUrl ?? null;
  } catch {
    // Avatar is non-critical — continue without it
  }

  // Fetch description
  let description: string | null = null;
  try {
    const profileRes = await withRetry(() =>
      http.get(`https://users.roblox.com/v1/users/${user.id}`)
    );
    description = profileRes.data?.description ?? null;
  } catch {
    // Non-critical
  }

  return {
    id: user.id,
    name: user.name,
    displayName: user.displayName,
    description,
    avatarUrl,
  };
}

async function fetchAllGamepasses(userId: number): Promise<GamepassData[]> {
  // Step 1: Fetch all user's games/universes (limit to first 50)
  let universes: Array<{ id: number; name: string }> = [];
  try {
    const gamesRes = await withRetry(() =>
      http.get(
        `https://games.roproxy.com/v2/users/${userId}/games?accessFilter=2&limit=50&sortOrder=Asc`
      )
    );
    universes = (gamesRes.data?.data ?? []).map((g: { id: number; name: string }) => ({
      id: g.id,
      name: g.name,
    }));
  } catch {
    // If we can't fetch games, return empty
    return [];
  }

  if (!universes.length) return [];

  // Step 2: Fetch gamepasses for each universe (limit 5 concurrent requests)
  const allPasses: GamepassData[] = [];
  const seen = new Set<number>();

  const CONCURRENCY = 5;
  for (let i = 0; i < universes.length; i += CONCURRENCY) {
    const batch = universes.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map(async (universe) => {
        const passRes = await withRetry(() =>
          http.get(
            `https://apis.roproxy.com/game-passes/v1/universes/${universe.id}/game-passes?passView=Full&pageSize=100`
          )
        );
        const passes: Array<{
          id: number;
          name: string;
          price?: number;
          isForSale?: boolean;
          iconImageId?: number;
          sellerName?: string;
        }> = passRes.data?.gamePasses ?? passRes.data?.data ?? [];

        for (const p of passes) {
          const price = p.price;
          const isForSale = p.isForSale !== false;
          const passId = p.id;

          if (
            typeof price !== "number" ||
            price <= 0 ||
            !isForSale ||
            seen.has(passId)
          ) {
            continue;
          }

          seen.add(passId);

          let iconUrl: string | null = null;
          if (p.iconImageId) {
            iconUrl = `https://www.roblox.com/asset-thumbnail/image?assetId=${p.iconImageId}&width=150&height=150&format=Png`;
          }

          allPasses.push({
            id: passId,
            name: p.name,
            price,
            iconUrl,
            sellerName: p.sellerName ?? null,
            gameId: universe.id,
            gameName: universe.name,
          });
        }
      })
    );

    // Log any errors but don't fail the whole request
    for (const r of results) {
      if (r.status === "rejected") {
        // silently skip failed universe gamepass fetches
      }
    }
  }

  // Sort by price ascending
  allPasses.sort((a, b) => a.price - b.price);

  return allPasses;
}

// ── Routes ───────────────────────────────────────────────────────────────────

router.get("/user/:username", async (req, res) => {
  const { username } = req.params;

  if (!username || username.trim().length === 0) {
    res.status(400).json({ error: "Username is required" });
    return;
  }

  const normalised = username.trim().toLowerCase();

  // Cache hit
  const cached = getCached(userCache, normalised);
  if (cached) {
    res.json(cached);
    return;
  }

  // Dedup in-flight requests
  let inFlight = inFlightUser.get(normalised);
  if (!inFlight) {
    inFlight = fetchRobloxUser(username.trim()).finally(() => {
      inFlightUser.delete(normalised);
    });
    inFlightUser.set(normalised, inFlight);
  }

  try {
    const data = await inFlight;
    setCache(userCache, normalised, data);
    res.json(data);
  } catch (err: unknown) {
    const statusCode = (err as { statusCode?: number }).statusCode;
    if (statusCode === 404) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    if (axios.isAxiosError(err) && err.response?.status === 429) {
      res.status(429).json({ error: "Rate limited by Roblox. Please try again shortly." });
      return;
    }
    req.log.error({ err }, "Failed to fetch Roblox user");
    res.status(500).json({ error: "Failed to fetch user data" });
  }
});

router.get("/gamepasses/:userId", async (req, res) => {
  const userIdRaw = Number(req.params.userId);

  if (!Number.isFinite(userIdRaw) || userIdRaw <= 0) {
    res.status(400).json({ error: "Invalid userId" });
    return;
  }

  const userId = Math.floor(userIdRaw);

  // Cache hit
  const cached = getCached(gamepassCache, userId);
  if (cached) {
    res.json({
      gamepasses: cached,
      cached: true,
      fetchedAt: new Date().toISOString(),
    });
    return;
  }

  // Dedup in-flight requests
  let inFlight = inFlightGamepasses.get(userId);
  if (!inFlight) {
    inFlight = fetchAllGamepasses(userId).finally(() => {
      inFlightGamepasses.delete(userId);
    });
    inFlightGamepasses.set(userId, inFlight);
  }

  try {
    const gamepasses = await inFlight;
    setCache(gamepassCache, userId, gamepasses);
    res.json({
      gamepasses,
      cached: false,
      fetchedAt: new Date().toISOString(),
    });
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response?.status === 429) {
      res.status(429).json({ error: "Rate limited by Roblox. Please try again shortly." });
      return;
    }
    req.log.error({ err }, "Failed to fetch gamepasses");
    res.status(500).json({ error: "Failed to fetch gamepasses" });
  }
});

export default router;
