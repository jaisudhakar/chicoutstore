/* Rack Showcase — Shopify section script (Phase 1).
 * One instance per [data-sagar-section]. Re-initialises and cleans up with the
 * theme editor (shopify:section:load / unload, block:select / deselect). */
(function () {
  'use strict';
  if (window.RackShowcase) return;

  var instances = new Map();

  /* ---------- shared: trim transparent space above the hanger ----------
     Measured from the already-loaded <img> (no second download), once per URL,
     when the browser is idle. Cross-origin images that can't be read are skipped. */
  var gapCache = {};
  var idle = window.requestIdleCallback || function (f) { return setTimeout(f, 60); };
  function applyTopGap(im, frac) {
    if (frac > 0.004) im.style.transform = 'translateY(-' + (frac * 100).toFixed(2) + '%)';
  }
  function measureTopGap(im) {
    var src = im.currentSrc || im.src;
    if (!src || !im.naturalWidth) return;
    if (gapCache[src] !== undefined) { applyTopGap(im, gapCache[src]); return; }
    gapCache[src] = 0;
    idle(function () {
      var frac = 0;
      try {
        var w = Math.min(120, im.naturalWidth || 1);
        var h = Math.max(1, Math.round((im.naturalHeight || 1) * (w / (im.naturalWidth || 1))));
        var c = document.createElement('canvas');
        c.width = w; c.height = h;
        var x = c.getContext('2d', { willReadFrequently: true });
        x.drawImage(im, 0, 0, w, h);
        var d = x.getImageData(0, 0, w, Math.ceil(h * 0.35)).data;   // only the top third matters
        var rows = Math.ceil(h * 0.35), row = 0, found = false;
        for (; row < rows && !found; row++) {
          for (var i = row * w * 4 + 3; i < (row + 1) * w * 4; i += 4) {
            if (d[i] > 12) { found = true; break; }
          }
        }
        if (found) frac = (row - 1) / h;
      } catch (e) { frac = 0; }           // tainted (cross-origin) → leave as is
      gapCache[src] = Math.max(0, frac);
      [].forEach.call(document.querySelectorAll('.sagar-view img'), function (el) {
        if ((el.currentSrc || el.src) === src) applyTopGap(el, gapCache[src]);
      });
    });
  }

  /* hi-res prefetch (focus view) — each URL once */
  var hiDone = {};
  function prefetchHi(root) {
    [].forEach.call(root.querySelectorAll('img[data-hi]'), function (im) {
      var u = im.getAttribute('data-hi');
      if (!u || hiDone[u]) return;
      hiDone[u] = 1;
      var pre = new Image();
      pre.decoding = 'async';
      pre.src = u;
    });
  }

  function num(el, attr, fallback) {
    var v = parseFloat(el.getAttribute(attr));
    return isNaN(v) ? fallback : v;
  }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function stripEditorAttrs(root) {
    [root].concat([].slice.call(root.querySelectorAll('*'))).forEach(function (n) {
      [].slice.call(n.attributes).forEach(function (a) {
        if (a.name.indexOf('data-shopify') === 0) n.removeAttribute(a.name);
      });
    });
  }
  function inView(r) {
    return r && r.width > 0 && r.bottom > 0 && r.top < window.innerHeight && r.right > 0 && r.left < window.innerWidth;
  }

  /* ---------- one section instance ---------- */
  function create(sec, opts) {
    opts = opts || {};
    var rack = sec.querySelector('[data-sagar-rack]');
    if (!rack) { sec.classList.remove('sagar-pre'); return null; }
    var items = [].slice.call(rack.querySelectorAll('[data-sagar-item]'));
    if (!items.length) { sec.classList.remove('sagar-pre'); return null; }

    var HOVER_MS = num(sec, 'data-hover-speed', 650);
    var HOVER_GAP = num(sec, 'data-hover-gap', 18);
    var TURN_MS = num(sec, 'data-turn-speed', 700);
    var SL_MS = num(sec, 'data-slide-interval', 3000);
    var SWING = clamp(num(sec, 'data-swing', 60), 0, 100) / 100;
    var DROP = sec.getAttribute('data-drop') === 'true';
    var LIFT = sec.getAttribute('data-lift') === 'true';
    var QA_REDIRECT = sec.getAttribute('data-qa-redirect') === 'true';
    var TOTAL = items.length;
    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var fineHover = window.matchMedia && window.matchMedia('(hover:hover) and (pointer:fine)').matches;
    var slMQ = window.matchMedia ? window.matchMedia('(max-width:599.98px)') : null;
    var canAnimate = typeof Element !== 'undefined' && !!Element.prototype.animate;

    var dead = false;
    var listeners = [];
    var timers = [];
    function on(t, type, fn, o) {
      t.addEventListener(type, fn, o || false);
      listeners.push([t, type, fn, o || false]);
    }
    function later(fn, ms) {
      var id = setTimeout(function () {
        timers.splice(timers.indexOf(id), 1);
        if (!dead) fn();
      }, ms);
      timers.push(id);
      return id;
    }

    // slider state (declared early: initWidths references it)
    var slOn = false, slTimer = null, slClones = [], slSetW = 0, slDots = [], slHold = 0, slNormTimer = null;
    // touch two-tap state: tapSel = garment turned by a first tap, tapBack = garment to turn back after the modal closes
    var cloneStates = [], tapSel = null, tapBack = null, lastPtr = '', tapScrollT = null;
    var visible = true;

    items.forEach(function (it, i) { it.setAttribute('data-idx', '' + (i + 1)); });

    /* caption swap */
    var capEl = sec.querySelector('[data-sagar-caption]');
    var capDefault = capEl ? capEl.innerHTML : '';
    var capCur = '', capTimer = null;
    function setCaption(txt) {
      var key = txt === null ? '' : txt;
      if (!capEl || capCur === key) return;
      capCur = key;
      capEl.classList.add('sagar-cap-swap');
      if (capTimer) clearTimeout(capTimer);
      capTimer = setTimeout(function () {
        if (txt === null) capEl.innerHTML = capDefault;
        else capEl.textContent = txt;
        capEl.classList.remove('sagar-cap-swap');
      }, 160);
    }

    /* views + widths */
    function viewsOf(root) {
      return [].slice.call(root.querySelectorAll('.sagar-view')).map(function (el) {
        return { el: el, pos: parseFloat(el.getAttribute('data-sagar-pos')) };
      }).sort(function (a, b) { return a.pos - b.pos; });
    }
    function blend(views, v) {
      for (var i = 0; i < views.length; i++) {
        var w = 0, p = views[i].pos;
        var prev = i > 0 ? views[i - 1].pos : null;
        var next = i < views.length - 1 ? views[i + 1].pos : null;
        if (v === p) w = 1;
        else if (v < p && prev !== null && v > prev) w = (v - prev) / (p - prev);
        else if (v > p && next !== null && v < next) w = (next - v) / (next - p);
        else if (v <= p && prev === null) w = 1;
        else if (v >= p && next === null) w = 1;
        views[i].el.style.opacity = Math.max(0, Math.min(1, w));
      }
    }

    var states = items.map(function (it) {
      var g = it.querySelector('.sagar-garment');
      return { it: it, g: g, views: viewsOf(g), p: 0, t: 0, asp: null, hpx: 0, blockId: it.getAttribute('data-block-id') };
    });
    states.forEach(function (s) { blend(s.views, 0); s.orig = s; });
    // originals + slider clones (clones turn on tap too)
    function turnStates() { return cloneStates.length ? states.concat(cloneStates) : states; }

    function aspectOf(view) {
      var img = view.el.querySelector('img');
      if (!img) return null;
      if (img.naturalWidth > 0 && img.naturalHeight > 0) return img.naturalWidth / img.naturalHeight;
      var aw = +img.getAttribute('width'), ah = +img.getAttribute('height');   // known before load
      return aw > 0 && ah > 0 ? aw / ah : null;
    }
    function refreshAspects() {
      states.forEach(function (s) {
        var pts = [];
        s.views.forEach(function (v) {
          if (v.pos >= 0) {
            var a = aspectOf(v);
            if (a) pts.push({ pos: v.pos, asp: a });
          }
        });
        pts.sort(function (a, b) { return a.pos - b.pos; });
        s.asp = pts.length ? pts : null;
        s.flip = s.views.filter(function (v) { return v.pos > 0 && v.pos < 1; }).length === 0;
      });
    }
    function aspectAt(s, e) {
      var pts = s.asp;
      if (!pts || !pts.length) return 0.33 + 0.65 * e;
      if (e <= pts[0].pos) return pts[0].asp;
      for (var i = 0; i < pts.length - 1; i++) {
        if (e <= pts[i + 1].pos) {
          var f = (e - pts[i].pos) / (pts[i + 1].pos - pts[i].pos || 1);
          return pts[i].asp + (pts[i + 1].asp - pts[i].asp) * f;
        }
      }
      return pts[pts.length - 1].asp;
    }
    function measureHeights() {
      states.forEach(function (s) { s.hpx = s.g.getBoundingClientRect().height || 0; });
    }
    function autoFitHeight() {
      rack.style.removeProperty('--sagar-h');
      if (slMQ && slMQ.matches) return;
      var cs = window.getComputedStyle(rack);
      var base = parseFloat(cs.getPropertyValue('--sagar-h')) || 260;
      var gap = parseFloat(cs.columnGap) || 0;
      var W = rack.clientWidth;
      var sumSide = 0, maxDelta = 0;
      states.forEach(function (s) {
        var a0 = aspectAt(s, 0), a1 = aspectAt(s, 1);
        sumSide += a0;
        if (a1 - a0 > maxDelta) maxDelta = a1 - a0;
      });
      if (sumSide > 0 && W > 0) {
        var hFit = (W - gap * (states.length - 1) - 8 - HOVER_GAP * 2) / (sumSide + maxDelta);
        var h = Math.min(base, Math.max(80, hFit));
        rack.style.setProperty('--sagar-h', h.toFixed(1) + 'px');
      }
    }
    function applyWidth(s, e) {
      if (!s.hpx) return;
      s.it.style.width = Math.round(s.hpx * aspectAt(s, e)) + 'px';
    }
    function initWidths() {
      if (dead) return;
      refreshAspects();
      autoFitHeight();
      measureHeights();
      states.forEach(function (s) { applyWidth(s, s.t); });
      if (slOn) slSyncWidths();
    }
    var widthsQueued = false;
    function queueWidths() {
      if (widthsQueued) return;
      widthsQueued = true;
      requestAnimationFrame(function () { widthsQueued = false; initWidths(); });
    }
    initWidths();
    on(window, 'load', queueWidths);
    on(window, 'resize', queueWidths);

    [].forEach.call(rack.querySelectorAll('.sagar-view img[src]'), function (im) {
      if (im.complete && im.naturalWidth > 0) measureTopGap(im);
      else on(im, 'load', function () { queueWidths(); measureTopGap(im); }, { once: true });
    });

    /* ================= SWING PHYSICS =================
       Each hanger is a damped pendulum around its hook.
       a = angle (deg, + means the hem swings right), v = angular velocity (deg/s). */
    var swingOn = SWING > 0 && !reduceMotion;
    var K_SPRING = 26, K_DAMP = 2.3, MAX_A = 11;
    var swingRaf = 0, swingLast = 0;
    function swingEls() { return items.concat(slClones); }
    function impulse(el, v) {
      if (!swingOn || !el || dead) return;
      var s = el._sagarSw || (el._sagarSw = { a: 0, v: 0 });
      s.v += v * SWING;
      if (!swingRaf) { swingLast = 0; swingRaf = requestAnimationFrame(swingLoop); }
    }
    function swingLoop(ts) {
      if (dead) return;
      var dt = swingLast ? Math.min(0.05, (ts - swingLast) / 1000) : 1 / 60;
      swingLast = ts;
      var live = false;
      swingEls().forEach(function (el) {
        var s = el._sagarSw;
        if (!s) return;
        if (Math.abs(s.a) < 0.03 && Math.abs(s.v) < 0.08) {
          if (s.a !== 0 || s.v !== 0) { s.a = 0; s.v = 0; el.style.setProperty('--sagar-sw', '0deg'); }
          return;
        }
        var h = dt / 2;
        for (var i = 0; i < 2; i++) {               // semi-implicit Euler, 2 sub-steps
          s.v += (-K_SPRING * s.a - K_DAMP * s.v) * h;
          s.a += s.v * h;
        }
        if (s.a > MAX_A) { s.a = MAX_A; s.v *= -0.35; }
        else if (s.a < -MAX_A) { s.a = -MAX_A; s.v *= -0.35; }
        // CSS rotate(+) is clockwise (hem swings left), so negate
        el.style.setProperty('--sagar-sw', (-s.a).toFixed(2) + 'deg');
        live = true;
      });
      swingRaf = live ? requestAnimationFrame(swingLoop) : 0;
    }

    // page scroll: a light breeze through the rack
    var scY = window.pageYOffset || 0, scT = 0;
    on(window, 'scroll', function () {
      if (!swingOn || !visible) return;
      var now = performance.now();
      if (now - scT < 110) return;
      var y = window.pageYOffset || 0, dt = now - scT, dy = y - scY;
      scY = y; scT = now;
      if (dt > 400 || !dy) return;
      var sp = dy / dt;
      swingEls().forEach(function (el, i) {
        impulse(el, clamp(sp * 9, -16, 16) * (i % 2 ? 1 : -0.8) * (0.8 + (i % 3) * 0.15));
      });
    }, { passive: true });

    // horizontal rack scroll (mobile slider): garments lag behind the swipe
    var rxL = 0, rxT = 0;
    on(rack, 'scroll', function () {
      if (!swingOn || !slOn) return;
      var now = performance.now();
      if (now - rxT < 70) return;
      var x = rack.scrollLeft, dt = now - rxT, dx = x - rxL;
      rxL = x; rxT = now;
      if (dt > 300 || Math.abs(dx) > 500 || !dx) return;
      var sp = dx / dt;
      swingEls().forEach(function (el) { impulse(el, clamp(-sp * 14, -28, 28)); });
    }, { passive: true });

    /* ================= HOVER TURN ================= */
    var running = false, lastTs = 0, rafId = 0;
    function ss(x) { return x * x * (3 - 2 * x); }
    function loop(ts) {
      if (dead) return;
      if (!lastTs) lastTs = ts;
      var dt = Math.min(64, ts - lastTs);
      lastTs = ts;
      var k = 1 - Math.exp(-dt / (HOVER_MS * 0.3));
      var busy = false;
      turnStates().forEach(function (s) {
        var d = s.t - s.p;
        if (Math.abs(d) > 0.02) { s.p += d * k; busy = true; }
        else if (s.p !== s.t) { s.p = s.t; busy = true; }
        else return;
        var e = ss(s.p);
        s.it.style.setProperty('--sagar-p', e.toFixed(4));
        s.it.classList.toggle('sagar-live', e > 0.02);
        if (s.flip) {
          var sideOp = Math.max(0, Math.min(1, (0.56 - e) / 0.12));
          var frontOp = Math.max(0, Math.min(1, (e - 0.44) / 0.12));
          s.views.forEach(function (v) {
            var o = v.pos === 0 ? sideOp : (v.pos === 1 ? frontOp : 0);
            v.el.style.opacity = o;
            if (v.pos === 0) {
              var sAng = Math.min(1, e * 2) * -84;
              v.el.style.transform = e <= 0 ? 'none' : 'perspective(900px) rotateY(' + sAng.toFixed(2) + 'deg)';
            } else if (v.pos === 1) {
              v.el.style.transform = e >= 1 ? 'none' : 'scale(' + (0.92 + 0.08 * e).toFixed(4) + ')';
            }
          });
          s.g.style.transform = 'none';
        } else {
          blend(s.views, e);
          s.g.style.transform = 'perspective(900px) rotateY(' + ((1 - e) * -14).toFixed(2) + 'deg)';
        }
      });
      if (busy) rafId = requestAnimationFrame(loop);
      else { running = false; lastTs = 0; rafId = 0; }
    }
    function kick() {
      if (!running) { running = true; rafId = requestAnimationFrame(loop); }
    }

    var curHover = null;
    function setHover(s) {
      if (curHover === s) return;
      var prev = curHover;
      if (curHover) { curHover.t = 0; applyWidth(curHover, 0); }
      curHover = s;
      if (curHover) {
        var hov = curHover;
        later(function () { if (curHover === hov) prefetchHi(hov.it); }, 140);   // hover intent
        curHover.t = 1;
        applyWidth(curHover, 1);
        setCaption(curHover.it.getAttribute('data-name') || null);
        // turning garment widens and nudges its neighbours aside
        var i = states.indexOf(curHover);
        if (states[i - 1]) impulse(states[i - 1].it, -26);
        if (states[i + 1]) impulse(states[i + 1].it, 26);
      } else {
        setCaption(null);
      }
      if (prev && prev !== curHover) {
        var j = states.indexOf(prev);
        if (states[j - 1] && states[j - 1] !== curHover) impulse(states[j - 1].it, 12);
        if (states[j + 1] && states[j + 1] !== curHover) impulse(states[j + 1].it, -12);
      }
      kick();
    }
    if (fineHover) {
      var mX = 0, mT = 0;
      on(rack, 'mousemove', function (ev) {
        var x = ev.clientX, y = ev.clientY, now = performance.now();

        // brushing past a hanger sets it swinging in the cursor's direction
        if (mT && now - mT < 100 && swingOn) {
          var vx = (x - mX) / Math.max(1, now - mT);
          states.forEach(function (st) {
            if (st === curHover) return;
            var r = st.it.getBoundingClientRect();
            if (y < r.top || y > r.bottom) return;
            var c = (r.left + r.right) / 2;
            if ((mX - c) * (x - c) < 0) impulse(st.it, clamp(vx * 24, -50, 50));
          });
        }
        mX = x; mT = now;

        if (curHover) {
          var cr = curHover.it.getBoundingClientRect();
          if (x >= cr.left - 20 && x <= cr.right + 20 && y >= cr.top - 10 && y <= cr.bottom + 40) return;
        }
        var best = null, bd = 1e9;
        states.forEach(function (s) {
          var r = s.it.getBoundingClientRect();
          if (y < r.top - 10 || y > r.bottom + 40) return;
          if (x < r.left - 2 || x > r.right + 2) return;
          var d = Math.abs(x - (r.left + r.right) / 2);
          if (d < bd) { bd = d; best = s; }
        });
        setHover(best || null);
      });
      on(rack, 'mouseleave', function () { mT = 0; setHover(null); });
    }

    /* ================= TOUCH: TWO-TAP =================
       1st tap turns the garment to the front, 2nd tap on the same garment opens the modal.
       Mouse clicks and the keyboard open the modal straight away. */
    function touchTap() { return lastPtr ? lastPtr !== 'mouse' : !fineHover; }
    on(rack, 'pointerdown', function (ev) { lastPtr = ev.pointerType || ''; }, true);

    function setTapped(s) {
      if (tapSel === s) return;
      var prev = tapSel;
      if (prev) { prev.t = 0; applyWidth(prev, 0); }
      tapSel = s;
      if (s) {
        s.t = 1;
        applyWidth(s, 1);
        prefetchHi(s.it);
        setCaption(s.it.getAttribute('data-name') || null);
        impulse(s.it.previousElementSibling, -26);
        impulse(s.it.nextElementSibling, 26);
      } else {
        setCaption(null);
      }
      kick();
    }
    function releaseTapBack() {
      var b = tapBack;
      tapBack = null;
      if (!b || dead || tapSel === b) return;
      b.t = 0;
      applyWidth(b, 0);
      setCaption(null);
      kick();
    }
    function itemTap(e, s) {
      e.preventDefault();
      if (slOn) slPause(6000);
      if (touchTap() && tapSel !== s) {
        setTapped(s);                                         // first tap: show the front
        if (slOn) {
          var i = slAll().indexOf(s.it);
          slGoto(i);                                          // centre it…
          later(function () { if (tapSel === s) slGoto(i); }, HOVER_MS + 40);   // …again once widened
        }
        return;
      }
      if (tapSel && tapSel !== s) setTapped(null);
      if (tapSel === s) { tapBack = s; tapSel = null; }       // turns back side-on after the modal closes
      openFocus(s.orig, s.it);                                // second tap (or mouse click): open the modal
    }
    // tapping anywhere outside a garment turns the tapped one back
    on(document, 'pointerdown', function (e) {
      if (!tapSel) return;
      var it = e.target && e.target.closest ? e.target.closest('.sagar-item') : null;
      if (!it || !rack.contains(it)) setTapped(null);
    }, true);

    states.forEach(function (s) {
      on(s.it, 'click', function (e) { itemTap(e, s); });
      on(s.it, 'keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openFocus(s, s.it); }
      });
      on(s.it, 'focus', function () { if (!slOn && !touchTap()) setHover(s); });
      on(s.it, 'blur', function () { if (!slOn && curHover === s) setHover(null); });
    });

    /* ================= DROP-IN ENTRANCE ================= */
    var dropped = !DROP || reduceMotion || !canAnimate || !!opts.noDrop || !('IntersectionObserver' in window);
    if (dropped) sec.classList.remove('sagar-pre');
    var dropWaiting = false;
    function railReady(maxMs, cb) {
      var vw = window.innerWidth, pending = 0, fired = false;
      function go() { if (!fired) { fired = true; cb(); } }
      items.forEach(function (it) {
        var r = it.getBoundingClientRect();
        if (r.right < 0 || r.left > vw) return;
        var im = it.querySelector('.sagar-view[data-sagar-pos="0"] img');
        if (!im || (im.complete && im.naturalWidth)) return;
        pending++;
        var done = function () { if (--pending <= 0) go(); };
        im.addEventListener('load', done, { once: true });
        im.addEventListener('error', done, { once: true });
      });
      if (!pending) go(); else later(go, maxMs);
    }
    function dropIn() {
      if (dropped) return;
      dropped = true;
      var vw = window.innerWidth, n = 0;
      swingEls().forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.right < 0 || r.left > vw) return;          // off-screen slider clones: no show
        var delay = 120 + n * 85, dir = n % 2 ? -1 : 1;
        n++;
        el.animate([
          { transform: 'translateY(-90px) rotate(' + (dir * 7) + 'deg)', opacity: 0 },
          { transform: 'translateY(9px) rotate(' + (-dir * 2) + 'deg)', opacity: 1, offset: 0.7 },
          { transform: 'translateY(0) rotate(0deg)', opacity: 1 }
        ], { duration: 640, delay: delay, easing: 'cubic-bezier(.25,.8,.35,1)', fill: 'backwards' });
        later(function () { impulse(el, dir * 34); }, delay + 560);   // lands on the rod and sways
      });
      sec.classList.remove('sagar-pre');
    }

    /* ================= FOCUS VIEW ================= */
    var focus = sec.querySelector('[data-sagar-focus]');
    if (focus) {
      // copy the section's CSS variables, then move to <body> so position:fixed
      // is never trapped by a transformed ancestor in the theme
      focus.setAttribute('style', sec.getAttribute('style') || '');
      document.body.appendChild(focus);
    }
    function q(sel) { return focus ? focus.querySelector(sel) : null; }
    var fbg = q('[data-sagar-fbg]');
    var finner = q('[data-sagar-finner]');
    var fstage = q('[data-sagar-fstage]');
    var fname = q('[data-sagar-fname]');
    var fsub = q('[data-sagar-fsub]');
    var fprice = q('[data-sagar-fprice]');
    var fidx = q('[data-sagar-fidx]');
    var facBar = q('[data-sagar-factionbar]');
    var facName = q('[data-sagar-factionname]');
    var facBtn = q('[data-sagar-factionbtn]');
    var facLbl = q('[data-sagar-factionlabel]');
    var tabF = q('[data-sagar-tab="front"]');
    var tabB = q('[data-sagar-tab="back"]');
    var closeBtn = q('.sagar-focus-close');
    var fGarment = null, fAng = 0, fAngT = 0, fAnim = null, fLast = 0, prevOverflow = '';
    var fCloseTimer = null, lastActive = null;
    var fSrc = null, fState = null, fFlight = null, closing = false;

    function T(key, fb) { return (focus && focus.getAttribute('data-t-' + key)) || fb; }
    var STR = {
      add: T('add', 'Add to cart'),
      soldout: T('soldout', 'Sold out'),
      added: T('added', 'Added to cart'),
      viewcart: T('viewcart', 'View cart'),
      unavailable: T('unavailable', 'Unavailable'),
      error: T('error', 'Could not add to cart. Please try again.')
    };

    function isOpen() { return !!focus && focus.classList.contains('sagar-focus-open'); }
    function fApply() {
      if (fGarment) fGarment.style.transform = 'rotateY(' + fAng.toFixed(2) + 'deg)';
    }
    function fblendLoop(ts) {
      if (dead) return;
      if (!fLast) fLast = ts;
      var dt = Math.min(80, ts - fLast);
      fLast = ts;
      var d = fAngT - fAng;
      var k = 1 - Math.exp(-dt / (TURN_MS * 0.22));
      if (Math.abs(d) < 0.4) fAng = fAngT; else fAng += d * k;
      fApply();
      if (fAng !== fAngT) fAnim = requestAnimationFrame(fblendLoop);
      else {
        if (fAng === -180) { fAng = fAngT = 180; fApply(); }
        fAnim = null; fLast = 0;
      }
    }
    function setTabs(front) {
      if (tabF) { tabF.classList.toggle('sagar-tab-on', front); tabF.setAttribute('aria-pressed', front ? 'true' : 'false'); }
      if (tabB) { tabB.classList.toggle('sagar-tab-on', !front); tabB.setAttribute('aria-pressed', front ? 'false' : 'true'); }
    }
    function fgo(target) {
      fAngT = target;
      setTabs(target === 0);
      if (!fAnim) fAnim = requestAnimationFrame(fblendLoop);
    }

    var fDrag = false, fDragX = 0, fDragA = 0;
    function fEndDrag() {
      if (!fDrag) return;
      fDrag = false;
      if (fstage) fstage.classList.remove('sagar-dragging');
      var t = Math.abs(fAng) < 90 ? 0 : (fAng > 0 ? 180 : -180);
      fAngT = t;
      setTabs(t === 0);
      if (!fAnim) fAnim = requestAnimationFrame(fblendLoop);
    }
    if (fstage) {
      on(fstage, 'pointerdown', function (ev) {
        if (!fGarment || !isOpen() || closing) return;
        fDrag = true; fDragX = ev.clientX; fDragA = fAng;
        if (fAnim) { cancelAnimationFrame(fAnim); fAnim = null; fLast = 0; }
        try { fstage.setPointerCapture(ev.pointerId); } catch (e) {}
        fstage.classList.add('sagar-dragging');
        ev.preventDefault();
      });
      on(fstage, 'pointermove', function (ev) {
        if (!fDrag) return;
        var a = fDragA + (ev.clientX - fDragX) * 0.45;
        if (a < -220) a = -220;
        if (a > 220) a = 220;
        fAng = a; fAngT = a;
        fApply();
      });
      on(fstage, 'pointerup', fEndDrag);
      on(fstage, 'pointercancel', fEndDrag);
      on(fstage, 'lostpointercapture', fEndDrag);
    }

    function pad2(n) { n = '' + n; return n.length < 2 ? '0' + n : n; }

    /* lift off / hang back: animate the stage between the rail slot and the centre */
    function flight(fromRect, reverse, done) {
      var to = fstage.getBoundingClientRect();
      var gh = to.height * (0.98 / 1.02);
      var sc = fromRect.height / (gh || 1);
      var dx = (fromRect.left + fromRect.width / 2) - (to.left + to.width / 2);
      var dy = fromRect.top - to.top;
      var lift = Math.min(90, Math.abs(dy) * 0.25 + 34);
      var start = 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px) scale(' + sc.toFixed(4) + ')';
      var mid = 'translate(' + (dx * 0.4).toFixed(1) + 'px,' + (dy * 0.4 - lift).toFixed(1) + 'px) scale(' +
                ((sc + 1) / 2 * 1.03).toFixed(4) + ') rotate(' + (dx > 0 ? -2.5 : 2.5) + 'deg)';
      var end = 'translate(0px,0px) scale(1)';
      var frames = reverse
        ? [{ transform: end }, { transform: mid, offset: 0.5 }, { transform: start }]
        : [{ transform: start }, { transform: mid, offset: 0.5 }, { transform: end }];
      var a = fstage.animate(frames, {
        duration: reverse ? 560 : 680,
        easing: reverse ? 'cubic-bezier(.45,0,.55,1)' : 'cubic-bezier(.22,.85,.3,1)',
        fill: 'both'
      });
      if (done) a.onfinish = done;
      return a;
    }

    function resetFocusState() {
      if (fFlight) { try { fFlight.cancel(); } catch (e) {} fFlight = null; }
      if (fCloseTimer) { clearTimeout(fCloseTimer); fCloseTimer = null; }
      if (fSrc) { fSrc.style.visibility = ''; fSrc = null; }
      closing = false;
      if (fstage) fstage.classList.remove('sagar-pop', 'sagar-fade');
    }

    function openFocus(s, srcEl) {
      if (!focus || !fstage) return;
      resetFocusState();
      srcEl = srcEl || s.it;
      lastActive = document.activeElement;

      fstage.innerHTML = '';
      var clone = s.it.cloneNode(true);
      stripEditorAttrs(clone);
      clone.removeAttribute('tabindex');
      clone.removeAttribute('role');
      clone.removeAttribute('aria-label');
      clone.removeAttribute('data-sagar-item');
      clone.classList.remove('sagar-live');
      clone.style.setProperty('--sagar-p', '1');
      clone.style.setProperty('--sagar-sw', '0deg');
      [].forEach.call(clone.querySelectorAll('.sagar-view'), function (v) {
        v.style.transform = '';
        v.style.opacity = '';
      });
      [].forEach.call(clone.querySelectorAll('img'), function (im) {
        im.removeAttribute('loading');
        im.removeAttribute('fetchpriority');
        var hi = im.getAttribute('data-hi');
        if (hi && im.getAttribute('src') !== hi) im.setAttribute('src', hi);   // low-res stays visible until hi arrives
      });
      var cg = clone.querySelector('.sagar-garment');
      if (cg) cg.style.transform = 'rotateY(0deg)';
      fstage.appendChild(clone);
      fGarment = cg;
      fAng = 0; fAngT = 0;
      setTabs(true);

      var name = s.it.getAttribute('data-name') || '';
      var sub = s.it.getAttribute('data-sub') || '';
      var price = s.it.getAttribute('data-price') || '';
      if (fname) fname.textContent = name;
      if (fsub) { fsub.textContent = sub; fsub.style.display = sub ? '' : 'none'; }
      if (fprice) { fprice.textContent = price; fprice.style.display = price ? '' : 'none'; }
      if (fidx) fidx.textContent = pad2(s.it.getAttribute('data-idx') || '1') + ' / ' + pad2(TOTAL);
      focus.setAttribute('aria-label', name || 'Product view');

      if (facName) facName.textContent = name;
      var bLbl = (s.it.getAttribute('data-btn-label') || '').trim();
      var bUrl = s.it.getAttribute('data-btn-url') || '';
      var bTgt = s.it.getAttribute('data-btn-target') || '';
      if (facLbl) facLbl.textContent = bLbl;
      if (facBtn) {
        facBtn.setAttribute('href', bUrl || '#');
        facBtn.setAttribute('target', bTgt === '_blank' ? '_blank' : '_self');
        if (bTgt === '_blank') facBtn.setAttribute('rel', 'noopener');
        else facBtn.removeAttribute('rel');
      }
      if (facBar) facBar.classList.toggle('sagar-no-btn', !bLbl);

      qaSetup(s);

      var srcG = srcEl.querySelector('.sagar-garment');
      var fromRect = srcG ? srcG.getBoundingClientRect() : null;

      try { prevOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; } catch (e) {}
      focus.classList.add('sagar-focus-open');
      focus.setAttribute('aria-hidden', 'false');
      focus.scrollTop = 0;
      fState = s;

      if (LIFT && canAnimate && !reduceMotion && inView(fromRect)) {
        fSrc = srcEl;
        srcEl.style.visibility = 'hidden';           // the hanger is now empty
        fFlight = flight(fromRect, false);
      } else {
        void fstage.offsetWidth;
        fstage.classList.add('sagar-pop');
      }

      requestAnimationFrame(function () { focus.classList.add('sagar-focus-in'); });
      if (closeBtn) { try { closeBtn.focus({ preventScroll: true }); } catch (e) { closeBtn.focus(); } }
      if (!fAnim) fAnim = requestAnimationFrame(fblendLoop);
    }

    function landBack(src, s) {
      impulse(src, (Math.random() > 0.5 ? 1 : -1) * 40);
      // it lands facing you, then turns back to its side-on resting pose
      if (s && src === s.it && s !== curHover && s.flip) { s.p = 1; s.t = 0; kick(); }
    }

    function closeFocus() {
      if (!isOpen() || closing) return;
      closing = true;
      if (fAnim) { cancelAnimationFrame(fAnim); fAnim = null; fLast = 0; }
      fDrag = false;
      if (fstage) fstage.classList.remove('sagar-dragging');
      focus.classList.remove('sagar-focus-in');
      focus.setAttribute('aria-hidden', 'true');
      try { document.body.style.overflow = prevOverflow; } catch (e) {}

      var src = fSrc, s = fState;
      var srcG = src && src.isConnected ? src.querySelector('.sagar-garment') : null;
      var r = srcG ? srcG.getBoundingClientRect() : null;

      function finish() {
        if (fFlight) { try { fFlight.cancel(); } catch (e) {} fFlight = null; }
        focus.classList.remove('sagar-focus-open');
        fstage.classList.remove('sagar-pop', 'sagar-fade');
        fstage.innerHTML = '';
        fGarment = null; fCloseTimer = null; closing = false;
      }

      if (src && inView(r) && canAnimate && !reduceMotion) {
        if (fFlight) { try { fFlight.cancel(); } catch (e) {} }
        fFlight = flight(r, true, function () {
          if (dead) return;
          src.style.visibility = '';
          fSrc = null;
          landBack(src, s);
          releaseTapBack();
          finish();
        });
      } else {
        if (src) src.style.visibility = '';
        fSrc = null;
        fstage.classList.add('sagar-fade');
        releaseTapBack();
        fCloseTimer = setTimeout(finish, 320);
      }
      if (lastActive && lastActive.isConnected && lastActive.focus) {
        try { lastActive.focus({ preventScroll: true }); } catch (e) {}
      }
      slPause();
    }

    if (closeBtn) {
      on(closeBtn, 'click', function (e) { e.preventDefault(); e.stopPropagation(); closeFocus(); });
    }
    if (focus) {
      on(focus, 'click', function (e) {
        if (e.target === focus || e.target === fbg || e.target === finner) closeFocus();
      });
    }
    on(document, 'keydown', function (e) {
      if (!isOpen() || closing) return;
      if (e.key === 'Escape') { closeFocus(); return; }
      var tag = e.target && e.target.tagName;
      if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && tag !== 'INPUT') { fgo(fAngT === 0 ? 180 : 0); return; }
      if (e.key === 'Tab') {
        var f = [].filter.call(focus.querySelectorAll('button, a[href]'), function (el) {
          return el.offsetParent !== null && !el.disabled;
        });
        if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (!focus.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
        else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    if (tabF) on(tabF, 'click', function () { fgo(0); });
    if (tabB) on(tabB, 'click', function () { fgo(180); });

    /* ================= QUICK ADD ================= */
    var qa = q('[data-sagar-qa]'), qaOpts = q('[data-sagar-qa-opts]'), qaBtn = q('[data-sagar-qa-btn]');
    var qaLbl = q('[data-sagar-qa-lbl]'), qaMsg = q('[data-sagar-qa-msg]');
    var qaData = null, qaSel = [], qaVariant = null, qaBusy = false, qaPriceDefault = '';

    function qaFind(sel) {
      if (!qaData) return null;
      for (var i = 0; i < qaData.variants.length; i++) {
        var v = qaData.variants[i], ok = true;
        for (var j = 0; j < sel.length; j++) { if (v.opts[j] !== sel[j]) { ok = false; break; } }
        if (ok) return v;
      }
      return null;
    }
    function qaSetup(s) {
      qaData = null;
      if (!qa) { if (focus) focus.classList.remove('sagar-split'); return; }
      var el = s.it.querySelector('[data-sagar-json]');
      if (el) { try { qaData = JSON.parse(el.textContent); } catch (e) { qaData = null; } }
      if (!qaData || !qaData.variants || !qaData.variants.length) {
        qa.hidden = true;
        focus.classList.remove('sagar-split');
        return;
      }
      qa.hidden = false;
      focus.classList.add('sagar-split');
      qaMsg.textContent = ''; qaMsg.classList.remove('sagar-err');
      qaBtn.classList.remove('sagar-done', 'sagar-busy');
      qaBusy = false;
      qaPriceDefault = s.it.getAttribute('data-price') || '';
      var first = null;
      for (var i = 0; i < qaData.variants.length; i++) { if (qaData.variants[i].av) { first = qaData.variants[i]; break; } }
      qaSel = (first || qaData.variants[0]).opts.slice();
      qaRender();
      qaUpdate();
    }
    function qaRender() {
      qaOpts.innerHTML = '';
      var single = qaData.options.length === 1 && qaData.options[0].values.length <= 1;   // "Default Title"
      if (single) return;
      qaData.options.forEach(function (o, oi) {
        var row = document.createElement('div');
        row.className = 'sagar-qa-opt';
        row.setAttribute('role', 'group');
        row.setAttribute('aria-label', o.name);
        var lab = document.createElement('div');
        lab.className = 'sagar-qa-optname';
        lab.textContent = o.name;
        var pills = document.createElement('div');
        pills.className = 'sagar-qa-pills';
        o.values.forEach(function (val) {
          var b = document.createElement('button');
          b.type = 'button';
          b.className = 'sagar-pill';
          b.textContent = val;
          b.setAttribute('data-oi', oi);
          b.setAttribute('data-val', val);
          b.addEventListener('click', function () {
            qaSel[oi] = val;
            qaMsg.textContent = ''; qaMsg.classList.remove('sagar-err');
            qaBtn.classList.remove('sagar-done');
            qaUpdate();
          });
          pills.appendChild(b);
        });
        row.appendChild(lab);
        row.appendChild(pills);
        qaOpts.appendChild(row);
      });
    }
    function qaUpdate() {
      qaVariant = qaFind(qaSel);
      [].forEach.call(qaOpts.querySelectorAll('.sagar-pill'), function (b) {
        var oi = +b.getAttribute('data-oi'), val = b.getAttribute('data-val');
        b.setAttribute('aria-pressed', qaSel[oi] === val ? 'true' : 'false');
        var test = qaSel.slice(); test[oi] = val;
        var v = qaFind(test), na = !v || !v.av;
        b.classList.toggle('sagar-na', na);
        b.setAttribute('aria-label', val + (na ? ' – ' + STR.soldout : ''));
      });
      if (qaBtn.classList.contains('sagar-done')) return;
      var ok = !!(qaVariant && qaVariant.av);
      qaBtn.disabled = !ok || qaBusy;
      qaLbl.textContent = !qaVariant ? STR.unavailable : (qaVariant.av ? STR.add : STR.soldout);
      if (fprice) {
        var pr = qaVariant && qaVariant.price ? qaVariant.price : qaPriceDefault;
        fprice.textContent = pr;
        fprice.style.display = pr ? '' : 'none';
      }
    }
    function cartRoot() {
      return (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) || '/';
    }
    function qaAdd() {
      if (!qaVariant || !qaVariant.av || qaBusy) return;
      qaBusy = true;
      qaBtn.disabled = true;
      qaBtn.classList.add('sagar-busy');
      qaMsg.textContent = ''; qaMsg.classList.remove('sagar-err');
      var root = cartRoot();
      // SiteCart (site-cart.js) posts to /cart/add.js inside Shopify and keeps
      // a local bag on the static site.
      var p = window.SiteCart
        ? window.SiteCart.add({
            id: qaVariant.id,
            quantity: 1,
            title: fState && fState.it.getAttribute('data-name'),
            variant: qaSel.join(' / '),
            price: qaVariant.price,
            image: (fstage.querySelector('.sagar-view[data-sagar-pos="1"] img') || {}).src
          })
        : fetch(root + 'cart/add.js', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({
              items: [{ id: qaVariant.id, quantity: 1 }],
              sections: 'cart-icon-bubble',
              sections_url: window.location.pathname
            })
          }).then(function (r) {
            return r.json().then(function (j) {
              if (!r.ok || j.status) throw new Error(j.description || j.message || STR.error);
              return j;
            });
          });
      p
        .then(function (j) {
          if (dead) return;
          var cartUrl = window.SiteCart ? window.SiteCart.cartUrl : root + 'cart';
          if (QA_REDIRECT && (!window.SiteCart || window.SiteCart.isShopify)) { window.location.href = cartUrl; return; }
          qaBtn.classList.add('sagar-done');
          qaLbl.textContent = STR.added;
          qaMsg.innerHTML = '';
          var a = document.createElement('a');
          a.href = cartUrl;
          a.textContent = STR.viewcart + ' \u2192';
          if (window.SiteCart && !window.SiteCart.isShopify) {
            a.addEventListener('click', function (e) { e.preventDefault(); closeFocus(); window.SiteCart.open(); });
          }
          qaMsg.appendChild(a);
          if (!window.SiteCart) updateCartUI(j);
          flyToCart();
          later(function () {
            if (!qaBtn.classList.contains('sagar-done')) return;
            qaBtn.classList.remove('sagar-done');
            qaUpdate();
          }, 2600);
        })
        .catch(function (err) {
          if (dead) return;
          qaMsg.textContent = (err && err.message) || STR.error;
          qaMsg.classList.add('sagar-err');
        })
        .then(function () {
          if (dead) return;
          qaBusy = false;
          qaBtn.classList.remove('sagar-busy');
          if (qaBtn.classList.contains('sagar-done')) qaBtn.disabled = false;
          else qaUpdate();
        });
    }
    if (qaBtn) on(qaBtn, 'click', function (e) { e.preventDefault(); qaAdd(); });

    /* keep the theme's cart icon / drawer in sync (Dawn + generic hooks) */
    function updateCartUI(res) {
      try {
        var html = res && res.sections && res.sections['cart-icon-bubble'];
        var bubble = document.getElementById('cart-icon-bubble');
        if (html && bubble) {
          var doc = new DOMParser().parseFromString(html, 'text/html');
          var src = doc.querySelector('.shopify-section') || doc.body;
          bubble.innerHTML = src.innerHTML;
        }
      } catch (e) {}
      fetch(cartRoot() + 'cart.js', { headers: { 'Accept': 'application/json' } })
        .then(function (r) { return r.json(); })
        .then(function (cart) {
          [].forEach.call(document.querySelectorAll('[data-cart-count]'), function (el) { el.textContent = cart.item_count; });
          try {
            if (typeof window.publish === 'function' && window.PUB_SUB_EVENTS && window.PUB_SUB_EVENTS.cartUpdate) {
              window.publish(window.PUB_SUB_EVENTS.cartUpdate, { source: 'rack-showcase', cartData: cart });
            }
          } catch (e) {}
          document.dispatchEvent(new CustomEvent('cart:refresh', { detail: cart }));
          document.dispatchEvent(new CustomEvent('rack:cart-updated', { detail: cart }));
        })
        .catch(function () {});
    }
    function flyToCart() {
      if (reduceMotion || !canAnimate || !fstage) return;
      var img = fstage.querySelector('.sagar-view[data-sagar-pos="1"] img');
      if (!img) return;
      var from = img.getBoundingClientRect();
      if (!from.width) return;
      var target = document.querySelector('#cart-icon-bubble, [data-cart-icon], .header__icon--cart, a[href$="/cart"]');
      var tr = target ? target.getBoundingClientRect() : null;
      if (!tr || !tr.width) tr = { left: window.innerWidth - 48, top: 18, width: 24, height: 24 };
      var f = document.createElement('img');
      f.src = img.currentSrc || img.src;
      f.alt = '';
      f.className = 'sagar-fly';
      f.style.left = from.left + 'px';
      f.style.top = from.top + 'px';
      f.style.width = from.width + 'px';
      f.style.height = from.height + 'px';
      document.body.appendChild(f);
      var dx = (tr.left + tr.width / 2) - (from.left + from.width / 2);
      var dy = (tr.top + tr.height / 2) - (from.top + from.height / 2);
      var a = f.animate([
        { transform: 'translate(0,0) scale(.9)', opacity: 0.95 },
        { transform: 'translate(' + (dx * 0.55) + 'px,' + (dy * 0.55 - 70) + 'px) scale(.32) rotate(-8deg)', opacity: 1, offset: 0.6 },
        { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(.04) rotate(-14deg)', opacity: 0.3 }
      ], { duration: 820, easing: 'cubic-bezier(.5,0,.3,1)' });
      a.onfinish = function () {
        if (f.parentNode) f.parentNode.removeChild(f);
        if (target && target.animate) {
          target.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.28)' }, { transform: 'scale(1)' }],
            { duration: 380, easing: 'ease-out' });
        }
      };
    }

    /* ================= MOBILE SLIDER (< 600px) ================= */
    var dotsWrap = sec.querySelector('[data-sagar-dots]');

    function slAll() { return items.concat(slClones); }
    function slNearest() {
      var center = rack.scrollLeft + rack.clientWidth / 2, best = 0, bd = 1e9;
      slAll().forEach(function (el, i) {
        var c = el.offsetLeft + el.offsetWidth / 2;
        var d = Math.abs(c - center);
        if (d < bd) { bd = d; best = i; }
      });
      return best;
    }
    function slGoto(i, smooth) {
      var el = slAll()[i];
      if (!el) return;
      rack.scrollTo({
        left: el.offsetLeft - (rack.clientWidth - el.offsetWidth) / 2,
        behavior: smooth === false || reduceMotion ? 'auto' : 'smooth'
      });
    }
    function slNorm() {
      if (slSetW <= 0 || !slClones.length) return;
      if (rack.scrollLeft >= slSetW) rack.scrollLeft = rack.scrollLeft - slSetW;
      else if (slNearest() >= items.length) rack.scrollLeft = Math.max(0, rack.scrollLeft - slSetW);
    }
    function slDotsUpdate() {
      if (!slDots.length) return;
      var i = slNearest() % items.length;
      slDots.forEach(function (d, k) {
        d.classList.toggle('sagar-dot-on', k === i);
        d.setAttribute('aria-current', k === i ? 'true' : 'false');
      });
    }
    function slSyncWidths() {
      slClones.forEach(function (c, k) {
        var cs = cloneStates[k], o = cs && cs.orig;
        if (cs && o && o.hpx) {
          cs.asp = o.asp; cs.flip = o.flip; cs.hpx = o.hpx;
          applyWidth(cs, cs.t);
        } else {
          var it = items[k % items.length];
          if (it) c.style.width = it.style.width || getComputedStyle(it).width;
        }
      });
      if (slClones.length && !tapSel) slSetW = slClones[0].offsetLeft - items[0].offsetLeft;
    }
    function slTick() {
      if (!slOn || !visible || document.hidden) return;
      if (slHold > Date.now()) return;
      if (isOpen()) return;
      if (tapSel) { setTapped(null); return; }   // turn back first, advance on the next tick
      var idx = slNearest();
      if (slSetW > 0 && idx >= items.length) {
        idx -= items.length;
        var el = items[idx];
        rack.scrollLeft = Math.max(0, el.offsetLeft - (rack.clientWidth - el.offsetWidth) / 2);
      }
      slGoto(idx + 1);
    }
    function slPause(ms) { slHold = Date.now() + (ms || 4000); }

    function slSetup() {
      if (slOn || items.length < 2) return;
      slOn = true;
      items.forEach(function (it, k) {
        var c = it.cloneNode(true);
        c.setAttribute('data-sagar-clone', '1');
        c.removeAttribute('data-sagar-item');
        c.setAttribute('tabindex', '-1');
        c.setAttribute('aria-hidden', 'true');
        c.style.visibility = '';
        c.style.setProperty('--sagar-p', '0');
        c.classList.remove('sagar-live');
        stripEditorAttrs(c);
        var o = states[k], cg = c.querySelector('.sagar-garment');
        var cs = { it: c, g: cg, views: viewsOf(cg), p: 0, t: 0, asp: o.asp, flip: o.flip, hpx: o.hpx, blockId: o.blockId, orig: o };
        c.addEventListener('click', function (e) { itemTap(e, cs); });
        rack.appendChild(c);
        slClones.push(c);
        cloneStates.push(cs);
      });
      slSyncWidths();
      if (dotsWrap) {
        dotsWrap.innerHTML = '';
        slDots = items.map(function (it, k) {
          var b = document.createElement('button');
          b.type = 'button';
          b.className = 'sagar-dot' + (k === 0 ? ' sagar-dot-on' : '');
          b.setAttribute('aria-label', 'Go to ' + (it.getAttribute('data-name') || 'product ' + (k + 1)));
          b.addEventListener('click', function () { slPause(); slNorm(); slGoto(k); });
          dotsWrap.appendChild(b);
          return b;
        });
      }
      slGoto(0, false);
      slDotsUpdate();
      if (!reduceMotion) slTimer = setInterval(slTick, SL_MS);
    }
    function slTeardown() {
      if (!slOn) return;
      slOn = false;
      if (slTimer) { clearInterval(slTimer); slTimer = null; }
      slClones.forEach(function (c) { if (c.parentNode) c.parentNode.removeChild(c); });
      slClones = []; slSetW = 0;
      if (tapSel && tapSel.orig !== tapSel) tapSel = null;
      if (tapBack && tapBack.orig !== tapBack) tapBack = null;
      cloneStates = [];
      if (dotsWrap) dotsWrap.innerHTML = '';
      slDots = [];
      rack.scrollLeft = 0;
      initWidths();
    }
    function slCheck() {
      if (dead) return;
      if (tapSel) setTapped(null);
      if (slMQ && slMQ.matches) {
        if (curHover) setHover(null);
        if (!slOn) { initWidths(); slSetup(); } else slSyncWidths();
      } else {
        slTeardown();
      }
    }

    // persistent slider listeners (registered once; no-ops while slider is off)
    if (dotsWrap) {
      var dOn = false;
      var dScrub = function (x) {
        var r = dotsWrap.getBoundingClientRect();
        var f = Math.max(0, Math.min(0.999, (x - r.left) / r.width));
        slGoto(Math.floor(f * items.length));
      };
      var dEnd = function () {
        if (!dOn) return;
        dOn = false;
        dotsWrap.classList.remove('sagar-dots-drag');
        slPause();
      };
      on(dotsWrap, 'pointerdown', function (ev) {
        if (!slOn) return;
        dOn = true; slPause(6000); slNorm();
        dotsWrap.classList.add('sagar-dots-drag');
        try { dotsWrap.setPointerCapture(ev.pointerId); } catch (e) {}
        dScrub(ev.clientX);
        ev.preventDefault();
      });
      on(dotsWrap, 'pointermove', function (ev) { if (dOn) dScrub(ev.clientX); });
      on(dotsWrap, 'pointerup', dEnd);
      on(dotsWrap, 'pointercancel', dEnd);
    }
    on(rack, 'scroll', function () { if (slOn) slDotsUpdate(); }, { passive: true });
    on(rack, 'touchstart', function () { if (slOn) slPause(); }, { passive: true });
    on(rack, 'touchend', function () {
      if (!slOn) return;
      slPause();
      if (slNormTimer) clearTimeout(slNormTimer);
      slNormTimer = setTimeout(function () { if (!tapSel) slNorm(); }, 450);
    }, { passive: true });
    // swiping the tapped garment away turns it back
    on(rack, 'scroll', function () {
      if (!slOn || !tapSel) return;
      if (tapScrollT) clearTimeout(tapScrollT);
      tapScrollT = setTimeout(function () {
        tapScrollT = null;
        if (dead || !slOn || !tapSel) return;
        if (slAll()[slNearest()] !== tapSel.it) setTapped(null);
      }, 180);
    }, { passive: true });
    on(window, 'load', function () { if (slOn) { slSyncWidths(); slDotsUpdate(); } });

    var io = null;
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver(function (entries) {
        var en = entries[0];
        visible = en ? en.isIntersecting : true;
        if (en && en.isIntersecting && en.intersectionRatio >= 0.2 && !dropped && !dropWaiting) {
          dropWaiting = true;
          railReady(1500, dropIn);
        }
      }, { threshold: [0, 0.2] });
      io.observe(sec);
    }

    slCheck();
    if (slMQ) {
      if (slMQ.addEventListener) on(slMQ, 'change', slCheck);
      else if (slMQ.addListener) slMQ.addListener(slCheck);
    }

    /* ---------- theme editor hooks ---------- */
    function select(blockId) {
      var s = states.filter(function (x) { return x.blockId === blockId; })[0];
      if (!s) return;
      if (slOn) { slPause(10000); slNorm(); slGoto(states.indexOf(s)); }
      else setHover(s);
    }
    function deselect() { if (!slOn) setHover(null); }

    function destroy() {
      dead = true;
      if (isOpen()) { try { document.body.style.overflow = prevOverflow; } catch (e) {} }
      listeners.forEach(function (l) { l[0].removeEventListener(l[1], l[2], l[3]); });
      listeners = [];
      if (slMQ && !slMQ.addEventListener && slMQ.removeListener) slMQ.removeListener(slCheck);
      if (rafId) cancelAnimationFrame(rafId);
      if (fAnim) cancelAnimationFrame(fAnim);
      if (swingRaf) cancelAnimationFrame(swingRaf);
      if (fFlight) { try { fFlight.cancel(); } catch (e) {} }
      if (slTimer) clearInterval(slTimer);
      [capTimer, fCloseTimer, slNormTimer, tapScrollT].concat(timers).forEach(function (t) { if (t) clearTimeout(t); });
      if (io) io.disconnect();
      if (focus && focus.parentNode) focus.parentNode.removeChild(focus);
    }

    return { select: select, deselect: deselect, destroy: destroy };
  }

  /* ---------- registry ---------- */
  function init(sec, opts) {
    if (!sec || instances.has(sec)) return;
    var inst = create(sec, opts);
    if (inst) instances.set(sec, inst);
  }
  function destroy(sec) {
    var inst = instances.get(sec);
    if (inst) { inst.destroy(); instances.delete(sec); }
  }
  function initAll(root, opts) {
    [].forEach.call((root || document).querySelectorAll('[data-sagar-section]'), function (sec) { init(sec, opts); });
  }
  function instFor(target) {
    var sec = target && target.closest ? target.closest('[data-sagar-section]') : null;
    return sec ? instances.get(sec) : null;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { initAll(); });
  else initAll();

  // in the theme editor, re-renders after a setting change skip the drop-in
  document.addEventListener('shopify:section:load', function (e) { initAll(e.target, { noDrop: true }); });
  document.addEventListener('shopify:section:unload', function (e) {
    [].forEach.call(e.target.querySelectorAll('[data-sagar-section]'), destroy);
  });
  document.addEventListener('shopify:block:select', function (e) {
    var inst = instFor(e.target);
    if (inst && e.detail) inst.select(e.detail.blockId);
  });
  document.addEventListener('shopify:block:deselect', function (e) {
    var inst = instFor(e.target);
    if (inst) inst.deselect();
  });

  window.RackShowcase = { init: init, destroy: destroy, initAll: initAll };
})();
