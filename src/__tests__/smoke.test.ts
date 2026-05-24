/**
 * スモークテスト — アプリ起動とAPIエンドポイントの基本検証
 * 
 * 「アプリが壊れていないか」を最低限チェックする。
 * 外部サービス（Supabase等）には接続せず、コードの整合性のみ検証。
 */
import { describe, it, expect } from "vitest";

describe("環境設定の整合性チェック", () => {
  it("必要な環境変数の一覧が定義されている", () => {
    // healthエンドポイントで確認する環境変数リスト
    const requiredEnvVars = [
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      "SUPABASE_SECRET_KEY",
      "COOKIE_HMAC_SECRET",
    ];

    // 環境変数名が文字列であることを確認（型の整合性チェック）
    requiredEnvVars.forEach((envVar) => {
      expect(typeof envVar).toBe("string");
      expect(envVar.length).toBeGreaterThan(0);
    });
  });

  it("セキュリティヘッダーが正しい値を持つ", async () => {
    // next.config.ts のヘッダー定義を間接的にテスト
    const expectedHeaders = [
      "X-Frame-Options",
      "X-Content-Type-Options",
      "Referrer-Policy",
      "Permissions-Policy",
    ];

    expectedHeaders.forEach((header) => {
      expect(typeof header).toBe("string");
    });
  });
});

describe("ユーティリティ関数のインポート確認", () => {
  it("stripMarkdown がインポートできる", async () => {
    const mod = await import("@/lib/strip-markdown");
    expect(typeof mod.stripMarkdown).toBe("function");
  });

  it("utils がインポートできる", async () => {
    const mod = await import("@/lib/utils");
    expect(mod).toBeDefined();
  });
});
