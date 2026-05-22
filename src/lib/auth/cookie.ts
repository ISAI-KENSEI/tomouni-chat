/**
 * Cookie 署名 / 検証 (HMAC-SHA256)
 * 依存ゼロ — Web Crypto API のみ使用
 *
 * Cookie 仕様:
 *   名前: tomouni_session
 *   有効期限: 7日
 *   自動延長: アクセス時に残り3日以下なら7日にリフレッシュ
 *   HttpOnly + Secure + SameSite=Lax
 */
import { cookies } from "next/headers";

const COOKIE_NAME = "tomouni_session";
const MAX_AGE_DAYS = 7;
const REFRESH_THRESHOLD_DAYS = 3;
const MAX_AGE_SECONDS = MAX_AGE_DAYS * 24 * 60 * 60;
const REFRESH_THRESHOLD_SECONDS = REFRESH_THRESHOLD_DAYS * 24 * 60 * 60;

function getSecret(): string {
  const secret = process.env.COOKIE_HMAC_SECRET;
  if (!secret) throw new Error("COOKIE_HMAC_SECRET is not set");
  return secret;
}

// --- 低レベルHMAC (Web Crypto API) ---

async function hmacSign(payload: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function hmacVerify(payload: string, signature: string): Promise<boolean> {
  const expected = await hmacSign(payload);
  // タイミングセーフ比較
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return diff === 0;
}

// --- Cookie ペイロード ---

export interface SessionPayload {
  /** コード検証時に振られた匿名ID */
  anonId: string;
  /** Cookie発行時刻 (epoch seconds) */
  iat: number;
  /** Cookie有効期限 (epoch seconds) */
  exp: number;
}

function encodePayload(p: SessionPayload): string {
  return btoa(JSON.stringify(p))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function decodePayload(encoded: string): SessionPayload | null {
  try {
    const padded = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(padded);
    return JSON.parse(json) as SessionPayload;
  } catch {
    return null;
  }
}

// --- 公開API ---

/**
 * セッションCookie を発行（Set-Cookie ヘッダー付きレスポンス用）
 */
export async function createSessionCookie(anonId: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    anonId,
    iat: now,
    exp: now + MAX_AGE_SECONDS,
  };
  const encoded = encodePayload(payload);
  const sig = await hmacSign(encoded);
  return `${encoded}.${sig}`;
}

/**
 * Cookie値を検証し、ペイロードを返す
 * 無効なら null
 */
export async function verifySessionCookie(
  cookieValue: string,
): Promise<SessionPayload | null> {
  const parts = cookieValue.split(".");
  if (parts.length !== 2) return null;

  const [encoded, sig] = parts;
  const valid = await hmacVerify(encoded, sig);
  if (!valid) return null;

  const payload = decodePayload(encoded);
  if (!payload) return null;

  // 有効期限チェック
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp < now) return null;

  return payload;
}

/**
 * Cookie をリフレッシュすべきか判定
 * 残り3日以下なら true
 */
export function shouldRefreshCookie(payload: SessionPayload): boolean {
  const now = Math.floor(Date.now() / 1000);
  const remaining = payload.exp - now;
  return remaining < REFRESH_THRESHOLD_SECONDS;
}

/**
 * Set-Cookie ヘッダー値を生成
 */
export function buildSetCookieHeader(value: string): string {
  const isProduction = process.env.NODE_ENV === "production";
  const parts = [
    `${COOKIE_NAME}=${value}`,
    `Path=/`,
    `HttpOnly`,
    `SameSite=Lax`,
    `Max-Age=${MAX_AGE_SECONDS}`,
  ];
  if (isProduction) parts.push("Secure");
  return parts.join("; ");
}

/**
 * Cookie を削除するためのSet-Cookie ヘッダー値
 */
export function buildClearCookieHeader(): string {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

/**
 * Next.js の cookies() から直接セッションを取得・検証
 */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(COOKIE_NAME);
  if (!cookie?.value) return null;
  return verifySessionCookie(cookie.value);
}

export { COOKIE_NAME, MAX_AGE_SECONDS };
