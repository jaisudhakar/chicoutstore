/* Feature scroll (sticky image follows the active point) and product grids with filter tabs. */
(function () {
  'use strict';
  if (window.SiteSections) return;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- feature scroll ---------- */
  function feature(sec) {
    var items = [].slice.call(sec.querySelectorAll('.feat-item'));
    var imgs = [].slice.call(sec.querySelectorAll('.feat-img'));
    var bars = [].slice.call(sec.querySelectorAll('.feat-progress i'));
    var big = sec.querySelector('[data-feat-num]');
    function set(i) {
      items.forEach(function (el, k) { el.classList.toggle('is-on', k === i); });
      imgs.forEach(function (el, k) { el.classList.toggle('is-on', k === i); });
      bars.forEach(function (el, k) { el.classList.toggle('is-on', k <= i); });
      if (big) big.textContent = (i < 9 ? '0' : '') + (i + 1);
    }
    set(0);
    if (!('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) set(items.indexOf(en.target)); });
    }, { rootMargin: '-48% 0px -48% 0px' });
    items.forEach(function (el) { io.observe(el); });
  }

  /* ---------- filter tabs with a sliding pill ---------- */
  function tabs(wrap, onPick) {
    var ink = wrap.querySelector('.tab-ink');
    var btns = [].slice.call(wrap.querySelectorAll('.tab'));
    function move(b) {
      if (!ink || !b) return;
      ink.style.width = b.offsetWidth + 'px';
      ink.style.transform = 'translateX(' + b.offsetLeft + 'px)';
    }
    function pick(b, silent) {
      btns.forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      move(b);
      if (!silent) onPick(b.getAttribute('data-filter'));
    }
    btns.forEach(function (b) { b.addEventListener('click', function () { pick(b); }); });
    var current = btns.filter(function (b) { return b.getAttribute('aria-pressed') === 'true'; })[0] || btns[0];
    pick(current, true);
    window.addEventListener('resize', function () { move(btns.filter(function (b) { return b.getAttribute('aria-pressed') === 'true'; })[0]); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { move(current); });
    return { pick: pick, buttons: btns };
  }

  /* ---------- FLIP: animate cards to their new places after a filter ---------- */
  function flip(grid, mutate) {
    var before = new Map();
    [].forEach.call(grid.children, function (c) { before.set(c.getAttribute('data-id'), c.getBoundingClientRect()); });
    mutate();
    if (reduce) return;
    [].forEach.call(grid.children, function (c, i) {
      var id = c.getAttribute('data-id');
      var b = before.get(id), a = c.getBoundingClientRect();
      c.classList.add('is-in');
      if (b) {
        var dx = b.left - a.left, dy = b.top - a.top;
        if (dx || dy) c.animate([{ transform: 'translate(' + dx + 'px,' + dy + 'px)' }, { transform: 'none' }], { duration: 650, easing: 'cubic-bezier(.22,1,.36,1)' });
      } else {
        c.animate([{ opacity: 0, transform: 'translateY(30px) scale(.96)' }, { opacity: 1, transform: 'none' }], { duration: 600, delay: Math.min(i, 8) * 40, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' });
      }
    });
  }

  /* ---------- product grid section (home "Trending", Shopify product grid) ---------- */
  function productGrid(sec) {
    var grid = sec.querySelector('[data-pg-grid]');
    if (!grid) return;
    if (!window.ProductCard) {
      // in a theme the card script may load after this one: try again once everything is in
      window.addEventListener('load', function () { if (window.ProductCard) productGrid(sec); }, { once: true });
      return;
    }
    var json = sec.querySelector('[data-pg-json]');
    var list = (json ? JSON.parse(json.textContent) : (window.CATALOG || [])).filter(function (p) { return p.images && p.images.length; });
    var limit = +sec.getAttribute('data-limit') || 8;
    function filtered(f) {
      return list.filter(function (p) { return !f || f === 'all' || p.type === f || p.category === f; }).slice(0, limit);
    }
    function render(f) {
      grid.innerHTML = filtered(f).map(window.ProductCard.html).join('');
    }
    render('all');
    window.ProductCard.wire(grid, list);
    if (window.SiteMotion) window.SiteMotion.init(grid);
    var t = sec.querySelector('.tabs');
    if (t) tabs(t, function (f) { flip(grid, function () { render(f); }); });
  }

  function init(root) {
    root = root || document;
    [].forEach.call(root.querySelectorAll('[data-feat]'), function (s) { if (!s.__f) { s.__f = 1; feature(s); } });
    [].forEach.call(root.querySelectorAll('[data-pg]'), function (s) { if (!s.__pg) { s.__pg = 1; productGrid(s); } });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { init(); });
  else init();
  document.addEventListener('shopify:section:load', function (e) { init(e.target); });
  window.SiteSections = { init: init, tabs: tabs, flip: flip };
})();
