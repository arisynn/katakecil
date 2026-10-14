-- Run after V4 migration using a privileged SQL editor.
select tablename,rowsecurity from pg_tables where schemaname='public' and tablename in ('qr_import_batches','qr_episodes','qr_books','qr_author_members');
select grantee,privilege_type,table_name from information_schema.role_table_grants where table_schema='public' and table_name='qr_import_batches' and grantee in ('anon','authenticated') order by grantee,privilege_type;
select proname,prosecdef from pg_proc where proname='qr_import_drafts';
-- Test as unauthorized/anonymous roles and authorized author separately; anon must not execute RPC.
