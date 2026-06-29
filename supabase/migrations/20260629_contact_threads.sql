-- Thread token pour URL publique du ticket
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS thread_token uuid DEFAULT gen_random_uuid() NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS contacts_thread_token_idx ON contacts(thread_token);

-- Table des messages du fil
CREATE TABLE IF NOT EXISTS contact_messages (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id  uuid        NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  author      text        NOT NULL CHECK (author IN ('client', 'admin')),
  content     text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS contact_messages_contact_id_idx ON contact_messages(contact_id, created_at);

-- Migrer les messages initiaux existants
INSERT INTO contact_messages (contact_id, author, content, created_at)
SELECT id, 'client', message, created_at FROM contacts
WHERE NOT EXISTS (
  SELECT 1 FROM contact_messages cm WHERE cm.contact_id = contacts.id
);

-- Migrer les réponses admin existantes
INSERT INTO contact_messages (contact_id, author, content, created_at)
SELECT id, 'admin', reponse, now() FROM contacts
WHERE reponse IS NOT NULL AND reponse != ''
AND NOT EXISTS (
  SELECT 1 FROM contact_messages cm WHERE cm.contact_id = contacts.id AND cm.author = 'admin'
);
