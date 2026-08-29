-- Renumérotation manuelle : Fly Horizons (info@fly-horizons.com) et Romain
-- (rom.destanberg@gmail.com) doivent être FH-0001 et FH-0002.
-- Vérifié avant écriture : FH-0001/FH-0002 libres, aucune réservation ne
-- référence FH-0028/FH-0043 — pas de ligne enfant à mettre à jour.
UPDATE clients SET id = 'FH-0001' WHERE id = 'FH-0028';
UPDATE clients SET id = 'FH-0002' WHERE id = 'FH-0043';
