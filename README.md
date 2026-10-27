# ChicOut — kids & baby wear storefront

An animated storefront for **ChicOut** (chicoutstore.in), built on the same engine as `shopify-theme-viral`
and re-skinned for a kids' and baby clothing store. It comes two ways from the same CSS/JS:

| Folder | What it is |
| --- | --- |
| `html/` | Static multi-page site. Open `html/index.html` — no build step. |
| `shopify/` | 10 theme sections + snippets + assets to drop into a Shopify theme. |
| `scripts/` | `build-catalog.py` (products, illustrations, homepage blocks) and `sync-shopify-assets.sh`. |

> **Sample content.** chicoutstore.in couldn't be reached while this was built, so the products, prices,
> contact details and About copy are **placeholders** written for a kids' and baby store. The product
> pictures are generated illustrations, not photos. Swap in the real catalogue, photos and details before launch
> (see *Make it yours* below).

## Pages (HTML version)

| Page | Highlights |
| --- | --- |
| `index.html` | Preloader → hero (split headline, floating cards, parallax, spinning "New arrivals" badge) → marquee → **New arrivals rack** (garments swing on hangers, turn to the front on hover, focus view with quick add) → shop-by-category tiles (Baby, Girls, Boys, Nightwear) → **The Washing Line** (clothes drift along a sagging line over a sunny backdrop; drag to scroll) → sticky "Why parents love ChicOut" feature scroll → **Tiny Steps** wheel for kids' shoes → most-loved grid with filter tabs → **Tiny joys** strip → "Join the family" sign-up |
| `shop.html` | Category tabs (Baby, Boys, Girls, Nightwear, Footwear), sort, 3/4-column toggle, search results (`?q=`), animated re-flow, filters kept in the URL (`?c=girls&sort=price-asc`) |
| `product.html?id=…` | Gallery with zoom, **age sizes** (0–3M … 4–5Y) or EU shoe sizes with sold-out state, quantity, add to bag, kids' size-guide pop-up, accordions, related products, sticky mobile buy bar |
| `about.html` | Statement headline, parallax band, story, values, marquee, quote, CTA |
| `contact.html` | Floating-label form with validation, contact cards, map pin, FAQ (sizes by age, washing baby clothes, returns) |
| `404.html` | Swinging hanger and big type |

**On every page:** header + footer from one config, live search (press `/`), bag drawer (₹, INR), full-screen
mobile menu, page-transition curtain, custom cursor, scroll progress, back-to-top, footer wordmark reveal,
newsletter form, `prefers-reduced-motion` support.

### Run it

```bash
cd html && python3 -m http.server 8000   # http://localhost:8000
```

The bag lives in the browser (localStorage). Checkout, the newsletter and the contact form are front-end only in
the static demo — connect them to Shopify, Formspree or Netlify Forms for real use.

## Look & feel

- **Type:** Fredoka (rounded headings), Nunito (body), Instrument Serif italic for the accent word.
- **Colours** (top of `html/assets/base.css`): deep plum ink `#2a2238`, coral accent `#ff6f61`, warm paper
  `#fffaf5`, pastel product tones (butter, blush, sky, mint, lilac).
- Section names were adapted for a kids' store: *Hang Rail Pro* → **The Washing Line**, *Nike Orbit* →
  **Tiny Steps**, *Obsessed* → **Tiny joys**.

## Make it yours

1. **`html/assets/brand.js`** — name, navigation, utility links, marquee words, **contact details (placeholders)**,
   social links, footer, newsletter text.
2. **`scripts/build-catalog.py`** — the product list (`PRODUCTS`, `FOOTWEAR`), categories, sizes and which items
   appear on the rack / washing line. Run `python3 scripts/build-catalog.py` to regenerate
   `html/assets/data/catalog.js`, the illustrations in `html/assets/img/`, and the generated blocks in `index.html`
   (between `<!-- build:… -->` markers — don't edit those by hand).
3. **Real photos** — point a product's `images` at real photos in `catalog.js` (or the build script). For the rack
   and washing line, use transparent PNG/WebP garment photos on a hanger with front, back and side views.
4. **`html/assets/base.css`** (top) — colours, fonts, radius.
5. Homepage, About and Contact copy lives directly in the HTML files.

## Shopify version

Copy into your theme (Online Store → Themes → ⋯ → Edit code, or `shopify theme push`):

- `shopify/sections/*.liquid` → `sections/`
- `shopify/snippets/*.liquid` → `snippets/`
- `shopify/assets/*` → `assets/`

Then **Add section** in the theme editor:

| Section | Notes |
| --- | --- |
| Rack showcase | One block per hanger (product + optional side/front/back images). |
| Washing line | Background image + garments; drift speed, sag and swing settings. |
| Tiny Steps | One block per shoe; quick-add uses the *Size* option. |
| Tiny joys | Heading, text and photo strip blocks. |
| ChicOut hero | Heading (`*word*` = italic accent), 3 card images, product chip, badge. |
| ChicOut marquee | Word blocks, speed, colours, outlined second row. |
| ChicOut category tiles | Collection blocks with image/colour. |
| ChicOut feature scroll | Feature blocks (title, text, image) with a sticky image panel. |
| ChicOut product grid | Any collection; filter tabs by product type; quick add pop-up. |
| ChicOut newsletter | Real Shopify customer form (tags the customer `newsletter`). |

Add to cart posts to `/cart/add.js`, updates the theme's `#cart-icon-bubble` and publishes Dawn's `cartUpdate`
event. The sections scope their styles under `.sx`, so they don't touch the rest of the theme.
`snippets/sx-assets.liquid` loads Fredoka, Nunito and Instrument Serif from Google Fonts; remove that link to use
the theme's own fonts.

## Editing the shared code

`html/assets/` is the source of truth. After changing a shared file, copy it into the theme folder:

```bash
./scripts/sync-shopify-assets.sh
```

HTML-only files: `site.css`, `site.js` (shell), `brand.js`, `pages.css`, `pages.js`, `marquee.js`, `data/catalog.js`.
