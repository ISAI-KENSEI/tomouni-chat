"use client";

import { useState, useEffect, useRef } from "react";

/* ─────────────── データ定義 ─────────────── */

interface Layer {
  id: number;
  name: string;
  nameEn: string;
  icon: string;
  description: string;
  tech: string;
  file: string;
  status: "active" | "improved" | "new";
  detail: string;
}

const LAYERS: Layer[] = [
  {
    id: 1,
    name: "CSRF ガード",
    nameEn: "CSRF Guard",
    icon: "🌐",
    description: "Origin / Referer ヘッダーを許可リストと照合",
    tech: "Origin 検証",
    file: "lib/csrf.ts",
    status: "active",
    detail:
      "外部サイトからの不正POSTを防止。chat.b-steep.com / tomouni-chat.vercel.app / localhost のみ許可。",
  },
  {
    id: 2,
    name: "Cookie HMAC 検証",
    nameEn: "Cookie Verification",
    icon: "🔐",
    description: "HMAC-SHA256 署名付き Cookie の二重チェック",
    tech: "Web Crypto API",
    file: "lib/auth/cookie.ts",
    status: "active",
    detail:
      "Middleware層とAPI層で独立してCookieを検証。タイミングセーフ比較でサイドチャネル攻撃を防止。CVE-2025-29927対策済み。",
  },
  {
    id: 3,
    name: "BAN 判定",
    nameEn: "Ban Check",
    icon: "⛔",
    description: "スコア合算方式（anon_id +3 / fp +5 / ip +1）",
    tech: "Upstash Redis + Supabase",
    file: "lib/security/ban-check.ts",
    status: "improved",
    detail:
      "【今回改善】Redis + Supabase 二重書き込みで同期不要化。Redis障害時はSupabaseフォールバック。setBan() 1回で両方に永続化。",
  },
  {
    id: 4,
    name: "入力長チェック",
    nameEn: "Input Validation",
    icon: "📏",
    description: "最終メッセージが 2000 字以下であることを検証",
    tech: "Zod Schema",
    file: "api/chat/route.ts",
    status: "active",
    detail: "空入力も拒否。メッセージ配列の上限は50件。",
  },
  {
    id: 5,
    name: "Prompt Injection 検知",
    nameEn: "Prompt Injection",
    icon: "🛡️",
    description: "7パターンの regex で攻撃的プロンプトを検知",
    tech: "RegExp マッチング",
    file: "lib/security/patterns.ts",
    status: "active",
    detail:
      'ignore_previous_instructions / reveal_system_prompt / DAN jailbreak / role_override / code_execution / script_injection の7パターン。high → 即ブロック。',
  },
  {
    id: 6,
    name: "Rate Limit 3段",
    nameEn: "Rate Limiting",
    icon: "⏱️",
    description: "per-IP 5/min → per-anon 20/day → global 400/day",
    tech: "Upstash Sliding Window",
    file: "lib/ratelimit.ts",
    status: "active",
    detail:
      "グローバルキルスイッチ最優先。IP→個人→全体の順で段階的に制限。analytics有効でダッシュボードで監視可能。",
  },
  {
    id: 7,
    name: "コスト天井",
    nameEn: "Cost Ceiling",
    icon: "💰",
    description: "maxOutputTokens=1024 / stepCount ≤ 3",
    tech: "AI SDK パラメータ",
    file: "api/chat/route.ts",
    status: "active",
    detail:
      "1回の応答で生成されるトークン数を1024に制限。ステップ数も3以下。LLMコスト爆発を構造的に防止。",
  },
  {
    id: 8,
    name: "PII Redaction",
    nameEn: "PII Protection",
    icon: "🔒",
    description: "個人情報を除去してから分析テーブルに保存",
    tech: "正規表現フィルタ",
    file: "lib/analytics/pii-redact.ts",
    status: "active",
    detail:
      "運営が会話ログを分析する際、生の個人情報が見えないようにする。question_analytics テーブルに保存。",
  },
];

interface AuthStep {
  icon: string;
  title: string;
  description: string;
  status: "active" | "improved" | "new";
}

const AUTH_FLOW: AuthStep[] = [
  {
    icon: "🔗",
    title: "URLアクセス",
    description: "Skool内リンク or 直接URL",
    status: "active",
  },
  {
    icon: "🍪",
    title: "Cookie検査",
    description: "Middleware が HMAC 署名を検証",
    status: "active",
  },
  {
    icon: "🔑",
    title: "招待コード入力",
    description: "Cookie無効時 → /login にリダイレクト",
    status: "active",
  },
  {
    icon: "🗃️",
    title: "DB照合 + 回数チェック",
    description: "code一致 + is_active + expires_at + used < max",
    status: "new",
  },
  {
    icon: "🔄",
    title: "排他ロックインクリメント",
    description: "RPC で used_count を安全に+1",
    status: "new",
  },
  {
    icon: "✅",
    title: "セッション発行",
    description: "HMAC-SHA256 Cookie（7日有効・自動延長）",
    status: "active",
  },
];

interface Vulnerability {
  id: string;
  title: string;
  risk: "critical" | "medium" | "low";
  before: string;
  after: string;
  status: "fixed" | "improved" | "planned";
}

const VULNERABILITIES: Vulnerability[] = [
  {
    id: "VUL-001",
    title: "招待コード利用回数無制限",
    risk: "critical",
    before: "1つのコードで無限にセッション発行可能。漏洩時に不正利用される。",
    after:
      "max_uses / used_count カラム追加。排他ロック付きRPCでレースコンディション対策済み。",
    status: "fixed",
  },
  {
    id: "VUL-002",
    title: "BAN の Supabase↔Redis 手動同期",
    risk: "medium",
    before:
      "Supabase に INSERT しても Redis には手動SET が必要。BANしたつもりが効いてない。",
    after:
      "setBan() が Redis + Supabase の両方に書き込む。同期パイプライン不要に。checkBan() に Supabase フォールバック追加。",
    status: "fixed",
  },
  {
    id: "VUL-003",
    title: "ブラウザ Fingerprint 未収集",
    risk: "medium",
    before: "BAN判定の fp_hash が使われていない。anon_id + ip のみで判定。",
    after: "Phase 2 で FingerprintJS 導入予定。プライバシー考慮が必要。",
    status: "planned",
  },
  {
    id: "VUL-004",
    title: "Cloudflare Turnstile 未実装",
    risk: "low",
    before: "bot大量アクセスに対する追加防御がない。",
    after: "Phase 2 で実装予定。isai-llc.com で運用実績あり。",
    status: "planned",
  },
];

const BAN_SCORE_TABLE = [
  {
    identifier: "anon_id",
    score: 3,
    desc: "localStorage の匿名ID",
    key: "ban:anon:{id}",
  },
  {
    identifier: "fp_hash",
    score: 5,
    desc: "ブラウザ Fingerprint",
    key: "ban:fp:{hash}",
  },
  {
    identifier: "ip/24",
    score: 1,
    desc: "同一ネットワーク帯域",
    key: "ban:ip24:{prefix}",
  },
];

/* ─────────────── コンポーネント ─────────────── */

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    improved: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    new: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
    fixed: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    planned: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  };
  const labels: Record<string, string> = {
    active: "稼働中",
    improved: "今回改善",
    new: "今回追加",
    fixed: "対策済み",
    planned: "Phase 2",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

function RiskBadge({ risk }: { risk: string }) {
  const styles: Record<string, string> = {
    critical: "bg-red-500/20 text-red-400 border-red-500/30",
    medium: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    low: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  };
  const labels: Record<string, string> = {
    critical: "🔴 Critical",
    medium: "🟡 Medium",
    low: "🟢 Low",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${styles[risk]}`}
    >
      {labels[risk]}
    </span>
  );
}

function AnimatedCounter({
  target,
  suffix = "",
}: {
  target: number;
  suffix?: string;
}) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          let current = 0;
          const increment = target / 40;
          const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
              setCount(target);
              clearInterval(timer);
            } else {
              setCount(Math.floor(current));
            }
          }, 30);
          observer.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);

  return (
    <span ref={ref} className="tabular-nums">
      {count}
      {suffix}
    </span>
  );
}

/* ─────────────── ページ本体 ─────────────── */

export default function SecurityPage() {
  const [expandedLayer, setExpandedLayer] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white selection:bg-cyan-500/30">
      {/* ====== グローバルCSS ====== */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap');
        
        .font-mono-code { font-family: 'JetBrains Mono', monospace; }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(34,211,238,0.15); }
          50% { box-shadow: 0 0 40px rgba(34,211,238,0.3); }
        }
        @keyframes scan-line {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
        @keyframes flow-down {
          0% { opacity: 0; transform: translateY(-8px); }
          50% { opacity: 1; }
          100% { opacity: 0; transform: translateY(8px); }
        }
        .animate-float { animation: float 4s ease-in-out infinite; }
        .animate-pulse-glow { animation: pulse-glow 3s ease-in-out infinite; }
        .flow-arrow { animation: flow-down 1.5s ease-in-out infinite; }
        
        .grid-bg {
          background-image: 
            linear-gradient(rgba(34,211,238,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(34,211,238,0.03) 1px, transparent 1px);
          background-size: 60px 60px;
        }
        
        .glass-card {
          background: linear-gradient(135deg, rgba(15,23,42,0.8), rgba(15,23,42,0.4));
          backdrop-filter: blur(20px);
          border: 1px solid rgba(34,211,238,0.1);
        }
        
        .gradient-text {
          background: linear-gradient(135deg, #22d3ee, #818cf8, #c084fc);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
      `}</style>

      {/* ====== ヒーローセクション ====== */}
      <section className="relative overflow-hidden px-6 pb-20 pt-16">
        {/* 背景グリッド */}
        <div className="grid-bg pointer-events-none absolute inset-0" />
        {/* 放射グラデーション */}
        <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2">
          <div className="h-[600px] w-[800px] rounded-full bg-cyan-500/5 blur-[120px]" />
        </div>

        <div className="relative mx-auto max-w-5xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-4 py-1.5 text-sm text-cyan-400">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            全システム稼働中 — 2026-05-24 監査完了
          </div>

          <h1
            className="mb-4 text-5xl font-black leading-tight tracking-tight md:text-7xl"
            style={{ fontFamily: "Inter, sans-serif" }}
          >
            <span className="gradient-text">TOMO チャット</span>
            <br />
            <span className="text-white/90">セキュリティ設計書</span>
          </h1>

          <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-slate-400">
            8層の多層防御 × 招待コード認証 × スコア合算BAN。
            <br />
            大学生向け無料AIチャットを、プロダクションレベルのセキュリティで守る。
          </p>

          {/* KPI カード */}
          <div className="mx-auto grid max-w-3xl grid-cols-2 gap-4 md:grid-cols-4">
            {[
              { value: 8, suffix: "層", label: "多層防御" },
              { value: 3, suffix: "段", label: "Rate Limit" },
              { value: 7, suffix: "種", label: "Injection検知" },
              { value: 2, suffix: "件", label: "今回の修正" },
            ].map((kpi) => (
              <div key={kpi.label} className="glass-card rounded-2xl p-5">
                <div className="gradient-text text-3xl font-black">
                  <AnimatedCounter target={kpi.value} suffix={kpi.suffix} />
                </div>
                <div className="mt-1 text-xs text-slate-500">{kpi.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====== 8層防御セクション ====== */}
      <section className="relative px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-2 text-center text-sm font-semibold uppercase tracking-widest text-cyan-400">
            Defense in Depth
          </h2>
          <h3 className="mb-12 text-center text-3xl font-bold md:text-4xl">
            8層の多層防御アーキテクチャ
          </h3>

          <div className="space-y-3">
            {LAYERS.map((layer, i) => (
              <div key={layer.id}>
                {/* 矢印 */}
                {i > 0 && (
                  <div className="flex justify-center py-1">
                    <span className="flow-arrow text-cyan-500/40">▼</span>
                  </div>
                )}

                {/* レイヤーカード */}
                <button
                  onClick={() =>
                    setExpandedLayer(
                      expandedLayer === layer.id ? null : layer.id,
                    )
                  }
                  className={`glass-card w-full cursor-pointer rounded-2xl p-5 text-left transition-all duration-300 hover:border-cyan-500/30 ${
                    expandedLayer === layer.id
                      ? "animate-pulse-glow border-cyan-500/40"
                      : ""
                  }`}
                >
                  <div className="flex items-center gap-4">
                    {/* レイヤー番号 */}
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 text-sm font-bold text-cyan-400">
                      {layer.id}
                    </div>

                    {/* アイコン */}
                    <span className="text-2xl">{layer.icon}</span>

                    {/* 名前・説明 */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{layer.name}</span>
                        <span className="font-mono-code text-xs text-slate-500">
                          {layer.nameEn}
                        </span>
                        <StatusBadge status={layer.status} />
                      </div>
                      <p className="mt-0.5 truncate text-sm text-slate-400">
                        {layer.description}
                      </p>
                    </div>

                    {/* テック */}
                    <span className="font-mono-code hidden rounded-lg bg-slate-800 px-3 py-1 text-xs text-slate-400 md:inline-block">
                      {layer.tech}
                    </span>

                    {/* 展開矢印 */}
                    <span
                      className={`text-slate-500 transition-transform duration-200 ${
                        expandedLayer === layer.id ? "rotate-180" : ""
                      }`}
                    >
                      ▾
                    </span>
                  </div>

                  {/* 展開コンテンツ */}
                  {expandedLayer === layer.id && (
                    <div className="mt-4 border-t border-slate-700/50 pt-4">
                      <p className="text-sm leading-relaxed text-slate-300">
                        {layer.detail}
                      </p>
                      <div className="mt-3 flex items-center gap-2">
                        <span className="font-mono-code rounded bg-slate-800/80 px-2 py-0.5 text-xs text-cyan-400">
                          📁 {layer.file}
                        </span>
                      </div>
                    </div>
                  )}
                </button>
              </div>
            ))}

            {/* 最終結果 */}
            <div className="flex justify-center py-2">
              <span className="flow-arrow text-emerald-500/60">▼</span>
            </div>
            <div className="glass-card rounded-2xl border-emerald-500/20 bg-emerald-500/5 p-5 text-center">
              <span className="text-2xl">✅</span>
              <span className="ml-2 font-semibold text-emerald-400">
                AI応答 + Supabase 履歴保存
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ====== 認証フローセクション ====== */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-2 text-center text-sm font-semibold uppercase tracking-widest text-cyan-400">
            Authentication Flow
          </h2>
          <h3 className="mb-12 text-center text-3xl font-bold md:text-4xl">
            招待コード認証 → リンク漏洩対策
          </h3>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {AUTH_FLOW.map((step, i) => (
              <div key={i} className="glass-card group relative rounded-2xl p-6 transition-all duration-300 hover:border-cyan-500/30">
                {/* ステップ番号 */}
                <div className="absolute -top-3 left-5 rounded-full bg-[#0a0e1a] px-2">
                  <span className="font-mono-code text-xs text-slate-500">
                    STEP {i + 1}
                  </span>
                </div>

                <div className="mb-3 flex items-center gap-3">
                  <span className="animate-float text-3xl" style={{ animationDelay: `${i * 0.3}s` }}>
                    {step.icon}
                  </span>
                  <StatusBadge status={step.status} />
                </div>

                <h4 className="mb-1 font-semibold">{step.title}</h4>
                <p className="text-sm text-slate-400">{step.description}</p>
              </div>
            ))}
          </div>

          {/* 招待コード仕様 */}
          <div className="mt-10 glass-card rounded-2xl p-8">
            <h4 className="mb-4 text-lg font-semibold">
              🔑 招待コード仕様（今回追加分をハイライト）
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-700/50 text-slate-400">
                    <th className="pb-3 pr-4">属性</th>
                    <th className="pb-3 pr-4">型</th>
                    <th className="pb-3 pr-4">説明</th>
                    <th className="pb-3">状態</th>
                  </tr>
                </thead>
                <tbody className="font-mono-code text-slate-300">
                  {[
                    ["code", "text UNIQUE", "コード文字列（大文字変換）", "既存"],
                    ["is_active", "boolean", "管理者が即時無効化可能", "既存"],
                    ["expires_at", "timestamptz", "有効期限（30日推奨）", "既存"],
                    [
                      "max_uses",
                      "int (nullable)",
                      "最大利用回数（NULLは無制限）",
                      "🆕",
                    ],
                    [
                      "used_count",
                      "int DEFAULT 0",
                      "現在の利用回数",
                      "🆕",
                    ],
                  ].map(([attr, type, desc, state]) => (
                    <tr
                      key={attr}
                      className={`border-b border-slate-800/50 ${
                        state === "🆕" ? "bg-cyan-500/5" : ""
                      }`}
                    >
                      <td className="py-3 pr-4 text-cyan-400">{attr}</td>
                      <td className="py-3 pr-4 text-slate-500">{type}</td>
                      <td className="py-3 pr-4 font-sans text-slate-300">
                        {desc}
                      </td>
                      <td className="py-3">{state}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* ====== BAN システムセクション ====== */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-2 text-center text-sm font-semibold uppercase tracking-widest text-cyan-400">
            Ban System
          </h2>
          <h3 className="mb-12 text-center text-3xl font-bold md:text-4xl">
            スコア合算方式 BAN 判定
          </h3>

          <div className="grid gap-8 md:grid-cols-2">
            {/* スコアテーブル */}
            <div className="glass-card rounded-2xl p-8">
              <h4 className="mb-6 font-semibold">スコア判定表</h4>
              <div className="space-y-4">
                {BAN_SCORE_TABLE.map((row) => (
                  <div
                    key={row.identifier}
                    className="flex items-center gap-4 rounded-xl bg-slate-800/40 p-4"
                  >
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-xl font-black ${
                        row.score >= 5
                          ? "bg-red-500/20 text-red-400"
                          : row.score >= 3
                            ? "bg-amber-500/20 text-amber-400"
                            : "bg-slate-600/20 text-slate-400"
                      }`}
                    >
                      +{row.score}
                    </div>
                    <div className="flex-1">
                      <div className="font-mono-code text-sm font-semibold text-white">
                        {row.identifier}
                      </div>
                      <div className="text-xs text-slate-400">{row.desc}</div>
                    </div>
                    <div className="font-mono-code text-xs text-slate-600">
                      {row.key}
                    </div>
                  </div>
                ))}

                {/* 閾値 */}
                <div className="flex items-center gap-4 rounded-xl border border-red-500/20 bg-red-500/5 p-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/20 font-black text-red-400">
                    ≥5
                  </div>
                  <div>
                    <div className="font-semibold text-red-400">BAN 発動</div>
                    <div className="text-xs text-slate-400">
                      403 Access Denied
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 判定例 */}
            <div className="glass-card rounded-2xl p-8">
              <h4 className="mb-6 font-semibold">判定シミュレーション</h4>
              <div className="space-y-4">
                {[
                  {
                    label: "fp_hash のみ一致",
                    calc: "5",
                    total: 5,
                    result: "BAN",
                  },
                  {
                    label: "anon_id + ip/24",
                    calc: "3 + 1 = 4",
                    total: 4,
                    result: "通過",
                  },
                  {
                    label: "anon_id + fp_hash",
                    calc: "3 + 5 = 8",
                    total: 8,
                    result: "BAN",
                  },
                  {
                    label: "ip/24 のみ",
                    calc: "1",
                    total: 1,
                    result: "通過",
                  },
                  {
                    label: "全一致",
                    calc: "3 + 5 + 1 = 9",
                    total: 9,
                    result: "BAN",
                  },
                ].map((sim) => (
                  <div
                    key={sim.label}
                    className="flex items-center justify-between rounded-xl bg-slate-800/40 p-4"
                  >
                    <div>
                      <div className="text-sm font-medium">{sim.label}</div>
                      <div className="font-mono-code text-xs text-slate-500">
                        {sim.calc}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono-code text-lg font-bold text-white">
                        {sim.total}
                      </span>
                      <span
                        className={`rounded-lg px-3 py-1 text-xs font-semibold ${
                          sim.result === "BAN"
                            ? "bg-red-500/20 text-red-400"
                            : "bg-emerald-500/20 text-emerald-400"
                        }`}
                      >
                        {sim.result === "BAN" ? "⛔ BAN" : "✅ 通過"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* 改善バッジ */}
              <div className="mt-6 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                <div className="flex items-center gap-2">
                  <StatusBadge status="improved" />
                  <span className="text-sm font-medium text-amber-400">
                    今回の改善
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  setBan() → Redis + Supabase 二重書き込みに改修。
                  <br />
                  checkBan() → Redis障害時は Supabase フォールバック。
                  <br />
                  手動同期パイプラインが不要になりました。
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ====== 脆弱性対応セクション ====== */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-2 text-center text-sm font-semibold uppercase tracking-widest text-cyan-400">
            Vulnerability Response
          </h2>
          <h3 className="mb-12 text-center text-3xl font-bold md:text-4xl">
            発見した脆弱性と対応状況
          </h3>

          <div className="space-y-6">
            {VULNERABILITIES.map((vul) => (
              <div key={vul.id} className="glass-card rounded-2xl p-6">
                <div className="mb-4 flex flex-wrap items-center gap-3">
                  <span className="font-mono-code text-sm text-slate-500">
                    {vul.id}
                  </span>
                  <RiskBadge risk={vul.risk} />
                  <StatusBadge status={vul.status} />
                  <span className="font-semibold">{vul.title}</span>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {/* Before */}
                  <div className="rounded-xl bg-red-500/5 p-4">
                    <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-red-400">
                      <span>❌</span> Before
                    </div>
                    <p className="text-sm text-slate-400">{vul.before}</p>
                  </div>

                  {/* After */}
                  <div className="rounded-xl bg-emerald-500/5 p-4">
                    <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-emerald-400">
                      <span>✅</span> After
                    </div>
                    <p className="text-sm text-slate-400">{vul.after}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====== Rate Limit セクション ====== */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-2 text-center text-sm font-semibold uppercase tracking-widest text-cyan-400">
            Rate Limiting
          </h2>
          <h3 className="mb-12 text-center text-3xl font-bold md:text-4xl">
            3段階 Rate Limit 設計
          </h3>

          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                tier: "Tier 1",
                label: "per-IP",
                limit: "5 req",
                window: "1分",
                purpose: "短期バースト防止",
                icon: "🖥️",
                color: "from-cyan-500/20 to-blue-500/20",
              },
              {
                tier: "Tier 2",
                label: "per-Anon",
                limit: "20 req",
                window: "1日",
                purpose: "個人の日次上限",
                icon: "👤",
                color: "from-indigo-500/20 to-purple-500/20",
              },
              {
                tier: "Tier 3",
                label: "Global",
                limit: "400 req",
                window: "1日",
                purpose: "キルスイッチ",
                icon: "🌐",
                color: "from-red-500/20 to-orange-500/20",
              },
            ].map((tier) => (
              <div
                key={tier.tier}
                className="glass-card group rounded-2xl p-6 transition-all duration-300 hover:border-cyan-500/30"
              >
                <div
                  className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${tier.color} text-2xl`}
                >
                  {tier.icon}
                </div>
                <div className="font-mono-code mb-1 text-xs text-slate-500">
                  {tier.tier}
                </div>
                <h4 className="mb-1 text-lg font-bold">{tier.label}</h4>
                <div className="gradient-text mb-3 text-2xl font-black">
                  {tier.limit}{" "}
                  <span className="text-sm text-slate-500">/ {tier.window}</span>
                </div>
                <p className="text-sm text-slate-400">{tier.purpose}</p>
              </div>
            ))}
          </div>

          <p className="mt-6 text-center text-sm text-slate-500">
            チェック順: Global → per-IP → per-Anon（キルスイッチ最優先）
          </p>
        </div>
      </section>

      {/* ====== フッター ====== */}
      <footer className="border-t border-slate-800 px-6 py-12">
        <div className="mx-auto max-w-5xl text-center">
          <p className="text-sm text-slate-600">
            TOMO チャット Security Architecture — 監査日 2026-05-24
          </p>
          <p className="mt-1 text-xs text-slate-700">
            合同会社ISAI × B-steep
          </p>
        </div>
      </footer>
    </div>
  );
}
