#!/usr/bin/env python3
"""Build the ChicOut catalogue from scripts/products.csv and the prepared images.

Reads:
  scripts/products.csv                       id, name, category, price, badge, source photo
  html/assets/img/products/<id>.webp         product photo      (scripts/prepare-images.py)
  html/assets/img/cutouts/<id>.webp          garment cut-out     (scripts/prepare-images.py)
Writes:
  html/assets/img/cutouts/<id>-side.webp     side-on view for the rack and the shirt rail
  html/assets/img/hang-rail-bg.svg           backdrop for the shirt rail
  html/assets/data/catalog.js                products + categories (shop, product page, search, grids)
  html/index.html                            the blocks between <!-- build:NAME --> markers

Edit products.csv (or the homepage picks below), then run:  python3 scripts/build-catalog.py
"""
import csv
import json
import os
import re

from PIL import Image, ImageChops, ImageDraw

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'html')
IMG = os.path.join(ROOT, 'assets', 'img')

CATEGORIES = [
    {'id': 'all', 'label': 'All', 'blurb': 'Statement shirts, everyday solids, checks, relaxed trousers and denim.'},
    {'id': 'designer', 'label': 'Embroidered & printed', 'blurb': 'Hand-finished embroidery and bold prints that do the talking.'},
    {'id': 'solid', 'label': 'Solid shirts', 'blurb': 'Clean, everyday shirts in rich, wearable colours.'},
    {'id': 'checks', 'label': 'Checks & stripes', 'blurb': 'Tartans, pinstripes and windowpane checks for every day.'},
    {'id': 'tees', 'label': 'Tees & polos', 'blurb': 'Striped long-sleeve tees and zip polos.'},
    {'id': 'denim', 'label': 'Denim & jackets', 'blurb': 'Washed denim shirts and a racing jacket.'},
    {'id': 'trousers', 'label': 'Trousers', 'blurb': 'Relaxed drawstring trousers and sharp pleated pairs.'},
    {'id': 'jeans', 'label': 'Jeans', 'blurb': 'Straight, wide, baggy and flared fits.'},
]
TONES = {'designer': '#efe6dc', 'solid': '#ebe7e1', 'checks': '#ece6dd', 'tees': '#e7e9ea',
         'denim': '#e4e7eb', 'trousers': '#efe9e0', 'jeans': '#e5e8ec'}
TOP_SIZES = ['S', 'M', 'L', 'XL', 'XXL']
WAIST_SIZES = ['28', '30', '32', '34', '36']

DESC = {
    'designer': 'A statement shirt with embroidered or printed detail that sets it apart. Wear it tucked into pleated trousers or loose over denim.',
    'solid': 'An everyday full-sleeve shirt in a rich, easy-to-wear colour. Dress it up with trousers or keep it relaxed with denim.',
    'checks': 'A full-sleeve shirt in a classic check or stripe — smart enough for work, easy enough for the weekend.',
    'tees': 'An easy top for off-duty days. Pair it with relaxed trousers or jeans.',
    'denim': 'A washed denim piece with real character. Layer it open over a tee or wear it buttoned up.',
    'trousers': 'Comfortable trousers with an easy, relaxed shape that pair with every shirt on the rack.',
    'jeans': 'Everyday jeans in a versatile wash. Pair with a solid shirt or a statement print.',
}
DETAILS = {
    'designer': ['Embroidered or printed design', 'Full sleeves with button cuffs', 'Classic collar', 'Gentle wash, iron on reverse'],
    'solid': ['Full sleeves with button cuffs', 'Classic collar', 'Curved hem — wear tucked or untucked', 'Machine wash cold, wash dark colours separately'],
    'checks': ['Classic check or stripe pattern', 'Full sleeves with button cuffs', 'Curved hem', 'Machine wash cold'],
    'tees': ['Easy, relaxed fit', 'Ribbed or tipped trims', 'Machine wash cold'],
    'denim': ['Washed finish — every piece is a little different', 'Full sleeves', 'Wash inside out, separately'],
    'trousers': ['Relaxed, comfortable fit', 'Side pockets', 'Machine wash cold'],
    'jeans': ['Five-pocket styling', 'Button and zip fly', 'Wash inside out, separately'],
}

# homepage picks (product ids)
HERO = ['monochrome-floral-print-shirt', 'rust-floral-embroidered-shirt', 'sage-green-oxford-shirt']
RACK = ['plum-embroidered-vine-shirt', 'rust-floral-embroidered-shirt', 'mint-floral-embroidered-shirt', 'red-tartan-check-shirt',
        'monochrome-floral-print-shirt', 'rose-pink-embroidered-shirt', 'brick-red-check-shirt', 'lavender-embroidered-shirt',
        'brown-floral-embroidered-shirt', 'ivory-satin-embroidered-shirt']
RAIL = ['royal-blue-motorsport-zip-polo', 'olive-stripe-long-sleeve-tee', 'sage-green-oxford-shirt', 'cream-motorsport-zip-polo',
        'navy-oxford-shirt', 'brown-stripe-long-sleeve-tee', 'black-tipped-polo', 'wine-solid-shirt', 'sky-blue-oxford-shirt',
        'rust-orange-shirt', 'bottle-green-shirt', 'sand-solid-shirt']
# featured first in "All" (home grid shows the first 8 of each filter)
FEATURED = ['white-floral-hem-shirt', 'brown-statement-embroidered-shirt', 'black-teal-bloom-shirt', 'vintage-wash-denim-shirt',
            'ivory-pleated-trousers', 'grey-flannel-check-shirt', 'brown-motif-print-shirt', 'indigo-straight-jeans']


def inr(n):
    return '₹' + f'{int(n):,}' + '.00'


def write(path, text):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(text)


def side_view(pid):
    """Squash the cut-out sideways and shade it so it reads as a garment seen edge-on."""
    src = os.path.join(IMG, 'cutouts', pid + '.webp')
    out = os.path.join(IMG, 'cutouts', pid + '-side.webp')
    im = Image.open(src).convert('RGBA')
    w, h = im.size
    sw = max(60, int(w * 0.3))
    side = im.resize((sw, h), Image.LANCZOS)
    shade = Image.new('L', (sw, h), 0)
    d = ImageDraw.Draw(shade)
    for x in range(sw):
        t = x / max(1, sw - 1)
        d.line([(x, 0), (x, h)], fill=int(70 * abs(t - 0.35) ** 1.2))
    dark = Image.new('RGBA', (sw, h), (0, 0, 0, 255))
    dark.putalpha(ImageChops.multiply(shade, side.getchannel('A')))
    Image.alpha_composite(side, dark).save(out, 'WEBP', quality=84, method=6)
    return sw, h


def dims(path):
    with Image.open(path) as im:
        return im.size


def hang_rail_bg():
    """A warm studio wall with a soft window light for the shirt rail."""
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="1920" height="1080">'
            '<defs><linearGradient id="w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a3d33"/>'
            '<stop offset=".78" stop-color="#3a2f27"/><stop offset=".78" stop-color="#2c241e"/><stop offset="1" stop-color="#211b16"/></linearGradient>'
            '<radialGradient id="l" cx=".62" cy=".35" r=".55"><stop offset="0" stop-color="#f3dcc0" stop-opacity=".38"/>'
            '<stop offset="1" stop-color="#f3dcc0" stop-opacity="0"/></radialGradient>'
            '<filter id="b"><feGaussianBlur stdDeviation="30"/></filter></defs>'
            '<rect width="1920" height="1080" fill="url(#w)"/><rect width="1920" height="1080" fill="url(#l)"/>'
            '<g filter="url(#b)" opacity=".22" fill="#f6e3cc"><path d="M1040 0 L1380 0 L1180 840 L760 840 Z"/>'
            '<path d="M1460 0 L1640 0 L1420 840 L1220 840 Z"/></g>'
            '<rect y="838" width="1920" height="4" fill="#000" opacity=".25"/></svg>\n')


def build():
    with open(os.path.join(ROOT, '..', 'scripts', 'products.csv'), newline='', encoding='utf-8') as f:
        rows = list(csv.DictReader(f))
    label = {c['id']: c['label'] for c in CATEGORIES}
    catalog = []
    for r in rows:
        pid, cat = r['id'], r['category']
        for kind in ('products', 'cutouts'):
            if not os.path.exists(os.path.join(IMG, kind, pid + '.webp')):
                raise SystemExit(f'missing image {kind}/{pid}.webp — run scripts/prepare-images.py first')
        bottoms = cat in ('trousers', 'jeans')
        sizes = WAIST_SIZES if bottoms else TOP_SIZES
        catalog.append({
            'id': pid, 'name': r['name'], 'type': 'apparel', 'category': cat, 'categoryLabel': label[cat],
            'price': inr(r['price']), 'badge': r['badge'] or None, 'tone': TONES[cat],
            'images': [f'assets/img/cutouts/{pid}.webp', f'assets/img/products/{pid}.webp'],
            'description': DESC[cat], 'details': DETAILS[cat],
            'options': [{'name': 'Size', 'label': 'Waist' if bottoms else 'Size', 'values': sizes}],
            'variants': [{'id': f'{pid}-{s.lower()}', 'av': True, 'price': inr(r['price']), 'opts': [s]} for s in sizes],
        })
    order = {pid: i for i, pid in enumerate(FEATURED)}
    catalog.sort(key=lambda p: order.get(p['id'], len(order)))

    js = ('/* Generated by scripts/build-catalog.py from scripts/products.csv — edit the CSV and re-run. */\n'
          'window.CATALOG = ' + json.dumps(catalog, indent=2, ensure_ascii=False) + ';\n'
          'window.CATEGORIES = ' + json.dumps(CATEGORIES, indent=2, ensure_ascii=False) + ';\n')
    write(os.path.join(ROOT, 'assets', 'data', 'catalog.js'), js)
    write(os.path.join(IMG, 'hang-rail-bg.svg'), hang_rail_bg())

    by_id = {p['id']: p for p in catalog}
    sides = {pid: side_view(pid) for pid in set(RACK + RAIL)}
    blocks = {
        'rack': '\n'.join(rack_html(by_id[i], sides[i]) for i in RACK),
        'hang-rail': json_script('data-hr-json', [rail_item(by_id[i], sides[i]) for i in RAIL]),
    }
    index = os.path.join(ROOT, 'index.html')
    with open(index, encoding='utf-8') as fh:
        html = fh.read()
    for name, content in blocks.items():
        pat = re.compile(r'(<!-- build:%s -->)(.*?)(<!-- /build:%s -->)' % (name, name), re.S)
        if not pat.search(html):
            raise SystemExit(f'marker build:{name} not found in index.html')
        html = pat.sub(lambda m_: m_.group(1) + '\n' + content + '\n' + m_.group(3), html)
    write(index, html)
    print(f'Built {len(catalog)} products; {len(sides)} side views.')


def json_script(attr, data):
    return f'    <script type="application/json" {attr}>\n' + json.dumps(data, indent=2, ensure_ascii=False) + '\n    </script>'


def opts_json(p):
    return json.dumps({'options': p['options'], 'variants': p['variants']}, ensure_ascii=False)


def rack_html(p, side):
    cut = f'assets/img/cutouts/{p["id"]}'
    fw, fh = dims(os.path.join(IMG, 'cutouts', p['id'] + '.webp'))
    tag = p['price'].replace('.00', '')
    return f'''        <div
          class="sagar-item"
          data-sagar-item
          role="button"
          tabindex="0"
          aria-label="{p['name']}"
          data-block-id="{p['id']}"
          data-name="{p['name']}"
          data-price="{p['price']}"
          data-btn-label="View product"
          data-btn-url="product.html?id={p['id']}"
          data-btn-target="_self"
        >
          <div class="sagar-garment">
            <div class="sagar-view" data-sagar-pos="0">
              <img src="{cut}-side.webp" width="{side[0]}" height="{side[1]}" alt="{p['name']} - side" loading="eager" decoding="async">
            </div>
            <div class="sagar-view" data-sagar-pos="1">
              <img src="{cut}.webp" data-hi="{cut}.webp" width="{fw}" height="{fh}" alt="{p['name']} - front" loading="eager" decoding="async">
            </div>
            <div class="sagar-view" data-sagar-pos="-1">
              <img data-hi="assets/img/products/{p['id']}.webp" width="{fw}" height="{fh}" alt="{p['name']} - photo" decoding="async">
            </div>
          </div>
          <div class="sagar-tag sagar-tag-single" aria-hidden="true">
            <div class="sagar-tag-inner">
              <span class="sagar-tag-face sagar-tag-front">{tag}</span>
            </div>
          </div>
          <script type="application/json" data-sagar-json>{opts_json(p)}</script>
        </div>'''


def rail_item(p, side):
    cut = f'assets/img/cutouts/{p["id"]}'
    fw, fh = dims(os.path.join(IMG, 'cutouts', p['id'] + '.webp'))
    return {'name': p['name'], 'price': p['price'], 'tag': p['price'].replace('.00', ''), 'url': f'product.html?id={p["id"]}',
            'side': {'src': f'{cut}-side.webp', 'w': side[0], 'h': side[1]},
            'front': {'src': f'{cut}.webp', 'w': fw, 'h': fh},
            'back': {'src': f'assets/img/products/{p["id"]}.webp', 'w': fw, 'h': fh},
            'options': p['options'], 'variants': p['variants']}


if __name__ == '__main__':
    build()
