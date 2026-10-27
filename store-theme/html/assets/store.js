/* ChicOut store — HTML version.
   Renders the shared header/footer, menu, search, cart drawer (saved in localStorage)
   and the collection / product / cart pages from window.STORE_PRODUCTS (assets/products.js). */
(function () {
  'use strict';

  var STORE = {
    name: 'ChicOut',
    announcement: 'New arrivals are here — shop the latest shirts',
    nav: [
      { label: 'Home', href: 'index.html' },
      { label: 'Shop all', href: 'collection.html' },
      { label: 'Shirts', children: [
        { label: 'Embroidered & printed', href: 'collection.html?c=designer' },
        { label: 'Solid shirts', href: 'collection.html?c=solid' },
        { label: 'Checks & stripes', href: 'collection.html?c=checks' },
        { label: 'Denim & jackets', href: 'collection.html?c=denim' }
      ] },
      { label: 'Tees & polos', href: 'collection.html?c=tees' },
      { label: 'Trousers', href: 'collection.html?c=trousers' },
      { label: 'Jeans', href: 'collection.html?c=jeans' },
      { label: 'Contact', href: 'contact.html' }
    ],
    // contact details — placeholders, replace with the store's real details
    email: 'hello@chicoutstore.in',
    phone: '+91 00000 00000',
    instagram: '#'
  };

  var PRODUCTS = window.STORE_PRODUCTS || [];
  var COLLECTIONS = window.STORE_COLLECTIONS || [];
  var byId = {};
  PRODUCTS.forEach(function (p) { byId[p.id] = p; });

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return [].slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var fmt = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });
  function money(n) { return fmt.format(n); }
  function params() { return new URLSearchParams(location.search); }
  var page = (location.pathname.split('/').pop() || 'index.html').toLowerCase();

  var ICON = {
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>',
    account: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>',
    bag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 8h14l-1 13H6L5 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>',
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 6h18M3 12h18M3 18h18"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none"/></svg>'
  };

  function isCurrent(href) {
    var file = href.split('?')[0].toLowerCase(), q = href.split('?')[1] || '';
    if (file !== page) return false;
    return q ? location.search.replace(/^\?/, '') === q : !params().get('c');
  }

  /* ---------- header + footer ---------- */
  function header() {
    var slot = $('[data-header]');
    if (!slot) return;
    var nav = STORE.nav.map(function (l) {
      if (l.children) {
        return '<li><details><summary>' + esc(l.label) + '</summary><ul class="header__submenu">' + l.children.map(function (c) {
          return '<li><a href="' + esc(c.href) + '"' + (isCurrent(c.href) ? ' aria-current="page"' : '') + '>' + esc(c.label) + '</a></li>';
        }).join('') + '</ul></details></li>';
      }
      return '<li><a href="' + esc(l.href) + '"' + (isCurrent(l.href) ? ' aria-current="page"' : '') + '>' + esc(l.label) + '</a></li>';
    }).join('');
    slot.outerHTML =
      '<a class="skip-link visually-hidden" href="#main">Skip to content</a>' +
      '<div class="announcement">' + esc(STORE.announcement) + '</div>' +
      '<header class="site-header"><div class="page-width header__inner">' +
      '  <button type="button" class="icon-button header__menu-toggle" data-menu-open aria-label="Open menu">' + ICON.menu + '</button>' +
      '  <a class="header__logo" href="index.html">' + esc(STORE.name) + '</a>' +
      '  <nav class="header__nav" aria-label="Main"><button type="button" class="icon-button menu-close" data-menu-close aria-label="Close menu">' + ICON.close + '</button><ul>' + nav + '</ul></nav>' +
      '  <div class="header__icons">' +
      '    <button type="button" class="icon-button" data-search-open aria-label="Search">' + ICON.search + '</button>' +
      '    <a class="icon-button hide-mobile" href="https://chicoutstore.in/account/login" aria-label="Account">' + ICON.account + '</a>' +
      '    <a class="icon-button" href="cart.html" data-cart-open aria-label="Cart">' + ICON.bag + '<span class="cart-count" data-cart-count></span></a>' +
      '  </div>' +
      '</div></header>' +
      '<div class="search-modal" role="dialog" aria-label="Search" aria-modal="true"><div class="page-width">' +
      '  <form class="search-modal__form" action="collection.html" role="search"><label class="visually-hidden" for="search-q">Search</label>' +
      '    <input id="search-q" type="search" name="q" placeholder="Search products" autocomplete="off">' +
      '    <button type="button" class="icon-button" data-search-close aria-label="Close search">' + ICON.close + '</button></form>' +
      '  <div class="search-results" data-search-results></div></div></div>' +
      '<aside class="cart-drawer" aria-label="Cart" aria-hidden="true"><div class="cart-drawer__head"><h2 class="h3">Your cart</h2>' +
      '  <button type="button" class="icon-button" data-cart-close aria-label="Close cart">' + ICON.close + '</button></div>' +
      '  <div class="cart-drawer__items" data-cart-items></div>' +
      '  <div class="cart-drawer__foot" data-cart-foot></div></aside>' +
      '<div class="overlay" data-overlay></div>';
  }

  function footer() {
    var slot = $('[data-footer]');
    if (!slot) return;
    var shop = COLLECTIONS.map(function (c) { return '<li><a href="collection.html?c=' + esc(c.id) + '">' + esc(c.label) + '</a></li>'; }).join('');
    slot.outerHTML =
      '<footer class="site-footer"><div class="page-width"><div class="footer__grid">' +
      '  <div class="footer__brand"><a class="header__logo" href="index.html" style="color:#fff">' + esc(STORE.name) + '</a>' +
      '    <p>Statement shirts, everyday solids, checks, trousers and denim for men.</p>' +
      '    <div class="footer__social"><a href="' + esc(STORE.instagram) + '" aria-label="Instagram">' + ICON.instagram + '</a></div></div>' +
      '  <div><h2>Shop</h2><ul><li><a href="collection.html">Shop all</a></li>' + shop + '</ul></div>' +
      '  <div><h2>Help</h2><ul><li><a href="contact.html">Contact us</a></li>' +
      '    <li><a href="https://chicoutstore.in/policies/shipping-policy">Shipping policy</a></li>' +
      '    <li><a href="https://chicoutstore.in/policies/refund-policy">Refund policy</a></li>' +
      '    <li><a href="https://chicoutstore.in/policies/privacy-policy">Privacy policy</a></li>' +
      '    <li><a href="https://chicoutstore.in/policies/terms-of-service">Terms of service</a></li></ul></div>' +
      '  <div class="footer__newsletter"><h2>Subscribe</h2><p style="margin:0 0 14px;color:#cfcfcf;font-size:15px">New arrivals and offers, straight to your inbox.</p>' +
      '    <form class="newsletter-form" data-newsletter novalidate><label class="visually-hidden" for="footer-email">Email</label>' +
      '      <input id="footer-email" type="email" placeholder="Email" required><button class="button" type="submit">Join</button></form>' +
      '    <p class="form-message" data-form-message></p></div>' +
      '</div><div class="footer__bottom"><span>&copy; ' + new Date().getFullYear() + ' ' + esc(STORE.name) + '</span>' +
      '<span>' + esc(STORE.email) + ' · ' + esc(STORE.phone) + '</span></div></div></footer>';
  }

  /* ---------- drawers: menu, search, cart ---------- */
  function setState(cls, on) {
    document.documentElement.classList.toggle(cls, on);
    document.body.style.overflow = on ? 'hidden' : '';
  }
  function closeAll() { ['menu-open', 'search-open', 'cart-open'].forEach(function (c) { setState(c, false); }); }

  function wireUi() {
    document.addEventListener('click', function (e) {
      var t = e.target;
      if (t.closest('[data-menu-open]')) { setState('menu-open', true); }
      else if (t.closest('[data-menu-close]') || t.closest('[data-overlay]') || t.closest('[data-search-close]') || t.closest('[data-cart-close]')) { closeAll(); }
      else if (t.closest('[data-search-open]')) { setState('search-open', true); setTimeout(function () { $('#search-q').focus(); }, 50); }
      else if (t.closest('[data-cart-open]') && page !== 'cart.html') { e.preventDefault(); openCart(); }
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeAll(); });
    // open one desktop dropdown at a time
    $$('.header__nav details').forEach(function (d) {
      d.addEventListener('toggle', function () { if (d.open) $$('.header__nav details').forEach(function (o) { if (o !== d) o.open = false; }); });
    });
    document.addEventListener('click', function (e) { if (!e.target.closest('.header__nav details')) $$('.header__nav details').forEach(function (d) { d.open = false; }); });

    var q = $('#search-q'), out = $('[data-search-results]');
    if (q) q.addEventListener('input', function () {
      var v = q.value.trim().toLowerCase();
      if (v.length < 2) { out.innerHTML = ''; return; }
      var hits = PRODUCTS.filter(function (p) { return (p.title + ' ' + p.categoryLabel).toLowerCase().indexOf(v) >= 0; }).slice(0, 8);
      out.innerHTML = hits.length ? hits.map(function (p) {
        return '<a class="search-result" href="product.html?id=' + esc(p.id) + '"><img src="' + esc(p.image) + '" alt="" loading="lazy"><span>' + esc(p.title) + '<br><span class="muted">' + money(p.price) + '</span></span></a>';
      }).join('') + '<p><a class="link" href="collection.html?q=' + encodeURIComponent(q.value.trim()) + '">View all results</a></p>' : '<p class="muted">No products found.</p>';
    });

    $$('[data-newsletter]').forEach(function (f) {
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        var input = $('input[type="email"]', f), msg = f.parentNode.querySelector('[data-form-message]');
        var ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value);
        if (msg) { msg.textContent = ok ? 'Thanks for subscribing.' : 'Please enter a valid email.'; msg.className = 'form-message ' + (ok ? 'form-message--success' : 'form-message--error'); }
        if (ok) f.reset();
      });
    });
  }

  /* ---------- cart (localStorage) ---------- */
  var KEY = 'chicout-cart';
  function readCart() { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; } }
  function saveCart(c) { try { localStorage.setItem(KEY, JSON.stringify(c)); } catch (e) { /* storage blocked */ } renderCart(); }
  function cartTotal(c) { return c.reduce(function (s, l) { var p = byId[l.id]; return s + (p ? p.price * l.qty : 0); }, 0); }
  function addToCart(id, size, qty) {
    var c = readCart(), key = id + '|' + size;
    var line = c.filter(function (l) { return l.key === key; })[0];
    if (line) line.qty += qty; else c.push({ key: key, id: id, size: size, qty: qty });
    saveCart(c);
    openCart();
  }
  function setQty(key, qty) {
    var c = readCart().map(function (l) { if (l.key === key) l.qty = qty; return l; }).filter(function (l) { return l.qty > 0; });
    saveCart(c);
  }
  function lineHtml(l) {
    var p = byId[l.id];
    if (!p) return '';
    return '<div class="cart-line" data-key="' + esc(l.key) + '"><a href="product.html?id=' + esc(p.id) + '"><img src="' + esc(p.image) + '" alt=""></a>' +
      '<div><a class="cart-line__title" href="product.html?id=' + esc(p.id) + '">' + esc(p.title) + '</a><p class="cart-line__meta">' + esc(p.optionName) + ': ' + esc(l.size) + '</p>' +
      '<div class="quantity"><button type="button" data-qty="-1" aria-label="Decrease quantity">−</button><input type="number" min="0" value="' + l.qty + '" aria-label="Quantity"><button type="button" data-qty="1" aria-label="Increase quantity">+</button></div>' +
      '<button type="button" class="cart-line__remove" data-remove>Remove</button></div>' +
      '<div>' + money(p.price * l.qty) + '</div></div>';
  }
  function renderCart() {
    var c = readCart();
    var count = c.reduce(function (s, l) { return s + l.qty; }, 0);
    $$('[data-cart-count]').forEach(function (el) { el.textContent = count || ''; el.setAttribute('data-count', count); });
    var items = $('[data-cart-items]'), foot = $('[data-cart-foot]');
    if (items) {
      items.innerHTML = c.length ? c.map(lineHtml).join('') : '<div class="cart-empty"><p>Your cart is empty</p><a class="button" href="collection.html">Continue shopping</a></div>';
      foot.innerHTML = c.length ? '<div class="cart-subtotal"><span>Subtotal</span><span>' + money(cartTotal(c)) + '</span></div><p class="cart-note">Taxes and shipping calculated at checkout.</p>' +
        '<a class="button button--full" href="cart.html">View cart</a>' : '';
    }
    var pageEl = $('[data-cart-page]');
    if (pageEl) renderCartPage(pageEl, c);
  }
  function openCart() { renderCart(); setState('cart-open', true); }
  document.addEventListener('click', function (e) {
    var line = e.target.closest('[data-key]');
    if (!line) return;
    var key = line.getAttribute('data-key'), l = readCart().filter(function (x) { return x.key === key; })[0];
    if (!l) return;
    if (e.target.closest('[data-qty]')) setQty(key, Math.max(0, l.qty + Number(e.target.closest('[data-qty]').getAttribute('data-qty'))));
    if (e.target.closest('[data-remove]')) setQty(key, 0);
  });
  document.addEventListener('change', function (e) {
    var line = e.target.closest('[data-key]');
    if (line && e.target.matches('input[type="number"]')) setQty(line.getAttribute('data-key'), Math.max(0, parseInt(e.target.value, 10) || 0));
  });

  function renderCartPage(el, c) {
    if (!c.length) { el.innerHTML = '<div class="cart-empty"><h1 class="h1">Your cart is empty</h1><p><a class="button" href="collection.html">Continue shopping</a></p></div>'; return; }
    el.innerHTML = '<h1 class="h1" style="margin-bottom:24px">Your cart</h1><table class="cart-page__table"><thead><tr><th>Product</th><th style="text-align:right">Total</th></tr></thead><tbody>' +
      c.map(function (l) {
        var p = byId[l.id]; if (!p) return '';
        return '<tr data-key="' + esc(l.key) + '"><td><div class="cart-line" style="border:0;padding:0;grid-template-columns:96px 1fr"><img src="' + esc(p.image) + '" alt="" style="width:96px">' +
          '<div><a class="cart-line__title" href="product.html?id=' + esc(p.id) + '">' + esc(p.title) + '</a><p class="cart-line__meta">' + money(p.price) + ' · ' + esc(p.optionName) + ': ' + esc(l.size) + '</p>' +
          '<div class="quantity"><button type="button" data-qty="-1" aria-label="Decrease quantity">−</button><input type="number" min="0" value="' + l.qty + '" aria-label="Quantity"><button type="button" data-qty="1" aria-label="Increase quantity">+</button></div>' +
          '<button type="button" class="cart-line__remove" data-remove>Remove</button></div></div></td><td style="text-align:right">' + money(p.price * l.qty) + '</td></tr>';
      }).join('') + '</tbody></table>' +
      '<div class="cart-page__summary"><div class="cart-subtotal"><span>Subtotal</span><span>' + money(cartTotal(c)) + '</span></div><p class="cart-note">Taxes and shipping calculated at checkout.</p>' +
      '<a class="button button--full" href="https://chicoutstore.in/cart">Check out</a></div>';
  }

  /* ---------- product cards ---------- */
  function card(p) {
    return '<li class="card"><a class="card__link" href="product.html?id=' + esc(p.id) + '">' +
      '<div class="card__media">' + (p.badge ? '<span class="card__badge">' + esc(p.badge) + '</span>' : '') +
      '<img src="' + esc(p.image) + '" alt="' + esc(p.title) + '" loading="lazy" width="900" height="1200"></div>' +
      '<div class="card__info"><p class="card__vendor">' + esc(STORE.name) + '</p><h3 class="card__title">' + esc(p.title) + '</h3><div class="price">' + money(p.price) + '</div></div></a></li>';
  }
  function renderGrids() {
    $$('[data-product-grid]').forEach(function (g) {
      var ids = (g.getAttribute('data-ids') || '').split(',').filter(Boolean);
      var cat = g.getAttribute('data-category'), limit = Number(g.getAttribute('data-limit')) || 8;
      var list = ids.length ? ids.map(function (i) { return byId[i]; }).filter(Boolean) : PRODUCTS.filter(function (p) { return !cat || p.category === cat; });
      g.innerHTML = list.slice(0, limit).map(card).join('');
    });
  }

  /* ---------- collection page ---------- */
  function collectionPage() {
    var root = $('[data-collection]');
    if (!root) return;
    var p = params(), cat = p.get('c') || 'all', q = (p.get('q') || '').trim(), sort = p.get('sort') || 'featured';
    var info = COLLECTIONS.filter(function (c) { return c.id === cat; })[0];
    $('[data-collection-title]').textContent = q ? 'Search: “' + q + '”' : (info ? info.label : 'Shop all');
    $('[data-collection-desc]').textContent = q ? '' : (info ? info.blurb : 'Statement shirts, everyday solids, checks, trousers and denim.');
    $('[data-crumb]').textContent = q ? 'Search' : (info ? info.label : 'Shop all');
    document.title = (info ? info.label : q ? 'Search' : 'Shop all') + ' — ChicOut';
    $('[data-pills]').innerHTML = [{ id: 'all', label: 'All' }].concat(COLLECTIONS).map(function (c) {
      return '<a class="pill" href="collection.html' + (c.id === 'all' ? '' : '?c=' + c.id) + '"' + (c.id === cat && !q ? ' aria-current="page"' : '') + '>' + esc(c.label) + '</a>';
    }).join('');
    var sel = $('[data-sort]');
    sel.value = sort;
    sel.addEventListener('change', function () {
      var u = new URL(location.href); u.searchParams.set('sort', sel.value); location.href = u.pathname.split('/').pop() + u.search;
    });
    var list = PRODUCTS.filter(function (x) {
      if (cat !== 'all' && x.category !== cat) return false;
      if (q && (x.title + ' ' + x.categoryLabel).toLowerCase().indexOf(q.toLowerCase()) < 0) return false;
      return true;
    });
    if (sort === 'price-asc') list.sort(function (a, b) { return a.price - b.price; });
    if (sort === 'price-desc') list.sort(function (a, b) { return b.price - a.price; });
    if (sort === 'title-asc') list.sort(function (a, b) { return a.title.localeCompare(b.title); });
    if (sort === 'title-desc') list.sort(function (a, b) { return b.title.localeCompare(a.title); });
    $('[data-product-count]').textContent = list.length + (list.length === 1 ? ' product' : ' products');
    $('[data-grid]').innerHTML = list.map(card).join('');
    $('[data-empty]').hidden = list.length > 0;
  }

  /* ---------- product page ---------- */
  var SIZE_GUIDE = {
    tops: [['Size', 'Chest', 'Length', 'Shoulder'], ['S', '100 cm', '72 cm', '44 cm'], ['M', '106 cm', '74 cm', '46 cm'], ['L', '112 cm', '76 cm', '48 cm'], ['XL', '118 cm', '78 cm', '50 cm'], ['XXL', '124 cm', '80 cm', '52 cm']],
    bottoms: [['Waist size', 'Waist', 'Hip', 'Inseam'], ['28', '71 cm', '92 cm', '76 cm'], ['30', '76 cm', '97 cm', '77 cm'], ['32', '81 cm', '102 cm', '78 cm'], ['34', '86 cm', '107 cm', '79 cm'], ['36', '91 cm', '112 cm', '80 cm']]
  };
  function table(rows) {
    return '<table class="size-table"><tr>' + rows[0].map(function (h) { return '<th>' + h + '</th>'; }).join('') + '</tr>' +
      rows.slice(1).map(function (r) { return '<tr><td>' + r.join('</td><td>') + '</td></tr>'; }).join('') + '</table>';
  }
  function productPage() {
    var root = $('[data-product]');
    if (!root) return;
    var p = byId[params().get('id')] || PRODUCTS[0];
    document.title = p.title + ' — ChicOut';
    $('[data-crumb-cat]').innerHTML = '<a href="collection.html?c=' + esc(p.category) + '">' + esc(p.categoryLabel) + '</a>';
    $('[data-crumb-name]').textContent = p.title;
    $('[data-title]').textContent = p.title;
    $('[data-price]').textContent = money(p.price);
    $('[data-desc]').textContent = p.description;
    $('[data-details]').innerHTML = '<ul>' + p.details.map(function (d) { return '<li>' + esc(d) + '</li>'; }).join('') + '</ul>';
    $('[data-size-guide]').innerHTML = table(p.optionName === 'Waist' ? SIZE_GUIDE.bottoms : SIZE_GUIDE.tops) + '<p class="muted" style="margin-top:10px">Measurements are approximate.</p>';
    var main = $('[data-main-img]');
    main.src = p.image; main.alt = p.title;
    $('[data-option-label]').textContent = p.optionName;
    var sizes = $('[data-sizes]');
    sizes.innerHTML = p.sizes.map(function (s, i) {
      return '<input type="radio" name="size" id="size-' + i + '" value="' + esc(s) + '"' + (i === 0 ? ' checked' : '') + '><label for="size-' + i + '">' + esc(s) + '</label>';
    }).join('');
    var qty = $('[data-qty-input]');
    $$('[data-qty-step]').forEach(function (b) {
      b.addEventListener('click', function () { qty.value = Math.max(1, (parseInt(qty.value, 10) || 1) + Number(b.getAttribute('data-qty-step'))); });
    });
    $('[data-add]').addEventListener('click', function () {
      var s = $('input[name="size"]:checked', sizes);
      addToCart(p.id, s ? s.value : p.sizes[0], Math.max(1, parseInt(qty.value, 10) || 1));
    });
    $('[data-buy]').addEventListener('click', function () {
      var s = $('input[name="size"]:checked', sizes);
      addToCart(p.id, s ? s.value : p.sizes[0], Math.max(1, parseInt(qty.value, 10) || 1));
      location.href = 'cart.html';
    });
    var related = PRODUCTS.filter(function (x) { return x.category === p.category && x.id !== p.id; }).slice(0, 4);
    $('[data-related]').innerHTML = related.map(card).join('');
  }

  /* ---------- contact page ---------- */
  function contactPage() {
    var f = $('[data-contact]');
    if (!f) return;
    $('[data-store-email]').innerHTML = 'Email: <a class="link" href="mailto:' + esc(STORE.email) + '">' + esc(STORE.email) + '</a>';
    $('[data-store-phone]').textContent = 'Phone: ' + STORE.phone;
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var msg = $('[data-contact-message]'), ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.value);
      msg.textContent = ok ? 'Thanks for contacting us. We’ll get back to you as soon as possible.' : 'Please enter a valid email.';
      msg.className = 'form-message ' + (ok ? 'form-message--success' : 'form-message--error');
      if (ok) f.reset();
    });
  }

  header();
  footer();
  contactPage();
  wireUi();
  renderGrids();
  collectionPage();
  productPage();
  renderCart();
})();
