/**
 * 肉球アイコン
 * 設計書 §3.5 — UI 各所のアクセント (ヘッダー・送信ボタン・thinking)
 */
import { cn } from "@/lib/utils";

type Props = {
  size?: number;
  className?: string;
};

export function PawIcon({ size = 20, className }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={cn("inline-block", className)}
      fill="currentColor"
      role="img"
      aria-label="肉球"
    >
      {/* メインパッド (掌) */}
      <ellipse cx="12" cy="17" rx="4.6" ry="3.6" />
      {/* 指4本 */}
      <ellipse cx="5.6" cy="10.2" rx="2" ry="2.7" />
      <ellipse cx="9.6" cy="6.6" rx="2" ry="2.7" />
      <ellipse cx="14.4" cy="6.6" rx="2" ry="2.7" />
      <ellipse cx="18.4" cy="10.2" rx="2" ry="2.7" />
    </svg>
  );
}
