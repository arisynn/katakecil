-- Run as the project administrator only after reviewing the deployment guide.
-- Existing VAPID keys remain in Edge Function secrets; do not recreate them.
-- This installs ONE disabled job. Activation is a separate cutover step.
begin;
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;
create schema if not exists kk_private;
revoke all on schema kk_private from public,anon,authenticated;
create or replace function kk_private.qr_web_push_tick() returns bigint
language plpgsql security invoker set search_path='' as $$
declare v_url text;v_secret text;v_request bigint;
begin
 select decrypted_secret into v_url from vault.decrypted_secrets where name='katakecil_web_push_project_url';
 select decrypted_secret into v_secret from vault.decrypted_secrets where name='katakecil_web_push_dispatch_secret';
 if v_url is null or v_url !~ '^https://[a-z0-9-]+\.supabase\.co$' or v_secret is null or length(v_secret)<32 then
  raise exception 'Configure the KataKecil Web Push URL and dispatch secret in Vault first';
 end if;
 select net.http_post(url:=v_url||'/functions/v1/web-push-dispatch',headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||v_secret),body:='{}'::jsonb,timeout_milliseconds:=100000) into v_request;
 return v_request;
end $$;
revoke all on function kk_private.qr_web_push_tick() from public,anon,authenticated,service_role;
select cron.schedule('katakecil-web-push-15m','*/15 * * * *','select kk_private.qr_web_push_tick();');
select cron.alter_job(job_id:=(select jobid from cron.job where jobname='katakecil-web-push-15m'),active:=false);
commit;
