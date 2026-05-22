-- invite_codes: 共通招待コード管理
-- Phase 0: 手動INSERT / Phase 1: n8n or pg_cron で月次ローテーション
create table if not exists invite_codes (
  id uuid default gen_random_uuid() primary key,
  code text unique not null,
  expires_at timestamptz not null,
  is_active boolean default true,
  notes text,
  created_at timestamptz default now()
);

-- 有効なコードのみ高速検索
create index if not exists idx_invite_codes_active
  on invite_codes (code)
  where is_active = true;

-- RLS: service_role のみアクセス（クライアント直接操作は不可）
alter table invite_codes enable row level security;
