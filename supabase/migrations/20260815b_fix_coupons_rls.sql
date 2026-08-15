-- coupons avait déjà RLS activé avec une policy inconnue (créée hors migration
-- trackée, probablement via l'éditeur de table Supabase) qui laissait passer
-- anon malgré `alter table coupons enable row level security` dans le
-- correctif précédent (no-op puisque RLS était déjà activée). On supprime
-- donc toute policy existante sur la table, peu importe son nom, pour repartir
-- sur une base saine : RLS activée + zéro policy = fermé à anon/authenticated,
-- service_role continue de fonctionner normalement (bypass RLS natif).
do $$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'coupons' loop
    execute format('drop policy %I on coupons', p.policyname);
  end loop;
end $$;
