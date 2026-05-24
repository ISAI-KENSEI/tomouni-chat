/**
 * スモークテスト — stripMarkdown ユーティリティ
 * 
 * AIが生成したマークダウン除去関数の動作を検証する。
 * 非エンジニアでも「テスト実行して」で結果がわかる。
 */
import { describe, it, expect } from "vitest";
import { stripMarkdown } from "@/lib/strip-markdown";

describe("stripMarkdown", () => {
  it("太字マークダウン (**text**) を除去する", () => {
    expect(stripMarkdown("これは**太字**です")).toBe("これは太字です");
  });

  it("見出し (## heading) を除去する", () => {
    expect(stripMarkdown("## タイトル")).toBe("タイトル");
  });

  it("インラインコード (`code`) を除去する", () => {
    expect(stripMarkdown("これは`コード`です")).toBe("これはコードです");
  });

  it("リンク [text](url) からテキストだけ残す", () => {
    expect(stripMarkdown("[リンク](https://example.com)")).toBe("リンク");
  });

  it("箇条書き (- item) を変換する", () => {
    expect(stripMarkdown("- アイテム1")).toBe("・アイテム1");
  });

  it("空文字列を安全に処理する", () => {
    expect(stripMarkdown("")).toBe("");
  });

  it("nullish入力を安全に処理する", () => {
    // @ts-expect-error — 実行時にnullが渡される可能性をテスト
    expect(stripMarkdown(null)).toBe(null);
  });

  it("マークダウンのない文字列はそのまま返す", () => {
    const plain = "こんにちは、TOMOです！";
    expect(stripMarkdown(plain)).toBe(plain);
  });

  it("複合マークダウン（太字+リンク）を処理する", () => {
    const input = "**重要**: [こちら](https://example.com)を参照";
    const expected = "重要: こちらを参照";
    expect(stripMarkdown(input)).toBe(expected);
  });
});
