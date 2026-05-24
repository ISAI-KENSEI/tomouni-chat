-- 004_invite_codes_max_uses.sql
-- 招待コードに利用回数制限を追加
-- max_uses: 最大利用回数（NULLは無制限 = 後方互換）
-- used_count: 現在の利用回数（認証成功時にインクリメント）

ALTER TABLE invite_codes
  ADD COLUMN IF NOT EXISTS max_uses int,
  ADD COLUMN IF NOT EXISTS used_count int NOT NULL DEFAULT 0;

-- used_count が max_uses を超えないようチェック制約
-- max_uses が NULL の場合はチェックスキップ（無制限）
ALTER TABLE invite_codes
  ADD CONSTRAINT chk_invite_codes_uses
  CHECK (max_uses IS NULL OR used_count <= max_uses);

-- インクリメント用の安全な関数（排他制御付き）
-- ATOMIC: SELECT FOR UPDATE → used_count + 1 → RETURNING
CREATE OR REPLACE FUNCTION increment_invite_code_usage(p_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_row invite_codes%ROWTYPE;
BEGIN
  -- 排他ロックで同時利用を防止
  SELECT * INTO v_row
    FROM invite_codes
    WHERE code = p_code
      AND is_active = true
      AND expires_at > now()
    FOR UPDATE;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- max_uses チェック（NULLなら無制限）
  IF v_row.max_uses IS NOT NULL AND v_row.used_count >= v_row.max_uses THEN
    RETURN false;
  END IF;

  UPDATE invite_codes
    SET used_count = used_count + 1
    WHERE id = v_row.id;

  RETURN true;
END;
$$;
