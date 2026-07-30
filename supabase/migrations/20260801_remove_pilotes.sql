-- Annule le portail pilote (projet abandonne le 2026-08-01). Voir migrations
-- 20260730_pilotes.sql, 20260730_products_pilote.sql, 20260730_profiles_role_pilote.sql
-- et 20260731_reservations_pilote.sql pour ce qui est defait ici.

-- Reservations : retire le lien vers un pilote/une annonce
alter table reservations drop column if exists product_id;
alter table reservations drop column if exists pilote_id;

-- Produits : retire les annonces de vol pilote et les colonnes associees
delete from products where product_type = 'vol_pilote';
alter table products drop column if exists pilote_id;
alter table products drop column if exists part_type;
alter table products drop column if exists part_valeur;

-- Profils : plus aucun compte ne doit garder le role pilote avant de le retirer
-- de la contrainte (echouerait sinon si une ligne l'utilise encore)
update profiles set role = 'customer' where role = 'pilote';

do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.profiles'::regclass and contype = 'c' and pg_get_constraintdef(oid) ilike '%role%'
  loop
    execute format('alter table public.profiles drop constraint %I', c.conname);
  end loop;
  alter table public.profiles add constraint profiles_role_check check (role in ('customer','admin'));
end $$;

-- Table pilotes elle-meme
drop table if exists pilotes;
