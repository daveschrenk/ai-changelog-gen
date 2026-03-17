-- AI Changelog Generator — Supabase schema
-- Run this in your Supabase SQL editor

-- Usage tracking for free tier rate limiting
create table if not exists usage (
  id uuid primary key default gen_random_uuid(),
  ip text not null,
  month text not null,          -- format: "YYYY-MM"
  count integer not null default 0,
  updated_at timestamptz default now(),
  unique (ip, month)
);

-- Atomic increment function (avoids race conditions)
create or replace function increment_usage(p_ip text, p_month text)
returns integer
language plpgsql
as $$
declare
  new_count integer;
begin
  insert into usage (ip, month, count, updated_at)
    values (p_ip, p_month, 1, now())
  on conflict (ip, month)
  do update set
    count = usage.count + 1,
    updated_at = now()
  returning count into new_count;

  return new_count;
end;
$$;

-- Optional: index for lookups
create index if not exists usage_ip_month_idx on usage(ip, month);

-- Stripe subscribers (Pro tier)
create table if not exists subscribers (
  id uuid primary key default gen_random_uuid(),
  stripe_customer_id text not null unique,
  stripe_subscription_id text not null unique,
  client_ip text,               -- used for IP-based paid tier detection (pre-auth)
  active boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists subscribers_ip_idx on subscribers(client_ip) where active = true;
