-- READ ONLY. Run after both V2 and V3 migrations as a quick security inspection.
select c.relname as table_name,c.relrowsecurity as rls_enabled
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname in
('qr_episodes','qr_books','qr_author_members','qr_release_rules','qr_publication_logs')
order by c.relname;

select schemaname,tablename,policyname,cmd,roles
from pg_policies where schemaname='public' and tablename in
('qr_episodes','qr_books','qr_author_members','qr_release_rules','qr_publication_logs')
order by tablename,policyname;

-- No anonymous access should exist for unpublished material, private rules or logs.
-- RLS SELECT policy on qr_episodes still protects unpublished novels/episodes.
-- For true runtime verification, test with a separate anonymous client key.
