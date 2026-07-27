-- Failed payments revoke paid access immediately (no past_due grace).
-- Scene data is retained; resubscribing restores Plus/Pro caps.

create or replace function public.get_effective_subscription_tier(p_user_id uuid)
returns public.subscription_tier
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  row public.user_subscriptions%rowtype;
begin
  select * into row
  from public.user_subscriptions
  where user_id = p_user_id;

  if not found then
    return 'free';
  end if;

  if row.tier in ('plus', 'pro') then
    if row.status = 'active' then
      return row.tier;
    end if;
    if row.status = 'canceled'
       and row.cancel_at_period_end
       and row.current_period_end is not null
       and row.current_period_end > now() then
      return row.tier;
    end if;
  end if;

  return 'free';
end;
$$;
