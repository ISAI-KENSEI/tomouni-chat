/**
 * Rate limit 3段階 (Upstash Redis + sliding window)
 *
 * 層1: per-IP    — 5 req / 1 min  (短期バースト防止)
 * 層2: per-anon  — 20 req / 1 day (1ユーザーの日次上限)
 * 層3: global    — 400 req / 1 day (全体キルスイッチ)
 *
 * RATELIMIT_ENABLED=false でスキップ可能（開発用）。
 */
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

let _redis: Redis | null | undefined;

function getRedis(): Redis | null {
  if (_redis !== undefined) return _redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    _redis = null;
    return null;
  }
  _redis = new Redis({ url, token });
  return _redis;
}

// --- 3段階の Ratelimit インスタンス ---

let _perIp: Ratelimit | null | undefined;
let _perAnon: Ratelimit | null | undefined;
let _global: Ratelimit | null | undefined;

function getPerIp(): Ratelimit | null {
  if (_perIp !== undefined) return _perIp;
  const redis = getRedis();
  if (!redis) { _perIp = null; return null; }
  _perIp = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, "1 m"),
    prefix: "tomouni:rl:ip",
    analytics: true,
  });
  return _perIp;
}

function getPerAnon(): Ratelimit | null {
  if (_perAnon !== undefined) return _perAnon;
  const redis = getRedis();
  if (!redis) { _perAnon = null; return null; }
  _perAnon = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, "1 d"),
    prefix: "tomouni:rl:anon",
    analytics: true,
  });
  return _perAnon;
}

function getGlobal(): Ratelimit | null {
  if (_global !== undefined) return _global;
  const redis = getRedis();
  if (!redis) { _global = null; return null; }
  _global = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(400, "1 d"),
    prefix: "tomouni:rl:global",
    analytics: true,
  });
  return _global;
}

export type RatelimitResult = {
  success: boolean;
  remaining: number;
  reset: number;
  limit: number;
};

/** 後方互換: 単一identifier（旧API） */
export async function checkRatelimit(identifier: string): Promise<RatelimitResult> {
  const enabled = process.env.RATELIMIT_ENABLED === "true";
  if (!enabled) {
    return { success: true, remaining: 999, reset: 0, limit: 999 };
  }
  const rl = getPerIp();
  if (!rl) return { success: true, remaining: 999, reset: 0, limit: 999 };
  return rl.limit(identifier);
}

export type MultiRatelimitResult = {
  success: boolean;
  /** どの層で拒否されたか */
  blockedBy?: "per_ip" | "per_anon" | "global";
  reset: number;
};

/**
 * 3段階 Rate Limit チェック
 * 順番: global → per-IP → per-anon_id
 * globalが先 = キルスイッチが最優先
 */
export async function checkMultiRatelimit(
  ip: string,
  anonId: string,
): Promise<MultiRatelimitResult> {
  const enabled = process.env.RATELIMIT_ENABLED === "true";
  if (!enabled) {
    return { success: true, reset: 0 };
  }

  // 層3: Global kill switch
  const globalRl = getGlobal();
  if (globalRl) {
    const g = await globalRl.limit("global");
    if (!g.success) {
      return { success: false, blockedBy: "global", reset: g.reset };
    }
  }

  // 層1: per-IP (短期バースト)
  const ipRl = getPerIp();
  if (ipRl) {
    const r = await ipRl.limit(ip);
    if (!r.success) {
      return { success: false, blockedBy: "per_ip", reset: r.reset };
    }
  }

  // 層2: per-anon_id (日次上限)
  const anonRl = getPerAnon();
  if (anonRl) {
    const r = await anonRl.limit(anonId);
    if (!r.success) {
      return { success: false, blockedBy: "per_anon", reset: r.reset };
    }
  }

  return { success: true, reset: 0 };
}
