/* ChicOut store theme: menu, predictive search, AJAX cart drawer and product form. */
(function () {
  'use strict';
  var T = window.theme || { routes: {}, strings: {} };
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return [].slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  function formatMoney(cents) {
    var format = T.moneyFormat || '₹{{amount}}';
    function delimit(n, precision, thousands, decimal) {
      var parts = (n / 100).toFixed(precision).split('.');
      return parts[0].replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1' + thousands) + (parts[1] ? decimal + parts[1] : '');
    }
    return format.replace(/\{\{\s*(\w+)\s*\}\}/, function (m, key) {
      switch (key) {
        case 'amount_no_decimals': return delimit(cents, 0, ',', '.');
        case 'amount_with_comma_separator': return delimit(cents, 2, '.', ',');
        case 'amount_no_decimals_with_comma_separator': return delimit(cents, 0, '.', ',');
        default: return delimit(cents, 2, ',', '.');
      }
    });
  }

  /* ---------- drawers ---------- */
  function setState(cls, on) {
    document.documentElement.classList.toggle(cls, on);
    document.body.style.overflow = on ? 'hidden' : '';
  }
  function closeAll() { ['menu-open', 'search-open', 'cart-open'].forEach(function (c) { setState(c, false); }); }

  document.addEventListener('click', function (e) {
    var t = e.target;
    if (t.closest('[data-menu-open]')) setState('menu-open', true);
    else if (t.closest('[data-menu-close]') || t.closest('[data-overlay]') || t.closest('[data-search-close]') || t.closest('[data-cart-close]')) closeAll();
    else if (t.closest('[data-search-open]')) { e.preventDefault(); setState('search-open', true); setTimeout(function () { var q = $('#Search-Input'); if (q) q.focus(); }, 50); }
    else if (t.closest('[data-cart-open]') && !document.body.classList.contains('template-cart')) { e.preventDefault(); openCart(); }
    if (!t.closest('.header__nav details')) $$('.header__nav details').forEach(function (d) { d.open = false; });
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeAll(); });
  $$('.header__nav details').forEach(function (d) {
    d.addEventListener('toggle', function () { if (d.open) $$('.header__nav details').forEach(function (o) { if (o !== d) o.open = false; }); });
  });

  /* ---------- predictive search ---------- */
  var q = $('#Search-Input'), out = $('[data-search-results]'), timer;
  if (q && out) q.addEventListener('input', function () {
    clearTimeout(timer);
    var v = q.value.trim();
    if (v.length < 2) { out.innerHTML = ''; return; }
    timer = setTimeout(function () {
      fetch(T.routes.predictiveSearch + '.json?q=' + encodeURIComponent(v) + '&resources[type]=product&resources[limit]=8')
        .then(function (r) { return r.json(); })
        .then(function (data) {
          var list = (data.resources && data.resources.results && data.resources.results.products) || [];
          out.innerHTML = list.length ? list.map(function (p) {
            return '<a class="search-result" href="' + esc(p.url) + '">' + (p.image ? '<img src="' + esc(p.image) + '" alt="" loading="lazy">' : '') +
              '<span>' + esc(p.title) + '<br><span class="muted">' + formatMoney(Math.round(parseFloat(p.price) * 100)) + '</span></span></a>';
          }).join('') + '<p><a class="link" href="' + T.routes.search + '?q=' + encodeURIComponent(v) + '&type=product">View all results</a></p>' : '<p class="muted">' + esc(T.strings.noResults) + '</p>';
        })
        .catch(function () { out.innerHTML = ''; });
    }, 200);
  });

  /* ---------- cart ---------- */
  function getCart() { return fetch(T.routes.cart + '.js', { headers: { Accept: 'application/json' } }).then(function (r) { return r.json(); }); }
  function setCount(n) { $$('[data-cart-count]').forEach(function (el) { el.textContent = n || ''; el.setAttribute('data-count', n); }); }
  function renderDrawer(cart) {
    setCount(cart.item_count);
    var items = $('[data-cart-items]'), foot = $('[data-cart-foot]');
    if (!items) return;
    if (!cart.item_count) {
      items.innerHTML = '<div class="cart-empty"><p>' + esc(T.strings.cartEmpty) + '</p><a class="button" href="' + T.routes.root + 'collections/all">' + esc(T.strings.continue) + '</a></div>';
      foot.innerHTML = '';
      return;
    }
    items.innerHTML = cart.items.map(function (it, i) {
      var opts = (it.options_with_values || []).filter(function (o) { return o.value !== 'Default Title'; }).map(function (o) { return esc(o.name) + ': ' + esc(o.value); }).join(' · ');
      return '<div class="cart-line" data-line="' + (i + 1) + '">' +
        '<a href="' + esc(it.url) + '">' + (it.image ? '<img src="' + esc(it.image) + '" alt="" loading="lazy">' : '') + '</a>' +
        '<div><a class="cart-line__title" href="' + esc(it.url) + '">' + esc(it.product_title) + '</a><p class="cart-line__meta">' + opts + '</p>' +
        '<div class="quantity"><button type="button" data-line-step="-1" aria-label="-">−</button><input type="number" min="0" value="' + it.quantity + '" aria-label="Quantity"><button type="button" data-line-step="1" aria-label="+">+</button></div>' +
        '<button type="button" class="cart-line__remove" data-line-remove>' + esc(T.strings.remove) + '</button></div>' +
        '<div>' + formatMoney(it.final_line_price) + '</div></div>';
    }).join('');
    foot.innerHTML = '<div class="cart-subtotal"><span>' + esc(T.strings.subtotal) + '</span><span>' + formatMoney(cart.total_price) + '</span></div>' +
      '<p class="cart-note">' + esc(T.strings.taxes) + '</p>' +
      '<form action="' + T.routes.cart + '" method="post"><button class="button button--full" type="submit" name="checkout">' + esc(T.strings.checkout) + '</button></form>' +
      '<p class="center" style="margin:10px 0 0"><a class="link" href="' + T.routes.cart + '">' + esc(T.strings.viewCart) + '</a></p>';
  }
  function openCart() { getCart().then(renderDrawer); setState('cart-open', true); }
  function changeLine(line, quantity) {
    return fetch(T.routes.cartChange + '.js', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ line: line, quantity: quantity })
    }).then(function (r) { return r.json(); }).then(renderDrawer);
  }
  document.addEventListener('click', function (e) {
    var line = e.target.closest('[data-line]');
    if (!line || !line.closest('.cart-drawer')) return;
    var n = Number(line.getAttribute('data-line')), input = $('input', line), qty = parseInt(input.value, 10) || 0;
    if (e.target.closest('[data-line-step]')) changeLine(n, Math.max(0, qty + Number(e.target.closest('[data-line-step]').getAttribute('data-line-step'))));
    if (e.target.closest('[data-line-remove]')) changeLine(n, 0);
  });
  document.addEventListener('change', function (e) {
    var line = e.target.closest('.cart-drawer [data-line]');
    if (line && e.target.matches('input')) changeLine(Number(line.getAttribute('data-line')), Math.max(0, parseInt(e.target.value, 10) || 0));
  });

  /* ---------- product form ---------- */
  $$('[data-product-form]').forEach(function (form) {
    var btn = $('[data-add]', form), msg = $('[data-form-error]', form);
    $$('[data-qty-step]', form).forEach(function (b) {
      b.addEventListener('click', function () {
        var input = $('[name="quantity"]', form);
        input.value = Math.max(1, (parseInt(input.value, 10) || 1) + Number(b.getAttribute('data-qty-step')));
      });
    });
    $$('input[name="id"]', form).forEach(function (r) {
      r.addEventListener('change', function () {
        var price = r.getAttribute('data-price'), el = document.querySelector('[data-product-price]');
        if (price && el) el.textContent = formatMoney(Number(price));
        btn.disabled = r.hasAttribute('data-sold-out');
      });
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      btn.disabled = true;
      if (msg) msg.textContent = '';
      fetch(T.routes.cartAdd + '.js', { method: 'POST', headers: { Accept: 'application/json' }, body: new FormData(form) })
        .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw j; return j; }); })
        .then(function () { openCart(); })
        .catch(function (err) { if (msg) msg.textContent = (err && err.description) || T.strings.addError; })
        .then(function () { btn.disabled = false; });
    });
  });

  /* ---------- product gallery ---------- */
  $$('[data-thumb]').forEach(function (b) {
    b.addEventListener('click', function () {
      var main = document.querySelector('.product__media-main img');
      if (!main) return;
      main.src = b.getAttribute('data-src');
      main.srcset = b.getAttribute('data-srcset') || '';
      $$('[data-thumb]').forEach(function (x) { x.setAttribute('aria-current', x === b ? 'true' : 'false'); });
    });
  });

  /* ---------- collection sort ---------- */
  $$('[data-sort]').forEach(function (sel) {
    sel.addEventListener('change', function () {
      var u = new URL(location.href);
      u.searchParams.set('sort_by', sel.value);
      u.searchParams.delete('page');
      location.href = u.toString();
    });
  });

  getCart().then(function (c) { setCount(c.item_count); }).catch(function () {});
})();
