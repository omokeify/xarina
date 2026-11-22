-- Anti-abuse rate limiting: public.hit_rate_limit(key, limit, window).
begin;
create extension if not exists pgtap with schema extensions;

select plan(7);

-- Visitors and staff can't call it: only the server (service role) can.
set local role anon;
select throws_ok($$ select public.hit_rate_limit('t:anon', 2, 600) $$, '42501', null, 'anonymous visitors cannot call it');
reset role;
set local role authenticated;
select throws_ok($$ select public.hit_rate_limit('t:auth', 2, 600) $$, '42501', null, 'signed-in users cannot call it');
reset role;

set local role service_role;
select ok(public.hit_rate_limit('t:203.0.113.7', 2, 600), 'first attempt is allowed');
select ok(public.hit_rate_limit('t:203.0.113.7', 2, 600), 'second attempt is allowed');
select ok(not public.hit_rate_limit('t:203.0.113.7', 2, 600), 'third attempt in the window is refused');
select ok(public.hit_rate_limit('t:198.51.100.2', 2, 600), 'another visitor has their own count');
select throws_ok($$ select public.hit_rate_limit('', 2, 600) $$, '22023', null, 'an empty key is refused');

select * from finish();
rollback;
