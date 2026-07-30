-- profiles n'a jamais ete cree via une migration trackee (table hors versioning) : on ne connait
-- pas le nom de sa contrainte CHECK sur role, on la retrouve donc dynamiquement avant de la remplacer.
do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.profiles'::regclass and contype = 'c' and pg_get_constraintdef(oid) ilike '%role%'
  loop
    execute format('alter table public.profiles drop constraint %I', c.conname);
  end loop;
  alter table public.profiles add constraint profiles_role_check check (role in ('customer','admin','pilote'));
end $$;
