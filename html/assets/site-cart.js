/* Site cart — one small API used by every section.
 *
 *   SiteCart.add({ id, quantity, title, variant, price, image }) → Promise
 *
 * Inside a Shopify theme it posts to /cart/add.js and keeps the theme's cart
 * icon in sync. On the static HTML site it keeps the bag in localStorage and
 * drives the bag drawer (see site.js). */
(function () {
  'use strict';
  if (window.SiteCart) return;

  var isShopify = !!(window.Shopify && window.Shopify.routes);
  var root = isShopify ? (window.Shopify.routes.root || '/') : '/';
  var KEY = 'site-cart:v1';
  var currency = document.documentElement.getAttribute('data-currency') || 'USD';

  function money(n) {
    try {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency }).format(n);
    } catch (e) {
      return '$' + Number(n).toFixed(2);
    }
  }
  /* "$149.00" → 149 */
  function parsePrice(p) {
    if (typeof p === 'number') return p;
    var n = parseFloat(String(p || '').replace(/[^0-9.,]/g, '').replace(/,(?=\d{3}\b)/g, '').replace(',', '.'));
    return isNaN(n) ? 0 : n;
  }

  function read() {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; }
  }
  function write(lines) {
    try { localStorage.setItem(KEY, JSON.stringify(lines)); } catch (e) {}
  }
  function snapshot(lines) {
    lines = lines || read();
    var count = 0, total = 0;
    lines.forEach(function (l) { count += l.quantity; total += l.quantity * l.price; });
    return { items: lines, item_count: count, total: total, total_label: money(total) };
  }
  function emit(cart) {
    [].forEach.call(document.querySelectorAll('[data-cart-count]'), function (el) {
      el.textContent = cart.item_count;
      el.hidden = !cart.item_count;
    });
    document.dispatchEvent(new CustomEvent('site:cart', { detail: cart }));
  }

  /* ---------- Shopify ---------- */
  function syncTheme(res) {
    try {
      var html = res && res.sections && res.sections['cart-icon-bubble'];
      var bubble = document.getElementById('cart-icon-bubble');
      if (html && bubble) {
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var src = doc.querySelector('.shopify-section') || doc.body;
        bubble.innerHTML = src.innerHTML;
      }
    } catch (e) {}
    return fetch(root + 'cart.js', { headers: { Accept: 'application/json' } })
      .then(function (r) { return r.json(); })
      .then(function (cart) {
        emit({ items: cart.items, item_count: cart.item_count, total: cart.total_price / 100 });
        try {
          if (typeof window.publish === 'function' && window.PUB_SUB_EVENTS && window.PUB_SUB_EVENTS.cartUpdate) {
            window.publish(window.PUB_SUB_EVENTS.cartUpdate, { source: 'site-cart', cartData: cart });
          }
        } catch (e) {}
        document.dispatchEvent(new CustomEvent('cart:refresh', { detail: cart }));
        return cart;
      })
      .catch(function () {});
  }

  function shopifyAdd(item) {
    return fetch(root + 'cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        items: [{ id: item.id, quantity: item.quantity || 1 }],
        sections: 'cart-icon-bubble',
        sections_url: window.location.pathname
      })
    }).then(function (r) {
      return r.json().then(function (j) {
        if (!r.ok || j.status) throw new Error(j.description || j.message || 'Could not add to cart.');
        syncTheme(j);
        return j;
      });
    });
  }

  /* ---------- static site ---------- */
  function localAdd(item) {
    var lines = read();
    var key = String(item.id || (item.title + '|' + item.variant));
    var line = lines.filter(function (l) { return l.key === key; })[0];
    if (line) line.quantity += item.quantity || 1;
    else {
      lines.push({
        key: key,
        id: item.id || null,
        title: item.title || 'Item',
        variant: item.variant || '',
        price: parsePrice(item.price),
        image: item.image || '',
        quantity: item.quantity || 1
      });
    }
    write(lines);
    var cart = snapshot(lines);
    emit(cart);
    // a short wait so the button's loading state is visible, like a real request
    return new Promise(function (res) { setTimeout(function () { res(cart); }, 450); });
  }

  function setQuantity(key, qty) {
    var lines = read().map(function (l) {
      if (l.key === key) l.quantity = qty;
      return l;
    }).filter(function (l) { return l.quantity > 0; });
    write(lines);
    emit(snapshot(lines));
  }

  window.SiteCart = {
    isShopify: isShopify,
    root: root,
    cartUrl: isShopify ? root + 'cart' : '#cart',
    money: money,
    parsePrice: parsePrice,
    add: function (item) { return isShopify ? shopifyAdd(item) : localAdd(item); },
    get: function () { return snapshot(); },
    setQuantity: setQuantity,
    remove: function (key) { setQuantity(key, 0); },
    open: function () { document.dispatchEvent(new CustomEvent('site:cart-open')); }
  };

  function init() {
    if (!isShopify) emit(snapshot());
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
