/* Inner pages: shop (filter / sort / search), product page, contact form, accordions, size guide. */
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var CAT = window.CATALOG || [];
  var ICON_ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return [].slice.call((r || document).querySelectorAll(s)); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function params() { return new URLSearchParams(location.search); }
  function price(p) { return window.SiteCart ? window.SiteCart.parsePrice(p.price) : parseFloat(p.price.replace(/[^0-9.]/g, '')); }

  /* ---------- accordion ---------- */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.acc-btn');
    if (!btn) return;
    var item = btn.closest('.acc-item');
    var open = !item.classList.contains('is-open');
    item.classList.toggle('is-open', open);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  /* ================= SHOP ================= */
  function shop(main) {
    var grid = $('[data-shop-grid]', main);
    var countEl = $('[data-shop-count]', main);
    var sortEl = $('[data-shop-sort]', main);
    var title = $('[data-shop-title]', main);
    var queryEl = $('[data-shop-query]', main);
    var empty = $('[data-shop-empty]', main);
    var tabsWrap = $('[data-shop-tabs]', main);
    var bar = $('[data-shop-bar]', main);
    var q = (params().get('q') || '').trim();
    var cat = params().get('c') || 'all';
    var sort = params().get('sort') || 'featured';

    tabsWrap.innerHTML = '<span class="tab-ink" aria-hidden="true"></span>' + (window.CATEGORIES || []).map(function (c) {
      var n = c.id === 'all' ? CAT.length : CAT.filter(function (p) { return p.category === c.id; }).length;
      return '<button type="button" class="tab" data-filter="' + esc(c.id) + '" aria-pressed="' + (c.id === cat) + '">' + esc(c.label) + ' <span class="muted">' + n + '</span></button>';
    }).join('');
    sortEl.value = sort;

    function list() {
      var out = CAT.filter(function (p) {
        if (cat !== 'all' && p.category !== cat) return false;
        if (q && (p.name + ' ' + p.categoryLabel + ' ' + p.description).toLowerCase().indexOf(q.toLowerCase()) < 0) return false;
        return true;
      });
      if (sort === 'price-asc') out.sort(function (a, b) { return price(a) - price(b); });
      if (sort === 'price-desc') out.sort(function (a, b) { return price(b) - price(a); });
      if (sort === 'name') out.sort(function (a, b) { return a.name.localeCompare(b.name); });
      if (sort === 'new') out.sort(function (a, b) { return (b.badge === 'New') - (a.badge === 'New'); });
      return out;
    }
    function sync() {
      var u = new URL(location.href);
      ['c', 'q', 'sort'].forEach(function (k) { u.searchParams.delete(k); });
      if (cat !== 'all') u.searchParams.set('c', cat);
      if (q) u.searchParams.set('q', q);
      if (sort !== 'featured') u.searchParams.set('sort', sort);
      history.replaceState(null, '', u.pathname.split('/').pop() + u.search);
    }
    function render(animate) {
      var items = list();
      var paint = function () {
        grid.innerHTML = items.map(window.ProductCard.html).join('');
      };
      if (animate && window.SiteSections) window.SiteSections.flip(grid, paint); else paint();
      if (!animate && window.SiteMotion) window.SiteMotion.init(grid);
      countEl.textContent = items.length + (items.length === 1 ? ' product' : ' products');
      empty.hidden = items.length > 0;
      queryEl.hidden = !q;
      if (q) queryEl.querySelector('span').textContent = 'Results for “' + q + '”';
      var catInfo = (window.CATEGORIES || []).filter(function (c) { return c.id === cat; })[0] || {};
      var label = catInfo.label;
      var lead = $('[data-shop-lead]', main);
      if (lead && catInfo.blurb && !q) lead.textContent = catInfo.blurb;
      var heading = q ? 'Search' : (cat === 'all' ? 'Shop all' : label);
      if (title.getAttribute('data-current') !== heading) {
        title.setAttribute('data-current', heading);
        var words = heading.split(' ');
        title.innerHTML = words.length > 1 ? esc(words[0]) + ' <em>' + esc(words.slice(1).join(' ')) + '</em>' : '<em>' + esc(heading) + '</em>';
        if (!reduce && title.animate) title.animate([{ opacity: 0, transform: 'translateY(20px)' }, { opacity: 1, transform: 'none' }], { duration: 600, easing: 'cubic-bezier(.22,1,.36,1)' });
      }
      document.title = heading + ' — ' + ((window.BRAND || {}).name || 'Shop');
      sync();
    }

    window.ProductCard.wire(grid, CAT);
    var tabs = window.SiteSections.tabs(tabsWrap, function (f) { cat = f; render(true); });
    sortEl.addEventListener('change', function () { sort = sortEl.value; render(true); });
    queryEl.querySelector('button').addEventListener('click', function () { q = ''; render(true); });
    $('[data-shop-reset]', main).addEventListener('click', function () {
      q = ''; cat = 'all'; sort = 'featured'; sortEl.value = sort;
      tabs.pick(tabs.buttons[0], true);
      render(true);
    });
    $$('.view-toggle button', main).forEach(function (b) {
      b.addEventListener('click', function () {
        $$('.view-toggle button', main).forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        window.SiteSections.flip(grid, function () { grid.classList.toggle('cols-3', b.getAttribute('data-cols') === '3'); });
      });
    });
    window.addEventListener('scroll', function () { bar.classList.toggle('is-stuck', bar.getBoundingClientRect().top <= 70); }, { passive: true });
    render(false);
  }

  /* ================= PRODUCT ================= */
  function product(main) {
    var id = params().get('id');
    var p = CAT.filter(function (x) { return x.id === id; })[0];
    var wrap = $('[data-pdp]', main);
    if (!p) {
      wrap.innerHTML = '<div class="pdp-missing"><h1 class="h2">Product not found</h1><p class="muted">It may have sold out or moved.</p><a class="btn btn-dark" href="shop.html">Back to the shop ' + ICON_ARROW + '</a></div>';
      return;
    }
    document.title = p.name + ' — ' + ((window.BRAND || {}).name || 'Shop');
    $('[data-pdp-crumb-cat]', main).innerHTML = '<a href="shop.html?c=' + esc(p.category) + '">' + esc(p.categoryLabel) + '</a>';
    $('[data-pdp-crumb-name]', main).textContent = p.name;
    main.style.setProperty('--tone', p.tone || '#f1f0ed');

    // gallery
    var mainImg = $('[data-pdp-img]', main), stage = $('[data-pdp-main]', main);
    var thumbs = $('[data-pdp-thumbs]', main), dots = $('[data-pdp-dots]', main);
    var cur = 0;
    if (p.badge) stage.insertAdjacentHTML('afterbegin', '<span class="pc-badge">' + esc(p.badge) + '</span>');
    thumbs.innerHTML = p.images.map(function (src, i) {
      return '<button type="button" class="pdp-thumb" aria-label="Image ' + (i + 1) + '"' + (i ? '' : ' aria-current="true"') + '><img src="' + esc(src) + '" alt=""></button>';
    }).join('');
    dots.innerHTML = p.images.length > 1 ? p.images.map(function (_, i) { return '<button type="button" aria-label="Image ' + (i + 1) + '"' + (i ? '' : ' aria-current="true"') + '></button>'; }).join('') : '';
    function show(i) {
      if (i === cur && mainImg.src) return;
      cur = (i + p.images.length) % p.images.length;
      mainImg.classList.add('is-swap');
      setTimeout(function () {
        mainImg.src = p.images[cur];
        mainImg.alt = p.name;
        mainImg.classList.remove('is-swap');
      }, reduce ? 0 : 220);
      $$('.pdp-thumb', thumbs).forEach(function (t, k) { t.setAttribute('aria-current', k === cur ? 'true' : 'false'); });
      $$('button', dots).forEach(function (t, k) { t.setAttribute('aria-current', k === cur ? 'true' : 'false'); });
    }
    mainImg.src = p.images[0];
    mainImg.alt = p.name;
    $$('.pdp-thumb', thumbs).forEach(function (t, i) {
      t.addEventListener('mouseenter', function () { show(i); });
      t.addEventListener('click', function () { show(i); });
    });
    $$('button', dots).forEach(function (t, i) { t.addEventListener('click', function () { show(i); }); });
    // hover zoom follows the cursor; swipe on touch
    var fine = window.matchMedia('(hover:hover) and (pointer:fine)').matches;
    if (fine) {
      stage.addEventListener('mousemove', function (e) {
        var r = stage.getBoundingClientRect();
        mainImg.style.transformOrigin = ((e.clientX - r.left) / r.width * 100).toFixed(1) + '% ' + ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%';
      });
      stage.addEventListener('click', function () { stage.classList.toggle('is-zoom'); });
      stage.addEventListener('mouseleave', function () { stage.classList.remove('is-zoom'); });
    } else {
      var sx = 0;
      stage.addEventListener('pointerdown', function (e) { sx = e.clientX; });
      stage.addEventListener('pointerup', function (e) { var dx = e.clientX - sx; if (Math.abs(dx) > 40) show(cur + (dx < 0 ? 1 : -1)); });
      var hint = $('.pdp-hint', stage);
      if (hint) hint.textContent = p.images.length > 1 ? 'Swipe for more' : '';
      if (hint && p.images.length < 2) hint.remove();
    }

    // info
    $('[data-pdp-cat]', main).textContent = p.categoryLabel;
    $('[data-pdp-name]', main).textContent = p.name;
    $('[data-pdp-price]', main).textContent = p.price;
    $('[data-pdp-desc]', main).textContent = p.description;
    $('[data-pdp-details]', main).innerHTML = '<ul>' + (p.details || []).map(function (d) { return '<li>' + esc(d) + '</li>'; }).join('') + '</ul>';
    var store = $('[data-pdp-store]', main);
    if (p.storeUrl) store.href = p.storeUrl; else store.remove();

    var opt = p.options && p.options[0];
    var sel = null, qty = 1;
    var optBox = $('[data-pdp-opt]', main), sizes = $('[data-pdp-sizes]', main);
    if (opt && opt.values.length > 1) {
      $('[data-pdp-opt-label]', main).textContent = opt.label || ('Select ' + opt.name.toLowerCase());
      sizes.innerHTML = opt.values.map(function (v) {
        var variant = p.variants.filter(function (x) { return x.opts[0] === v; })[0];
        var na = !variant || !variant.av;
        return '<button type="button" class="pdp-size' + (na ? ' is-na' : '') + '" data-size="' + esc(v) + '" aria-pressed="false"' + (na ? ' aria-disabled="true" title="Sold out"' : '') + '>' + esc(v) + '</button>';
      }).join('');
      sizes.addEventListener('click', function (e) {
        var b = e.target.closest('.pdp-size');
        if (!b || b.classList.contains('is-na')) return;
        sel = b.getAttribute('data-size');
        $$('.pdp-size', sizes).forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        optBox.classList.remove('is-error');
        $('[data-pdp-opt-label]', main).textContent = (opt.label || opt.name) + ': ' + sel;
      });
    } else {
      optBox.remove();
      sel = opt ? opt.values[0] : null;
    }
    var qtyOut = $('[data-qty-out]', main);
    $$('[data-qty-step]', main).forEach(function (b) {
      b.addEventListener('click', function () { qty = Math.max(1, Math.min(9, qty + (+b.getAttribute('data-qty-step')))); qtyOut.textContent = qty; });
    });

    var addBtn = $('[data-pdp-add]', main), msg = $('[data-pdp-msg]', main), busy = false;
    function add() {
      if (busy) return;
      if (opt && opt.values.length > 1 && !sel) {
        optBox.classList.remove('is-error'); void optBox.offsetWidth; optBox.classList.add('is-error');
        msg.textContent = 'Please choose a size.';
        optBox.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
        return;
      }
      var variant = p.variants.filter(function (x) { return !opt || x.opts[0] === sel; })[0];
      busy = true;
      addBtn.disabled = true;
      addBtn.querySelector('span').textContent = 'Adding…';
      window.SiteCart.add({ id: variant.id, quantity: qty, title: p.name, variant: sel, price: variant.price || p.price, image: p.images[0] })
        .then(function () {
          addBtn.classList.add('is-done');
          addBtn.querySelector('span').textContent = 'Added to bag';
          msg.innerHTML = esc(p.name) + (sel ? ', ' + esc(sel) : '') + ' × ' + qty + ' added. <a href="#cart">View bag</a>';
          fly();
          setTimeout(function () { window.SiteCart.open(); }, reduce ? 0 : 900);
          setTimeout(function () { addBtn.classList.remove('is-done'); addBtn.querySelector('span').textContent = 'Add to bag'; }, 2600);
        })
        .catch(function (err) { msg.textContent = (err && err.message) || 'Could not add to bag.'; })
        .then(function () { busy = false; addBtn.disabled = false; });
    }
    function fly() {
      var target = document.querySelector('[data-cart-icon]');
      if (reduce || !target || !mainImg.animate) return;
      var from = mainImg.getBoundingClientRect(), to = target.getBoundingClientRect();
      var f = mainImg.cloneNode();
      f.style.cssText = 'position:fixed;z-index:100000;pointer-events:none;object-fit:contain;margin:0;left:' + from.left + 'px;top:' + from.top + 'px;width:' + from.width + 'px;height:' + from.height + 'px';
      document.body.appendChild(f);
      var dx = to.left + to.width / 2 - (from.left + from.width / 2), dy = to.top + to.height / 2 - (from.top + from.height / 2);
      f.animate([
        { transform: 'none', opacity: 1 },
        { transform: 'translate(' + dx * 0.5 + 'px,' + (dy * 0.5 - 80) + 'px) scale(.35) rotate(-10deg)', opacity: 1, offset: 0.6 },
        { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(.05) rotate(-16deg)', opacity: 0.2 }
      ], { duration: 850, easing: 'cubic-bezier(.5,0,.3,1)' }).onfinish = function () { f.remove(); };
    }
    addBtn.addEventListener('click', add);

    // sticky mobile bar appears once the main button scrolls away
    var sticky = $('[data-pdp-sticky]');
    if (sticky) {
      $('img', sticky).src = p.images[0];
      $('strong', sticky).textContent = p.name;
      $('span', sticky).textContent = p.price;
      $('button', sticky).addEventListener('click', function () {
        if (opt && opt.values.length > 1 && !sel) { optBox.scrollIntoView({ behavior: 'smooth', block: 'center' }); optBox.classList.add('is-error'); return; }
        add();
      });
      // a scroll check (not an observer) so jumps past the button are caught too
      var onStickyScroll = function () { sticky.classList.toggle('is-on', addBtn.getBoundingClientRect().bottom < 0); };
      window.addEventListener('scroll', onStickyScroll, { passive: true });
      onStickyScroll();
    }

    // related: same category first
    var related = CAT.filter(function (x) { return x.id !== p.id; })
      .sort(function (a, b) { return (b.category === p.category) - (a.category === p.category) || (b.type === p.type) - (a.type === p.type); })
      .slice(0, 4);
    var rel = $('[data-pdp-related]', main);
    rel.innerHTML = related.map(window.ProductCard.html).join('');
    window.ProductCard.wire(rel, CAT);

    // size guide
    var sg = $('[data-size-guide]');
    if (sg) {
      $('[data-sg-body]', sg).innerHTML = p.type === 'footwear'
        ? '<table><tr><th>EU</th><th>UK (child)</th><th>Foot length</th><th>Approx. age</th></tr>' + [['19', '3', '11.5 cm', '9–12 months'], ['20', '4', '12.2 cm', '12–18 months'], ['21', '4.5', '12.9 cm', '18–24 months'], ['22', '5', '13.5 cm', '2 years'], ['23', '6', '14.2 cm', '2–3 years'], ['24', '7', '14.8 cm', '3 years']].map(function (r) { return '<tr><td>' + r.join('</td><td>') + '</td></tr>'; }).join('') + '</table>'
        : '<table><tr><th>Size</th><th>Height</th><th>Weight</th><th>Chest</th></tr>' + [['0-3M', '56–62 cm', '3.5–6 kg', '40 cm'], ['3-6M', '62–68 cm', '6–8 kg', '43 cm'], ['6-12M', '68–80 cm', '8–10 kg', '46 cm'], ['12-18M', '80–86 cm', '10–11.5 kg', '48 cm'], ['1-2Y', '80–92 cm', '10–13 kg', '50 cm'], ['2-3Y', '92–98 cm', '13–15 kg', '52 cm'], ['3-4Y', '98–104 cm', '15–17 kg', '54 cm'], ['4-5Y', '104–110 cm', '17–19 kg', '56 cm']].map(function (r) { return '<tr><td>' + r.join('</td><td>') + '</td></tr>'; }).join('') + '</table>';
      $('[data-sg-body]', sg).insertAdjacentHTML('beforeend', '<p class="muted" style="font-size:13px;margin:14px 0 0">Example measurements — replace with your own size chart.</p>');
      function sgOpen(o) { sg.classList.toggle('is-open', o); sg.setAttribute('aria-hidden', o ? 'false' : 'true'); }
      document.addEventListener('click', function (e) {
        if (e.target.closest('[data-sg-open]')) sgOpen(true);
        else if (e.target.closest('[data-sg-close]')) sgOpen(false);
      });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape') sgOpen(false); });
    }
    if (window.SiteMotion) window.SiteMotion.init(main);
  }

  /* ================= CONTACT ================= */
  function contact(main) {
    var B = window.BRAND || {};
    var c = B.contact || {};
    $$('[data-brand]', main).forEach(function (el) {
      var k = el.getAttribute('data-brand');
      if (c[k]) el.textContent = c[k];
      if (k === 'email' && el.closest('a')) el.closest('a').href = 'mailto:' + c.email;
      if (k === 'phone' && el.closest('a')) el.closest('a').href = 'tel:' + String(c.phone).replace(/[^+\d]/g, '');
    });
    var form = $('[data-contact-form]', main);
    if (!form) return;
    var rules = {
      name: function (v) { return v.trim().length > 1 || 'Please enter your name.'; },
      email: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) || 'Please enter a valid email.'; },
      message: function (v) { return v.trim().length > 9 || 'Tell us a little more (10+ characters).'; }
    };
    function check(input) {
      var rule = rules[input.name];
      if (!rule) return true;
      var res = rule(input.value);
      var field = input.closest('.field');
      field.classList.toggle('is-invalid', res !== true);
      field.querySelector('.field-err').textContent = res === true ? '' : res;
      return res === true;
    }
    $$('input, textarea', form).forEach(function (i) {
      i.addEventListener('blur', function () { if (i.value) check(i); });
      i.addEventListener('input', function () { if (i.closest('.field') && i.closest('.field').classList.contains('is-invalid')) check(i); });
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var bad = $$('input[name], textarea[name]', form).filter(function (i) { return !check(i); });
      if (bad.length) { bad[0].focus(); return; }
      var btn = $('button[type="submit"]', form);
      btn.disabled = true;
      btn.querySelector('span').textContent = 'Sending…';
      // Static demo: no server. Hook this up to Formspree, Netlify Forms or Shopify's contact form.
      setTimeout(function () {
        form.hidden = true;
        var done = $('[data-contact-done]', main);
        done.classList.add('is-on');
        done.querySelector('[data-done-name]').textContent = $('input[name="name"]', form).value.trim().split(' ')[0];
      }, 900);
    });
  }

  var main = document.querySelector('[data-page]');
  if (!main) return;
  var kind = main.getAttribute('data-page');
  if (kind === 'shop') shop(main);
  if (kind === 'product') product(main);
  if (kind === 'contact') contact(main);
})();
