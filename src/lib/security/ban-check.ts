/**
 * BAN判定 (スコア合算方式) + Supabase永続化
 *
 * 判定ロジック:
 *   anon_id 一致 → +3 点
 *   fp_hash 一致 → +5 点
 *   ip/24  一致 → +1 点
 *   合計 ≥ 5 → BAN
 *
 * Upstash Redis で O(1) ルックアップ。
 * setBan() は Redis + Supabase の両方に書き込む（同期不要化）。
 * checkBan() は Redis 優先、Redis障害時は Supabase フォールバック。
 */
import { Redis } from "@upstash/redis";
import { createAdminClient } from "@/lib/supabase/admin";

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

export interface BanCheckInput {
  anonId?: string;
  fpHash?: string;
  ipSlash24?: string;
}

export interface BanCheckResult {
  banned: boolean;
  score: number;
  /** BANの理由（見つかった場合） */
  reason?: string;
}

const SCORE_ANON_ID = 3;
const SCORE_FP_HASH = 5;
const SCORE_IP_SLASH24 = 1;
const BAN_THRESHOLD = 5;

/**
 * Redis キー規約:
 *   ban:anon:{anonId}  → "1" or reason string
 *   ban:fp:{fpHash}    → "1" or reason string
 *   ban:ip24:{prefix}  → "1" or reason string
 */
export async function checkBan(input: BanCheckInput): Promise<BanCheckResult> {
  const redis = getRedis();

  // Redis が使える場合は Redis で高速判定
  if (redis) {
    try {
      return await checkBanFromRedis(redis, input);
    } catch (e) {
      console.error("[ban-check] Redis error, falling back to Supabase:", e);
    }
  }

  // Redis 未設定 or 障害時は Supabase フォールバック
  return await checkBanFromSupabase(input);
}

/** Redis からのBAN判定 */
async function checkBanFromRedis(redis: Redis, input: BanCheckInput): Promise<BanCheckResult> {
  let score = 0;
  let reason: string | undefined;

  const keys: string[] = [];
  const scores: number[] = [];

  if (input.anonId) {
    keys.push(`ban:anon:${input.anonId}`);
    scores.push(SCORE_ANON_ID);
  }
  if (input.fpHash) {
    keys.push(`ban:fp:${input.fpHash}`);
    scores.push(SCORE_FP_HASH);
  }
  if (input.ipSlash24) {
    keys.push(`ban:ip24:${input.ipSlash24}`);
    scores.push(SCORE_IP_SLASH24);
  }

  if (keys.length === 0) {
    return { banned: false, score: 0 };
  }

  // MGET で一括取得
  const values = await redis.mget<(string | null)[]>(...keys);

  for (let i = 0; i < values.length; i++) {
    if (values[i] !== null) {
      score += scores[i];
      if (!reason && typeof values[i] === "string" && values[i] !== "1") {
        reason = values[i] as string;
      }
    }
  }

  return {
    banned: score >= BAN_THRESHOLD,
    score,
    reason,
  };
}

/** Supabase フォールバック（Redis障害時） */
async function checkBanFromSupabase(input: BanCheckInput): Promise<BanCheckResult> {
  const admin = createAdminClient();
  if (!admin) {
    // 両方使えない場合はBAN判定スキップ（可用性優先）
    return { banned: false, score: 0 };
  }

  try {
    let score = 0;
    let reason: string | undefined;

    // 各識別子を個別にチェック
    if (input.anonId) {
      const { data } = await admin
        .from("banned_identifiers")
        .select("reason")
        .eq("anon_id", input.anonId)
        .eq("is_active", true)
        .maybeSingle();
      if (data) {
        score += SCORE_ANON_ID;
        if (data.reason) reason = data.reason;
      }
    }

    if (input.fpHash) {
      const { data } = await admin
        .from("banned_identifiers")
        .select("reason")
        .eq("fp_hash", input.fpHash)
        .eq("is_active", true)
        .maybeSingle();
      if (data) {
        score += SCORE_FP_HASH;
        if (!reason && data.reason) reason = data.reason;
      }
    }

    if (input.ipSlash24) {
      const { data } = await admin
        .from("banned_identifiers")
        .select("reason")
        .eq("ip_slash24", input.ipSlash24)
        .eq("is_active", true)
        .maybeSingle();
      if (data) {
        score += SCORE_IP_SLASH24;
        if (!reason && data.reason) reason = data.reason;
      }
    }

    return { banned: score >= BAN_THRESHOLD, score, reason };
  } catch (e) {
    console.error("[ban-check] Supabase fallback error:", e);
    return { banned: false, score: 0 };
  }
}

/**
 * BAN を登録 (Redis + Supabase の両方に書き込む)
 *
 * これにより Redis ⇄ Supabase の同期パイプラインが不要になる。
 * setBan() 1回で両方に永続化される。
 */
export async function setBan(
  input: BanCheckInput,
  reason: string = "manual_ban",
  options?: {
    ttlSeconds?: number;
    banLevel?: "warning" | "temp_24h" | "temp_48h" | "permanent";
    bannedBy?: string;
  },
): Promise<void> {
  const { ttlSeconds, banLevel = "permanent", bannedBy = "system" } = options ?? {};

  // --- Redis に書き込み ---
  const redis = getRedis();
  if (redis) {
    try {
      const pipeline = redis.pipeline();

      if (input.anonId) {
        if (ttlSeconds) {
          pipeline.set(`ban:anon:${input.anonId}`, reason, { ex: ttlSeconds });
        } else {
          pipeline.set(`ban:anon:${input.anonId}`, reason);
        }
      }
      if (input.fpHash) {
        if (ttlSeconds) {
          pipeline.set(`ban:fp:${input.fpHash}`, reason, { ex: ttlSeconds });
        } else {
          pipeline.set(`ban:fp:${input.fpHash}`, reason);
        }
      }
      if (input.ipSlash24) {
        if (ttlSeconds) {
          pipeline.set(`ban:ip24:${input.ipSlash24}`, reason, { ex: ttlSeconds });
        } else {
          pipeline.set(`ban:ip24:${input.ipSlash24}`, reason);
        }
      }

      await pipeline.exec();
    } catch (e) {
      console.error("[ban-check] Redis setBan error:", e);
    }
  }

  // --- Supabase に永続化 ---
  const admin = createAdminClient();
  if (admin) {
    try {
      const expiresAt = ttlSeconds
        ? new Date(Date.now() + ttlSeconds * 1000).toISOString()
        : null;

      await admin.from("banned_identifiers").insert({
        anon_id: input.anonId ?? null,
        fp_hash: input.fpHash ?? null,
        ip_slash24: input.ipSlash24 ?? null,
        reason,
        banned_by: bannedBy,
        ban_level: banLevel,
        is_active: true,
        expires_at: expiresAt,
      });
    } catch (e) {
      console.error("[ban-check] Supabase setBan error:", e);
    }
  }
}

/**
 * IP アドレスから /24 プレフィックスを抽出
 * 例: "192.168.1.100" → "192.168.1"
 */
export function extractIpSlash24(ip: string): string {
  // IPv4
  const parts = ip.split(".");
  if (parts.length === 4) {
    return parts.slice(0, 3).join(".");
  }
  // IPv6 はそのまま返す（Phase 2 で対応）
  return ip;
}

export { BAN_THRESHOLD, SCORE_ANON_ID, SCORE_FP_HASH, SCORE_IP_SLASH24 };
