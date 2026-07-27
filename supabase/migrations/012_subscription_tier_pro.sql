-- Add Pro to subscription_tier enum.
-- Must be its own migration/transaction: Postgres rejects using a newly added
-- enum label in the same transaction (55P04). Caps/functions follow in 014.

alter type public.subscription_tier add value if not exists 'pro';
