/* Tiny Steps — sneakers ride a large circle; the one at the front is the active product.
 * Turn it by dragging the shoes, dragging the "wheel" control, scrolling sideways,
 * the arrow keys, or clicking a shoe. Click the front shoe (or "View details") for
 * Quick view; click a size to add the front shoe straight to the bag.
 * Data comes from <script data-orbit-json>. */
(function () {
  'use strict';
  if (window.StepOrbit) return;

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function pad2(n) { n = '' + n; return n.length < 2 ? '0' + n : n; }

  function create(sec) {
    var stage = sec.querySelector('[data-orbit-stage]');
    var ring = sec.querySelector('[data-orbit-ring]');
    var json = sec.querySelector('[data-orbit-json]');
    if (!stage || !json) return null;
    var items;
    try { items = JSON.parse(json.textContent); } catch (e) { return null; }
    items = items.filter(function (p) { return p.images && p.images.length; });
    var N = items.length;
    if (!N) return null;

    var ui = {
      idx: sec.querySelector('[data-orbit-idx]'),
      name: sec.querySelector('[data-orbit-name]'),
      price: sec.querySelector('[data-orbit-price]'),
      details: sec.querySelector('[data-orbit-details]'),
      info: sec.querySelector('.orbit-info'),
      wheel: sec.querySelector('[data-orbit-wheel]'),
      track: sec.querySelector('[data-orbit-track]'),
      sizes: sec.querySelector('[data-orbit-sizes]'),
      msg: sec.querySelector('[data-orbit-msg]'),
      max: sec.querySelector('[data-orbit-max]')
    };
    if (ui.max) ui.max.textContent = pad2(N);

    var qvItems = items.map(function (p) {
      return { name: p.name, price: p.price, url: p.url, images: p.images, options: p.options, variants: p.variants };
    });
    window.SiteProducts = (window.SiteProducts || []).concat(qvItems);

    /* ---------- shoes ---------- */
    var shoes = items.map(function (p, i) {
      var el = document.createElement('button');
      el.type = 'button';
      el.className = 'orbit-shoe';
      el.setAttribute('aria-label', p.name);
      el.innerHTML = '<span class="orbit-float"><img src="' + p.images[0] + '" alt="" draggable="false" decoding="async"></span><span class="orbit-shadow" aria-hidden="true"></span>';
      stage.appendChild(el);
      el.addEventListener('click', function (e) {
        if (moved > 6) { e.preventDefault(); return; }
        if (activeIndex() === i) openQuick(i);
        else goTo(nearestTarget(i));
      });
      return { el: el, img: el.querySelector('img'), fl: el.querySelector('.orbit-float') };
    });

    /* ---------- geometry ---------- */
    var W = 0, H = 0, C = { x: 0, y: 0 }, R = 0, A0 = 0, STEP = 0.36, BASE = 300;
    function measure() {
      var r = stage.getBoundingClientRect();
      W = r.width; H = r.height;
      var mobile = W < 750;
      if (mobile) {
        // phones: the active shoe sits on top of a wide arc, neighbours peek in at the sides
        R = H * 0.95;
        C.x = W / 2; C.y = H * 0.47 + R;
        A0 = -Math.PI / 2;
        STEP = 0.27;
        BASE = clamp(W * 0.72, 220, 340);
      } else {
        // active shoe sits up-left of a big circle whose centre is off to the bottom right
        var ax = W * 0.53, ay = H * 0.42;
        C.x = W * 0.86; C.y = H * 1.04;
        R = Math.hypot(ax - C.x, ay - C.y);
        A0 = Math.atan2(ay - C.y, ax - C.x);
        STEP = 0.36;
        BASE = clamp(W * 0.25, 220, 380);
      }
      if (ring) {
        ring.style.width = ring.style.height = (R * 2) + 'px';
        ring.style.left = (C.x - R) + 'px';
        ring.style.top = (C.y - R) + 'px';
      }
    }

    /* ---------- motion ---------- */
    var pos = 0, target = 0, raf = 0, last = 0, t0 = performance.now(), visible = true, dead = false;
    function wrapD(d) {                // shortest signed distance on the loop
      d = ((d % N) + N) % N;
      return d > N / 2 ? d - N : d;
    }
    function activeIndex() { return ((Math.round(pos) % N) + N) % N; }
    function nearestTarget(i) { return Math.round(pos) + wrapD(i - Math.round(pos)); }

    var shown = -1;
    function paint(ts) {
      var t = (ts - t0) / 1000;
      shoes.forEach(function (s, i) {
        var d = wrapD(i - pos);
        var ad = Math.abs(d);
        var ang = A0 + d * STEP;
        var x = C.x + Math.cos(ang) * R, y = C.y + Math.sin(ang) * R;
        var sc = 1 / (1 + 0.82 * ad);
        var op = ad < 2.3 ? 1 : clamp(1 - (ad - 2.3) / 0.9, 0, 1);
        var w = BASE * sc;
        var bob = reduceMotion ? 0 : Math.sin(t * 1.4 + i * 1.3) * 6 * sc;
        s.el.style.width = w.toFixed(1) + 'px';
        s.el.style.transform = 'translate3d(' + (x - w / 2).toFixed(1) + 'px,' + (y - w * 0.32).toFixed(1) + 'px,0) rotate(' + (-d * 5).toFixed(2) + 'deg)';
        s.fl.style.transform = 'translateY(' + bob.toFixed(2) + 'px)';
        s.el.style.opacity = op.toFixed(3);
        s.el.style.zIndex = 100 - Math.round(ad * 10);
        s.el.style.visibility = op <= 0 ? 'hidden' : '';
        s.el.tabIndex = ad < 0.5 ? 0 : -1;
        s.el.classList.toggle('orbit-front', ad < 0.5);
      });
      if (ui.track) ui.track.style.backgroundPosition = (-pos * 46).toFixed(1) + 'px 0';
      var a = activeIndex();
      if (a !== shown) { shown = a; showInfo(a); }
    }
    function frame(ts) {
      raf = 0;
      if (dead) return;
      var dt = last ? Math.min(0.05, (ts - last) / 1000) : 1 / 60;
      last = ts;
      if (!dragging) {
        var k = reduceMotion ? 1 : 1 - Math.exp(-dt / 0.16);
        pos += (target - pos) * k;
        if (Math.abs(target - pos) < 0.0005) pos = target;
      }
      paint(ts);
      // keep running while visible: the shoes float
      if (visible && (!reduceMotion || pos !== target || dragging)) raf = requestAnimationFrame(frame);
      else last = 0;
    }
    function kick() { if (!raf && !dead) raf = requestAnimationFrame(frame); }
    function goTo(t) { target = t; kick(); }

    /* ---------- info panel + sizes ---------- */
    var sel = null, busy = false;
    function showInfo(i) {
      var p = items[i];
      if (ui.idx) ui.idx.textContent = pad2(i + 1) + ' / ' + pad2(N);
      if (ui.name) ui.name.textContent = p.name;
      if (ui.price) ui.price.textContent = p.price;
      if (ui.info && !reduceMotion) {
        ui.info.classList.remove('orbit-swap');
        void ui.info.offsetWidth;
        ui.info.classList.add('orbit-swap');
      }
      if (ui.wheel) {
        ui.wheel.setAttribute('aria-valuenow', i + 1);
        ui.wheel.setAttribute('aria-valuetext', p.name);
      }
      renderSizes(p);
    }
    function sizeOption(p) {
      var o = p.options || [];
      for (var i = 0; i < o.length; i++) if (/size|taille|größe|maat|talla/i.test(o[i].name)) return i;
      return o.length ? 0 : -1;
    }
    function variantFor(p, oi, val) {
      return (p.variants || []).filter(function (v) { return v.opts[oi] === val; })[0] || null;
    }
    function renderSizes(p) {
      if (!ui.sizes) return;
      sel = null;
      var grid = ui.sizes.querySelector('.orbit-sizes-grid');
      grid.innerHTML = '';
      var oi = sizeOption(p);
      if (oi < 0) return;
      p.options[oi].values.forEach(function (val) {
        var v = variantFor(p, oi, val);
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'orbit-size';
        b.innerHTML = '<span>' + val + '</span><i class="orbit-spin" aria-hidden="true"></i>';
        b.setAttribute('aria-label', 'Add ' + p.name + ', size ' + val + ' to bag' + (v && !v.av ? ' (sold out)' : ''));
        if (!v || !v.av) b.classList.add('orbit-na');
        b.addEventListener('click', function () { quickAdd(p, val, v, b); });
        grid.appendChild(b);
      });
    }
    function quickAdd(p, val, v, btn) {
      if (busy || !v || !v.av || !window.SiteCart) return;
      busy = true;
      [].forEach.call(ui.sizes.querySelectorAll('.orbit-size'), function (b) { b.classList.remove('orbit-on'); });
      btn.classList.add('orbit-on', 'orbit-busy');
      window.SiteCart.add({ id: v.id, quantity: 1, title: p.name, variant: val, price: v.price || p.price, image: p.images[0] })
        .then(function () {
          ui.msg.innerHTML = '';
          ui.msg.className = 'orbit-msg orbit-msg-ok';
          var ok = document.createElement('span');
          ok.className = 'orbit-check';
          ok.setAttribute('aria-hidden', 'true');
          ui.msg.appendChild(ok);
          ui.msg.appendChild(document.createTextNode(p.name + ', ' + val + ' added to bag '));
          var a = document.createElement('a');
          a.href = window.SiteCart.cartUrl;
          a.textContent = 'View bag';
          if (!window.SiteCart.isShopify) a.addEventListener('click', function (e) { e.preventDefault(); window.SiteCart.open(); });
          ui.msg.appendChild(a);
          flyToCart(shoes[activeIndex()].img);
        })
        .catch(function (err) {
          btn.classList.remove('orbit-on');
          ui.msg.className = 'orbit-msg orbit-msg-err';
          ui.msg.textContent = (err && err.message) || 'Could not add to bag. Please try again.';
        })
        .then(function () { busy = false; btn.classList.remove('orbit-busy'); });
    }
    function flyToCart(img) {
      if (reduceMotion || !img || !Element.prototype.animate) return;
      var from = img.getBoundingClientRect();
      var target = document.querySelector('#cart-icon-bubble, [data-cart-icon], .header__icon--cart, a[href$="/cart"]');
      var tr = target ? target.getBoundingClientRect() : null;
      if (!tr || !tr.width) tr = { left: window.innerWidth - 48, top: 18, width: 24, height: 24 };
      var f = img.cloneNode();
      f.className = 'orbit-fly';
      f.style.cssText = 'left:' + from.left + 'px;top:' + from.top + 'px;width:' + from.width + 'px;height:' + from.height + 'px';
      document.body.appendChild(f);
      var dx = tr.left + tr.width / 2 - (from.left + from.width / 2), dy = tr.top + tr.height / 2 - (from.top + from.height / 2);
      f.animate([
        { transform: 'translate(0,0) scale(.9)', opacity: 1 },
        { transform: 'translate(' + dx * 0.55 + 'px,' + (dy * 0.55 - 70) + 'px) scale(.3) rotate(-8deg)', opacity: 1, offset: 0.6 },
        { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(.04) rotate(-14deg)', opacity: 0.3 }
      ], { duration: 820, easing: 'cubic-bezier(.5,0,.3,1)' }).onfinish = function () {
        f.remove();
        if (target && target.animate) target.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.28)' }, { transform: 'scale(1)' }], { duration: 380 });
      };
    }

    function openQuick(i) {
      if (!window.QuickView) return;
      window.QuickView.open({
        items: qvItems, index: i,
        onIndex: function (n) { goTo(nearestTarget(n)); }   // the wheel follows the pop-up
      });
    }
    if (ui.details) ui.details.addEventListener('click', function (e) { e.preventDefault(); openQuick(activeIndex()); });

    /* ---------- input ---------- */
    var dragging = false, moved = 0, dX = 0, dY = 0, dPos = 0, dScale = 1, lastX = 0, lastT = 0, flick = 0, dEl = null, dId = 0;
    function startDrag(ev, scale) {
      if (ev.button !== 0) return;
      dragging = true; moved = 0;
      dX = lastX = ev.clientX; dY = ev.clientY; dPos = pos; dScale = scale; flick = 0; lastT = performance.now();
      dEl = ev.currentTarget; dId = ev.pointerId;
      sec.classList.add('orbit-dragging');
      kick();
    }
    function moveDrag(ev) {
      if (!dragging) return;
      var dx = ev.clientX - dX;
      moved = Math.max(moved, Math.abs(dx), Math.abs(ev.clientY - dY));
      // capture only once it is a real drag, so a plain click still reaches the shoe
      if (dEl && moved > 4) { try { dEl.setPointerCapture(dId); } catch (e) {} dEl = null; }
      pos = dPos + dx * dScale;
      var now = performance.now();
      flick = flick * 0.5 + ((ev.clientX - lastX) * dScale / Math.max(1, now - lastT)) * 0.5;
      lastX = ev.clientX; lastT = now;
    }
    function endDrag() {
      if (!dragging) return;
      dragging = false;
      sec.classList.remove('orbit-dragging');
      target = Math.round(pos + clamp(flick * 90, -1, 1));
      kick();
      setTimeout(function () { moved = 0; }, 0);
    }
    // dragging the shoes: drag left to bring the next one forward
    stage.addEventListener('pointerdown', function (ev) { measure(); startDrag(ev, -1 / Math.max(160, W * 0.16)); });
    stage.addEventListener('pointermove', moveDrag);
    stage.addEventListener('pointerup', endDrag);
    stage.addEventListener('pointercancel', endDrag);
    if (ui.wheel) {
      // the wheel control turns like a knurled dial: drag right for the next shoe
      ui.wheel.addEventListener('pointerdown', function (ev) { startDrag(ev, 1 / 46); });
      ui.wheel.addEventListener('pointermove', moveDrag);
      ui.wheel.addEventListener('pointerup', endDrag);
      ui.wheel.addEventListener('pointercancel', endDrag);
      ui.wheel.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); goTo(Math.round(target) + 1); }
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); goTo(Math.round(target) - 1); }
        else if (e.key === 'Home') { e.preventDefault(); goTo(nearestTarget(0)); }
        else if (e.key === 'End') { e.preventDefault(); goTo(nearestTarget(N - 1)); }
      });
    }
    // sideways scroll / trackpad swipe turns the wheel; vertical scroll still scrolls the page
    var wheelAcc = 0, wheelT = 0;
    sec.addEventListener('wheel', function (e) {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      wheelAcc += e.deltaX;
      if (Math.abs(wheelAcc) > 60 && performance.now() - wheelT > 220) {
        goTo(Math.round(target) + (wheelAcc > 0 ? 1 : -1));
        wheelAcc = 0; wheelT = performance.now();
      }
    }, { passive: false });
    stage.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); goTo(Math.round(target) + 1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(Math.round(target) - 1); }
    });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) {
        visible = en[0].isIntersecting;
        if (visible) { sec.classList.add('orbit-in'); kick(); }
      }, { threshold: 0.15 }).observe(sec);
    } else sec.classList.add('orbit-in');

    measure();
    window.addEventListener('resize', function () { measure(); kick(); });
    paint(performance.now());
    kick();

    return { destroy: function () { dead = true; if (raf) cancelAnimationFrame(raf); } };
  }

  var instances = new Map();
  function initAll(root) {
    [].forEach.call((root || document).querySelectorAll('[data-orbit-section]'), function (sec) {
      if (!instances.has(sec)) { var i = create(sec); if (i) instances.set(sec, i); }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { initAll(); });
  else initAll();
  document.addEventListener('shopify:section:load', function (e) { initAll(e.target); });
  document.addEventListener('shopify:section:unload', function (e) {
    [].forEach.call(e.target.querySelectorAll('[data-orbit-section]'), function (sec) {
      var i = instances.get(sec);
      if (i) { i.destroy(); instances.delete(sec); }
    });
  });
  window.StepOrbit = { initAll: initAll };
})();
