-- Stocke les dimensions des images pour équilibrer les colonnes masonry
ALTER TABLE gallery_images
  ADD COLUMN IF NOT EXISTS width  INTEGER,
  ADD COLUMN IF NOT EXISTS height INTEGER;
