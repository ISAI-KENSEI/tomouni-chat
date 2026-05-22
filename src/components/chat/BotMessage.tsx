/**
 * BotMessage — TOMO の発言吹き出し
 * 設計書 §3.5 / §8.1 — クリーム白 + 茶ボーダー2px破線 + 左上アバター
 */
"use client";
import { TomoMascot } from "@/components/icons/TomoMascot";
import { PawIcon } from "@/components/icons/PawIcon";
import { cn } from "@/lib/utils";
import { stripMarkdown } from "@/lib/strip-markdown";

type Props = {
  text: string;
  isStreaming?: boolean;
  className?: string;
};

export function BotMessage({ text, isStreaming, className }: Props) {
  const cleanText = stripMarkdown(text);
  return (
    <article
      className={cn("animate-paper-flip flex items-start gap-2.5", className)}
      aria-label="TOMOからのメッセージ"
    >
      {/* アバター (円形クリッピング枠 + 顔画像中央拡大) */}
      <div
        className={cn(
          "shrink-0 size-16 overflow-hidden rounded-full border-2 border-wood-500 bg-craft-50 shadow-sm",
          isStreaming && "animate-pom-bounce",
        )}
        aria-hidden
      >
        <TomoMascot
          variant="face"
          mood={isStreaming ? "thinking" : "default"}
          fillCircle
        />
      </div>

      {/* 吹き出し */}
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-1.5">
          <span
            className="text-xs font-bold text-wood-700"
            style={{ fontFamily: "var(--font-zen-maru)" }}
          >
            TOMO
          </span>
          <PawIcon size={10} className="text-wood-500" />
        </div>
        <div className="bot-bubble px-4 py-3">
          <p
            className="whitespace-pre-wrap break-words text-[15px] leading-[1.75] text-ink-900"
            style={{ fontFamily: "var(--font-noto-jp)" }}
          >
            {cleanText}
            {isStreaming && (
              <span
                className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 animate-pulse bg-mustard-500"
                aria-hidden
              />
            )}
          </p>
        </div>
      </div>
    </article>
  );
}
