/**
 * ThinkingIndicator — 「メモメモ♪」状態表示
 * 設計書 §3.5 — TOMO が考え中アニメ + 肉球が並ぶ
 */
"use client";
import { TomoMascot } from "@/components/icons/TomoMascot";
import { PawIcon } from "@/components/icons/PawIcon";
import { cn } from "@/lib/utils";

type Props = { className?: string };

export function ThinkingIndicator({ className }: Props) {
  return (
    <div
      className={cn("flex items-center gap-2.5", className)}
      role="status"
      aria-live="polite"
      aria-label="TOMOが考え中"
    >
      <div className="animate-pom-bounce shrink-0 size-16 overflow-hidden rounded-full border-2 border-wood-500 bg-craft-50 shadow-sm">
        <TomoMascot variant="face" mood="thinking" fillCircle />
      </div>
      <div className="flex items-center gap-2 rounded-[18px] border-2 border-dashed border-wood-500 bg-craft-50 px-3.5 py-2.5">
        <span
          className="text-[14px] text-wood-700"
          style={{ fontFamily: "var(--font-yusei)" }}
        >
          メモメモ♪
        </span>
        <span className="flex gap-0.5">
          {[0, 1, 2].map((i) => (
            <PawIcon
              key={i}
              size={11}
              className="text-wood-500 animate-paw-dance"
              // @ts-expect-error inline style with custom delay
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </span>
      </div>
    </div>
  );
}
