# ChicOut store theme (classic version)

A clean, classic storefront for ChicOut: announcement bar, header menu, hero banner, category tiles,
product rows, image-with-text blocks, newsletter and footer. No extra animations. It comes two ways:

| Folder / file | What it is |
| --- | --- |
| `html/` | Static site with all 100 products — open `html/index.html` (home, shop with filters and sort, product, cart, contact, 404). |
| `shopify/` | A complete Shopify theme (Online Store 2.0) in the same design. Shows the store's real products, cart and checkout. |
| `chicout-store-theme.zip` | The `shopify/` folder zipped, ready to upload. |
| `products-import.csv` | The 100 products (500 size variants) in Shopify's product import format. |
| `scripts/build.py` | Rebuilds `html/assets/products.js`, the photos and `products-import.csv` from `../scripts/products.csv`. |

> **Design note:** chicoutstore.in could not be opened from the build environment, so this is a classic
> Shopify-style layout built around the store's own photos — not a pixel copy of the live site. Send the live
> theme file (Shopify admin → Online Store → Themes → ⋯ → Download theme file) to match it exactly.
>
> **Check before launch:** prices are placeholders by category, sizes are S–XXL (tops) and waist 28–36
> (bottoms), and contact details in `html/assets/store.js` are placeholders.

## Run the HTML version

```bash
cd store-theme/html && python3 -m http.server 8000   # http://localhost:8000
```

The cart is kept in the browser; checkout links to the live store.

## Put it on Shopify

Work on an **unpublished** theme first — nothing here touches the live theme until you publish it.

1. **Upload the theme:** Online Store → Themes → Add theme → Upload zip file → `chicout-store-theme.zip`.
2. **Import the products** (optional, if they aren't in the store yet): Products → Import → `products-import.csv`.
   Products import as **drafts** so you can check prices before they go live. Photos are fetched from this
   GitHub repo, so keep the repo public until the import has finished.
3. **Create 7 automated collections** (Products → Collections → Create collection), each with the condition
   *Product type is equal to* the title:

   | Collection title (= product type) | Handle the theme expects |
   | --- | --- |
   | Embroidered & Printed Shirts | `embroidered-printed-shirts` |
   | Solid Shirts | `solid-shirts` |
   | Checked & Striped Shirts | `checked-striped-shirts` |
   | T-Shirts & Polos | `t-shirts-polos` |
   | Denim & Jackets | `denim-jackets` |
   | Trousers | `trousers` |
   | Jeans | `jeans` |

4. **Menus** (Online Store → Navigation):
   - *Main menu*: Home, Shop all (`/collections/all`), Shirts (with the four shirt collections nested under it),
     Tees & polos, Trousers, Jeans, Contact.
   - *Footer menu*: Contact, Search, and your policy pages.
5. **Contact page:** create a page called *Contact* and pick the `page.contact` template.
6. **Customize** the theme: upload your logo, pick the hero image, and adjust colours and fonts under
   Theme settings. Then preview and publish.

## Theme contents

- `layout/` — `theme.liquid`, `password.liquid`
- `sections/` — announcement bar, header, footer (section groups), hero banner, collection list, featured
  collection, image with text, newsletter, and the main collection / product / cart / search / contact / page /
  blog / article / 404 / password sections
- `snippets/` — product card, price, icons, cart drawer, social meta tags
- `templates/` — JSON templates for every page type, customer account pages, gift card
- `assets/` — `store.css` (shared with the HTML version), `theme.js` (menu, predictive search, AJAX cart drawer,
  product form), `banner.webp` (hero fallback)

Shopify Theme Check (`@shopify/theme-check-node`) reports no errors or warnings.

## Editing

`html/assets/store.css` is the shared stylesheet — after changing it, copy it to `shopify/assets/store.css`.
Product changes go in `../scripts/products.csv`; then run `python3 store-theme/scripts/build.py`.
To rebuild the zip: `cd store-theme/shopify && zip -r ../chicout-store-theme.zip . -x '.*'`.
