create extension if not exists pgcrypto;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  token text not null default encode(gen_random_bytes(16),'hex'),
  pkg text not null check (pkg in ('basic','premium')),
  amount_centavos int not null,
  customer_name text not null, email text not null, phone text,
  consent boolean not null default false,
  photo_path text not null,
  status text not null default 'pending',        -- pending|paid|cancelled
  render_status text not null default 'idle',    -- idle|rendering|ready|partial
  render_lock_at timestamptz,
  provider text, provider_session_id text, paid_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.photos (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  style_id text not null, storage_path text not null,
  cost_usd numeric(10,4) default 0,
  created_at timestamptz not null default now(),
  unique (order_id, style_id)            -- <- makes re-rendering idempotent
);

create table public.webhook_events (id text primary key, received_at timestamptz default now());

alter table public.orders enable row level security;
alter table public.photos enable row level security;
alter table public.webhook_events enable row level security;
-- no public policies: only the service role (server) touches these

insert into storage.buckets (id,name,public) values ('uploads','uploads',false),('renders','renders',false)
on conflict (id) do nothing;