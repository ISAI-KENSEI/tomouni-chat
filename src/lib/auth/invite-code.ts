/**
 * 招待コード照合
 * invite_codes テーブルから有効なコードを検索
 *
 * 照合条件: code一致 + is_active=true + expires_at > now()
 */
import { createAdminClient } from "@/lib/supabase/admin";

export interface InviteCodeResult {
  valid: boolean;
  error?: string;
}

/**
 * 招待コードを照合する
 * @param code ユーザーが入力したコード
 * @returns valid=true なら認証成功
 */
export async function verifyInviteCode(code: string): Promise<InviteCodeResult> {
  if (!code || code.trim().length === 0) {
    return { valid: false, error: "コードを入力してください" };
  }

  const trimmed = code.trim().toUpperCase();

  const admin = createAdminClient();
  if (!admin) {
    console.error("[invite-code] Supabase admin client unavailable");
    return { valid: false, error: "サーバーエラーが発生しました" };
  }

  try {
    const { data, error } = await admin
      .from("invite_codes")
      .select("id, code, expires_at")
      .eq("code", trimmed)
      .eq("is_active", true)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (error) {
      console.error("[invite-code] Supabase query error:", error);
      return { valid: false, error: "サーバーエラーが発生しました" };
    }

    if (!data) {
      return { valid: false, error: "招待コードが無効です。コードを確認してください。" };
    }

    return { valid: true };
  } catch (e) {
    console.error("[invite-code] unexpected error:", e);
    return { valid: false, error: "サーバーエラーが発生しました" };
  }
}
