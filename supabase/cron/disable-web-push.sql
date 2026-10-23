-- Stops notification polling only; never changes story schedules or subscriptions.
select cron.alter_job(job_id:=(select jobid from cron.job where jobname='katakecil-web-push-15m'),active:=false);
