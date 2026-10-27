#!/usr/bin/env sh
# Copy the shared section CSS/JS from the HTML site into the Shopify theme folder.
# html/assets is the source of truth; run this after editing any of these files.
set -e
cd "$(dirname "$0")/.."
for f in base.css motion.css motion.js \
         hero.css hero.js sections.css sections.js \
         product-grid.css product-card.js \
         site-cart.js quick-view.js quick-view.css \
         rack-showcase.js rack-showcase.css \
         hang-rail.js hang-rail.css \
         obsessed.js obsessed.css; do
  cp "html/assets/$f" "shopify/assets/$f"
done
echo "Synced $(ls shopify/assets | wc -l | tr -d ' ') files to shopify/assets"
