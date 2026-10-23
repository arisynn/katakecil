-- Run only after old GitHub/Vercel dispatch is disabled and Edge smoke checks pass.
-- Vault entries must reuse WEB_PUSH_DISPATCH_SECRET and the existing project URL.
begin;
do $$begin
 if not exists(select 1 from vault.secrets where name='katakecil_web_push_project_url') or not exists(select 1 from vault.secrets where name='katakecil_web_push_dispatch_secret') then raise exception 'Configure Web Push Vault entries before activation';end if;
 if not exists(select 1 from cron.job where jobname='katakecil-web-push-15m') then raise exception 'Install the disabled Web Push Cron job first';end if;
end $$;
select cron.alter_job(job_id:=(select jobid from cron.job where jobname='katakecil-web-push-15m'),active:=true);
commit;
