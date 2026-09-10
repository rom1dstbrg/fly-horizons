-- Espace pilote · paiement des annonces = virement + QR SEPA, aucun PSP
-- (décision 08/09 soir). Fly Horizons n'encaisse rien sur un vol pilote ;
-- l'app garde une trace déclarative du règlement direct au pilote.
--
-- Sous-ensemble volontaire de la migration 20260909_pilote_paiement.sql (gelée,
-- câblée sur l'assignation Bloc B) : PAS de montant_pilote (reservations.acompte
-- porte déjà le montant dû par le client), PAS de pilotes.paylink.
--
-- À exécuter à la main dans Supabase.

-- Mode de vente d'une annonce : tout l'avion pour un seul client, ou vente à la
-- place (plusieurs clients, chacun règle sa quote-part au pilote).
alter table annonces_pilote
  add column if not exists mode_vente text not null default 'avion'
    check (mode_vente in ('avion', 'place')),
  add column if not exists places_reservees int not null default 0;

-- Suivi déclaratif du règlement direct au pilote + bilan de vol.
alter table reservations
  add column if not exists pilote_paye     boolean not null default false,
  add column if not exists pilote_paye_at  timestamptz,
  add column if not exists duree_reelle    int;  -- minutes réellement volées (bilan pilote)

comment on column annonces_pilote.mode_vente is
  'avion = 1 booking prend tout l''avion ; place = vente à la place jusqu''à `places`.';
comment on column annonces_pilote.places_reservees is
  'Places déjà réservées (mode place). Atteint `places` => annonce fermée (statut reservee).';
comment on column reservations.pilote_paye is
  'Le client a réglé le pilote en direct (virement). Déclaratif, aucun flux réel dans l''app.';
comment on column reservations.duree_reelle is
  'Minutes réellement volées, saisies par le pilote au moment de marquer le vol effectué.';
