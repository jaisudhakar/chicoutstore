/* Motion helpers shared by every page and Shopify section.
 *
 *   data-reveal="up|fade|left|right|scale|clip"   animate in when scrolled into view
 *   data-reveal-stagger                          children with data-reveal animate one after another
 *   data-split                                   headline words slide up from a mask
 *   data-parallax="0.15"                         moves at a different speed while scrolling
 *   data-magnetic                                button leans towards the cursor
 *   data-tilt="8"                                card tilts in 3D under the cursor
 *
 * Pages add `motion-ready` to <html> as early as possible so hidden start states
 * never flash. Everything is skipped for prefers-reduced-motion. */
(function () {
  'use strict';
  if (window.SiteMotion) return;

  var root = document.documentElement;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia && window.matchMedia('(hover:hover) and (pointer:fine)').matches;
  root.classList.add('motion-ready');
  if (reduce) root.classList.add('motion-reduce');

  /* ---------- split headline words ---------- */
  function split(el) {
    if (el.__split) return;
    el.__split = true;
    var i = 0;
    (function walk(node) {
      [].slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var parts = n.textContent.split(/(\s+)/);
          var frag = document.createDocumentFragment();
          parts.forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            var w = document.createElement('span');
            w.className = 'sw';
            var inner = document.createElement('span');
            inner.className = 'swi';
            inner.style.setProperty('--wi', i++);
            inner.textContent = part;
            w.appendChild(inner);
            frag.appendChild(w);
          });
          n.parentNode.replaceChild(frag, n);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') {
          walk(n);
        }
      });
    })(el);
    if (!el.hasAttribute('data-reveal')) el.setAttribute('data-reveal', 'split');
    if (!el.getAttribute('aria-label')) el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
  }

  /* ---------- reveal on scroll ---------- */
  var io = null;
  function show(el) { el.classList.add('is-in'); }
  function observe(scope) {
    scope = scope || document;
    [].forEach.call(scope.querySelectorAll('[data-split]'), split);
    [].forEach.call(scope.querySelectorAll('[data-reveal-stagger]'), function (wrap) {
      var step = parseFloat(wrap.getAttribute('data-reveal-stagger')) || 0.08;
      [].forEach.call(wrap.querySelectorAll('[data-reveal]'), function (c, k) {
        c.style.setProperty('--rd', (k * step).toFixed(2) + 's');
      });
    });
    var els = scope.querySelectorAll('[data-reveal]:not(.is-in)');
    if (reduce || !('IntersectionObserver' in window)) { [].forEach.call(els, show); return; }
    if (!io) {
      io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { show(en.target); io.unobserve(en.target); }
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    }
    [].forEach.call(els, function (el) {
      if (el.hasAttribute('data-reveal-manual')) return;   // revealed by its own script
      io.observe(el);
    });
  }

  /* ---------- parallax ---------- */
  var plx = [], ticking = false;
  function collectParallax() {
    plx = [].slice.call(document.querySelectorAll('[data-parallax]')).map(function (el) {
      return { el: el, k: parseFloat(el.getAttribute('data-parallax')) || 0.15 };
    });
  }
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      var vh = window.innerHeight;
      plx.forEach(function (p) {
        var r = p.el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        var d = (r.top + r.height / 2 - vh / 2) * -p.k;
        p.el.style.transform = 'translate3d(0,' + d.toFixed(1) + 'px,0)';
      });
    });
  }

  /* ---------- magnetic buttons + tilt cards ---------- */
  function magnetic(el) {
    if (el.__mag) return;
    el.__mag = true;
    var s = parseFloat(el.getAttribute('data-magnetic')) || 0.3;
    el.addEventListener('pointermove', function (e) {
      var r = el.getBoundingClientRect();
      var x = (e.clientX - r.left - r.width / 2) * s, y = (e.clientY - r.top - r.height / 2) * s;
      el.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
    });
    el.addEventListener('pointerleave', function () { el.style.transform = ''; });
  }
  function tilt(el) {
    if (el.__tilt) return;
    el.__tilt = true;
    var max = parseFloat(el.getAttribute('data-tilt')) || 8;
    el.addEventListener('pointermove', function (e) {
      var r = el.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      el.style.transform = 'perspective(900px) rotateY(' + (x * max).toFixed(2) + 'deg) rotateX(' + (-y * max).toFixed(2) + 'deg)';
    });
    el.addEventListener('pointerleave', function () { el.style.transform = ''; });
  }

  function init(scope) {
    observe(scope);
    if (reduce) return;
    collectParallax();
    onScroll();
    if (fine) {
      [].forEach.call((scope || document).querySelectorAll('[data-magnetic]'), magnetic);
      [].forEach.call((scope || document).querySelectorAll('[data-tilt]'), tilt);
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  function start() {
    // while the preloader is up, hold the reveals so the first screen animates in after it
    if (root.classList.contains('is-loading')) document.addEventListener('site:ready', function () { init(); }, { once: true });
    else init();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
  document.addEventListener('shopify:section:load', function (e) { init(e.target); });

  window.SiteMotion = { init: init, split: split, reduce: reduce, fine: fine };
})();
