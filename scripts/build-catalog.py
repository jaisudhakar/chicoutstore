#!/usr/bin/env python3
"""Build the ChicOut catalog from one product list.

Writes:
  html/assets/data/catalog.js            products + categories for shop, product page, search, grids
  html/assets/img/products/*.svg         front / back / side garment illustrations (with hanger)
  html/assets/img/footwear/*.svg         side-view kids' shoes for the Tiny Steps wheel
  html/assets/img/lifestyle/*.svg        tiles for the "Little moments" strip
  html/assets/img/hang-rail-bg.svg       backdrop for the washing-line section
  html/index.html                        the blocks between <!-- build:NAME --> markers

Edit PRODUCTS / FOOTWEAR below, then run:  python3 scripts/build-catalog.py
The products are sample data; swap in the real catalogue (and real photos) when you have it.
"""
import json
import math
import os
import re

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'html')
IMG = os.path.join(ROOT, 'assets', 'img')

BABY_SIZES = ['0-3M', '3-6M', '6-12M', '12-18M']
KID_SIZES = ['1-2Y', '2-3Y', '3-4Y', '4-5Y']
SHOE_SIZES = ['19', '20', '21', '22', '23', '24']

CATEGORIES = [
    {'id': 'all', 'label': 'All', 'blurb': 'Soft, comfy outfits and first shoes for babies, toddlers and little kids.'},
    {'id': 'baby', 'label': 'Baby', 'blurb': 'Rompers, jhablas and gift sets in gentle cotton for 0–24 months.'},
    {'id': 'boys', 'label': 'Boys', 'blurb': 'Play-ready sets, dungarees and party suits for little boys.'},
    {'id': 'girls', 'label': 'Girls', 'blurb': 'Frocks, kurti sets and party dresses for little girls.'},
    {'id': 'nightwear', 'label': 'Nightwear', 'blurb': 'Night suits and pyjamas for cosy, easy bedtimes.'},
    {'id': 'footwear', 'label': 'Footwear', 'blurb': 'Booties, sandals and first walkers for tiny feet.'},
]

# kind = garment shape; main/second/trim = colours; pattern = print on the main piece
PRODUCTS = [
    dict(id='truck-tee-shorts-set', name='Truck Print Tee & Shorts Set', category='boys', price=599, badge='New',
         tone='#fff1d6', kind='tee-shorts', main='#f6c445', second='#2f4b7c', trim='#ffffff', pattern=None, motif='truck',
         desc='A sunny cotton tee with a little red truck, paired with soft elasticated shorts. Easy on, easy play.',
         details=['100% breathable cotton', 'Elasticated waist, no buttons', 'Soft print that stays bright', 'Machine wash cold']),
    dict(id='star-footed-night-suit', name='Star Print Footed Night Suit', category='nightwear', price=399, badge='Bestseller',
         tone='#e6eefb', kind='sleepsuit', main='#a9c4ef', second='#f7f3ea', trim='#ffffff', pattern='stars', motif='moon',
         desc='A snug footed sleepsuit scattered with stars. Front snaps make night-time changes quick and calm.',
         details=['Soft interlock cotton', 'Snap opening from neck to leg', 'Covered feet keep toes warm', 'Machine wash cold']),
    dict(id='christmas-romper-hat', name='Christmas Romper with Hat', category='baby', price=749, badge='Festive',
         tone='#fde4e1', kind='romper', main='#d9443f', second='#ffffff', trim='#2e7d5b', pattern=None, motif='tree',
         desc='A cheerful festive romper with a stitched Christmas tree and a matching pom-pom hat for photos.',
         details=['Cotton-rich jersey', 'Bottom snaps for easy changing', 'Matching knit hat included', 'Gentle machine wash']),
    dict(id='suspender-party-suit', name='4-Piece Suspender Party Suit', category='boys', price=1499, badge=None,
         tone='#e8ecf6', kind='suit', main='#ffffff', second='#24345c', trim='#d9443f', pattern=None, motif=None,
         desc='Shirt, shorts, suspenders and bow tie — a smart little set for birthdays, weddings and festive days.',
         details=['Shirt, shorts, suspenders and bow tie', 'Adjustable clip-on suspenders', 'Soft cotton-blend shirt', 'Hand wash recommended']),
    dict(id='floral-kurti-pant-set', name='Floral Kurti & Pant Set', category='girls', price=899, badge='New',
         tone='#fde6ee', kind='kurta', main='#f29bb7', second='#fbf3e4', trim='#f6c445', pattern='floral', motif=None,
         desc='A breezy printed kurti with a golden border and comfy straight pants — made for festivals and family visits.',
         details=['Pure cotton kurti and pants', 'Contrast golden border', 'Elasticated pants waist', 'Machine wash cold, inside out']),
    dict(id='smocked-cotton-frock', name='Smocked Cotton Frock', category='girls', price=799, badge=None,
         tone='#efe7fb', kind='frock', main='#c3a6ec', second='#ffffff', trim='#ffffff', pattern='dots', motif=None,
         desc='A twirly polka-dot frock with puff sleeves, a smocked waist and a soft frill at the hem.',
         details=['Lightweight cotton poplin', 'Smocked, stretchy waist', 'Puff sleeves and frill hem', 'Machine wash cold']),
    dict(id='denim-dungaree-tee-set', name='Denim Dungaree & Tee Set', category='boys', price=999, badge=None,
         tone='#e3edf7', kind='dungaree', main='#5b86c5', second='#ffffff', trim='#e8553f', pattern=None, motif=None,
         desc='Soft washed dungarees with a striped tee underneath. Snap straps and roomy pockets for treasures.',
         details=['Soft washed cotton denim', 'Striped cotton tee included', 'Adjustable snap straps', 'Machine wash cold']),
    dict(id='teddy-hooded-jacket', name='Teddy Ear Hooded Jacket', category='baby', price=1199, badge='New',
         tone='#f4e9dc', kind='jacket', main='#c99a6b', second='#f3e3cf', trim='#8a5a35', pattern=None, motif=None,
         desc='A cosy zip-up jacket with teddy ears on the hood, ribbed cuffs and two little pockets.',
         details=['Brushed fleece lining', 'Hood with teddy ears', 'Easy front zip with chin guard', 'Machine wash cold']),
    dict(id='cotton-jhabla-pack-3', name='Cotton Jhabla — Pack of 3', category='baby', price=549, badge='Value pack',
         tone='#e2f4ec', kind='jhabla', main='#8fd1b5', second='#ffffff', trim='#ffffff', pattern='checks', motif=None,
         desc='Classic soft-cotton jhablas with front ties. Three gentle prints for everyday comfort in warm weather.',
         details=['Pack of 3 jhablas', 'Pure, pre-washed cotton', 'Front tie closure, no snaps', 'Machine wash cold']),
    dict(id='rainbow-pyjama-set', name='Rainbow Pyjama Set', category='nightwear', price=649, badge=None,
         tone='#fff0e8', kind='pyjama', main='#ffd9c7', second='#f4a38c', trim='#ffffff', pattern=None, motif='rainbow',
         desc='A long-sleeve top and pyjama bottoms with a happy rainbow. Soft enough for the sleepiest nights.',
         details=['Soft cotton jersey', 'Ribbed cuffs and ankles', 'Elasticated waist', 'Machine wash cold']),
    dict(id='tulle-party-dress', name='Tulle Party Dress', category='girls', price=1299, badge='Party',
         tone='#ffe9e0', kind='frock', main='#f7b9a4', second='#fff4ee', trim='#ffffff', pattern='sparkle', motif=None,
         desc='A sparkly layered tulle dress with puffed sleeves and a satin bow — made for birthday twirls.',
         details=['Layered tulle skirt', 'Soft cotton lining', 'Satin bow at the waist', 'Hand wash recommended']),
    dict(id='newborn-gift-set', name='Newborn Gift Set (5 pcs)', category='baby', price=1099, badge='Gift',
         tone='#fff7d9', kind='romper', main='#fbe7a1', second='#ffffff', trim='#f29a3a', pattern='hearts', motif='duck',
         desc='Romper, cap, mittens, booties and bib in a keepsake box — a sweet welcome for a new little one.',
         details=['Romper, cap, mittens, booties and bib', 'Soft organic-feel cotton', 'Gift box included', 'Machine wash cold']),
]

FOOTWEAR = [
    dict(id='light-up-velcro-sneakers', name='Light-Up Velcro Sneakers', price=899, style='sneaker', main='#ffffff', second='#ff6f61', sole='#ffd34d', badge='New'),
    dict(id='knit-baby-booties', name='Knit Baby Booties', price=449, style='bootie', main='#f3e9d9', second='#8fd1b5', sole='#e7d8c2', badge=None),
    dict(id='strappy-summer-sandals', name='Strappy Summer Sandals', price=599, style='sandal', main='#d9a46b', second='#f6c445', sole='#8a5a35', badge=None),
    dict(id='bow-mary-janes', name='Bow Mary Janes', price=699, style='maryjane', main='#f29bb7', second='#ffffff', sole='#f7e6ec', badge='Party'),
    dict(id='rainy-day-clogs', name='Rainy Day Clogs', price=499, style='clog', main='#f6c445', second='#2f4b7c', sole='#2f4b7c', badge=None),
    dict(id='first-walker-shoes', name='First Walker Shoes', price=749, style='hightop', main='#2f4b7c', second='#ffffff', sole='#f3ece1', badge='Bestseller'),
]

SOLD_OUT = {('truck-tee-shorts-set', '4-5Y'), ('tulle-party-dress', '1-2Y'), ('bow-mary-janes', '24')}


# ---------------------------------------------------------------- helpers
def inr(n, decimals=True):
    s = f'{n:,}'
    return '₹' + s + ('.00' if decimals else '')


def shade(hex_color, amt):
    """amt < 0 darkens, > 0 lightens."""
    h = hex_color.lstrip('#')
    r, g, b = (int(h[i:i + 2], 16) for i in (0, 2, 4))
    if amt < 0:
        r, g, b = (int(c * (1 + amt)) for c in (r, g, b))
    else:
        r, g, b = (int(c + (255 - c) * amt) for c in (r, g, b))
    return '#%02x%02x%02x' % (r, g, b)


def is_light(hex_color):
    h = hex_color.lstrip('#')
    r, g, b = (int(h[i:i + 2], 16) for i in (0, 2, 4))
    return (0.299 * r + 0.587 * g + 0.114 * b) > 200


def rounded(points, r=14):
    """Closed path through points with softly rounded corners."""
    n = len(points)
    out = []
    for i in range(n):
        p0, p1, p2 = points[i - 1], points[i], points[(i + 1) % n]
        def toward(a, b, d):
            dx, dy = b[0] - a[0], b[1] - a[1]
            L = math.hypot(dx, dy) or 1
            d = min(d, L / 2.2)
            return (a[0] + dx / L * d, a[1] + dy / L * d)
        a = toward(p1, p0, r)
        b = toward(p1, p2, r)
        out.append(('M' if i == 0 else 'L') + f'{a[0]:.1f} {a[1]:.1f} Q{p1[0]:.1f} {p1[1]:.1f} {b[0]:.1f} {b[1]:.1f}')
    return ' '.join(out) + ' Z'


def mirror(right, cx=300):
    """right = points from the top centre, clockwise down the right side, ending at the bottom centre."""
    left = [(2 * cx - x, y) for x, y in reversed(right[1:-1])]
    return right + left


def sym(right, r=14, cx=300):
    return rounded(mirror(right, cx), r)


class Svg:
    """Collects defs + body for one illustration; every id is prefixed so tiles can embed several."""

    def __init__(self, prefix):
        self.p = prefix
        self.defs = []
        self.body = []
        self._pat = {}
        self.defs.append(
            f'<linearGradient id="{prefix}sh" x1="0" y1="0" x2="1" y2="0">'
            '<stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/>'
            '<stop offset=".7" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".12"/></linearGradient>')

    def pattern(self, kind, base):
        if not kind:
            return None
        key = kind + base
        if key in self._pat:
            return self._pat[key]
        pid = f'{self.p}pt{len(self._pat)}'
        ink = '#ffffff' if not is_light(base) else shade(base, -0.28)
        if kind == 'dots':
            inner = f'<circle cx="9" cy="9" r="4.5" fill="#fff" opacity=".9"/><circle cx="27" cy="27" r="4.5" fill="#fff" opacity=".9"/>'
            size = 36
        elif kind == 'stars':
            star = star_path(0, 0, 7, 3)
            inner = f'<path d="{star}" transform="translate(12 12)" fill="#fff" opacity=".9"/><path d="{star}" transform="translate(36 38) scale(.7)" fill="#fff6c9"/>'
            size = 48
        elif kind == 'checks':
            inner = f'<rect width="14" height="28" fill="#fff" opacity=".35"/><rect width="28" height="14" fill="#fff" opacity=".35"/>'
            size = 28
        elif kind == 'floral':
            petals = ''.join(f'<circle cx="{14 + 6 * math.cos(a):.1f}" cy="{14 + 6 * math.sin(a):.1f}" r="4.6" fill="#fff" opacity=".85"/>'
                             for a in [i * 2 * math.pi / 5 for i in range(5)])
            inner = petals + '<circle cx="14" cy="14" r="3.2" fill="#f6c445"/>' \
                + '<path d="M40 40 q6 -8 12 0 q-6 8 -12 0z" fill="#7cc4a0" opacity=".9"/>'
            size = 56
        elif kind == 'hearts':
            inner = f'<path d="{heart_path(14, 14, 7)}" fill="{shade(base, -0.18)}" opacity=".55"/><path d="{heart_path(36, 36, 5)}" fill="#fff" opacity=".9"/>'
            size = 46
        elif kind == 'sparkle':
            s = star_path(0, 0, 4, 1.4, 4)
            inner = f'<path d="{s}" transform="translate(10 10)" fill="#fff"/><path d="{s}" transform="translate(30 28) scale(.7)" fill="#fff" opacity=".8"/>'
            size = 40
        else:
            return None
        self.defs.append(f'<pattern id="{pid}" width="{size}" height="{size}" patternUnits="userSpaceOnUse">{inner}</pattern>')
        self._pat[key] = pid
        return pid

    def piece(self, d, color, pattern=None, outline=True, shade_it=True):
        stroke = f' stroke="{shade(color, -0.16)}" stroke-width="2.5" stroke-linejoin="round"' if outline else ''
        self.body.append(f'<path d="{d}" fill="{color}"{stroke}/>')
        pid = self.pattern(pattern, color)
        if pid:
            self.body.append(f'<path d="{d}" fill="url(#{pid})"/>')
        if shade_it:
            self.body.append(f'<path d="{d}" fill="url(#{self.p}sh)"/>')

    def add(self, s):
        self.body.append(s)

    def render(self, w, h, vw=None, vh=None):
        vw, vh = vw or w, vh or h
        return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {vw} {vh}" width="{w}" height="{h}">'
                f'<defs>{"".join(self.defs)}</defs>{"".join(self.body)}</svg>\n')


def star_path(cx, cy, R, r, n=5):
    pts = []
    for i in range(2 * n):
        a = -math.pi / 2 + i * math.pi / n
        rad = R if i % 2 == 0 else r
        pts.append(f'{cx + rad * math.cos(a):.1f} {cy + rad * math.sin(a):.1f}')
    return 'M' + ' L'.join(pts) + ' Z'


def heart_path(cx, cy, s):
    return (f'M{cx} {cy + s * .9} C{cx - s * 1.6} {cy - s * .1} {cx - s * .9} {cy - s * 1.3} {cx} {cy - s * .45} '
            f'C{cx + s * .9} {cy - s * 1.3} {cx + s * 1.6} {cy - s * .1} {cx} {cy + s * .9} Z')


def stitch(d, color='#ffffff', op=.55):
    return f'<path d="{d}" fill="none" stroke="{color}" stroke-opacity="{op}" stroke-width="2" stroke-dasharray="7 6" stroke-linecap="round"/>'


# ---------------------------------------------------------------- garments (600 x 800, hanger at top)
def hook(svg, cx=300, top=28):
    svg.add(f'<path d="M{cx} 104 L{cx} {top + 44} Q{cx} {top} {cx + 24} {top} Q{cx + 48} {top} {cx + 48} {top + 22} '
            f'Q{cx + 48} {top + 38} {cx + 32} {top + 42}" fill="none" stroke="#b7aea3" stroke-width="7" stroke-linecap="round"/>')
    svg.add(f'<path d="M{cx} 104 L{cx} {top + 44} Q{cx} {top} {cx + 24} {top}" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="2" stroke-linecap="round" transform="translate(-2 0)"/>')


def tee_right(hem, long_sleeve=False):
    if long_sleeve:
        return [(300, 142), (330, 118), (394, 130), (440, 188), (474, 330), (436, 342), (404, 232), (402, hem), (300, hem)]
    return [(300, 142), (330, 118), (394, 130), (458, 198), (426, 232), (402, 208), (402, hem), (300, hem)]


def neckband(svg, color, y=118):
    svg.add(f'<path d="M270 {y} Q300 {y + 30} 330 {y}" fill="none" stroke="{color}" stroke-width="9" stroke-linecap="round"/>')


def stripes_overlay(svg, d, color, y0, y1, step=26):
    cid = f'{svg.p}clip{len(svg.defs)}'
    svg.defs.append(f'<clipPath id="{cid}"><path d="{d}"/></clipPath>')
    bands = ''.join(f'<rect x="100" y="{y}" width="400" height="12" fill="{color}"/>' for y in range(y0, y1, step))
    svg.add(f'<g clip-path="url(#{cid})">{bands}</g>')


def draw_motif(svg, kind, cx, cy, p):
    t = p['trim']
    if kind == 'truck':
        svg.add(f'<g transform="translate({cx - 52} {cy - 30})">'
                '<rect x="0" y="6" width="66" height="40" rx="7" fill="#e8553f"/>'
                '<path d="M66 18 L90 18 Q100 18 104 30 L106 46 L66 46 Z" fill="#e8553f"/>'
                '<rect x="74" y="23" width="18" height="12" rx="3" fill="#cfe6f5"/>'
                '<circle cx="22" cy="50" r="10" fill="#2b2b28"/><circle cx="22" cy="50" r="4" fill="#fff"/>'
                '<circle cx="86" cy="50" r="10" fill="#2b2b28"/><circle cx="86" cy="50" r="4" fill="#fff"/>'
                '<rect x="8" y="14" width="20" height="5" rx="2.5" fill="#fff" opacity=".7"/></g>')
    elif kind == 'moon':
        svg.add(f'<path d="M{cx + 10} {cy - 34} A34 34 0 1 0 {cx + 26} {cy + 22} A28 28 0 1 1 {cx + 10} {cy - 34} Z" fill="#fff4c2"/>')
    elif kind == 'tree':
        svg.add(f'<g transform="translate({cx} {cy - 44})">'
                '<path d="M0 0 L26 30 L14 30 L34 56 L18 56 L40 84 L-40 84 L-18 56 L-34 56 L-14 30 L-26 30 Z" fill="#2e7d5b"/>'
                '<rect x="-7" y="84" width="14" height="14" fill="#8a5a35"/>'
                f'<path d="{star_path(0, -4, 11, 5)}" fill="#f6c445"/>'
                '<circle cx="-12" cy="46" r="4" fill="#f6c445"/><circle cx="14" cy="64" r="4" fill="#fff"/><circle cx="-20" cy="74" r="4" fill="#fff"/>'
                '</g>')
    elif kind == 'rainbow':
        cols = ['#e8553f', '#f6c445', '#8fd1b5', '#5b86c5']
        arcs = ''.join(f'<path d="M{cx - 54 + i * 12} {cy + 22} A{54 - i * 12} {54 - i * 12} 0 0 1 {cx + 54 - i * 12} {cy + 22}" '
                       f'fill="none" stroke="{c}" stroke-width="11" stroke-linecap="round"/>' for i, c in enumerate(cols))
        svg.add(arcs + f'<ellipse cx="{cx - 52}" cy="{cy + 26}" rx="20" ry="11" fill="#fff"/><ellipse cx="{cx + 52}" cy="{cy + 26}" rx="20" ry="11" fill="#fff"/>')
    elif kind == 'duck':
        svg.add(f'<g transform="translate({cx} {cy})">'
                '<ellipse cx="4" cy="14" rx="36" ry="24" fill="#f6c445"/><circle cx="-18" cy="-14" r="20" fill="#f6c445"/>'
                '<path d="M-38 -12 L-54 -6 L-38 -2 Z" fill="#f29a3a"/><circle cx="-22" cy="-18" r="3.5" fill="#2b2b28"/>'
                '<path d="M8 6 Q24 0 30 16" fill="none" stroke="#e0a92a" stroke-width="4" stroke-linecap="round"/></g>')


def draw_garment(svg, p, view):
    kind, m, s, t, pat = p['kind'], p['main'], p['second'], p['trim'], p.get('pattern')
    front = view == 'front'
    hook(svg)

    if kind == 'tee-shorts':
        sh = rounded(mirror([(300, 346), (398, 346), (416, 468), (318, 468), (300, 410)]), 10)
        svg.piece(sh, s)
        svg.add(stitch('M206 360 L394 360'))
        if front:
            svg.add('<path d="M300 352 L300 384" stroke="#fff" stroke-opacity=".5" stroke-width="2"/>')
        tee = sym(tee_right(352))
        svg.piece(tee, m, pat)
        neckband(svg, shade(m, -0.12))
        svg.add(stitch('M202 336 L398 336') + stitch('M410 214 L440 226') + stitch('M190 214 L160 226'))
        if front:
            draw_motif(svg, p['motif'], 300, 236, p)

    elif kind == 'sleepsuit':
        d = sym([(300, 142), (330, 118), (392, 132), (438, 186), (474, 330), (438, 342), (404, 236), (406, 420), (412, 628),
                 (406, 690), (314, 690), (306, 478), (300, 462)])
        svg.piece(d, m, pat)
        for x0, x1 in ((316, 404), (196, 284)):
            svg.piece(rounded([(x0, 628), (x1 + 6, 628), (x1, 690), (x0 + 2, 690)], 16), s, outline=False)
        svg.piece(rounded([(436, 324), (474, 330), (470, 346), (438, 342)], 6), s, outline=False, shade_it=False)
        svg.piece(rounded([(164, 324), (126, 330), (130, 346), (162, 342)], 6), s, outline=False, shade_it=False)
        neckband(svg, s)
        if front:
            svg.add('<path d="M300 142 L300 462" stroke="#fff" stroke-opacity=".6" stroke-width="3"/>')
            svg.add(''.join(f'<circle cx="300" cy="{y}" r="5" fill="#fff"/>' for y in range(180, 460, 46)))
            draw_motif(svg, p['motif'], 360, 224, p)
        else:
            svg.add(stitch('M206 420 Q300 440 394 420'))

    elif kind == 'romper':
        d = sym([(300, 142), (330, 118), (392, 132), (446, 192), (414, 224), (396, 206), (404, 330), (420, 432), (322, 448), (300, 430)])
        svg.piece(d, m, pat)
        svg.add(stitch('M222 196 L206 214') + stitch('M378 196 L394 214'))
        neckband(svg, t if t != '#ffffff' else shade(m, -0.12))
        svg.add(f'<path d="M188 424 L278 440" stroke="{s}" stroke-width="9" stroke-linecap="round"/><path d="M412 424 L322 440" stroke="{s}" stroke-width="9" stroke-linecap="round"/>')
        if front:
            svg.add(''.join(f'<circle cx="{x}" cy="436" r="4.5" fill="{shade(m, -0.25)}"/>' for x in (286, 300, 314)))
            draw_motif(svg, p['motif'], 300, 270, p)
            if p['id'] == 'christmas-romper-hat':
                # matching pom-pom hat hung on the hook
                svg.add('<path d="M326 64 Q352 18 392 36 L376 80 Z" fill="#d9443f" stroke="#a92f2c" stroke-width="2"/>'
                        '<rect x="318" y="72" width="66" height="18" rx="9" fill="#fff" transform="rotate(12 351 81)"/>'
                        '<circle cx="396" cy="34" r="12" fill="#fff"/>')

    elif kind == 'suit':
        shorts = rounded(mirror([(300, 326), (398, 326), (414, 456), (318, 456), (300, 398)]), 10)
        shirt = sym(tee_right(340))
        svg.piece(shirt, m)
        svg.piece(shorts, s)
        svg.add(stitch('M206 340 L394 340', '#fff', .35))
        # suspenders
        for x0, x1 in ((236, 262), (364, 338)):
            svg.add(f'<path d="M{x0} 330 L{x1} 132" stroke="{shade(s, -0.1)}" stroke-width="16" stroke-linecap="round"/>')
            svg.add(f'<rect x="{x0 - 10}" y="318" width="20" height="16" rx="3" fill="#d6d2c8"/>')
        # collar + bow tie
        svg.add(f'<path d="M268 118 L300 146 L282 162 Z" fill="#fff" stroke="{shade(m, -0.2)}" stroke-width="2"/>'
                f'<path d="M332 118 L300 146 L318 162 Z" fill="#fff" stroke="{shade(m, -0.2)}" stroke-width="2"/>')
        if front:
            svg.add(f'<path d="M262 132 L300 148 L262 166 Z M338 132 L300 148 L338 166 Z" fill="{t}"/><circle cx="300" cy="148" r="9" fill="{shade(t, -0.15)}"/>')
            svg.add(''.join(f'<circle cx="300" cy="{y}" r="4.5" fill="#d6d2c8"/>' for y in (190, 236, 282)))

    elif kind == 'kurta':
        pants = rounded(mirror([(300, 470), (378, 470), (372, 700), (316, 700), (300, 560)]), 10)
        svg.piece(pants, s)
        svg.add(stitch('M232 680 L292 680', shade(s, -0.3), .5) + stitch('M308 680 L368 680', shade(s, -0.3), .5))
        d = sym([(300, 140), (326, 118), (392, 130), (452, 262), (418, 278), (392, 214), (398, 522), (300, 522)])
        svg.piece(d, m, pat)
        # golden border at hem and sleeves
        svg.add(f'<path d="M204 498 L396 498" stroke="{t}" stroke-width="22"/>'
                f'<path d="M204 498 L396 498" stroke="#fff" stroke-opacity=".6" stroke-width="2" stroke-dasharray="3 7"/>'
                f'<path d="M418 276 L452 260" stroke="{t}" stroke-width="12" stroke-linecap="round"/>'
                f'<path d="M182 276 L148 260" stroke="{t}" stroke-width="12" stroke-linecap="round"/>')
        neckband(svg, t)
        if front:
            svg.add(f'<path d="M300 140 L300 218" stroke="{t}" stroke-width="6" stroke-linecap="round"/>'
                    + ''.join(f'<circle cx="{300 + dx}" cy="{y}" r="3.5" fill="{t}"/>' for dx, y in ((-16, 150), (16, 150), (-14, 176), (14, 176), (-12, 202), (12, 202))))

    elif kind == 'frock':
        # puff sleeves behind the bodice
        for cx in (222, 378):
            svg.piece(f'M{cx - 46} 150 Q{cx} 104 {cx + 46} 150 Q{cx + 40} 196 {cx} 194 Q{cx - 40} 196 {cx - 46} 150 Z', m, pat)
            svg.add(f'<path d="M{cx - 34} 186 Q{cx} 200 {cx + 34} 186" fill="none" stroke="{s}" stroke-width="6" stroke-linecap="round"/>')
        d = sym([(300, 140), (328, 118), (370, 126), (382, 250), (376, 268), (470, 548), (300, 556)], 18)
        svg.piece(d, m, pat)
        # smocking / waist band
        svg.add(f'<path d="M222 256 Q300 270 378 256 L382 282 Q300 296 218 282 Z" fill="{shade(m, -0.1)}"/>')
        svg.add(''.join(f'<path d="M{x} 262 l6 8 l6 -8 l6 8" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="2"/>' for x in range(228, 372, 24)))
        # frill
        frill = ' '.join(f'M{x} 548 a14 14 0 0 0 28 0' for x in range(132, 468, 28))
        svg.add(f'<path d="{frill}" fill="{s}" stroke="{shade(s, -0.1)}" stroke-width="2"/>')
        neckband(svg, s)
        if front:
            if p['id'] == 'tulle-party-dress':
                svg.add(f'<g transform="translate(300 272)"><path d="M0 0 L-44 -20 Q-52 0 -44 20 Z M0 0 L44 -20 Q52 0 44 20 Z" fill="{shade(m, -0.18)}"/>'
                        f'<path d="M-4 4 L-24 52 M4 4 L24 52" stroke="{shade(m, -0.18)}" stroke-width="9" stroke-linecap="round"/><circle r="10" fill="{shade(m, -0.28)}"/></g>')
            else:
                svg.add(''.join(f'<circle cx="300" cy="{y}" r="5" fill="#fff"/>' for y in (162, 196, 230)))

    elif kind == 'dungaree':
        tee = sym(tee_right(330))
        svg.piece(tee, s)
        stripes_overlay(svg, tee, t, 150, 330)
        neckband(svg, t)
        d = sym([(300, 214), (352, 214), (356, 300), (404, 306), (416, 600), (318, 600), (300, 430)], 12)
        svg.piece(d, m)
        for x0, x1 in ((252, 228), (348, 372)):
            svg.add(f'<path d="M{x0} 222 L{x1} 132" stroke="{m}" stroke-width="20" stroke-linecap="round"/>'
                    f'<path d="M{x0} 222 L{x1} 132" stroke="#fff" stroke-opacity=".45" stroke-width="2" stroke-dasharray="6 6"/>')
        svg.add(stitch('M256 232 L344 232 L346 296') + stitch('M254 232 L254 296') + stitch('M318 588 L410 588') + stitch('M190 588 L282 588'))
        if front:
            svg.add('<circle cx="256" cy="226" r="8" fill="#f6c445"/><circle cx="344" cy="226" r="8" fill="#f6c445"/>')
            svg.add(f'<rect x="270" y="244" width="60" height="44" rx="10" fill="{shade(m, -0.08)}" stroke="#fff" stroke-opacity=".5" stroke-dasharray="5 5"/>')

    elif kind == 'jacket':
        hood = 'M226 136 Q226 64 300 64 Q374 64 374 136 Z'
        if front:
            svg.add(f'<circle cx="236" cy="78" r="22" fill="{t}"/><circle cx="364" cy="78" r="22" fill="{t}"/>'
                    f'<circle cx="236" cy="78" r="11" fill="{s}"/><circle cx="364" cy="78" r="11" fill="{s}"/>')
            svg.piece(hood, shade(m, -0.08))
            svg.add(f'<path d="M244 136 Q244 92 300 92 Q356 92 356 136 Z" fill="{s}"/>')
        d = sym([(300, 140), (332, 118), (398, 130), (446, 190), (482, 376), (442, 388), (408, 240), (410, 444), (300, 444)])
        svg.piece(d, m)
        for cx in (194, 406):
            pass
        svg.add(f'<path d="M444 372 L482 366 L484 384 L446 392 Z M156 372 L118 366 L116 384 L154 392 Z" fill="{t}"/>')
        svg.add(f'<rect x="196" y="420" width="208" height="24" rx="6" fill="{t}"/>')
        if front:
            svg.add('<path d="M300 140 L300 420" stroke="#d6d2c8" stroke-width="7"/><path d="M300 140 L300 420" stroke="#9c958a" stroke-width="2" stroke-dasharray="3 3"/>')
            svg.add('<rect x="294" y="150" width="12" height="22" rx="3" fill="#d6d2c8"/>')
            svg.add(f'<path d="M218 330 Q250 318 278 330 L276 404 L222 404 Z M382 330 Q350 318 322 330 L324 404 L378 404 Z" fill="{shade(m, -0.08)}"/>')
        else:
            svg.piece(hood, shade(m, -0.08))
            svg.add(f'<circle cx="236" cy="78" r="22" fill="{t}"/><circle cx="364" cy="78" r="22" fill="{t}"/>')
            svg.add(stitch('M300 70 L300 136'))

    elif kind == 'jhabla':
        d = sym([(300, 152), (322, 120), (370, 126), (384, 160), (396, 196), (404, 392), (300, 392)], 16)
        svg.piece(d, m, pat)
        svg.add(f'<path d="M268 122 Q300 156 332 122" fill="none" stroke="{shade(m, -0.15)}" stroke-width="8" stroke-linecap="round"/>')
        svg.add(stitch('M200 378 L400 378') + stitch('M386 166 Q376 196 396 204') + stitch('M214 166 Q224 196 204 204'))
        if front:
            svg.add(f'<path d="M300 158 L300 392" stroke="{shade(m, -0.15)}" stroke-width="2"/>'
                    f'<path d="M300 196 q-26 6 -30 30 M300 196 q26 6 30 30 M300 256 q-26 6 -30 30 M300 256 q26 6 30 30" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round"/>')

    elif kind == 'pyjama':
        pants = rounded(mirror([(300, 320), (392, 320), (394, 690), (316, 690), (300, 446)]), 12)
        svg.piece(pants, s)
        svg.add(f'<rect x="206" y="320" width="188" height="20" rx="6" fill="{shade(s, -0.1)}"/>')
        svg.add(f'<path d="M318 676 L394 676 M206 676 L282 676" stroke="{shade(s, -0.12)}" stroke-width="16"/>')
        tee = sym(tee_right(334, long_sleeve=True))
        svg.piece(tee, m, pat)
        svg.add(f'<path d="M436 326 L474 330 L472 344 L438 340 Z M164 326 L126 330 L128 344 L162 340 Z" fill="{s}"/>')
        neckband(svg, s)
        if front:
            draw_motif(svg, p['motif'], 300, 222, p)

    if not front:
        # little care label in the back neck
        svg.add('<rect x="288" y="124" width="24" height="16" rx="2" fill="#fff" stroke="#e2dbd0"/>')


def side_view(svg, p):
    """A slim edge-on silhouette (220 x 800)."""
    kind, m, s = p['kind'], p['main'], p['second']
    svg.add('<path d="M110 104 L110 54 Q110 30 118 28" fill="none" stroke="#b7aea3" stroke-width="7" stroke-linecap="round"/>')
    top = [(110, 112), (132, 124), (140, 150)]
    if kind in ('frock',):
        d = rounded(top + [(138, 266), (176, 548), (110, 556), (44, 548), (82, 266), (80, 150), (88, 124)], 16)
        svg.piece(d, m, p.get('pattern'))
        svg.add(f'<path d="M46 548 Q110 568 174 548" fill="none" stroke="{s}" stroke-width="12" stroke-linecap="round"/>')
        return
    bottoms = {'tee-shorts': (352, 468, s), 'romper': (440, None, m), 'sleepsuit': (690, None, m), 'suit': (340, 456, s),
               'kurta': (522, 700, s), 'dungaree': (330, 600, m), 'jacket': (444, None, m), 'jhabla': (392, None, m),
               'pyjama': (334, 690, s)}
    y1, y2, c2 = bottoms[kind]
    if y2:
        svg.piece(rounded([(110, y1 - 12), (138, y1 - 12), (144, y2), (76, y2), (82, y1 - 12)], 10), c2)
    upper = m if kind not in ('suit', 'dungaree') else (m if kind == 'suit' else s)
    svg.piece(rounded(top + [(146, y1), (74, y1), (80, 150), (88, 124)], 12), upper, p.get('pattern'))
    if kind == 'dungaree':
        svg.piece(rounded([(84, 216), (136, 216), (144, 600), (76, 600)], 10), m)


def write(path, text):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(text)


# ---------------------------------------------------------------- footwear (420 x 230)
def draw_shoe(svg, f):
    m, s, sole = f['main'], f['second'], f['sole']
    st = f['style']
    svg.add('<ellipse cx="210" cy="206" rx="170" ry="10" fill="#000" opacity=".08"/>')
    sole_d = 'M44 168 Q40 196 80 196 L344 196 Q392 196 388 160 L384 150 L48 156 Z'
    if st == 'bootie':
        svg.piece('M70 164 Q60 60 110 46 L196 40 Q214 92 250 104 Q332 116 368 136 Q392 150 384 168 Z', m)
        svg.add(f'<rect x="96" y="28" width="112" height="34" rx="14" fill="{s}"/>' +
                ''.join(f'<path d="M{x} 32 L{x} 58" stroke="#fff" stroke-opacity=".5" stroke-width="3" stroke-linecap="round"/>' for x in range(110, 200, 14)))
        svg.add(f'<circle cx="300" cy="118" r="16" fill="{s}"/><circle cx="300" cy="118" r="7" fill="#fff" opacity=".6"/>')
        svg.piece('M60 166 Q58 186 84 186 L350 186 Q386 186 384 164 Z', sole, shade_it=False)
        return
    svg.piece(sole_d, sole, shade_it=False)
    if st == 'sandal':
        svg.piece('M48 156 L384 150 Q388 140 372 136 L60 140 Q46 144 48 156 Z', shade(m, -0.15), shade_it=False)
        for d in ('M250 142 Q270 84 330 104 L346 140', 'M150 144 Q176 86 236 98 L254 142', 'M70 146 Q60 96 104 84 Q120 90 128 146'):
            svg.add(f'<path d="{d}" fill="none" stroke="{m}" stroke-width="20" stroke-linecap="round"/>')
        svg.add(f'<circle cx="112" cy="104" r="9" fill="{s}"/><path d="{star_path(300, 106, 16, 7)}" fill="{s}"/>')
        return
    if st == 'clog':
        svg.piece('M58 154 Q48 92 112 84 Q200 74 300 84 Q384 96 384 152 Z', m)
        svg.add(''.join(f'<circle cx="{x}" cy="{y}" r="7" fill="{shade(m, -0.3)}"/>' for x, y in ((250, 104), (282, 100), (314, 106), (266, 126), (298, 126), (330, 128))))
        svg.add(f'<path d="M96 120 Q70 120 70 150" fill="none" stroke="{s}" stroke-width="12" stroke-linecap="round"/><circle cx="104" cy="118" r="10" fill="{s}"/>')
        return
    if st == 'maryjane':
        svg.piece('M58 156 Q52 112 96 102 Q130 128 176 116 Q250 106 330 118 Q384 128 384 152 Z', m)
        svg.add(f'<path d="M110 106 Q150 70 196 86" fill="none" stroke="{shade(m, -0.15)}" stroke-width="14" stroke-linecap="round"/>'
                f'<circle cx="196" cy="88" r="8" fill="{s}"/>')
        svg.add(f'<path d="M300 116 L274 100 Q268 116 274 130 Z M300 116 L326 100 Q332 116 326 130 Z" fill="{s}"/><circle cx="300" cy="116" r="7" fill="{shade(m, -0.2)}"/>')
        return
    # sneaker / hightop
    if st == 'hightop':
        svg.piece('M56 156 Q46 60 96 40 L170 36 Q190 92 236 98 Q320 108 364 128 Q390 142 384 154 Z', m)
        svg.add(''.join(f'<path d="M{150 + i * 18} {70 + i * 9} L{186 + i * 18} {60 + i * 12}" stroke="{s}" stroke-width="6" stroke-linecap="round"/>' for i in range(4)))
        svg.add(f'<circle cx="104" cy="106" r="18" fill="{s}"/><path d="{star_path(104, 106, 12, 5)}" fill="{m}"/>')
    else:
        svg.piece('M56 156 Q42 64 100 52 L156 50 Q180 92 222 90 Q306 96 360 122 Q392 138 384 156 Z', m)
        svg.add(f'<path d="M70 58 Q112 40 156 50" fill="none" stroke="{shade(m, -0.3)}" stroke-width="8" stroke-linecap="round"/>')
        svg.add(f'<path d="M58 70 Q46 112 58 152 L84 152 Q74 112 86 66 Z" fill="{s}"/>')
        svg.add(f'<path d="M286 104 Q350 110 380 136 L384 156 L300 156 Q280 130 286 104 Z" fill="{shade(s, 0.55)}" stroke="{shade(s, 0.2)}" stroke-width="2"/>')
        svg.add(f'<rect x="150" y="76" width="104" height="22" rx="11" fill="{s}" transform="rotate(10 202 87)"/>'
                f'<rect x="166" y="108" width="104" height="22" rx="11" fill="{s}" transform="rotate(10 218 119)"/>')
        svg.add(f'<path d="{star_path(120, 110, 16, 7)}" fill="{sole}"/>')
    # light strip / toe bumper
    svg.add(f'<path d="M60 172 L380 166" stroke="#fff" stroke-opacity=".7" stroke-width="4" stroke-dasharray="14 10" stroke-linecap="round"/>')


# ---------------------------------------------------------------- scenes
def lifestyle_tile(i, title, sub, colors, product):
    svg = Svg(f't{i}')
    a, b = colors
    svg.defs.append(f'<linearGradient id="t{i}bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="{a}"/><stop offset="1" stop-color="{b}"/></linearGradient>')
    svg.add(f'<rect width="800" height="800" fill="url(#t{i}bg)"/>')
    svg.add('<circle cx="560" cy="250" r="230" fill="#fff" opacity=".35"/>'
            '<circle cx="150" cy="680" r="120" fill="#fff" opacity=".25"/>')
    for k, (x, y) in enumerate(((120, 120), (690, 600), (640, 110))):
        svg.add(f'<path d="{star_path(x, y, 18 - k * 3, 7)}" fill="#fff" opacity=".8"/>')
    inner = Svg(f't{i}g')
    if 'kind' in product:
        draw_garment(inner, product, 'front')
        g = f'<g transform="translate(290 40) scale(.68)">'
    else:
        draw_shoe(inner, product)
        g = f'<g transform="translate(170 200) scale(1.2)">'
    svg.defs.extend(inner.defs)
    svg.add(g + ''.join(inner.body) + '</g>')
    svg.add(f'<text x="60" y="640" font-family="Fredoka, \'Arial Rounded MT Bold\', Nunito, Arial, sans-serif" font-size="78" font-weight="700" fill="#2a2238">{title}</text>')
    svg.add(f'<text x="64" y="700" font-family="Nunito, Arial, sans-serif" font-size="30" font-weight="600" fill="#2a2238" opacity=".7">{sub}</text>')
    return svg.render(800, 800)


def hang_rail_bg():
    svg = Svg('hb')
    svg.defs.append('<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bfe3f2"/>'
                    '<stop offset=".62" stop-color="#fdf1e3"/><stop offset="1" stop-color="#ffe2cf"/></linearGradient>')
    svg.add('<rect width="1920" height="1080" fill="url(#sky)"/>')
    svg.add('<circle cx="1520" cy="230" r="120" fill="#ffe18a"/><circle cx="1520" cy="230" r="170" fill="#ffe18a" opacity=".3"/>')
    for cx, cy, sc in ((300, 220, 1), (980, 150, .8), (1700, 420, .7), (620, 420, .6)):
        svg.add(f'<g transform="translate({cx} {cy}) scale({sc})" fill="#fff" opacity=".9"><ellipse cx="0" cy="0" rx="120" ry="44"/>'
                '<circle cx="-50" cy="-24" r="50"/><circle cx="30" cy="-40" r="64"/><circle cx="90" cy="-10" r="40"/></g>')
    svg.add('<path d="M0 820 Q380 700 820 790 Q1260 880 1920 730 L1920 1080 L0 1080 Z" fill="#bfe0b7"/>')
    svg.add('<path d="M0 900 Q520 800 1060 890 Q1500 960 1920 860 L1920 1080 L0 1080 Z" fill="#9fd19b"/>')
    svg.add('<path d="M0 990 Q600 930 1200 990 Q1600 1030 1920 980 L1920 1080 L0 1080 Z" fill="#86c288"/>')
    for x, y, c in ((220, 940, '#f29bb7'), (420, 1000, '#f6c445'), (1300, 960, '#fff'), (1600, 1010, '#c3a6ec'), (900, 1010, '#f29bb7')):
        svg.add(''.join(f'<circle cx="{x + 9 * math.cos(a):.0f}" cy="{y + 9 * math.sin(a):.0f}" r="8" fill="{c}"/>' for a in [k * 1.2566 for k in range(5)])
                + f'<circle cx="{x}" cy="{y}" r="6" fill="#f6c445"/>')
    return svg.render(1920, 1080)


# ---------------------------------------------------------------- data
def variants_for(pid, sizes, price):
    return [{'id': f'{pid}-{sz.lower()}', 'av': (pid, sz) not in SOLD_OUT, 'price': inr(price), 'opts': [sz]} for sz in sizes]


def build():
    cat_label = {c['id']: c['label'] for c in CATEGORIES}
    catalog = []
    for i, p in enumerate(PRODUCTS):
        for view in ('front', 'back', 'side'):
            svg = Svg(f'g{i}{view[0]}')
            if view == 'side':
                side_view(svg, p)
                write(os.path.join(IMG, 'products', f'{p["id"]}-side.svg'), svg.render(220, 800))
            else:
                draw_garment(svg, p, view)
                write(os.path.join(IMG, 'products', f'{p["id"]}-{view}.svg'), svg.render(600, 800))
        sizes = BABY_SIZES if p['category'] == 'baby' else KID_SIZES
        catalog.append({
            'id': p['id'], 'name': p['name'], 'type': 'clothing', 'category': p['category'],
            'categoryLabel': cat_label[p['category']], 'price': inr(p['price']), 'badge': p['badge'], 'tone': p['tone'],
            'images': [f'assets/img/products/{p["id"]}-front.svg', f'assets/img/products/{p["id"]}-back.svg'],
            'description': p['desc'], 'details': p['details'],
            'options': [{'name': 'Size', 'label': 'Age', 'values': sizes}],
            'variants': variants_for(p['id'], sizes, p['price']),
        })
    tones = ['#fff1e8', '#e8f5ef', '#fff7d9', '#fde6ee', '#fff7d9', '#e6eefb']
    for i, f in enumerate(FOOTWEAR):
        svg = Svg(f's{i}')
        draw_shoe(svg, f)
        write(os.path.join(IMG, 'footwear', f'{f["id"]}.svg'), svg.render(840, 460, 420, 230))
        catalog.append({
            'id': f['id'], 'name': f['name'], 'type': 'footwear', 'category': 'footwear', 'categoryLabel': 'Footwear',
            'price': inr(f['price']), 'badge': f['badge'], 'tone': tones[i],
            'images': [f'assets/img/footwear/{f["id"]}.svg'],
            'description': f'Soft, flexible {f["name"].lower()} with a cushioned insole and a grippy sole for little explorers.',
            'details': ['Flexible, non-slip sole', 'Cushioned insole', 'Easy on and off', 'Wipe clean'],
            'options': [{'name': 'Size', 'label': 'EU size', 'values': SHOE_SIZES}],
            'variants': variants_for(f['id'], SHOE_SIZES, f['price']),
        })

    by_id = {p['id']: p for p in PRODUCTS}
    tiles = [('Play all day', 'Sets made for running around', ('#ffe9a8', '#ffc9a8'), by_id['truck-tee-shorts-set']),
             ('Sweet dreams', 'Soft nightwear for cosy nights', ('#cfe0fb', '#e6d8fb'), by_id['star-footed-night-suit']),
             ('Party ready', 'Dresses and suits for big days', ('#ffd6e4', '#ffe5d6'), by_id['tulle-party-dress']),
             ('Tiny steps', 'First shoes for little feet', ('#d4f0e3', '#fff1c9'), FOOTWEAR[0])]
    for i, (t, sub, cols, prod) in enumerate(tiles, 1):
        write(os.path.join(IMG, 'lifestyle', f'moment-{i}.svg'), lifestyle_tile(i, t, sub, cols, prod))
    write(os.path.join(IMG, 'hang-rail-bg.svg'), hang_rail_bg())

    js = ('/* Generated by scripts/build-catalog.py — edit the product list there and re-run.\n'
          '   Sample products and illustrations; replace with the real catalogue and photos. */\n'
          'window.CATALOG = ' + json.dumps(catalog, indent=2, ensure_ascii=False) + ';\n'
          'window.CATEGORIES = ' + json.dumps(CATEGORIES, indent=2, ensure_ascii=False) + ';\n')
    write(os.path.join(ROOT, 'assets', 'data', 'catalog.js'), js)

    cat_by_id = {c['id']: c for c in catalog}
    blocks = {
        'rack': rack_html([cat_by_id[i] for i in ('truck-tee-shorts-set', 'smocked-cotton-frock', 'christmas-romper-hat', 'denim-dungaree-tee-set',
                                                    'floral-kurti-pant-set', 'teddy-hooded-jacket', 'star-footed-night-suit', 'tulle-party-dress',
                                                    'suspender-party-suit', 'rainbow-pyjama-set')]),
        'hang-rail': json_script('data-hr-json', [rail_item(cat_by_id[i]) for i in ('cotton-jhabla-pack-3', 'smocked-cotton-frock', 'truck-tee-shorts-set',
                                                                    'newborn-gift-set', 'floral-kurti-pant-set', 'rainbow-pyjama-set',
                                                                    'christmas-romper-hat', 'denim-dungaree-tee-set')]),
        'orbit': json_script('data-orbit-json', [orbit_item(cat_by_id[f['id']]) for f in FOOTWEAR]),
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
    print(f'Built {len(catalog)} products, {len(PRODUCTS) * 3 + len(FOOTWEAR) + 5} images.')


def json_script(attr, data):
    return f'    <script type="application/json" {attr}>\n' + json.dumps(data, indent=2, ensure_ascii=False) + '\n    </script>'


def opts_json(p):
    return json.dumps({'options': p['options'], 'variants': p['variants']}, ensure_ascii=False)


def rack_html(items):
    out = []
    for p in items:
        base = f'assets/img/products/{p["id"]}'
        tag = p['price'].replace('.00', '')
        out.append(f'''        <div
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
              <img src="{base}-side.svg" width="220" height="800" alt="{p['name']} - side" loading="eager" decoding="async">
            </div>
            <div class="sagar-view" data-sagar-pos="1">
              <img src="{base}-front.svg" data-hi="{base}-front.svg" width="600" height="800" alt="{p['name']} - front" loading="eager" decoding="async">
            </div>
            <div class="sagar-view" data-sagar-pos="-1">
              <img data-hi="{base}-back.svg" width="600" height="800" alt="{p['name']} - back" decoding="async">
            </div>
          </div>
          <div class="sagar-tag sagar-tag-single" aria-hidden="true">
            <div class="sagar-tag-inner">
              <span class="sagar-tag-face sagar-tag-front">{tag}</span>
            </div>
          </div>
          <script type="application/json" data-sagar-json>{opts_json(p)}</script>
        </div>''')
    return '\n'.join(out)


def rail_item(p):
    base = f'assets/img/products/{p["id"]}'
    return {'name': p['name'], 'price': p['price'], 'tag': p['price'].replace('.00', ''), 'url': f'product.html?id={p["id"]}',
            'side': {'src': f'{base}-side.svg', 'w': 220, 'h': 800},
            'front': {'src': f'{base}-front.svg', 'w': 600, 'h': 800},
            'back': {'src': f'{base}-back.svg', 'w': 600, 'h': 800},
            'options': p['options'], 'variants': p['variants']}


def orbit_item(p):
    return {'name': p['name'], 'price': p['price'], 'url': f'product.html?id={p["id"]}', 'images': p['images'],
            'options': p['options'], 'variants': p['variants']}


if __name__ == '__main__':
    build()
