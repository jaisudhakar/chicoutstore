/* Site shell for the static HTML pages (Shopify themes provide their own):
 * header + footer from brand.js, bag drawer, live search, mobile menu,
 * preloader, page transitions, custom cursor, scroll progress and back-to-top.
 *
 * Load it right after <div data-site-header></div> at the top of <body> so the
 * header paints with the page; the rest wires up on DOMContentLoaded. */
(function () {
  'use strict';
  var B = window.BRAND || {};
  var html = document.documentElement;
  var body = document.body;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia && window.matchMedia('(hover:hover) and (pointer:fine)').matches;
  var page = (location.pathname.split('/').pop() || 'index.html').toLowerCase();

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function ss(key, val) {
    try { if (val === undefined) return sessionStorage.getItem(key); sessionStorage.setItem(key, val); } catch (e) { return null; }
  }
  var ICON = {
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="10.5" cy="12.5" r="6"/><path d="m19 21-4.2-4.2"/><path d="M18 2.5v4M16 4.5h4" stroke-width="1.4"/></svg>',
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="8" r="3.6"/><path d="M5 20c.8-3.6 3.6-5.4 7-5.4s6.2 1.8 7 5.4"/></svg>',
    bag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M5 8h14l-1 12H6L5 8Z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/></svg>',
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M4 8h16M4 16h16"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M6 11l6-6 6 6"/></svg>',
    instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none"/></svg>',
    tiktok: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5"/><path d="M14 3c.4 2.6 2.2 4.4 5 4.6"/></svg>',
    youtube: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><rect x="2.5" y="5.5" width="19" height="13" rx="4"/><path d="m10 9.5 5 2.5-5 2.5z" fill="currentColor"/></svg>'
  };

  function isCurrent(href) {
    var file = href.split('#')[0].split('?')[0].toLowerCase();
    if (file !== page || href.indexOf('#') >= 0) return false;
    // links with a query (shop.html?c=baby) only match that exact filter
    var q = href.split('#')[0].split('?')[1] || '';
    return q ? location.search.replace(/^\?/, '') === q : !/[?&]c=/.test(location.search);
  }
  function logo() {
    return B.logo
      ? '<img src="' + esc(B.logo) + '" alt="' + esc(B.name) + '" width="72" height="24">'
      : '<span class="site-logo-text">' + esc(B.name) + '</span>';
  }

  /* ================= header (synchronous) ================= */
  var headerSlot = document.querySelector('[data-site-header]');
  if (headerSlot) {
    headerSlot.outerHTML =
      '<a class="skip-link" href="#main">Skip to content</a>' +
      '<div class="util-bar"><ul>' + (B.utility || []).map(function (l) {
        return '<li><a href="' + esc(l.href) + '">' + esc(l.label) + '</a></li>';
      }).join('') + '</ul></div>' +
      '<header class="site-header" data-header>' +
      '  <div class="site-header-in">' +
      '    <a class="site-logo" href="index.html" aria-label="' + esc(B.name) + ' home">' + logo() + '</a>' +
      '    <nav class="site-nav" id="site-nav" aria-label="Main">' + (B.nav || []).map(function (l, i) {
        return '<a href="' + esc(l.href) + '" style="--ni:' + i + '"' + (isCurrent(l.href) ? ' aria-current="page"' : '') + '>' + esc(l.label) + '</a>';
      }).join('') +
      '      <div class="site-nav-foot">' + esc((B.contact || {}).email || '') + '</div>' +
      '    </nav>' +
      '    <div class="site-tools">' +
      '      <button type="button" class="site-search" data-search-open aria-label="Search">' + ICON.search + '<span>Search</span></button>' +
      '      <a class="icon-btn hide-sm" href="' + esc((B.storeUrl || '') + '/account') + '" aria-label="Account">' + ICON.user + '</a>' +
      '      <a class="icon-btn" href="#cart" data-cart-icon aria-label="Bag">' + ICON.bag + '<span class="cart-count" data-cart-count hidden>0</span></a>' +
      '      <button class="icon-btn menu-btn" type="button" data-menu-toggle aria-controls="site-nav" aria-expanded="false" aria-label="Menu"><span class="burger"><i></i><i></i></span></button>' +
      '    </div>' +
      '  </div>' +
      '</header>' +
      '<div class="nav-scrim" data-menu-close></div>';
  }

  /* ================= preloader + page transition (synchronous) ================= */
  var usePreloader = body.hasAttribute('data-preloader') && !ss('pl-seen') && !reduce;
  var fromTransition = ss('pt') === '1';
  ss('pt', '0');
  if (usePreloader) {
    html.classList.add('is-loading');
    var pl = document.createElement('div');
    pl.className = 'preloader';
    pl.setAttribute('aria-hidden', 'true');
    pl.innerHTML =
      '<div class="pl-word">' + esc(B.name).split('').map(function (c, i) {
        return '<span style="--ci:' + i + '">' + (c === ' ' ? '&nbsp;' : c) + '</span>';
      }).join('') + '</div>' +
      '<div class="pl-bar"><i></i></div><div class="pl-count">0</div>';
    body.insertBefore(pl, body.firstChild);
  }
  if (fromTransition && !reduce) html.classList.add('pt-in');

  /* ================= everything else ================= */
  function ready() {
    // footer
    var footSlot = document.querySelector('[data-site-footer]');
    if (footSlot) {
      var c = B.contact || {};
      var year = new Date().getFullYear();
      footSlot.outerHTML =
        '<footer class="site-footer">' +
        '  <div class="ft-top">' +
        '    <div class="ft-news">' +
        '      <h2>' + esc((B.newsletter || {}).title || 'Newsletter') + '</h2>' +
        '      <p>' + esc((B.newsletter || {}).text || '') + '</p>' +
        '      <form class="ft-form" data-newsletter novalidate>' +
        '        <label class="visually-hidden" for="ft-email">Email</label>' +
        '        <input id="ft-email" type="email" name="email" placeholder="Email address" autocomplete="email" required>' +
        '        <button type="submit" aria-label="Subscribe">' + ICON.arrow + '</button>' +
        '        <p class="form-msg" aria-live="polite"></p>' +
        '      </form>' +
        '    </div>' +
        (B.footer || []).map(function (col) {
          return '<div class="ft-col"><h3>' + esc(col.title) + '</h3><ul>' + col.links.map(function (l) {
            return '<li><a href="' + esc(l.href) + '">' + esc(l.label) + '</a></li>';
          }).join('') + '</ul></div>';
        }).join('') +
        '  </div>' +
        '  <div class="ft-mid">' +
        '    <div class="ft-social">' + (B.social || []).map(function (s) {
          return '<a href="' + esc(s.href) + '" aria-label="' + esc(s.label) + '">' + (ICON[s.icon] || esc(s.label)) + '</a>';
        }).join('') + '</div>' +
        '    <div class="ft-contact"><a href="mailto:' + esc(c.email) + '">' + esc(c.email) + '</a><span>' + esc(c.phone) + '</span><span>' + esc(c.address) + '</span></div>' +
        '  </div>' +
        '  <div class="ft-word" aria-hidden="true" data-ft-word>' + esc(B.name).split('').map(function (ch, i) {
          return '<span style="--ci:' + i + '">' + (ch === ' ' ? '&nbsp;' : ch) + '</span>';
        }).join('') + '</div>' +
        '  <div class="ft-base"><span>&copy; ' + year + ' ' + esc(B.name) + '. All rights reserved.</span>' +
        '    <span class="ft-base-links"><a href="contact.html#faq">Shipping &amp; returns</a><a href="contact.html">Contact</a></span></div>' +
        '</footer>';
    }

    // overlays appended to <body>
    var shell = document.createElement('div');
    shell.innerHTML =
      '<div class="bag" data-bag aria-hidden="true">' +
      '  <div class="bag-scrim" data-bag-close></div>' +
      '  <aside class="bag-panel" role="dialog" aria-modal="true" aria-label="Bag">' +
      '    <div class="bag-head"><h2>Bag <span data-bag-count></span></h2><button type="button" class="icon-btn" data-bag-close aria-label="Close bag">' + ICON.close + '</button></div>' +
      '    <ul class="bag-list" data-bag-list></ul>' +
      '    <div class="bag-foot">' +
      '      <div class="bag-total"><span>Subtotal</span><span data-bag-total>$0.00</span></div>' +
      '      <p class="bag-note" data-bag-note>Shipping and taxes calculated at checkout.</p>' +
      '      <button type="button" class="btn btn-dark btn-block" data-bag-checkout>Checkout</button>' +
      '      <button type="button" class="bag-continue" data-bag-close>Continue shopping</button>' +
      '    </div>' +
      '  </aside>' +
      '</div>' +
      '<div class="search" data-search aria-hidden="true" role="dialog" aria-modal="true" aria-label="Search">' +
      '  <div class="search-scrim" data-search-close></div>' +
      '  <div class="search-panel">' +
      '    <form class="search-form" data-search-form role="search">' + ICON.search +
      '      <label class="visually-hidden" for="search-q">Search products</label>' +
      '      <input id="search-q" type="search" placeholder="Search products" autocomplete="off">' +
      '      <button type="button" class="search-cancel" data-search-close>Cancel</button>' +
      '    </form>' +
      '    <div class="search-tags"><span>Popular</span><button type="button" data-q="Hoodie">Hoodie</button><button type="button" data-q="Sweatshirt">Sweatshirt</button><button type="button" data-q="Luka">Luka</button><button type="button" data-q="Jordan">Jordan</button></div>' +
      '    <ul class="search-results" data-search-results></ul>' +
      '  </div>' +
      '</div>' +
      '<div class="pt-curtain" aria-hidden="true"><span>' + esc(B.name) + '</span></div>' +
      '<div class="scroll-progress" aria-hidden="true"><i></i></div>' +
      '<button type="button" class="to-top" aria-label="Back to top"><svg class="to-top-ring" viewBox="0 0 48 48"><circle cx="24" cy="24" r="22"/></svg>' + ICON.up + '</button>' +
      (fine && !reduce ? '<div class="cursor" aria-hidden="true"><div class="cursor-dot"></div><div class="cursor-ring"><span></span></div></div>' : '');
    while (shell.firstChild) body.appendChild(shell.firstChild);

    wireHeader();
    wireBag();
    wireSearch();
    wireTransitions();
    wireExtras();
    runPreloader();
  }

  /* ---------- header: menu, sticky hide/show, active section ---------- */
  function wireHeader() {
    var header = document.querySelector('[data-header]');
    var menuBtn = document.querySelector('[data-menu-toggle]');
    function setMenu(open) {
      body.classList.toggle('nav-open', open);
      if (menuBtn) menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    }
    if (menuBtn) menuBtn.addEventListener('click', function () { setMenu(!body.classList.contains('nav-open')); });
    document.addEventListener('click', function (e) {
      if (e.target.closest('[data-menu-close]') || e.target.closest('.site-nav a')) setMenu(false);
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });

    var lastY = window.pageYOffset;
    window.addEventListener('scroll', function () {
      var y = window.pageYOffset;
      if (header) {
        var hide = y > 260 && y > lastY && !body.classList.contains('nav-open');
        header.classList.toggle('is-scrolled', y > 40);
        header.classList.toggle('is-hidden', hide);
        body.classList.toggle('header-hidden', hide);
      }
      lastY = y;
    }, { passive: true });

    // on the homepage the anchor links light up as their section scrolls by
    var links = [].slice.call(document.querySelectorAll('.site-nav a[href*="#"]')).filter(function (a) {
      return a.getAttribute('href').split('#')[0].toLowerCase() === page;
    });
    var home = document.querySelector('.site-nav a[aria-current="page"]');
    if (links.length && 'IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          var a = links.filter(function (l) { return l.getAttribute('href').split('#')[1] === en.target.id; })[0];
          if (!a) return;
          if (en.isIntersecting) {
            links.concat(home ? [home] : []).forEach(function (l) { l.removeAttribute('aria-current'); });
            a.setAttribute('aria-current', 'true');
          } else if (a.getAttribute('aria-current')) {
            a.removeAttribute('aria-current');
            if (home) home.setAttribute('aria-current', 'page');
          }
        });
      }, { rootMargin: '-45% 0px -50% 0px' });
      links.forEach(function (a) {
        var t = document.getElementById(a.getAttribute('href').split('#')[1]);
        if (t) io.observe(t);
      });
    }
  }

  /* ---------- bag drawer ---------- */
  function wireBag() {
    var bag = document.querySelector('[data-bag]');
    if (!bag || !window.SiteCart) return;
    var list = bag.querySelector('[data-bag-list]');
    var total = bag.querySelector('[data-bag-total]');
    var count = bag.querySelector('[data-bag-count]');
    var checkout = bag.querySelector('[data-bag-checkout]');
    var lastFocus = null;

    function render(cart) {
      cart = cart || window.SiteCart.get();
      count.textContent = cart.item_count ? '(' + cart.item_count + ')' : '';
      if (!cart.items.length) {
        list.innerHTML = '<li class="bag-empty"><p>Your bag is empty.</p><a class="btn btn-dark" href="shop.html">Shop new arrivals</a></li>';
      } else {
        list.innerHTML = cart.items.map(function (l) {
          return '<li class="bag-line" data-key="' + esc(l.key) + '">' +
            (l.image ? '<img src="' + esc(l.image) + '" alt="">' : '<span class="bag-ph"></span>') +
            '<div><h3>' + esc(l.title) + '</h3>' +
            (l.variant ? '<p>Size ' + esc(l.variant) + '</p>' : '') +
            '<div class="bag-qty"><button type="button" data-qty="-1" aria-label="Decrease">−</button>' +
            '<span>' + l.quantity + '</span>' +
            '<button type="button" data-qty="1" aria-label="Increase">+</button></div></div>' +
            '<div class="bag-line-price">' + esc(window.SiteCart.money(l.price * l.quantity)) +
            '<button type="button" class="bag-remove" data-qty="-999" aria-label="Remove ' + esc(l.title) + '">Remove</button></div></li>';
        }).join('');
      }
      total.textContent = window.SiteCart.money(cart.total);
      checkout.disabled = !cart.items.length;
    }
    function open() {
      render();
      lastFocus = document.activeElement;
      bag.classList.add('bag-open');
      bag.setAttribute('aria-hidden', 'false');
      body.style.overflow = 'hidden';
      var c = bag.querySelector('[data-bag-close]');
      if (c) c.focus({ preventScroll: true });
    }
    function close() {
      bag.classList.remove('bag-open');
      bag.setAttribute('aria-hidden', 'true');
      body.style.overflow = '';
      if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
      if (location.hash === '#cart') history.replaceState(null, '', location.pathname + location.search);
    }
    document.addEventListener('site:cart', function (e) {
      if (bag.classList.contains('bag-open')) render(e.detail);
      var icon = document.querySelector('[data-cart-icon]');
      if (icon && icon.animate && !reduce) icon.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.22)' }, { transform: 'scale(1)' }], { duration: 420, easing: 'ease-out' });
    });
    document.addEventListener('site:cart-open', open);
    document.addEventListener('click', function (e) {
      if (e.target.closest('a[href="#cart"], [data-bag-open]')) { e.preventDefault(); open(); return; }
      if (e.target.closest('[data-bag-close]')) { close(); return; }
      var q = e.target.closest('[data-qty]');
      if (q && bag.contains(q)) {
        var key = q.closest('[data-key]').getAttribute('data-key');
        var item = window.SiteCart.get().items.filter(function (l) { return l.key === key; })[0];
        if (item) window.SiteCart.setQuantity(key, Math.max(0, item.quantity + (+q.getAttribute('data-qty'))));
      }
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && bag.classList.contains('bag-open')) close(); });
    checkout.addEventListener('click', function () {
      var note = bag.querySelector('[data-bag-note]');
      if (B.storeUrl) note.innerHTML = 'Checkout happens on the Shopify store. <a href="' + esc(B.storeUrl) + '/cart">Go to store</a>';
    });
    if (location.hash === '#cart') open();
  }

  /* ---------- live search ---------- */
  function wireSearch() {
    var box = document.querySelector('[data-search]');
    if (!box) return;
    var input = box.querySelector('input');
    var results = box.querySelector('[data-search-results]');
    function catalog() { return window.CATALOG || []; }
    function run() {
      var q = input.value.trim().toLowerCase();
      if (!q) { results.innerHTML = ''; return; }
      var hits = catalog().filter(function (p) {
        return (p.name + ' ' + p.category + ' ' + (p.type || '')).toLowerCase().indexOf(q) > -1;
      }).slice(0, 6);
      results.innerHTML = hits.length ? hits.map(function (p, i) {
        return '<li style="--i:' + i + '"><a href="product.html?id=' + encodeURIComponent(p.id) + '">' +
          '<span class="sr-img" style="background:' + esc(p.tone || '#f3f2ef') + '"><img src="' + esc(p.images[0]) + '" alt=""></span>' +
          '<span class="sr-txt"><strong>' + esc(p.name) + '</strong><span>' + esc(p.categoryLabel || p.category) + '</span></span>' +
          '<span class="sr-price">' + esc(p.price) + '</span></a></li>';
      }).join('') + '<li class="sr-all" style="--i:' + hits.length + '"><a href="shop.html?q=' + encodeURIComponent(q) + '">See all results ' + ICON.arrow + '</a></li>'
        : '<li class="sr-none">No products match “' + esc(input.value) + '”.</li>';
    }
    function open() {
      box.classList.add('is-open');
      box.setAttribute('aria-hidden', 'false');
      body.style.overflow = 'hidden';
      setTimeout(function () { input.focus(); }, 60);
    }
    function close() {
      box.classList.remove('is-open');
      box.setAttribute('aria-hidden', 'true');
      body.style.overflow = '';
    }
    document.addEventListener('click', function (e) {
      if (e.target.closest('[data-search-open]')) { e.preventDefault(); open(); }
      else if (e.target.closest('[data-search-close]')) close();
      var tag = e.target.closest('[data-q]');
      if (tag && box.contains(tag)) { input.value = tag.getAttribute('data-q'); run(); input.focus(); }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && box.classList.contains('is-open')) close();
      if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { e.preventDefault(); open(); }
    });
    input.addEventListener('input', run);
    box.querySelector('[data-search-form]').addEventListener('submit', function (e) {
      e.preventDefault();
      var q = input.value.trim();
      if (q) go('shop.html?q=' + encodeURIComponent(q));
    });
  }

  /* ---------- page transitions ---------- */
  function go(href) {
    if (reduce) { location.href = href; return; }
    ss('pt', '1');
    html.classList.add('pt-out');
    setTimeout(function () { location.href = href; }, 520);
  }
  function wireTransitions() {
    if (html.classList.contains('pt-in')) {
      requestAnimationFrame(function () { requestAnimationFrame(function () { html.classList.add('pt-in-go'); }); });
      setTimeout(function () { html.classList.remove('pt-in', 'pt-in-go'); }, 900);
    }
    document.addEventListener('click', function (e) {
      var a = e.target.closest('a[href]');
      if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (a.target === '_blank' || a.hasAttribute('download')) return;
      var href = a.getAttribute('href');
      if (!/^[\w\-]+\.html([?#].*)?$/i.test(href)) return;            // only our own pages
      var file = href.split(/[?#]/)[0].toLowerCase();
      var hash = href.indexOf('#') > -1 ? href.split('#')[1] : '';
      if (file === page && hash && href.indexOf('?') < 0) {           // same page anchor: smooth scroll
        var t = document.getElementById(hash);
        if (t) { e.preventDefault(); t.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); history.replaceState(null, '', '#' + hash); }
        return;
      }
      e.preventDefault();
      go(href);
    });
    window.addEventListener('pageshow', function (e) { if (e.persisted) html.classList.remove('pt-out'); });
  }

  /* ---------- cursor, progress, back-to-top, footer word, newsletter ---------- */
  function wireExtras() {
    var bar = document.querySelector('.scroll-progress i');
    var top = document.querySelector('.to-top');
    var ring = top && top.querySelector('circle');
    var len = 2 * Math.PI * 22;
    if (ring) { ring.style.strokeDasharray = len; ring.style.strokeDashoffset = len; }
    function onScroll() {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      var p = h > 0 ? window.pageYOffset / h : 0;
      if (bar) bar.style.transform = 'scaleX(' + p.toFixed(4) + ')';
      if (top) {
        top.classList.toggle('is-on', window.pageYOffset > window.innerHeight * 0.8);
        ring.style.strokeDashoffset = (len * (1 - p)).toFixed(1);
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    if (top) top.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); });

    var word = document.querySelector('[data-ft-word]');
    if (word && 'IntersectionObserver' in window) {
      var wio = new IntersectionObserver(function (en) {
        if (en[0].isIntersecting) { word.classList.add('is-in'); wio.disconnect(); }
      }, { threshold: 0.3 });
      wio.observe(word);
    } else if (word) word.classList.add('is-in');

    // newsletter forms (static demo: validates and shows a thank-you)
    document.addEventListener('submit', function (e) {
      var f = e.target.closest('[data-newsletter]');
      if (!f) return;
      e.preventDefault();
      var input = f.querySelector('input[type="email"]');
      var msg = f.querySelector('.form-msg');
      var ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value.trim());
      f.classList.toggle('is-error', !ok);
      if (!ok) { msg.textContent = 'Please enter a valid email address.'; input.focus(); return; }
      f.classList.add('is-done');
      msg.textContent = 'Thanks — you’re on the list.';
      input.value = '';
    });

    // custom cursor
    var cur = document.querySelector('.cursor');
    if (!cur) return;
    var dot = cur.querySelector('.cursor-dot'), rg = cur.querySelector('.cursor-ring'), label = rg.querySelector('span');
    var x = -100, y = -100, rx = -100, ry = -100, raf = 0;
    function loop() {
      rx += (x - rx) * 0.18; ry += (y - ry) * 0.18;
      dot.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)';
      rg.style.transform = 'translate3d(' + rx.toFixed(1) + 'px,' + ry.toFixed(1) + 'px,0)';
      raf = Math.abs(x - rx) + Math.abs(y - ry) > 0.2 ? requestAnimationFrame(loop) : 0;
    }
    document.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      x = e.clientX; y = e.clientY;
      cur.classList.add('is-on');
      if (!raf) raf = requestAnimationFrame(loop);
      var t = e.target.closest ? e.target.closest('[data-cursor], a, button, input, textarea, select, label') : null;
      var txt = t && t.getAttribute('data-cursor');
      cur.classList.toggle('is-label', !!txt);
      cur.classList.toggle('is-link', !!t && !txt);
      if (txt) label.textContent = txt;
    }, { passive: true });
    document.addEventListener('pointerdown', function () { cur.classList.add('is-down'); });
    document.addEventListener('pointerup', function () { cur.classList.remove('is-down'); });
    document.documentElement.addEventListener('mouseleave', function () { cur.classList.remove('is-on'); });
  }

  /* ---------- preloader ---------- */
  function runPreloader() {
    var pl = document.querySelector('.preloader');
    if (!pl) { document.dispatchEvent(new CustomEvent('site:ready')); return; }
    var countEl = pl.querySelector('.pl-count'), barEl = pl.querySelector('.pl-bar i');
    var start = performance.now(), loaded = document.readyState === 'complete', MIN = 1400;
    window.addEventListener('load', function () { loaded = true; });
    pl.classList.add('is-in');
    (function tick(now) {
      var t = Math.min(1, (now - start) / MIN);
      var p = loaded ? t : Math.min(t, 0.9);
      var e = 1 - Math.pow(1 - p, 3);
      countEl.textContent = Math.round(e * 100);
      barEl.style.transform = 'scaleX(' + e.toFixed(3) + ')';
      if (p < 1) { requestAnimationFrame(tick); return; }
      pl.classList.add('is-out');
      ss('pl-seen', '1');
      setTimeout(function () {
        html.classList.remove('is-loading');
        document.dispatchEvent(new CustomEvent('site:ready'));
      }, 450);
      setTimeout(function () { pl.remove(); }, 1300);
    })(start);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready);
  else ready();
})();
