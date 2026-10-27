# ChicOut — men's shirts, trousers & denim storefront

An animated storefront for **ChicOut** (chicoutstore.in), built on the same engine as `shopify-theme-viral`,
using the store's own product photos. It comes two ways from the same CSS/JS:

| Folder | What it is |
| --- | --- |
| `html/` | Static multi-page site. Open `html/index.html` — no build step. |
| `shopify/` | 9 theme sections + snippets + assets to drop into a Shopify theme. |
| `scripts/` | `products.csv` (the catalogue), `prepare-images.py`, `build-catalog.py`, `sync-shopify-assets.sh`. |
| `store-theme/` | A separate **classic** version (no extra animations): HTML site + complete Shopify theme + product import CSV. See `store-theme/README.md`. |

## Catalogue

**100 products from the store's photos**, sorted into 7 categories:

| Category | Styles |
| --- | --- |
| Embroidered & printed shirts | 20 |
| Solid shirts | 36 |
| Checks & stripes | 18 |
| Tees & polos | 5 |
| Denim & jackets | 4 |
| Trousers | 10 |
| Jeans | 7 |

Each product has its **photo** (`html/assets/img/products/`) and a **cut-out** of the garment on a transparent
background (`html/assets/img/cutouts/`). Cut-outs are used on the rack, the shirt rail, the hero, category tiles
and product cards; cards switch to the real photo on hover, and the product page shows both.

> **Check before launch:** product names were written from the photos, and **prices are placeholders by
> category** (solid shirts ₹1,299, checks ₹1,399, embroidered ₹1,599, denim ₹1,799, tees ₹999, zip polos ₹1,199,
> jacket ₹2,999, trousers ₹1,499, jeans ₹1,799). Sizes are S–XXL for tops and waist 28–36 for bottoms, all in
> stock. Contact details in `brand.js` are placeholders too. Fix them in `scripts/products.csv` / `brand.js`.

## Pages (HTML version)

| Page | Highlights |
| --- | --- |
| `index.html` | Preloader → hero (split headline, floating shirt cards, parallax, spinning badge) → marquee → **New arrivals rack** (10 embroidered and printed shirts swing on the rod, turn to the front on hover, open a focus view with quick add) → category tiles → **The Shirt Rail** (solids, tees and polos drift along a brass rail; drag to scroll) → sticky "ChicOut edit" feature scroll → **Lookbook** (the banner photo with shop-the-look links) → trending grid with filter tabs → **Stand out** photo strip → newsletter |
| `shop.html` | All 100 products, category tabs, sort, 3/4-column toggle, search results (`?q=`), animated re-flow, filters kept in the URL (`?c=designer&sort=price-asc`) |
| `product.html?id=…` | Cut-out and photo gallery with zoom, sizes, quantity, add to bag, size guide (shirt chest / trouser waist), accordions, related products, sticky mobile buy bar |
| `about.html`, `contact.html`, `404.html` | Story, values, contact form with validation, FAQ |

**On every page:** header + footer from one config, live search (press `/`), bag drawer (₹), mobile menu,
page transitions, custom cursor, scroll progress, back-to-top, `prefers-reduced-motion` support.

### Run it

```bash
cd html && python3 -m http.server 8000   # http://localhost:8000
```

The bag lives in the browser (localStorage). Checkout, the newsletter and the contact form are front-end only in
the static demo — connect them to Shopify, Formspree or Netlify Forms for real use.

## Add or change products

1. Edit **`scripts/products.csv`** — `id, name, category, price, badge, source` (`source` = the photo's file name).
   Categories: `designer`, `solid`, `checks`, `tees`, `denim`, `trousers`, `jeans`.
2. For new photos, make the web photo and cut-out:
   ```bash
   pip install onnxruntime numpy pillow
   curl -L -o isnet.onnx https://github.com/danielgatis/rembg/releases/download/v0.0.0/isnet-general-use.onnx
   python3 scripts/prepare-images.py path/to/photos --model isnet.onnx --skip-existing
   ```
3. Rebuild: `python3 scripts/build-catalog.py` — writes `html/assets/data/catalog.js`, the side views, and the
   rack / shirt-rail blocks in `index.html` (between `<!-- build:… -->` markers; don't edit those by hand).
   Homepage picks (hero, rack, rail, featured order) are lists at the top of `build-catalog.py`.

Colours and fonts are at the top of `html/assets/base.css`; site-wide text (menus, footer, contact) is in
`html/assets/brand.js`; homepage, About and Contact copy lives in the HTML files.

## Shopify version

Copy into your theme (Online Store → Themes → ⋯ → Edit code, or `shopify theme push`):

- `shopify/sections/*.liquid` → `sections/`
- `shopify/snippets/*.liquid` → `snippets/`
- `shopify/assets/*` → `assets/`

Then **Add section** in the theme editor:

| Section | Notes |
| --- | --- |
| Rack showcase | One block per hanger (product + optional side/front/back images). |
| Shirt rail | Background image + garments; drift speed, sag and swing settings. |
| Stand out strip | Heading, text and photo strip blocks. |
| ChicOut hero | Heading (`*word*` = italic accent), 3 card images, product chip, badge. |
| ChicOut marquee | Word blocks, speed, colours, outlined second row. |
| ChicOut category tiles | Collection blocks with image/colour. |
| ChicOut feature scroll | Feature blocks (title, text, image) with a sticky image panel. |
| ChicOut product grid | Any collection; filter tabs by product type; quick add pop-up. |
| ChicOut newsletter | Real Shopify customer form (tags the customer `newsletter`). |

Add to cart posts to `/cart/add.js`, updates the theme's `#cart-icon-bubble` and publishes Dawn's `cartUpdate`
event. The sections scope their styles under `.sx`, so they don't touch the rest of the theme.
`snippets/sx-assets.liquid` loads Instrument Serif (the italic accent) from Google Fonts; remove that link to use
the theme's own fonts.

## Editing the shared code

`html/assets/` is the source of truth. After changing a shared file, copy it into the theme folder:

```bash
./scripts/sync-shopify-assets.sh
```

HTML-only files: `site.css`, `site.js` (shell), `brand.js`, `pages.css`, `pages.js`, `marquee.js`, `data/catalog.js`.
