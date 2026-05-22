/**
 * POST /api/auth/logout — ログアウト
 * Cookie を削除して /login にリダイレクト
 */
import { buildClearCookieHeader } from "@/lib/auth/cookie";

export async function POST() {
  return new Response(null, {
    status: 302,
    headers: {
      Location: "/login",
      "Set-Cookie": buildClearCookieHeader(),
    },
  });
}
