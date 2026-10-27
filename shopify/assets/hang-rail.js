/* Hang Rail Pro — garments drift along a sagging rail over a full-bleed photo.
 * Hover turns a piece to face you and pauses the rail; click opens Quick view.
 * Drag (or swipe) to scrub the rail. Data comes from <script data-hr-json>. */
(function () {
  'use strict';
  if (window.HangRail) return;

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fineHover = window.matchMedia && window.matchMedia('(hover:hover) and (pointer:fine)').matches;

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function ss(x) { return x * x * (3 - 2 * x); }

  function create(sec) {
    var stage = sec.querySelector('[data-hr-stage]');
    var railPath = sec.querySelector('[data-hr-rail] path');
    var railSvg = sec.querySelector('[data-hr-rail]');
    var cap = sec.querySelector('[data-hr-cap]');
    var bar = sec.querySelector('[data-hr-progress]');
    var bg = sec.querySelector('.hr-bg');
    var json = sec.querySelector('[data-hr-json]');
    if (!stage || !json) return null;
    var products;
    try { products = JSON.parse(json.textContent); } catch (e) { return null; }
    if (!products.length) return null;

    var SPEED = +sec.getAttribute('data-speed') || 24;          // px per second
    var SAG = +sec.getAttribute('data-sag') || 0.07;            // rail dip, share of width
    var SWING = clamp(+sec.getAttribute('data-swing') || 70, 0, 100) / 100;
    var dead = false, visible = false, raf = 0, last = 0;

    // Quick view list + search registry
    var qvItems = products.map(function (p) {
      return {
        name: p.name, price: p.price, url: p.url,
        images: [p.front && p.front.src, p.back && p.back.src, p.side && p.side.src].filter(Boolean),
        options: p.options, variants: p.variants
      };
    });
    window.SiteProducts = (window.SiteProducts || []).concat(qvItems);

    /* ---------- build pieces (repeat the set so the loop always fills the rail) ---------- */
    var pieces = [];
    function makePiece(p, pi) {
      var el = document.createElement('div');
      el.className = 'hr-item';
      el.setAttribute('role', 'button');
      el.setAttribute('tabindex', pieces.length < products.length ? '0' : '-1');
      el.setAttribute('aria-label', p.name + ', ' + p.price);
      el.innerHTML =
        '<span class="hr-hook" aria-hidden="true"></span>' +
        '<div class="hr-garment">' +
        '  <img class="hr-side" src="' + p.side.src + '" alt="" draggable="false" decoding="async">' +
        (p.front ? '  <img class="hr-front" src="' + p.front.src + '" alt="" draggable="false" decoding="async" loading="lazy">' : '') +
        '</div>' +
        '<span class="hr-tag" aria-hidden="true"><span>' + (p.tag || p.price) + '</span></span>';
      stage.appendChild(el);
      var pc = {
        el: el, pi: pi, p: p,
        side: el.querySelector('.hr-side'), front: el.querySelector('.hr-front'),
        aSide: p.side.w && p.side.h ? p.side.w / p.side.h : 0.3,
        aFront: p.front && p.front.w && p.front.h ? p.front.w / p.front.h : 0.75,
        e: 0, t: 0, w: 0, x: 0, sw: 0, sv: 0
      };
      [pc.side, pc.front].forEach(function (im) {
        if (!im) return;
        im.addEventListener('load', function () {
          if (!im.naturalWidth) return;
          var a = im.naturalWidth / im.naturalHeight;
          if (im === pc.side) pc.aSide = a; else pc.aFront = a;
        }, { once: true });
      });
      el.addEventListener('focus', function () { if (!dragging) setHover(pc); });
      el.addEventListener('blur', function () { if (hover === pc) setHover(null); });
      el.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openQuick(pc); }
      });
      pieces.push(pc);
    }

    var W = 0, H = 0, GH = 0, GAP = 0, Y0 = 0, SAGPX = 0, L = 0, unitL = 0;
    function measure() {
      var r = stage.getBoundingClientRect();
      W = r.width; H = r.height;
      GH = clamp(H * 0.62, 170, 330);                 // garment height
      GAP = Math.max(8, GH * 0.05);
      Y0 = H * 0.06;                                  // rail height at the edges
      SAGPX = W * SAG;
      railSvg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      railPath.setAttribute('d', 'M -20 ' + Y0 + ' Q ' + (W / 2) + ' ' + (Y0 + SAGPX * 2) + ' ' + (W + 20) + ' ' + Y0);
      stage.style.setProperty('--hr-gh', GH + 'px');
      // enough copies of the set to cover the width plus a turned piece on each side
      unitL = products.reduce(function (s, p) { return s + GH * (p.side.w / p.side.h || 0.3) + GAP; }, 0);
      var need = Math.max(2, Math.ceil((W + GH * 2) / unitL) + 1);
      while (pieces.length < need * products.length) {
        products.forEach(function (p, i) { if (pieces.length < need * products.length) makePiece(p, i); });
      }
    }
    function railY(x) {
      var t = clamp(x / W, 0, 1);
      return Y0 + 4 * SAGPX * t * (1 - t);
    }

    /* ---------- motion state ---------- */
    var offset = 0, vel = reduceMotion ? 0 : SPEED, hover = null, dragging = false;
    var dragX = 0, dragOff = 0, dragV = 0, dragT = 0, moved = 0;

    function impulse(pc, v) {
      if (!pc || reduceMotion || !SWING) return;
      pc.sv += v * SWING;
    }

    function setHover(pc) {
      if (hover === pc) return;
      var prev = hover;
      if (prev) prev.t = 0;
      hover = pc;
      if (pc) {
        pc.t = 1;
        var i = pieces.indexOf(pc);
        impulse(pieces[i - 1], -30);
        impulse(pieces[i + 1], 30);
      }
      if (cap) {
        cap.classList.toggle('hr-cap-on', !!pc);
        var nm = cap.querySelector('[data-hr-cap-name]'), pr = cap.querySelector('[data-hr-cap-price]');
        if (pc && nm) { nm.textContent = pc.p.name; pr.textContent = pc.p.price; }
      }
      sec.classList.toggle('hr-hovering', !!pc);
    }

    function openQuick(pc) {
      if (!window.QuickView) return;
      window.QuickView.open({ items: qvItems, index: pc.pi });
    }

    /* ---------- frame ---------- */
    function frame(ts) {
      if (dead) return;
      raf = 0;
      var dt = last ? Math.min(0.05, (ts - last) / 1000) : 1 / 60;
      last = ts;

      // drift: ease to 0 while hovering or dragging, back to SPEED otherwise
      if (!dragging) {
        var target = hover || reduceMotion ? 0 : SPEED;
        vel += (target - vel) * (1 - Math.exp(-dt * 3));
        offset += vel * dt;
      }

      // widths (turning pieces widen), then lay out along the loop
      var total = 0, grow = 0;
      pieces.forEach(function (pc) {
        var k = 1 - Math.exp(-dt / 0.22);
        pc.e += (pc.t - pc.e) * k;
        if (Math.abs(pc.t - pc.e) < 0.002) pc.e = pc.t;
        var e = ss(pc.e);
        pc.w = GH * (pc.aSide + (pc.aFront - pc.aSide) * e);
        grow += pc.w - GH * pc.aSide;
        total += pc.w + GAP;
      });
      L = total;
      // shift everything back by half the growth so a turning piece widens from its centre
      var margin = GH * 1.2 + grow / 2;
      var cum = 0;
      pieces.forEach(function (pc) {
        var x = ((cum + offset) % L + L) % L - margin;
        cum += pc.w + GAP;
        pc.x = x;
      });

      // swing: damped pendulum per piece
      pieces.forEach(function (pc) {
        if (reduceMotion) return;
        var h = dt / 2;
        for (var i = 0; i < 2; i++) {
          pc.sv += (-28 * pc.sw - 2.4 * pc.sv) * h;
          pc.sw += pc.sv * h;
        }
        pc.sw = clamp(pc.sw, -12, 12);
      });

      // paint
      pieces.forEach(function (pc) {
        var cx = pc.x + pc.w / 2;
        var y = railY(cx);
        var e = ss(pc.e);
        pc.el.style.width = pc.w.toFixed(1) + 'px';
        pc.el.style.transform = 'translate3d(' + pc.x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0) rotate(' + (-pc.sw).toFixed(2) + 'deg)';
        pc.el.style.zIndex = pc.t ? 5 : 1;
        if (pc.front) {
          pc.side.style.opacity = clamp((0.56 - e) / 0.12, 0, 1);
          pc.side.style.transform = e > 0 ? 'perspective(900px) rotateY(' + (Math.min(1, e * 2) * -84).toFixed(1) + 'deg)' : '';
          pc.front.style.opacity = clamp((e - 0.44) / 0.12, 0, 1);
          pc.front.style.transform = 'scale(' + (0.92 + 0.08 * e).toFixed(3) + ')';
        }
        pc.el.classList.toggle('hr-live', e > 0.02);
      });

      if (bar && unitL) bar.style.transform = 'scaleX(' + (((offset % unitL) + unitL) % unitL / unitL).toFixed(4) + ')';

      var busy = visible && (vel !== 0 || dragging || pieces.some(function (pc) {
        return pc.e !== pc.t || Math.abs(pc.sw) > 0.03 || Math.abs(pc.sv) > 0.08;
      }));
      if (busy) raf = requestAnimationFrame(frame);
      else last = 0;
    }
    function kick() { if (!raf && !dead) raf = requestAnimationFrame(frame); }

    /* ---------- pointer ---------- */
    var mX = 0, mT = 0;
    function pieceAt(x, y) {
      var best = null, bd = 1e9;
      pieces.forEach(function (pc) {
        var r = pc.el.getBoundingClientRect();
        if (x < r.left - 2 || x > r.right + 2 || y < r.top - 10 || y > r.bottom + 30) return;
        var d = Math.abs(x - (r.left + r.right) / 2);
        if (d < bd) { bd = d; best = pc; }
      });
      return best;
    }
    stage.addEventListener('pointermove', function (ev) {
      var x = ev.clientX, y = ev.clientY, now = performance.now();
      if (dragging) {
        var dx = x - dragX;
        moved = Math.max(moved, Math.abs(dx));
        offset = dragOff + dx;
        var dtt = Math.max(1, now - dragT);
        dragV = dragV * 0.6 + ((x - mX) / dtt * 1000) * 0.4;
        dragT = now;
        mX = x;
        pieces.forEach(function (pc) { impulse(pc, clamp(-(dragV / 60), -18, 18) * 0.15); });
        kick();
        return;
      }
      // brushing past a hanger sets it swinging
      if (mT && now - mT < 100) {
        var vx = (x - mX) / Math.max(1, now - mT);
        pieces.forEach(function (pc) {
          if (pc === hover) return;
          var r = pc.el.getBoundingClientRect();
          if (y < r.top || y > r.bottom) return;
          var c = (r.left + r.right) / 2;
          if ((mX - c) * (x - c) < 0) impulse(pc, clamp(vx * 24, -50, 50));
        });
      }
      mX = x; mT = now;
      if (fineHover && ev.pointerType === 'mouse') setHover(pieceAt(x, y));
      kick();
    });
    stage.addEventListener('pointerleave', function () { mT = 0; if (!dragging) setHover(null); kick(); });
    stage.addEventListener('pointerdown', function (ev) {
      if (ev.button !== 0) return;
      dragging = true; moved = 0;
      dragX = mX = ev.clientX; dragOff = offset; dragV = 0; dragT = performance.now();
      try { stage.setPointerCapture(ev.pointerId); } catch (e) {}
      stage.classList.add('hr-drag');
      kick();
    });
    function endDrag(ev) {
      if (!dragging) return;
      dragging = false;
      stage.classList.remove('hr-drag');
      vel = clamp(dragV, -1400, 1400);              // fling, then eases back to the drift speed
      if (moved < 6 && ev && ev.type === 'pointerup') {
        var pc = pieceAt(ev.clientX, ev.clientY);
        if (pc) openQuick(pc);
      }
      kick();
    }
    stage.addEventListener('pointerup', endDrag);
    stage.addEventListener('pointercancel', endDrag);

    // page scroll: a light breeze
    var scY = window.pageYOffset, scT = 0;
    function onScroll() {
      if (!visible) return;
      var now = performance.now();
      if (bg && !reduceMotion) {
        var r = sec.getBoundingClientRect();
        var p = clamp((window.innerHeight - r.top) / (window.innerHeight + r.height), 0, 1);
        bg.style.transform = 'translate3d(0,' + ((p - 0.5) * 60).toFixed(1) + 'px,0) scale(1.12)';
      }
      if (now - scT < 110) return;
      var y = window.pageYOffset, dy = y - scY, dtt = now - scT;
      scY = y; scT = now;
      if (dtt > 400 || !dy) return;
      pieces.forEach(function (pc, i) { impulse(pc, clamp(dy / dtt * 9, -16, 16) * (i % 2 ? 1 : -0.8)); });
      kick();
    }
    window.addEventListener('scroll', onScroll, { passive: true });

    /* ---------- entrance + visibility ---------- */
    var entered = false;
    function enter() {
      if (entered) return;
      entered = true;
      sec.classList.add('hr-in');
      if (reduceMotion || !Element.prototype.animate) return;
      var n = 0;
      pieces.forEach(function (pc) {
        if (pc.x + pc.w < 0 || pc.x > W) return;
        var delay = 300 + n++ * 70, dir = n % 2 ? 1 : -1;
        pc.el.querySelector('.hr-garment').animate([
          { transform: 'translateY(-70px) rotate(' + dir * 6 + 'deg)', opacity: 0 },
          { transform: 'translateY(8px)', opacity: 1, offset: 0.7 },
          { transform: 'none', opacity: 1 }
        ], { duration: 700, delay: delay, easing: 'cubic-bezier(.25,.8,.35,1)', fill: 'backwards' });
        setTimeout(function () { impulse(pc, dir * 30); kick(); }, delay + 600);
      });
    }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) {
        visible = en[0].isIntersecting;
        if (visible) { if (en[0].intersectionRatio > 0.25) enter(); onScroll(); kick(); }
      }, { threshold: [0, 0.25] }).observe(sec);
    } else { visible = true; enter(); }

    measure();
    window.addEventListener('resize', function () { measure(); kick(); });
    frame(performance.now());

    return { destroy: function () { dead = true; if (raf) cancelAnimationFrame(raf); window.removeEventListener('scroll', onScroll); } };
  }

  var instances = new Map();
  function initAll(root) {
    [].forEach.call((root || document).querySelectorAll('[data-hr-section]'), function (sec) {
      if (!instances.has(sec)) { var i = create(sec); if (i) instances.set(sec, i); }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { initAll(); });
  else initAll();
  document.addEventListener('shopify:section:load', function (e) { initAll(e.target); });
  document.addEventListener('shopify:section:unload', function (e) {
    [].forEach.call(e.target.querySelectorAll('[data-hr-section]'), function (sec) {
      var i = instances.get(sec);
      if (i) { i.destroy(); instances.delete(sec); }
    });
  });
  window.HangRail = { initAll: initAll };
})();
