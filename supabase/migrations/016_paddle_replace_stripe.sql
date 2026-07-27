-- Replace Stripe billing columns with Paddle equivalents on user_subscriptions.

alter table public.user_subscriptions
  add column if not exists paddle_customer_id text,
  add column if not exists paddle_subscription_id text;

-- Copy any residual IDs only if columns still exist (best-effort; usually empty after Stripe test).
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'user_subscriptions'
      and column_name = 'stripe_customer_id'
  ) then
    update public.user_subscriptions
    set paddle_customer_id = coalesce(paddle_customer_id, nullif(stripe_customer_id, ''))
    where stripe_customer_id is not null
      and stripe_customer_id not like 'sim_cus_%';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'user_subscriptions'
      and column_name = 'stripe_subscription_id'
  ) then
    update public.user_subscriptions
    set paddle_subscription_id = coalesce(paddle_subscription_id, nullif(stripe_subscription_id, ''))
    where stripe_subscription_id is not null
      and stripe_subscription_id not like 'sim_sub_%';
  end if;
end $$;

alter table public.user_subscriptions
  drop column if exists stripe_customer_id,
  drop column if exists stripe_subscription_id;
