/* Marquee strip — fills empty [data-marquee] sections from BRAND.marquee
   (Shopify renders the words in Liquid, so there is nothing to do there). */
(function () {
  'use strict';
  var STAR = '<svg class="mq-star" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 0l2.6 9.4L24 12l-9.4 2.6L12 24l-2.6-9.4L0 12l9.4-2.6z"/></svg>';
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function set(words, hidden) {
    return '<div class="mq-set"' + (hidden ? ' aria-hidden="true"' : '') + '>' + words.map(function (w) {
      return '<span class="mq-item">' + esc(w) + STAR + '</span>';
    }).join('') + '</div>';
  }
  [].forEach.call(document.querySelectorAll('[data-marquee]'), function (el) {
    if (el.children.length) return;
    var words = (window.BRAND && window.BRAND.marquee) || [];
    if (!words.length) return;
    while (words.length < 6) words = words.concat(words);   // long enough to fill wide screens
    el.innerHTML =
      '<div class="mq-row">' + set(words) + set(words, true) + '</div>' +
      '<div class="mq-row rev outline" aria-hidden="true">' + set(words.slice().reverse(), true) + set(words.slice().reverse(), true) + '</div>';
  });
})();
