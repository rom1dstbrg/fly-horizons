-- Libération atomique du stock produit (symétrique à claim_product_stock) — utilisée
-- partout où une réservation liée à un produit à quantité limitée est annulée/expire,
-- pour éviter la perte d'incrément en cas d'échecs concurrents (lecture-puis-écriture).
CREATE OR REPLACE FUNCTION release_product_stock(p_product_id uuid)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE products SET quantity_available = quantity_available + 1
  WHERE id = p_product_id AND quantity_available IS NOT NULL;
END; $$;
