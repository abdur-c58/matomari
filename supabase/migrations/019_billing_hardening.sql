-- Webhook idempotency: store processed Paddle event IDs (service-role only).

create table if not exists public.paddle_webhook_events (
  event_id text primary key,
  event_type text not null,
  processed_at timestamptz not null default now()
);

create index if not exists paddle_webhook_events_processed_at_idx
  on public.paddle_webhook_events (processed_at desc);

alter table public.paddle_webhook_events enable row level security;
-- No policies: only service_role may read/write.
