-- ============ columns ============
alter table public.orders
  add column if not exists video_path     text,
  add column if not exists video_status   text not null default 'idle',
  add column if not exists video_seconds  int,
  add column if not exists video_lock_at  timestamptz,
  add column if not exists render_attempts int not null default 0,
  add column if not exists video_attempts  int not null default 0,
  add column if not exists last_error     text,
  add column if not exists notified_at    timestamptz;

-- ============ work lists ============
create or replace function public.pending_render_orders(p_limit int default 3)
returns table(id uuid)
language sql stable security definer set search_path = public as $$
  select id from orders
   where status = 'paid'
     and render_attempts < 5
     and ( render_status in ('idle','partial','failed')
        or (render_status = 'rendering' and render_lock_at < now() - interval '5 minutes') )
   order by created_at
   limit p_limit;
$$;

create or replace function public.pending_video_orders(p_limit int default 3)
returns table(id uuid)
language sql stable security definer set search_path = public as $$
  select o.id from orders o
   where o.status = 'paid' and o.pkg = 'premium' and o.video_path is null
     and o.video_attempts < 3
     and (select count(*) from photos p where p.order_id = o.id) >= 5
     and ( o.video_status in ('idle','failed')
        or (o.video_status = 'rendering' and o.video_lock_at < now() - interval '10 minutes') )
   order by o.created_at
   limit p_limit;
$$;

-- ============ atomic claims (only one worker wins) ============
create or replace function public.claim_render_job(p_id uuid)
returns boolean
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  update orders
     set render_status  = 'rendering',
         render_lock_at = now(),
         render_attempts = render_attempts + 1
   where id = p_id
     and status = 'paid'
     and render_attempts < 5
     and ( render_status in ('idle','partial','failed')
        or (render_status = 'rendering' and render_lock_at < now() - interval '5 minutes') );
  get diagnostics n = row_count;
  return n > 0;
end $$;

create or replace function public.claim_video_job(p_id uuid)
returns boolean
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  update orders
     set video_status  = 'rendering',
         video_lock_at = now(),
         video_attempts = video_attempts + 1
   where id = p_id
     and status = 'paid' and pkg = 'premium' and video_path is null
     and video_attempts < 3
     and (select count(*) from photos p where p.order_id = p_id) >= 5
     and ( video_status in ('idle','failed')
        or (video_status = 'rendering' and video_lock_at < now() - interval '10 minutes') );
  get diagnostics n = row_count;
  return n > 0;
end $$;

-- ============ lock them to the server only ============
revoke all on function public.pending_render_orders(int) from public, anon, authenticated;
revoke all on function public.pending_video_orders(int)  from public, anon, authenticated;
revoke all on function public.claim_render_job(uuid)     from public, anon, authenticated;
revoke all on function public.claim_video_job(uuid)      from public, anon, authenticated;
grant execute on function public.pending_render_orders(int) to service_role;
grant execute on function public.pending_video_orders(int)  to service_role;
grant execute on function public.claim_render_job(uuid)     to service_role;
grant execute on function public.claim_video_job(uuid)      to service_role;

-- ============ the every-minute driver ============
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule('pasko-sweep', '* * * * *', $$
  select net.http_post(
    url     := 'https://YOUR-APP.vercel.app/api/sweep',
    headers := jsonb_build_object(
                 'Content-Type',  'application/json',
                 'Authorization', 'Bearer YOUR_CRON_SECRET'),
    body    := '{}'::jsonb,
    timeout_milliseconds := 250000
  );
$$);