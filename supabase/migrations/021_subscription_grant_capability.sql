-- Separate "can grant subscriptions" capability from admin role.

alter table public.profiles
  add column if not exists can_grant_subscriptions boolean not null default false;

update public.profiles
set can_grant_subscriptions = true
where user_id = '9446ec2d-d0e0-4359-95c2-727206ce88b4';
