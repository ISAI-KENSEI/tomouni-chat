/**
 * BAN判定 (スコア合算方式)
 *
 * 判定ロジック:
 *   anon_id 一致 → +3 点
 *   fp_hash 一致 → +5 点
 *   ip/24  一致 → +1 点
 *   合計 ≥ 5 → BAN
 *
 * Upstash Redis で O(1) ルックアップ。
 * Supabase banned_identifiers からの同期は Phase 1 で自動化。
 * Phase 0 では Supabase Studio で手動 INSERT → Redis に手動 SET。
 */
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

  // Redis 未設定時はBAN判定スキップ（開発環境用）
  if (!redis) {
    return { banned: false, score: 0 };
  }

  let score = 0;
  let reason: string | undefined;

  // 並列で3つのキーをチェック
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

  try {
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
  } catch (e) {
    console.error("[ban-check] Redis error:", e);
    // Redis障害時はBAN判定をスキップ（可用性優先）
    return { banned: false, score: 0 };
  }

  return {
    banned: score >= BAN_THRESHOLD,
    score,
    reason,
  };
}

/**
 * BAN を登録 (管理者操作用)
 * Supabase にも INSERT する必要がある（別途実装）
 */
export async function setBan(
  input: BanCheckInput,
  reason: string = "1",
  ttlSeconds?: number,
): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

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
