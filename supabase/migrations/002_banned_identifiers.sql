-- banned_identifiers: 垢BAN管理
-- スコア合算判定: anon_id(+3) + fp_hash(+5) + ip/24(+1) → ≥5でBAN
create table if not exists banned_identifiers (
  id uuid default gen_random_uuid() primary key,
  anon_id text,
  fp_hash text,
  ip_slash24 text,
  reason text,
  banned_by text default 'system',
  ban_level text default 'permanent'
    check (ban_level in ('warning', 'temp_24h', 'temp_48h', 'permanent')),
  warn_count int default 0,
  last_warn_at timestamptz,
  is_active boolean default true,
  expires_at timestamptz, -- 一時BANの自動解除用
  created_at timestamptz default now()
);

-- 各識別子の個別インデックス（O(1)ルックアップ）
create index if not exists idx_banned_anon
  on banned_identifiers (anon_id)
  where is_active = true and anon_id is not null;

create index if not exists idx_banned_fp
  on banned_identifiers (fp_hash)
  where is_active = true and fp_hash is not null;

create index if not exists idx_banned_ip
  on banned_identifiers (ip_slash24)
  where is_active = true and ip_slash24 is not null;

-- RLS: service_role のみ
alter table banned_identifiers enable row level security;
