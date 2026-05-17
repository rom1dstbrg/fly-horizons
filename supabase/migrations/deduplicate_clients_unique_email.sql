-- Step 1: Reassign reservations from duplicate clients to the keeper (lowest id = oldest)
WITH keepers AS (
  SELECT DISTINCT ON (email) id AS keeper_id, email
  FROM clients
  ORDER BY email, id ASC
),
dups AS (
  SELECT c.id AS dup_id, k.keeper_id
  FROM clients c
  JOIN keepers k ON k.email = c.email
  WHERE c.id != k.keeper_id
)
UPDATE reservations
SET client_id = dups.keeper_id
FROM dups
WHERE reservations.client_id = dups.dup_id;

-- Step 2: Delete duplicate client rows (keep lowest id per email)
WITH keepers AS (
  SELECT DISTINCT ON (email) id
  FROM clients
  ORDER BY email, id ASC
)
DELETE FROM clients
WHERE id NOT IN (SELECT id FROM keepers);

-- Step 3: Add unique constraint so this can never happen again
ALTER TABLE clients ADD CONSTRAINT clients_email_unique UNIQUE (email);
