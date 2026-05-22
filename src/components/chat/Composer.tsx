/**
 * Composer — 入力欄 + 送信ボタン
 * 設計書 §3.5 / §8.1 — sticky bottom, 木札カラー送信ボタン, 肉球マーク
 */
"use client";
import { useRef, useState, useEffect } from "react";
import type { ChatStatus } from "ai";
import { PawIcon } from "@/components/icons/PawIcon";
import { Send, Square } from "lucide-react";
import { cn } from "@/lib/utils";

const MAX_INPUT = 2000;

type Props = {
  status: ChatStatus;
  onSend: (text: string) => void;
  onStop?: () => void;
  className?: string;
  placeholder?: string;
};

export function Composer({
  status,
  onSend,
  onStop,
  className,
  placeholder = "なんでも聞いてね 🐾",
}: Props) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isStreaming = status === "submitted" || status === "streaming";
  const tooLong = value.length > MAX_INPUT;
  const canSend = !isStreaming && value.trim().length > 0 && !tooLong;

  // textarea auto-resize
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 140)}px`;
  }, [value]);

  const handleSend = () => {
    if (!canSend) return;
    onSend(value.trim());
    setValue("");
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Cmd/Ctrl + Enter で送信
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <footer
      className={cn(
        "sticky bottom-0 z-20",
        // body と同じ木目テクスチャを fixed で貼る → 画面全体が1枚の机に見える
        "bg-[#B58454] bg-[url('/textures/wood-desk.webp')] bg-cover bg-fixed bg-center bg-no-repeat",
        "pb-[max(env(safe-area-inset-bottom),12px)]",
        className,
      )}
    >
      <div className="mx-auto max-w-2xl px-3 pt-3">
        <div
          className={cn(
            "flex items-end gap-2 rounded-[24px] border-2 border-craft-300 bg-craft-50",
            "px-3 py-2 shadow-sm transition-colors focus-within:border-mustard-500",
            tooLong && "border-tomato-500",
          )}
        >
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={1}
            className={cn(
              "flex-1 resize-none bg-transparent text-[15px] leading-[1.6] text-ink-900",
              "placeholder:text-ink-500 outline-none",
              "min-h-[28px] max-h-[140px] py-1",
            )}
            style={{ fontFamily: "var(--font-noto-jp)" }}
            aria-label="メッセージを入力"
            disabled={isStreaming}
          />

          {/* 送信 or 停止ボタン */}
          {isStreaming ? (
            <button
              type="button"
              onClick={onStop}
              className={cn(
                "group flex h-11 w-11 shrink-0 items-center justify-center rounded-full",
                "bg-tomato-500 text-craft-50 shadow-sm",
                "transition-all hover:scale-105 active:scale-95",
              )}
              aria-label="停止"
            >
              <Square size={16} fill="currentColor" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSend}
              disabled={!canSend}
              className={cn(
                "group relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full",
                "bg-wood-500 text-craft-50 shadow-sm",
                "transition-all hover:rotate-6 hover:bg-wood-600 hover:scale-105 active:scale-95",
                "disabled:cursor-not-allowed disabled:bg-craft-300 disabled:text-craft-50/60 disabled:hover:rotate-0 disabled:hover:scale-100",
              )}
              aria-label="送信"
            >
              <Send size={17} className="-translate-x-px translate-y-px" />
              {/* hover時にふわっと肉球 */}
              <PawIcon
                size={14}
                className={cn(
                  "absolute -top-2 -right-1 text-mustard-500 opacity-0 transition-all duration-300",
                  "group-hover:-top-3 group-hover:-right-2 group-hover:opacity-100",
                )}
              />
            </button>
          )}
        </div>

        {/* 文字数カウンタ・ヒント */}
        <div className="mt-1.5 flex items-center justify-between px-2 text-[11px] text-ink-500">
          <span style={{ fontFamily: "var(--font-quicksand)" }}>
            ⌘/Ctrl + Enter で送信
          </span>
          <span
            className={cn(
              "tabular-nums",
              tooLong && "font-bold text-tomato-500",
            )}
            style={{ fontFamily: "var(--font-quicksand)" }}
          >
            {value.length} / {MAX_INPUT}
          </span>
        </div>
      </div>
    </footer>
  );
}
