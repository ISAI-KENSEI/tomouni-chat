import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "セキュリティ設計書 | TOMOチャット",
  description: "トモユニチャットの多層防御アーキテクチャ",
};

export default function SecurityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
