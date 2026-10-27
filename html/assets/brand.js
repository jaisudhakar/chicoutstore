/* ============================================================
   BRAND CONFIG — change this file (and the colours/fonts at the top of base.css)
   to re-skin the whole site.
   ============================================================ */
window.BRAND = {
  name: 'ChicOut',
  logo: '',                                // '' shows `name` as a text wordmark; or point to an image
  storeUrl: 'https://chicoutstore.in',
  currency: 'INR',

  // top utility bar (right side)
  utility: [
    { label: 'Track order', href: 'contact.html#faq' },
    { label: 'Help', href: 'contact.html#faq' },
    { label: 'Join us', href: 'index.html#join' },
    { label: 'Sign in', href: 'https://chicoutstore.in/account/login' }
  ],

  // main navigation
  nav: [
    { label: 'Home', href: 'index.html' },
    { label: 'Shop', href: 'shop.html' },
    { label: 'Shirts', href: 'shop.html?c=designer' },
    { label: 'Trousers', href: 'shop.html?c=trousers' },
    { label: 'Jeans', href: 'shop.html?c=jeans' },
    { label: 'Lookbook', href: 'index.html#lookbook' },
    { label: 'About', href: 'about.html' },
    { label: 'Contact', href: 'contact.html' }
  ],

  // words in the scrolling strips
  marquee: ['New arrivals', 'Embroidered shirts', 'Checks & stripes', 'Relaxed trousers', 'Denim', 'Made to stand out'],

  // contact details — PLACEHOLDERS: replace with the store's real details
  contact: {
    email: 'hello@chicoutstore.in',
    phone: '+91 00000 00000',
    address: 'Your store address, India',
    hours: 'Mon–Sat, 10:00–19:00 IST'
  },

  social: [
    { label: 'Instagram', href: '#', icon: 'instagram' },
    { label: 'YouTube', href: '#', icon: 'youtube' }
  ],

  footer: [
    { title: 'Shop', links: [
      { label: 'All products', href: 'shop.html' },
      { label: 'Embroidered & printed', href: 'shop.html?c=designer' },
      { label: 'Solid shirts', href: 'shop.html?c=solid' },
      { label: 'Checks & stripes', href: 'shop.html?c=checks' },
      { label: 'Trousers', href: 'shop.html?c=trousers' },
      { label: 'Jeans', href: 'shop.html?c=jeans' }
    ] },
    { title: 'Explore', links: [
      { label: 'New arrivals', href: 'index.html#new-arrivals' },
      { label: 'The Shirt Rail', href: 'index.html#shirt-rail' },
      { label: 'Lookbook', href: 'index.html#lookbook' },
      { label: 'About us', href: 'about.html' }
    ] },
    { title: 'Help', links: [
      { label: 'Contact', href: 'contact.html' },
      { label: 'FAQ', href: 'contact.html#faq' },
      { label: 'Size guide', href: 'contact.html#faq' }
    ] }
  ],

  newsletter: {
    title: 'Join the list',
    text: 'New arrivals, restocks and limited embroidered drops — straight to your inbox.'
  }
};
