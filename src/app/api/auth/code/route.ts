/**
 * POST /api/auth/code — 招待コード認証
 *
 * リクエスト: { code: string }
 * 成功時: Set-Cookie (tomouni_session) + 200
 * 失敗時: 401 + error message
 */
import { z } from "zod";
import { verifyInviteCode } from "@/lib/auth/invite-code";
import { createSessionCookie, buildSetCookieHeader } from "@/lib/auth/cookie";
import { nanoid } from "nanoid";

const BodySchema = z.object({
  code: z.string().min(1).max(64),
});

export async function POST(req: Request) {
  // body parse
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return Response.json(
      { error: "コードを入力してください" },
      { status: 400 },
    );
  }

  // 招待コード照合
  const result = await verifyInviteCode(parsed.data.code);
  if (!result.valid) {
    return Response.json(
      { error: result.error ?? "招待コードが無効です" },
      { status: 401 },
    );
  }

  // セッションCookie発行
  // anonId は nanoid で生成（ユーザーごとの匿名識別子）
  const anonId = nanoid(21);
  const cookieValue = await createSessionCookie(anonId);

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": buildSetCookieHeader(cookieValue),
    },
  });
}
