-- Existing revision RPCs resolve author-guarded helpers with invoker permissions.
-- This grants schema lookup only; private table grants and RLS remain restricted.
grant usage on schema kk_private to authenticated;
