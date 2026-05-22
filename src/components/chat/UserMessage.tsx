/**
 * UserMessage — ユーザーの発言吹き出し
 * 設計書 §3.5 — マスタード背景 + 濃茶文字 + 右寄せ + 微 tilt
 */
"use client";
import { cn } from "@/lib/utils";

type Props = {
  text: string;
  className?: string;
};

export function UserMessage({ text, className }: Props) {
  return (
    <article
      className={cn("animate-paper-flip flex justify-end", className)}
      aria-label="あなたのメッセージ"
    >
      <div
        className={cn(
          "max-w-[82%] rounded-[22px] px-4 py-3",
          "bg-mustard-500 text-craft-50 shadow-sm",
          "ring-2 ring-mustard-600/40",
        )}
        style={{ transform: "rotate(0.6deg)" }}
      >
        <p
          className="whitespace-pre-wrap break-words text-[15px] leading-[1.7]"
          style={{ fontFamily: "var(--font-noto-jp)" }}
        >
          {text}
        </p>
      </div>
    </article>
  );
}
