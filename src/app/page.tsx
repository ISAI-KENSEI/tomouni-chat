/**
 * TOMO チャット — メイン画面
 * 設計書 §8.1 — ChatShell (Header + MessageList + Composer)
 *
 * chatId は localStorage 永続化。React 19 の正規パターンに従い、
 * useSyncExternalStore で SSR↔CSR の同期を取る。
 * (useEffect + setState は react-hooks/set-state-in-effect 違反)
 */
"use client";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { MessageList } from "@/components/chat/MessageList";
import { Composer } from "@/components/chat/Composer";
import { DecorLayer } from "@/components/chat/DecorLayer";

const CHAT_ID_KEY = "tomouni:chatId";

function genChatId(): string {
  const t = Date.now().toString(36);
  const r = Math.random().toString(36).slice(2, 8);
  return `c_${t}_${r}`;
}

/* ---------- useSyncExternalStore: localStorage chatId ---------- */
const noopUnsubscribe = () => {};
const subscribeChatId = (cb: () => void) => {
  if (typeof window === "undefined") return noopUnsubscribe;
  window.addEventListener("storage", cb);
  return () => window.removeEventListener("storage", cb);
};
const getClientChatId = (): string => {
  let id = window.localStorage.getItem(CHAT_ID_KEY);
  if (!id) {
    id = genChatId();
    window.localStorage.setItem(CHAT_ID_KEY, id);
  }
  return id;
};
const getServerChatId = (): string | undefined => undefined;

export default function ChatPage() {
  // SSR では undefined / CSR ハイドレ後に localStorage から取得
  const baseChatId = useSyncExternalStore(
    subscribeChatId,
    getClientChatId,
    getServerChatId,
  );
  // 新会話ボタンで bump させる (chatId を意図的に変える)
  const [bump, setBump] = useState(0);
  const chatId = useMemo(
    () => (baseChatId ? `${baseChatId}#${bump}` : undefined),
    [baseChatId, bump],
  );

  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/chat" }),
    [],
  );

  const { messages, sendMessage, status, stop, error, setMessages } = useChat({
    id: chatId,
    transport,
  });

  const handleSend = useCallback(
    (text: string) => {
      if (!text.trim()) return;
      sendMessage({ text });
    },
    [sendMessage],
  );

  const handleNewChat = useCallback(() => {
    // 1. 先に messages を空にする (UIを即クリア)
    setMessages([]);
    // 2. 新しい chatId を localStorage に保存
    const newId = genChatId();
    if (typeof window !== "undefined") {
      window.localStorage.setItem(CHAT_ID_KEY, newId);
      // useSyncExternalStore は同タブの localStorage 変更を検知しない
      // → 明示的に storage イベントを発火させて再評価させる
      window.dispatchEvent(new Event("storage"));
    }
    // 3. bump で useChat の id を確実に変える (新規chatとして扱わせる)
    setBump((b) => b + 1);
  }, [setMessages]);

  // SSR / 初回ハイドレーション中はローディング (SSR-CSR mismatch 回避)
  if (!chatId) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div
          className="text-wood-500 text-sm"
          style={{ fontFamily: "var(--font-yusei)" }}
        >
          🐾 準備中...
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-dvh flex-col">
      <DecorLayer />
      <ChatHeader onNewChat={handleNewChat} />
      <MessageList
        messages={messages}
        status={status}
        error={error}
        onSelectSuggestion={handleSend}
      />
      <Composer status={status} onSend={handleSend} onStop={stop} />
    </div>
  );
}
