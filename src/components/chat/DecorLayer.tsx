/**
 * DecorLayer — 画面四隅に装飾素材を配置する背景レイヤー
 * 設計書 §3.5 — 書斎の世界観を漂わせる
 *
 * v3 (2026-05-21): 木目背景がしっかり出るようになったので、装飾の opacity を引き上げて
 *   サムネと同じ「机の上に小物が並んでる」見え方に揃える。
 */
import Image from "next/image";

export function DecorLayer() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 select-none"
    >
      {/* 右上: 観葉植物 + 肉球マグ (端から少し内側) */}
      <div className="absolute right-8 top-28 hidden w-20 opacity-90 md:block lg:right-14 lg:top-32 lg:w-28">
        <Image
          src="/decor/mug-plant.png"
          alt=""
          width={350}
          height={432}
          className="h-auto w-full drop-shadow-md"
        />
      </div>

      {/* 左下: 本4冊 (端から少し内側) */}
      <div className="absolute bottom-32 left-8 hidden w-24 opacity-90 lg:block lg:bottom-36 lg:left-14 lg:w-32">
        <Image
          src="/decor/books.png"
          alt=""
          width={400}
          height={358}
          className="h-auto w-full drop-shadow-md"
        />
      </div>

      {/* 右下: トモユニノート (少し傾き、端から少し内側) */}
      <div className="absolute bottom-32 right-8 hidden w-24 -rotate-[6deg] opacity-90 lg:block lg:bottom-36 lg:right-14 lg:w-32">
        <Image
          src="/decor/notebook.png"
          alt=""
          width={400}
          height={425}
          className="h-auto w-full drop-shadow-md"
        />
      </div>

    </div>
  );
}
