/* Hero — cards drift with the mouse (by depth) and the scroll; entrance after the preloader. */
(function () {
  'use strict';
  if (window.SiteHero) return;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia && window.matchMedia('(hover:hover) and (pointer:fine)').matches;

  function create(sec) {
    var layers = [].slice.call(sec.querySelectorAll('[data-depth]')).map(function (el) {
      return { el: el, d: parseFloat(el.getAttribute('data-depth')) || 0.5 };
    });
    var mx = 0, my = 0, sy = 0, raf = 0;
    function paint() {
      raf = 0;
      layers.forEach(function (l) {
        var x = mx * 26 * l.d, y = my * 18 * l.d - sy * l.d * 0.18;
        l.el.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0)';
      });
    }
    function kick() { if (!raf) raf = requestAnimationFrame(paint); }
    if (!reduce) {
      if (fine) {
        sec.addEventListener('pointermove', function (e) {
          var r = sec.getBoundingClientRect();
          mx = (e.clientX - r.left) / r.width - 0.5;
          my = (e.clientY - r.top) / r.height - 0.5;
          kick();
        });
        sec.addEventListener('pointerleave', function () { mx = my = 0; kick(); });
      }
      window.addEventListener('scroll', function () {
        var r = sec.getBoundingClientRect();
        if (r.bottom < 0) return;
        sy = Math.max(0, -r.top);
        kick();
      }, { passive: true });
    }
    function enter() { sec.classList.add('is-in'); }
    if (document.documentElement.classList.contains('is-loading')) document.addEventListener('site:ready', enter, { once: true });
    else requestAnimationFrame(function () { requestAnimationFrame(enter); });
  }

  function init(root) {
    [].forEach.call((root || document).querySelectorAll('[data-hero]'), function (sec) {
      if (sec.__hero) return;
      sec.__hero = true;
      create(sec);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { init(); });
  else init();
  document.addEventListener('shopify:section:load', function (e) { init(e.target); });
  window.SiteHero = { init: init };
})();
