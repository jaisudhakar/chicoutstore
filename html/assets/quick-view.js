/* Quick view — full-screen product pop-up shared by the shirt rail and product grids.
 *
 *   QuickView.open({ items: [product, …], index: 0, onIndex: fn })
 *
 * product = { name, price, url, images: [url…],
 *             options: [{ name, values: [] }],
 *             variants: [{ id, av, price, opts: [] }] }   ← same shape as the rack JSON */
(function () {
  'use strict';
  if (window.QuickView) return;

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var el, ui = {}, state = { items: [], index: 0, sel: [], img: 0, busy: false, onIndex: null, lastFocus: null };

  function h(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  function pad2(n) { n = '' + n; return n.length < 2 ? '0' + n : n; }

  function build() {
    el = h('div', 'qv');
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML =
      '<div class="qv-bg" data-qv-close></div>' +
      '<button type="button" class="qv-close" data-qv-close>Close <span class="qv-x" aria-hidden="true"></span></button>' +
      '<div class="qv-inner">' +
      '  <div class="qv-media">' +
      '    <div class="qv-stage"><img class="qv-img" alt=""></div>' +
      '    <div class="qv-under">' +
      '      <div class="qv-thumbs"></div>' +
      '      <div class="qv-pager">' +
      '        <button type="button" class="qv-arrow" data-qv-prev aria-label="Previous product">&larr;</button>' +
      '        <span class="qv-count"></span>' +
      '        <button type="button" class="qv-arrow" data-qv-next aria-label="Next product">&rarr;</button>' +
      '      </div>' +
      '    </div>' +
      '  </div>' +
      '  <div class="qv-info">' +
      '    <h2 class="qv-name"></h2>' +
      '    <p class="qv-price"></p>' +
      '    <div class="qv-opts"></div>' +
      '    <button type="button" class="qv-add"><span class="qv-spin" aria-hidden="true"></span><span class="qv-add-lbl"></span></button>' +
      '    <p class="qv-msg" aria-live="polite"></p>' +
      '    <a class="qv-link" href="#">View full details <span aria-hidden="true">&rarr;</span></a>' +
      '  </div>' +
      '</div>';
    document.body.appendChild(el);
    ['stage', 'img', 'thumbs', 'count', 'name', 'price', 'opts', 'add', 'msg', 'link', 'inner'].forEach(function (k) {
      ui[k] = el.querySelector('.qv-' + (k === 'add' ? 'add' : k));
    });
    ui.addLbl = el.querySelector('.qv-add-lbl');
    ui.pager = el.querySelector('.qv-pager');

    el.addEventListener('click', function (e) {
      if (e.target.closest('[data-qv-close]')) close();
      else if (e.target.closest('[data-qv-prev]')) go(-1);
      else if (e.target.closest('[data-qv-next]')) go(1);
    });
    ui.add.addEventListener('click', add);
    document.addEventListener('keydown', function (e) {
      if (!isOpen()) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'Tab') trap(e);
    });

    // swipe between products on touch
    var sx = 0, sy = 0;
    ui.stage.addEventListener('pointerdown', function (e) { sx = e.clientX; sy = e.clientY; });
    ui.stage.addEventListener('pointerup', function (e) {
      var dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1);
    });
  }

  function trap(e) {
    var f = [].filter.call(el.querySelectorAll('button, a[href]'), function (n) { return n.offsetParent !== null && !n.disabled; });
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (!el.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
    else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  function isOpen() { return !!el && el.classList.contains('qv-open'); }
  function cur() { return state.items[state.index]; }

  function find(p, sel) {
    var vs = p.variants || [];
    for (var i = 0; i < vs.length; i++) {
      var ok = true;
      for (var j = 0; j < sel.length; j++) if (sel[j] != null && vs[i].opts[j] !== sel[j]) { ok = false; break; }
      if (ok) return vs[i];
    }
    return null;
  }

  function showImage(i) {
    var p = cur(), imgs = p.images || [];
    state.img = i;
    ui.img.src = imgs[i] || '';
    ui.img.alt = p.name || '';
    [].forEach.call(ui.thumbs.children, function (t, k) { t.classList.toggle('qv-thumb-on', k === i); });
  }

  function render() {
    var p = cur();
    ui.name.textContent = p.name || '';
    ui.count.textContent = pad2(state.index + 1) + ' / ' + pad2(state.items.length);
    ui.pager.hidden = state.items.length < 2;
    ui.link.href = p.url || '#';
    ui.link.hidden = !p.url;
    ui.msg.textContent = '';
    ui.msg.className = 'qv-msg';
    ui.add.classList.remove('qv-done', 'qv-busy');

    ui.thumbs.innerHTML = '';
    var imgs = p.images || [];
    if (imgs.length > 1) {
      imgs.forEach(function (src, i) {
        var b = h('button', 'qv-thumb');
        b.type = 'button';
        b.setAttribute('aria-label', 'Image ' + (i + 1));
        b.innerHTML = '<img src="' + src + '" alt="" loading="lazy">';
        b.addEventListener('mouseenter', function () { showImage(i); });
        b.addEventListener('click', function () { showImage(i); });
        ui.thumbs.appendChild(b);
      });
    }
    showImage(0);

    // options: nothing pre-selected, so the button reads "Select a size" like the store
    var opts = (p.options || []).filter(function (o) { return o.values && o.values.length > 1; });
    state.sel = (p.options || []).map(function (o) { return o.values && o.values.length === 1 ? o.values[0] : null; });
    ui.opts.innerHTML = '';
    (p.options || []).forEach(function (o, oi) {
      if (opts.indexOf(o) < 0) return;
      var row = h('div', 'qv-opt');
      row.setAttribute('role', 'group');
      row.setAttribute('aria-label', o.name);
      row.appendChild(h('div', 'qv-optname', o.label || o.name));
      var grid = h('div', 'qv-grid');
      o.values.forEach(function (val) {
        var b = h('button', 'qv-size');
        b.type = 'button';
        b.textContent = val;
        b.setAttribute('data-oi', oi);
        b.setAttribute('data-val', val);
        b.addEventListener('click', function () {
          if (b.classList.contains('qv-na')) return;
          state.sel[oi] = val;
          ui.msg.textContent = '';
          ui.add.classList.remove('qv-done');
          update();
        });
        grid.appendChild(b);
      });
      row.appendChild(grid);
      ui.opts.appendChild(row);
    });
    update();
  }

  function update() {
    var p = cur();
    [].forEach.call(ui.opts.querySelectorAll('.qv-size'), function (b) {
      var oi = +b.getAttribute('data-oi'), val = b.getAttribute('data-val');
      var test = state.sel.slice(); test[oi] = val;
      var v = find(p, test);
      b.classList.toggle('qv-na', !!(p.variants && p.variants.length) && (!v || !v.av));
      b.setAttribute('aria-pressed', state.sel[oi] === val ? 'true' : 'false');
    });
    var complete = state.sel.every(function (s) { return s != null; });
    var v = complete ? find(p, state.sel) : null;
    ui.price.textContent = (v && v.price) || p.price || '';
    if (ui.add.classList.contains('qv-done')) return;
    var firstMissing = (p.options || [])[state.sel.indexOf(null)];
    ui.add.disabled = !complete || !v || !v.av || state.busy;
    ui.addLbl.textContent = !complete
      ? 'Select a ' + String((firstMissing && (firstMissing.label || firstMissing.name)) || 'size').toLowerCase().replace(/^shoe /, '')
      : (!v ? 'Unavailable' : (v.av ? 'Add to bag' : 'Sold out'));
  }

  function add() {
    var p = cur(), v = find(p, state.sel);
    if (!v || !v.av || state.busy) return;
    state.busy = true;
    ui.add.disabled = true;
    ui.add.classList.add('qv-busy');
    window.SiteCart.add({
      id: v.id,
      quantity: 1,
      title: p.name,
      variant: state.sel.filter(Boolean).join(' / '),
      price: v.price || p.price,
      image: (p.images || [])[0]
    }).then(function () {
      ui.add.classList.add('qv-done');
      ui.addLbl.textContent = 'Added to bag';
      ui.msg.innerHTML = '';
      ui.msg.appendChild(document.createTextNode(p.name + ', ' + state.sel.filter(Boolean).join(' / ') + ' added to bag. '));
      var a = h('a', '', 'View bag');
      a.href = window.SiteCart.cartUrl;
      a.addEventListener('click', function (e) {
        if (!window.SiteCart.isShopify) { e.preventDefault(); close(); window.SiteCart.open(); }
      });
      ui.msg.appendChild(a);
      setTimeout(function () { if (isOpen()) { ui.add.classList.remove('qv-done'); update(); } }, 2600);
    }).catch(function (err) {
      ui.msg.textContent = (err && err.message) || 'Could not add to bag. Please try again.';
      ui.msg.className = 'qv-msg qv-err';
    }).then(function () {
      state.busy = false;
      ui.add.classList.remove('qv-busy');
      update();
    });
  }

  function go(d) {
    if (state.items.length < 2 || state.busy) return;
    var n = state.items.length;
    var next = (state.index + d + n) % n;
    if (reduceMotion) { state.index = next; render(); return; }
    ui.inner.classList.add('qv-swap');
    setTimeout(function () {
      state.index = next;
      render();
      if (state.onIndex) state.onIndex(next);
      ui.inner.classList.remove('qv-swap');
    }, 260);
  }

  function open(opts) {
    if (!el) build();
    state.items = opts.items || [];
    state.index = opts.index || 0;
    state.onIndex = opts.onIndex || null;
    state.busy = false;
    if (!state.items.length) return;
    render();
    state.lastFocus = document.activeElement;
    state.overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    el.classList.add('qv-open');
    el.setAttribute('aria-hidden', 'false');
    el.setAttribute('aria-label', cur().name || 'Product');
    requestAnimationFrame(function () { requestAnimationFrame(function () { el.classList.add('qv-in'); }); });
    try { el.querySelector('.qv-close').focus({ preventScroll: true }); } catch (e) {}
  }

  function close() {
    if (!isOpen()) return;
    el.classList.remove('qv-in');
    el.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = state.overflow || '';
    setTimeout(function () { el.classList.remove('qv-open'); }, reduceMotion ? 0 : 320);
    if (state.lastFocus && state.lastFocus.focus) { try { state.lastFocus.focus({ preventScroll: true }); } catch (e) {} }
  }

  window.QuickView = { open: open, close: close, isOpen: isOpen };
})();
