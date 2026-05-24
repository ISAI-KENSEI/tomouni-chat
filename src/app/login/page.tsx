/**
 * /login — 招待コード入力ページ
 * トモユニのデザインに合わせた暖色系ポップUI
 */
"use client";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError("");
      setLoading(true);

      try {
        const res = await fetch("/api/auth/code", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: code.trim() }),
        });

        if (res.ok) {
          router.push("/");
          router.refresh();
          return;
        }

        const data = await res.json().catch(() => ({}));
        setError(
          data.error ?? "招待コードが無効です。コードを確認してください。",
        );
      } catch {
        setError("通信エラーが発生しました。もう一度お試しください。");
      } finally {
        setLoading(false);
      }
    },
    [code, router],
  );

  return (
    <div className="flex min-h-dvh items-center justify-center bg-gradient-to-b from-[#FFF8F0] to-[#F5E6D3] px-4">
      <div className="w-full max-w-sm rounded-3xl bg-white/80 p-8 shadow-lg backdrop-blur-sm">
        {/* ロゴ */}
        <div className="mb-6 text-center">
          <p
            className="text-3xl"
            style={{ fontFamily: "var(--font-mochiy)" }}
          >
            🐾
          </p>
          <h1
            className="mt-2 text-xl font-bold text-[#5C3D2E]"
            style={{ fontFamily: "var(--font-zen-maru)" }}
          >
            トモユニチャット
          </h1>
          <p className="mt-1 text-sm text-[#8B6914]/70">
            トモユニ メンバー専用
          </p>
        </div>

        {/* フォーム */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="invite-code"
              className="mb-1 block text-sm font-medium text-[#5C3D2E]"
            >
              招待コード
            </label>
            <input
              id="invite-code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="コードを入力してね"
              autoComplete="off"
              autoFocus
              className="w-full rounded-xl border border-[#D4B896] bg-white px-4 py-3 text-center text-lg tracking-widest text-[#5C3D2E] placeholder:text-[#C4A882]/50 focus:border-[#A8784A] focus:outline-none focus:ring-2 focus:ring-[#A8784A]/30"
              style={{ fontFamily: "var(--font-quicksand)" }}
              disabled={loading}
            />
          </div>

          {/* エラー表示 */}
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-center text-sm text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !code.trim()}
            className="w-full rounded-xl bg-gradient-to-r from-[#A8784A] to-[#8B6914] py-3 text-sm font-bold text-white shadow-md transition-all hover:shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:shadow-none"
            style={{ fontFamily: "var(--font-zen-maru)" }}
          >
            {loading ? "確認中..." : "入室する 🐾"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-[#8B6914]/50">
          招待コードはトモユニのコミュニティ内で確認できます
        </p>
      </div>
    </div>
  );
}
