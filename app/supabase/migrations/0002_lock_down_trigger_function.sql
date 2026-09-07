-- handle_new_user() is only ever invoked by the auth.users trigger. It must
-- not be callable through the REST API by anonymous or signed-in users.
-- (0001_init also carries this statement for fresh installs; this file makes
-- sure environments that applied 0001 before the fix receive it too.)
revoke execute on function public.handle_new_user() from public, anon, authenticated;
