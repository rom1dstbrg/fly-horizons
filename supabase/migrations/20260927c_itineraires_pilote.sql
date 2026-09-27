-- Itinéraires par pilote (27/09) : chaque itinéraire appartient au pilote qui
-- l'a créé, et lui seul le voit. Pas d'itinéraire partagé. Un itinéraire
-- chargé dans une réservation y est copié (waypoints de la résa) : il reste
-- sur la réservation même si le vol passe à un autre pilote.
alter table itineraires
  add column if not exists pilote_id uuid references pilotes(id) on delete cascade;

-- Les itinéraires existants ont tous été créés par Romain (admin + pilote).
update itineraires
set pilote_id = (
  select p.id from pilotes p
  join profiles pr on pr.id = p.user_id
  where pr.role = 'admin'
  order by p.created_at
  limit 1
)
where pilote_id is null;

alter table itineraires alter column pilote_id set not null;

create index if not exists itineraires_pilote_id_idx on itineraires (pilote_id);
