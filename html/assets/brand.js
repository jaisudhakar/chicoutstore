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
    { label: 'Baby', href: 'shop.html?c=baby' },
    { label: 'Girls', href: 'shop.html?c=girls' },
    { label: 'Boys', href: 'shop.html?c=boys' },
    { label: 'Tiny Steps', href: 'index.html#step-orbit' },
    { label: 'About', href: 'about.html' },
    { label: 'Contact', href: 'contact.html' }
  ],

  // words in the scrolling strips
  marquee: ['New arrivals', 'Soft cotton', 'Baby & kids', 'Gift sets', 'Tiny Steps', 'Made for play'],

  // contact details — PLACEHOLDERS: replace with the store's real details
  contact: {
    email: 'hello@chicoutstore.in',
    phone: '+91 00000 00000',
    address: 'Your store address, Kolkata, India',
    hours: 'Mon–Sat, 10:00–19:00 IST'
  },

  social: [
    { label: 'Instagram', href: '#', icon: 'instagram' },
    { label: 'YouTube', href: '#', icon: 'youtube' }
  ],

  footer: [
    { title: 'Shop', links: [
      { label: 'All products', href: 'shop.html' },
      { label: 'Baby', href: 'shop.html?c=baby' },
      { label: 'Girls', href: 'shop.html?c=girls' },
      { label: 'Boys', href: 'shop.html?c=boys' },
      { label: 'Nightwear', href: 'shop.html?c=nightwear' },
      { label: 'Footwear', href: 'shop.html?c=footwear' }
    ] },
    { title: 'Explore', links: [
      { label: 'New arrivals', href: 'index.html#new-arrivals' },
      { label: 'The Washing Line', href: 'index.html#washing-line' },
      { label: 'Tiny Steps', href: 'index.html#step-orbit' },
      { label: 'About us', href: 'about.html' }
    ] },
    { title: 'Help', links: [
      { label: 'Contact', href: 'contact.html' },
      { label: 'FAQ', href: 'contact.html#faq' },
      { label: 'Size guide', href: 'contact.html#faq' }
    ] }
  ],

  newsletter: {
    title: 'Join the family',
    text: 'New arrivals, festive edits and restocks of your favourites — straight to your inbox.'
  }
};
