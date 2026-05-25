/**
 * MessageList — スクロール領域 + 自動スクロール
 * 設計書 §8.2 — UIMessage[] を role で分岐レンダリング
 */
"use client";
import { useEffect, useRef } from "react";
import type { UIMessage, ChatStatus } from "ai";
import { BotMessage } from "./BotMessage";
import { UserMessage } from "./UserMessage";
import { ThinkingIndicator } from "./ThinkingIndicator";
import { Suggestions } from "./Suggestions";
import { TomoMascot } from "@/components/icons/TomoMascot";
import { PawIcon } from "@/components/icons/PawIcon";
import { cn } from "@/lib/utils";

type Props = {
  messages: UIMessage[];
  status: ChatStatus;
  error?: Error;
  onSelectSuggestion: (prompt: string) => void;
  className?: string;
};

function getText(message: UIMessage): string {
  return message.parts
    .filter((p) => p.type === "text")
    .map((p) => (p as { type: "text"; text: string }).text)
    .join("");
}

export function MessageList({
  messages,
  status,
  error,
  onSelectSuggestion,
  className,
}: Props) {
  const endRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 自動スクロール
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, status]);

  const showWelcome = messages.length === 0;
  const lastMessage = messages.at(-1);
  const lastIsAssistant = lastMessage?.role === "assistant";
  const isWaiting =
    (status === "submitted" || status === "streaming") &&
    (!lastIsAssistant || getText(lastMessage!).length === 0);

  return (
    <main
      ref={containerRef}
      className={cn(
        "relative flex-1 overflow-y-auto",
        "[scrollbar-gutter:stable]",
        className,
      )}
      aria-label="会話履歴"
    >
      <div className="mx-auto max-w-2xl px-4 py-6">
        {/* ウェルカム + サジェスト */}
        {showWelcome && (
          <>
            <div className="animate-paper-flip mx-auto mb-6 flex flex-col items-center text-center">
              {/* ヒーロー: tomo-hero.png (胸+ペン) を大きく表示 + 横に青マグ */}
              <div className="relative mb-3 w-44 sm:w-52">
                <div className="animate-tomo-idle">
                  <TomoMascot variant="hero" mood="happy" priority />
                </div>
                {/* TOMO の右下に肉球マグを「机に置いた」感じで小さく配置 (TOMOの動きとは独立) */}
                <div className="absolute -bottom-2 -right-10 w-14 -rotate-[8deg] sm:-right-12 sm:w-16">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/decor/mug.png"
                    alt=""
                    width={300}
                    height={268}
                    className="h-auto w-full drop-shadow-sm"
                    aria-hidden
                  />
                </div>
              </div>
              {/* テキスト部分は紙風カードで囲んで読みやすさ確保 */}
              <div
                className={cn(
                  "rounded-[20px] px-6 py-4 shadow-md",
                  "bg-craft-50/90 backdrop-blur-sm",
                  "border-2 border-dashed border-craft-300",
                )}
              >
                <h1
                  className="mb-2 text-2xl text-wood-700"
                  style={{ fontFamily: "var(--font-mochiy)" }}
                >
                  こんにちは <PawIcon size={20} className="inline -translate-y-0.5 text-mustard-500" />
                </h1>
                <p
                  className="max-w-[20rem] text-[15px] leading-[1.8] text-ink-700"
                  style={{ fontFamily: "var(--font-zen-maru)" }}
                >
                  大学生のAI活用、いっしょに考えよっか。
                </p>
              </div>
            </div>

            <Suggestions onSelect={onSelectSuggestion} />
          </>
        )}

        {/* メッセージ一覧 */}
        <div className="space-y-4">
          {messages.map((m) => {
            const text = getText(m);
            if (m.role === "user") {
              return <UserMessage key={m.id} text={text} />;
            }
            if (m.role === "assistant") {
              const isLast = m.id === lastMessage?.id;
              const isStreamingThis =
                isLast && (status === "submitted" || status === "streaming");
              return (
                <BotMessage
                  key={m.id}
                  text={text}
                  isStreaming={isStreamingThis && text.length > 0}
                />
              );
            }
            return null;
          })}

          {/* "考え中..." 表示 (assistant メッセージがまだ生成されていない時) */}
          {isWaiting && <ThinkingIndicator />}

          {/* エラー表示 */}
          {error && (
            <div className="animate-paper-flip flex items-start gap-2.5">
              <div className="shrink-0 size-16 overflow-hidden rounded-full border-2 border-tomato-500 bg-craft-50 shadow-sm">
                <TomoMascot variant="face" mood="sad" fillCircle />
              </div>
              <div className="min-w-0 flex-1 rounded-[18px] border-2 border-dashed border-tomato-500 bg-craft-50 px-4 py-3">
                <p
                  className="text-[14px] leading-relaxed text-tomato-600"
                  style={{ fontFamily: "var(--font-yusei)" }}
                >
                  ごめんね…うまく答えられなかった。もう一度試してみてくれる？🐾
                </p>
                <p
                  className="mt-1 text-[11px] text-ink-500"
                  style={{ fontFamily: "var(--font-quicksand)" }}
                >
                  {error.message}
                </p>
              </div>
            </div>
          )}
        </div>

        <div ref={endRef} aria-hidden className="h-2" />
      </div>
    </main>
  );
}
