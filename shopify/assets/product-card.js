/* Product cards — hover swaps to the second image, "+" opens Quick view.
 *
 *   ProductCard.html(product, index)   → card markup
 *   ProductCard.wire(container, list)  → quick add for every card inside container
 *
 * product = catalog item (see data/catalog.js) or the same shape built in Liquid. */
(function () {
  'use strict';
  if (window.ProductCard) return;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function url(p) { return p.url || ('product.html?id=' + encodeURIComponent(p.id)); }
  function toQuick(p) {
    return { name: p.name, price: p.price, url: url(p), images: p.images, options: p.options, variants: p.variants };
  }

  function html(p, i) {
    var look = p.look || p.type || 'apparel';          // 'footwear' = side-on shoe, no image swap
    var two = p.images.length > 1 && look !== 'footwear';
    return '' +
      '<article class="pc pc-' + esc(look) + '" data-id="' + esc(p.id) + '" data-reveal style="--tone:' + esc(p.tone || '#f1f0ed') + ';--rd:' + ((i || 0) % 4 * 0.07).toFixed(2) + 's">' +
      '  <a class="pc-media" href="' + esc(url(p)) + '" data-cursor="View" aria-label="' + esc(p.name) + '">' +
      '    <img class="pc-img" src="' + esc(p.images[0]) + '" alt="' + esc(p.name) + '" loading="lazy" decoding="async">' +
      (two ? '    <img class="pc-img pc-img-2" src="' + esc(p.images[1]) + '" alt="" loading="lazy" decoding="async">' : '') +
      (p.badge ? '    <span class="pc-badge">' + esc(p.badge) + '</span>' : '') +
      '  </a>' +
      '  <button type="button" class="pc-add" data-pc-add aria-label="Quick add ' + esc(p.name) + '">' +
      '    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg><span>Quick add</span>' +
      '  </button>' +
      '  <div class="pc-info">' +
      '    <div><h3 class="pc-name"><a href="' + esc(url(p)) + '">' + esc(p.name) + '</a></h3><p class="pc-cat">' + esc(p.categoryLabel || p.category || '') + '</p></div>' +
      '    <span class="pc-price">' + esc(p.price) + '</span>' +
      '  </div>' +
      '</article>';
  }

  function wire(container, list) {
    if (!container || container.__pc) return;
    container.__pc = true;
    container.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-pc-add]');
      if (!btn || !window.QuickView) return;
      e.preventDefault();
      var cards = [].slice.call(container.querySelectorAll('.pc'));
      var ids = cards.map(function (c) { return c.getAttribute('data-id'); });
      var items = ids.map(function (id) { return (list || []).filter(function (p) { return String(p.id) === id; })[0]; }).filter(Boolean);
      var idx = ids.indexOf(btn.closest('.pc').getAttribute('data-id'));
      window.QuickView.open({ items: items.map(toQuick), index: Math.max(0, idx) });
    });
  }

  window.ProductCard = { html: html, wire: wire, url: url, toQuick: toQuick };
})();
