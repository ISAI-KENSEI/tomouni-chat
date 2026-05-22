-- question_analytics: 質問分析用テーブル
-- chat_messages とは別テーブル（ALTER不要・Phase 1でバッチ分類追加）
create table if not exists question_analytics (
  id uuid default gen_random_uuid() primary key,
  anon_id text,
  pii_redacted_content text,
  pii_flag boolean default false,
  topic_tag text, -- Phase 1: Gemini Flash-Lite で自動分類
  moderation_categories jsonb, -- OpenAI Moderation API の返却値
  moderation_max_score numeric,
  created_at timestamptz default now()
);

create index if not exists idx_qa_created
  on question_analytics (created_at desc);

create index if not exists idx_qa_topic
  on question_analytics (topic_tag)
  where topic_tag is not null;

-- RLS: service_role のみ
alter table question_analytics enable row level security;
