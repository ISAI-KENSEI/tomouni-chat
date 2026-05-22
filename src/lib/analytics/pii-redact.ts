/**
 * PII (個人情報) 除去 — Regex ベース
 *
 * 日本の個人情報パターンに特化:
 *   - メールアドレス
 *   - 電話番号（固定/携帯/国際）
 *   - 学籍番号パターン（英数字混合6-12桁）
 *   - マイナンバー（12桁数字）
 *
 * Phase 2 で Gemini hybrid 判定を追加予定。
 */

interface RedactResult {
  /** PII除去済みテキスト */
  redacted: string;
  /** PIIが含まれていたか */
  hasPii: boolean;
  /** 検出されたPIIの種類 */
  types: string[];
}

const PII_PATTERNS: { pattern: RegExp; replacement: string; type: string }[] = [
  // メールアドレス
  {
    pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    replacement: "[メール]",
    type: "email",
  },
  // 日本の電話番号（ハイフンあり/なし）
  {
    pattern: /(?:0\d{1,4}[-\s]?\d{1,4}[-\s]?\d{3,4})|(?:\+81[-\s]?\d{1,4}[-\s]?\d{1,4}[-\s]?\d{3,4})/g,
    replacement: "[電話番号]",
    type: "phone",
  },
  // 学籍番号パターン（英字+数字の6-12桁、例: B1234567, 2024AB001）
  {
    pattern: /\b[A-Z]{1,3}\d{5,10}\b|\b\d{4}[A-Z]{1,3}\d{3,6}\b/gi,
    replacement: "[学籍番号]",
    type: "student_id",
  },
  // マイナンバー（12桁数字の連続）
  {
    pattern: /\b\d{12}\b/g,
    replacement: "[マイナンバー]",
    type: "my_number",
  },
];

/**
 * テキストからPIIを除去する
 */
export function redactPii(text: string): RedactResult {
  let redacted = text;
  const types: string[] = [];

  for (const { pattern, replacement, type } of PII_PATTERNS) {
    // グローバルフラグのregexは毎回lastIndexがリセットされるので新規作成
    const re = new RegExp(pattern.source, pattern.flags);
    if (re.test(redacted)) {
      types.push(type);
      redacted = redacted.replace(new RegExp(pattern.source, pattern.flags), replacement);
    }
  }

  return {
    redacted,
    hasPii: types.length > 0,
    types,
  };
}
