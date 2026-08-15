-- Annonces pilote v3 : la date/heure n'est plus fixée à la publication, c'est le
-- client qui la choisit au moment de réserver (vit sur reservations.date_vol/
-- heure_vol, colonnes déjà existantes) — voir app/api/vol-annonce/checkout.
-- Durée libre (plus limitée à 30/60/90/120), places élargies à 1-6, et ajout
-- photos (couverture = 1ère image) + description.

alter table annonces_pilote
  drop column if exists date_vol,
  drop column if exists heure_vol;

alter table annonces_pilote
  drop constraint if exists annonces_pilote_duree_check;
alter table annonces_pilote
  add constraint annonces_pilote_duree_check check (duree between 10 and 240);

alter table annonces_pilote
  drop constraint if exists annonces_pilote_places_check;
alter table annonces_pilote
  add constraint annonces_pilote_places_check check (places between 1 and 6);

alter table annonces_pilote
  add column if not exists description text,
  add column if not exists images text[] not null default '{}',
  add constraint annonces_pilote_images_check
    check (array_length(images, 1) is null or array_length(images, 1) <= 6);

-- Bucket storage public pour les photos d'annonces (lecture publique, écriture
-- uniquement via service_role — même pattern que le bucket gallery).
insert into storage.buckets (id, name, public)
values ('annonces', 'annonces', true)
on conflict (id) do nothing;

create policy "Public read annonces storage"
  on storage.objects for select
  using (bucket_id = 'annonces');
