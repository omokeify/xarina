-- Anti-abuse rate limiting for public forms (waitlist, drop alerts, restock,
-- Privé requests) and checkout start. A fixed-window counter keyed by
-- "<action>:<client>", called only by the server with the service role, so
-- visitors can neither read nor reset it. Drops attract bursts: this stops a
-- script from flooding sign-ups or holding stock with endless checkouts.

create table private.rate_limit_hits (
  key text not null,
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (key, window_start)
);

alter table private.rate_limit_hits enable row level security;   -- rule 8: no policies, no client access

-- Records one attempt and returns true while the caller is within the limit.
create function public.hit_rate_limit(p_key text, p_limit integer, p_window_seconds integer)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_window timestamptz;
  v_hits integer;
begin
  if p_key is null or length(p_key) = 0 or length(p_key) > 200 or p_limit < 1 or p_window_seconds < 1 then
    raise exception 'Invalid rate limit call' using errcode = '22023';
  end if;

  v_window := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);

  insert into private.rate_limit_hits as r (key, window_start, hits)
  values (p_key, v_window, 1)
  on conflict (key, window_start) do update set hits = r.hits + 1
  returning r.hits into v_hits;

  -- Housekeeping: now and then, drop windows older than a day.
  if random() < 0.01 then
    delete from private.rate_limit_hits where window_start < now() - interval '1 day';
  end if;

  return v_hits <= p_limit;
end;
$$;

revoke all on function public.hit_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.hit_rate_limit(text, integer, integer) to service_role;
