import { Router, Request, Response } from "express";
import axios from "axios";
import type { AxiosResponse } from "axios";

const router = Router();

// ── Types ─────────────────────────────────────────────────────────────────────

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

// ── Cache ─────────────────────────────────────────────────────────────────────

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const userCache = new Map<string, CacheEntry<RobloxUserData>>();
const gamepassCache = new Map<number, CacheEntry<GamepassData[]>>();
const CACHE_TTL_MS = 5 * 60 * 1000;

function getCached<K extends string | number, T>(
  cache: Map<K, CacheEntry<T>>,
  key: K
): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache<K extends string | number, T>(
  cache: Map<K, CacheEntry<T>>,
  key: K,
  data: T
) {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

// ── In-flight dedup ───────────────────────────────────────────────────────────

const inFlightUser = new Map<string, Promise<RobloxUserData>>();
const inFlightGamepasses = new Map<number, Promise<GamepassData[]>>();

// ── Axios ─────────────────────────────────────────────────────────────────────

const http = axios.create({ timeout: 10_000 });

// ── Retry ─────────────────────────────────────────────────────────────────────

async function withRetry<T>(
  fn: () => Promise<AxiosResponse<T>>,
  retries = 3,
  delayMs = 500
): Promise<T> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fn();
      return res.data;
    } catch (err: unknown) {
      if (attempt === retries - 1) throw err;
      const isRateLimit =
        axios.isAxiosError(err) &&
        (err.response?.status === 429 || err.response?.status === 503);
      const wait = isRateLimit ? delayMs * 4 : delayMs;
      await new Promise((r) => setTimeout(r, wait * (attempt + 1)));
    }
  }
  throw new Error("unreachable");
}

// ── Roblox API response shapes ────────────────────────────────────────────────

interface RobloxUsernameResponse {
  data: Array<{ id: number; name: string; displayName: string }>;
}

interface RobloxAvatarResponse {
  data: Array<{ imageUrl?: string }>;
}

interface RobloxProfileResponse {
  description?: string;
}

interface RobloxGamesResponse {
  data: Array<{ id: number; name: string }>;
}

interface RobloxRawPass {
  id: number;
  name: string;
  price?: number;
  isForSale?: boolean;
  iconImageId?: number;
  sellerName?: string;
}

interface RobloxGamepassesResponse {
  gamePasses?: RobloxRawPass[];
  data?: RobloxRawPass[];
}

// ── Fetch helpers ─────────────────────────────────────────────────────────────

async function fetchRobloxUser(username: string): Promise<RobloxUserData> {
  const users = await withRetry<RobloxUsernameResponse>(() =>
    http.post("https://users.roblox.com/v1/usernames/users", {
      usernames: [username],
      excludeBannedUsers: false,
    })
  );

  const list = users.data ?? [];
  if (!list.length) {
    const err = new Error("User not found") as Error & { statusCode: number };
    err.statusCode = 404;
    throw err;
  }

  const user = list[0]!;

  let avatarUrl: string | null = null;
  try {
    const avatar = await withRetry<RobloxAvatarResponse>(() =>
      http.get(
        `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${user.id}&size=150x150&format=Png&isCircular=false`
      )
    );
    avatarUrl = avatar.data?.[0]?.imageUrl ?? null;
  } catch {
    // non-critical — continue without avatar
  }

  let description: string | null = null;
  try {
    const profile = await withRetry<RobloxProfileResponse>(() =>
      http.get(`https://users.roblox.com/v1/users/${user.id}`)
    );
    description = profile.description ?? null;
  } catch {
    // non-critical
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
  let universes: Array<{ id: number; name: string }> = [];
  try {
    const games = await withRetry<RobloxGamesResponse>(() =>
      http.get(
        `https://games.roproxy.com/v2/users/${userId}/games?accessFilter=2&limit=50&sortOrder=Asc`
      )
    );
    universes = games.data ?? [];
  } catch {
    return [];
  }

  if (!universes.length) return [];

  const allPasses: GamepassData[] = [];
  const seen = new Set<number>();
  const CONCURRENCY = 5;

  for (let i = 0; i < universes.length; i += CONCURRENCY) {
    const batch = universes.slice(i, i + CONCURRENCY);
    await Promise.allSettled(
      batch.map(async (universe) => {
        const gp = await withRetry<RobloxGamepassesResponse>(() =>
          http.get(
            `https://apis.roproxy.com/game-passes/v1/universes/${universe.id}/game-passes?passView=Full&pageSize=100`
          )
        );
        const passes: RobloxRawPass[] = gp.gamePasses ?? gp.data ?? [];

        for (const p of passes) {
          if (
            typeof p.price !== "number" ||
            p.price <= 0 ||
            p.isForSale === false ||
            seen.has(p.id)
          )
            continue;

          seen.add(p.id);
          const iconUrl = p.iconImageId
            ? `https://www.roblox.com/asset-thumbnail/image?assetId=${p.iconImageId}&width=150&height=150&format=Png`
            : null;

          allPasses.push({
            id: p.id,
            name: p.name,
            price: p.price,
            iconUrl,
            sellerName: p.sellerName ?? null,
            gameId: universe.id,
            gameName: universe.name,
          });
        }
      })
    );
  }

  allPasses.sort((a, b) => a.price - b.price);
  return allPasses;
}

// ── Routes ────────────────────────────────────────────────────────────────────

router.get("/user/:username", async (req: Request, res: Response) => {
  const { username } = req.params;
  if (!username?.trim()) {
    res.status(400).json({ error: "Username is required" });
    return;
  }

  const key = username.trim().toLowerCase();
  const cached = getCached(userCache, key);
  if (cached) {
    res.json(cached);
    return;
  }

  let inFlight = inFlightUser.get(key);
  if (!inFlight) {
    inFlight = fetchRobloxUser(username.trim()).finally(() =>
      inFlightUser.delete(key)
    );
    inFlightUser.set(key, inFlight);
  }

  try {
    const data = await inFlight;
    setCache(userCache, key, data);
    res.json(data);
  } catch (err: unknown) {
    if ((err as { statusCode?: number }).statusCode === 404) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    if (axios.isAxiosError(err) && err.response?.status === 429) {
      res.status(429).json({ error: "Rate limited. Try again shortly." });
      return;
    }
    console.error("[roblox] user fetch error:", err);
    res.status(500).json({ error: "Failed to fetch user data" });
  }
});

router.get("/gamepasses/:userId", async (req: Request, res: Response) => {
  const userId = Math.floor(Number(req.params.userId));
  if (!Number.isFinite(userId) || userId <= 0) {
    res.status(400).json({ error: "Invalid userId" });
    return;
  }

  const cached = getCached(gamepassCache, userId);
  if (cached) {
    res.json({
      gamepasses: cached,
      cached: true,
      fetchedAt: new Date().toISOString(),
    });
    return;
  }

  let inFlight = inFlightGamepasses.get(userId);
  if (!inFlight) {
    inFlight = fetchAllGamepasses(userId).finally(() =>
      inFlightGamepasses.delete(userId)
    );
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
      res.status(429).json({ error: "Rate limited. Try again shortly." });
      return;
    }
    console.error("[roblox] gamepass fetch error:", err);
    res.status(500).json({ error: "Failed to fetch gamepasses" });
  }
});

export default router;
