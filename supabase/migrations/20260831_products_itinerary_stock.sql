ALTER TABLE products
  ADD COLUMN IF NOT EXISTS route_waypoints jsonb,
  ADD COLUMN IF NOT EXISTS quantity_available integer;

ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES products(id);

-- Décrément atomique du stock produit — évite la race condition entre deux
-- clients qui réservent la même offre à quantité limitée au même moment.
CREATE OR REPLACE FUNCTION claim_product_stock(p_product_id uuid)
RETURNS boolean LANGUAGE plpgsql AS $$
DECLARE ok boolean;
BEGIN
  UPDATE products SET quantity_available = quantity_available - 1
  WHERE id = p_product_id AND quantity_available > 0
  RETURNING true INTO ok;
  RETURN COALESCE(ok, false);
END; $$;
