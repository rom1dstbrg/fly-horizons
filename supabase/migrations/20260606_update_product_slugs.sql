-- Met à jour les slugs des produits dont le titre a changé
UPDATE products SET slug = 'exploration-60-min'  WHERE slug = 'aventure-60-min';
UPDATE products SET slug = 'immersion-90-min'    WHERE slug = 'voyage-90-min';
