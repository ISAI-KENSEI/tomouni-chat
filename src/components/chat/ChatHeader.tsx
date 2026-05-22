/**
 * ChatHeader — 木札風ヘッダー
 * 設計書 §3.5 / §8.1 — sticky top, 64px, 木目テクスチャ + 肉球マーク
 */
"use client";
import { PawIcon } from "@/components/icons/PawIcon";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  onNewChat?: () => void;
  className?: string;
};

export function ChatHeader({ onNewChat, className }: Props) {
  return (
    <header
      className={cn(
        "sticky top-0 z-30",
        // body と同じ木目テクスチャを fixed で貼る → 画面全体が1枚の机に見える
        // 完全不透明なので背後のメッセージは透けない
        "bg-[#B58454] bg-[url('/textures/wood-desk.webp')] bg-cover bg-fixed bg-center bg-no-repeat",
        className,
      )}
      role="banner"
    >
      <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-3">
        {/* 木札ロゴ */}
        <div className="wood-plate relative overflow-hidden rounded-2xl px-4 py-2 shadow-sm">
          <div className="relative z-10 flex items-center gap-2">
            <PawIcon size={16} className="text-craft-50/95" />
            <span
              className="text-craft-50 text-base tracking-wide sm:text-lg"
              style={{ fontFamily: "var(--font-mochiy)" }}
            >
              トモユニコミュニティ
            </span>
            <PawIcon size={12} className="text-craft-50/70" />
          </div>
        </div>

        {/* 新会話ボタン */}
        <button
          type="button"
          onClick={onNewChat}
          className={cn(
            "group inline-flex items-center gap-1.5 rounded-full",
            "border-2 border-dashed border-wood-500 bg-craft-50 px-3.5 py-2",
            "text-sm font-medium text-wood-700",
            "transition-all hover:rotate-1 hover:bg-mustard-500 hover:text-craft-50",
            "active:translate-y-0.5",
          )}
          style={{ fontFamily: "var(--font-zen-maru)" }}
          aria-label="新しいトピックで会話を始める"
        >
          <Plus size={15} className="transition-transform group-hover:rotate-90" />
          <span className="hidden sm:inline">新しいトピック</span>
          <span className="sm:hidden">New</span>
        </button>
      </div>
    </header>
  );
}
