-- Run against a migrated Supabase staging project using a SQL editor or psql.
-- These are catalog/grant assertions; cross-account behavior still needs separate Auth identities.
begin;
do $$
declare
  t text;
begin
  foreach t in array array['club_gamification_settings','contribution_rules','contributions','xp_ledger','member_leaderboard_preferences','club_level_rules','achievement_definitions','member_achievements','member_level_history','member_board_term_history','admin_audit_logs','announcement_notification_deliveries'] loop
    if not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname=t and c.relrowsecurity) then
      raise exception 'RLS is not enabled on public.%',t;
    end if;
  end loop;
  if exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prosecdef and coalesce(array_to_string(p.proconfig,','),'') not ilike '%search_path=%') then raise exception 'A public SECURITY DEFINER function has no explicit search_path'; end if;
  if has_table_privilege('authenticated','public.xp_ledger','INSERT,UPDATE,DELETE') then raise exception 'authenticated unexpectedly has write privileges on XP ledger'; end if;
  if has_table_privilege('anon','public.admin_audit_logs','SELECT,INSERT,UPDATE,DELETE') then raise exception 'anon unexpectedly has audit access'; end if;
  if has_table_privilege('authenticated','public.admin_audit_logs','INSERT,UPDATE,DELETE') then raise exception 'authenticated unexpectedly has audit mutation privileges'; end if;
  if has_table_privilege('authenticated','public.member_leaderboard_preferences','INSERT,UPDATE,DELETE') then raise exception 'authenticated unexpectedly has direct leaderboard preference writes'; end if;
  if has_function_privilege('authenticated','public.set_member_role(uuid,text,boolean)','EXECUTE') then raise exception 'legacy unreasoned role RPC is still executable'; end if;
  if not has_function_privilege('authenticated','public.admin_set_member_role(uuid,text,boolean,text)','EXECUTE') then raise exception 'reasoned role RPC is unavailable'; end if;
  if not has_function_privilege('authenticated','public.get_admin_overview()','EXECUTE') then raise exception 'admin overview RPC is unavailable'; end if;
  if not has_function_privilege('authenticated','public.award_contribution_xp(uuid,text)','EXECUTE') then raise exception 'XP award RPC is unavailable'; end if;
  if exists(select 1 from public.club_gamification_settings where singleton and (xp_enabled or achievements_enabled or leaderboard_enabled)) then raise exception 'Gamification unexpectedly enabled by default'; end if;
  if exists(select 1 from public.contribution_rules where enabled) then raise exception 'A proposed contribution rule is enabled by default'; end if;
  if exists(select 1 from public.club_level_rules where enabled) then raise exception 'A proposed level is enabled by default'; end if;
  if exists(select 1 from public.achievement_definitions where enabled) then raise exception 'A proposed achievement is enabled by default'; end if;
end $$;
rollback;
