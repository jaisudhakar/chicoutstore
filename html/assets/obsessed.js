/* OBSESSED — fade the heading in when it scrolls into view. */
(function () {
  'use strict';
  function init(root) {
    [].forEach.call((root || document).querySelectorAll('[data-obs-section]:not(.obs-in)'), function (sec) {
      if (!('IntersectionObserver' in window)) { sec.classList.add('obs-in'); return; }
      var io = new IntersectionObserver(function (en) {
        if (en[0].isIntersecting) { sec.classList.add('obs-in'); io.disconnect(); }
      }, { threshold: 0.3 });
      io.observe(sec);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { init(); });
  else init();
  document.addEventListener('shopify:section:load', function (e) { init(e.target); });
})();
