/**
 * プロンプトインジェクション検知
 *
 * 最小限のregex集。完全な防御ではなく「明らかな攻撃」を検知する。
 * Phase 1 で OpenAI Moderation API と組み合わせて多層化。
 */

/** 検知パターンとその重大度 */
interface InjectionPattern {
  pattern: RegExp;
  label: string;
  severity: "high" | "medium";
}

const PATTERNS: InjectionPattern[] = [
  // システムプロンプト抽出の試み
  {
    pattern: /(?:ignore|disregard|forget|override)\s+(?:all\s+)?(?:previous|above|prior|earlier)\s+(?:instructions?|prompts?|rules?|guidelines?)/i,
    label: "ignore_previous_instructions",
    severity: "high",
  },
  {
    pattern: /(?:show|reveal|display|print|output|repeat)\s+(?:your|the|system)\s+(?:system\s+)?(?:prompt|instructions?|rules?)/i,
    label: "reveal_system_prompt",
    severity: "high",
  },
  // DAN (Do Anything Now) ジェイルブレイク
  {
    pattern: /\bDAN\b.*\bdo\s+anything\s+now\b/i,
    label: "dan_jailbreak",
    severity: "high",
  },
  {
    pattern: /\bjailbreak\b/i,
    label: "jailbreak_keyword",
    severity: "medium",
  },
  // ロール変更の試み
  {
    pattern: /(?:you\s+are\s+now|act\s+as|pretend\s+(?:to\s+be|you\s+are)|roleplay\s+as)\s+(?:a\s+)?(?:different|new|evil|unrestricted|unfiltered)/i,
    label: "role_override",
    severity: "high",
  },
  // コード実行の試み
  {
    pattern: /(?:execute|run|eval)\s*\(\s*['"]/i,
    label: "code_execution",
    severity: "high",
  },
  // マークダウン/HTMLインジェクション
  {
    pattern: /<\s*script\b/i,
    label: "script_injection",
    severity: "high",
  },
];

export interface InjectionCheckResult {
  blocked: boolean;
  /** 検知されたパターンのラベル一覧 */
  matches: string[];
  /** 最も重大な一致のseverity */
  maxSeverity: "high" | "medium" | "none";
}

/**
 * テキストをプロンプトインジェクションパターンと照合
 */
export function checkPromptInjection(text: string): InjectionCheckResult {
  const matches: string[] = [];
  let maxSeverity: "high" | "medium" | "none" = "none";

  for (const { pattern, label, severity } of PATTERNS) {
    if (pattern.test(text)) {
      matches.push(label);
      if (severity === "high") {
        maxSeverity = "high";
      } else if (severity === "medium" && maxSeverity !== "high") {
        maxSeverity = "medium";
      }
    }
  }

  return {
    blocked: maxSeverity === "high",
    matches,
    maxSeverity,
  };
}
