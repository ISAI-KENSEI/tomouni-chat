/**
 * Suggestions — 付箋風カード
 * 設計書 §3.5 — PiyoAILab カラー流用 + 微 tilt + ホバー時にまっすぐ
 *
 * AI活用に特化したサジェスト（システムプロンプト §9.1 の「できること」に対応）
 */
"use client";
import { cn } from "@/lib/utils";

export type SuggestionItem = {
  id: string;
  icon: string;
  label: string;
  prompt: string;
  bg: "orange" | "yellow" | "teal" | "pink";
  tilt: number; // deg
};

const DEFAULT_SUGGESTIONS: SuggestionItem[] = [
  {
    id: "prompt",
    icon: "✏️",
    label: "プロンプトのコツ",
    prompt: "AIに質問するとき、上手なプロンプトの書き方のコツを教えて。",
    bg: "orange",
    tilt: -1.8,
  },
  {
    id: "tool",
    icon: "🤖",
    label: "AIツールの選び方",
    prompt: "ChatGPT、Claude、Geminiって何が違うの？大学生はどれから始めるべき？",
    bg: "yellow",
    tilt: 1.5,
  },
  {
    id: "report",
    icon: "📝",
    label: "レポートにAI活用",
    prompt: "大学のレポートをAIで効率よく書くコツを教えて。",
    bg: "teal",
    tilt: -1.2,
  },
  {
    id: "slide",
    icon: "📊",
    label: "スライドをAIで作成",
    prompt: "プレゼン用のスライドをAIで作るとき、どう進めるのがいい？",
    bg: "pink",
    tilt: 2.0,
  },
];

const BG_CLASSES = {
  orange: "bg-sticky-orange [--border-color:var(--color-sticky-orange-border)]",
  yellow: "bg-sticky-yellow [--border-color:var(--color-sticky-yellow-border)]",
  teal: "bg-sticky-teal [--border-color:var(--color-sticky-teal-border)]",
  pink: "bg-sticky-pink [--border-color:var(--color-sticky-pink-border)]",
} as const;

type Props = {
  items?: SuggestionItem[];
  onSelect: (prompt: string) => void;
};

export function Suggestions({ items = DEFAULT_SUGGESTIONS, onSelect }: Props) {
  return (
    <section className="mb-2" aria-label="質問のサジェスト">
      <div className="mb-2 flex items-center justify-center gap-2 text-wood-700">
        <span className="h-px w-8 bg-craft-300" />
        <span
          className="text-xs font-medium sm:text-sm"
          style={{ fontFamily: "var(--font-yusei)" }}
        >
          何を相談する？
        </span>
        <span className="h-px w-8 bg-craft-300" />
      </div>
      <ul className="grid grid-cols-2 gap-2 px-1">
        {items.map((s) => (
          <li key={s.id} style={{ ["--tilt" as string]: `${s.tilt}deg` }}>
            <button
              type="button"
              onClick={() => onSelect(s.prompt)}
              className={cn(
                "sticky-note flex w-full items-center gap-2 text-left",
                "border-[var(--border-color)]",
                "!py-2.5 !px-3",
                BG_CLASSES[s.bg],
              )}
              aria-label={s.label}
            >
              <span className="text-lg leading-none shrink-0" aria-hidden>
                {s.icon}
              </span>
              <span
                className="text-xs leading-snug text-ink-900 sm:text-sm"
                style={{ fontFamily: "var(--font-yusei)" }}
              >
                {s.label}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
