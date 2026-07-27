-- Admin-granted subscriptions expire when current_period_end passes (lifetime = null end).

create or replace function public.get_effective_subscription_tier(p_user_id uuid)
returns public.subscription_tier
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  row public.user_subscriptions%rowtype;
  is_admin_grant boolean;
begin
  select * into row
  from public.user_subscriptions
  where user_id = p_user_id;

  if not found then
    return 'free';
  end if;

  is_admin_grant := row.paddle_subscription_id like 'pad_sub_admin_%'
    or row.paddle_subscription_id like 'pad_sub_comp_%'
    or row.paddle_subscription_id like 'pad_sub_ovr_%';

  if row.tier in ('plus', 'pro') then
    if row.status = 'active' then
      if is_admin_grant
         and row.current_period_end is not null
         and row.current_period_end <= now() then
        return 'free';
      end if;
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
