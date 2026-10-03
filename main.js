/* =========================================================
   JASHO WORKS — MAIN SCRIPT
   Progressive enhancement only. Site works without JS for
   navigation, content and contact — the gallery limit,
   form interception, FAQ auto-close, back-to-top and
   scroll-reveal are the only JS-dependent behaviours.

   CHANGELOG — audit fixes
   - ADD §1.3: initJsClass now applies the .js hook that every
     animation rule is gated behind (was previously only on
     privacy.html, which meant the homepage never animated).
   - FIX §1.4: data-wa templating is now actually wired up.
   - FIX §3.3: lightbox toggles via is-open class only; no
     more display:hidden flag, so the transition plays.
   - FIX §4.2: form submission uses an anchor click instead of
     window.open() to survive popup blockers.
   - FIX §4.1: form has explicit validation, length caps,
     live status region and screen-reader announcements.
   - FIX §6: lightbox image now keeps its descriptive alt text;
     background regions are made inert while it's open.
========================================================= */

'use strict';

/* ---------------------------------------------------------
   Helpers
--------------------------------------------------------- */
const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(',');

function getFocusable(root) {
  return Array.from(root.querySelectorAll(FOCUSABLE))
    .filter((el) => el.offsetParent !== null || el === document.activeElement);
}

function trapFocus(container, e) {
  if (e.key !== 'Tab') return;
  const focusables = getFocusable(container);
  if (!focusables.length) return;
  const first = focusables[0];
  const last  = focusables[focusables.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}


/* ---------------------------------------------------------
   0a. JS-CLASS HOOK
   Sets html.js so the animation rules in style.css activate.
   The setTimeout is a safety net: if main.js fails to load
   or throws before initReveal runs, the class is stripped and
   every [data-reveal] element goes back to full opacity.
--------------------------------------------------------- */
(function initJsClass() {
  const root = document.documentElement;
  root.classList.remove('no-js');
  root.classList.add('js');

  window.setTimeout(function () {
    if (!window.__jashoRevealReady) {
      root.classList.remove('js');
    }
  }, 2500);
})();


/* ---------------------------------------------------------
   0b. WHATSAPP TEMPLATE
   Single source of truth for every WhatsApp link. Elements
   carry a `data-wa` attribute with the message body; the
   number, sign-off and URL encoding live here. Static hrefs
   remain in the markup as a no-JS fallback.
--------------------------------------------------------- */
const WA_NUMBER = '254702555093';
const WA_SIGN   = '\n\n— Sent from jashoworks.co.ke';

function buildWhatsAppLink(body) {
  return 'https://wa.me/' + WA_NUMBER +
         '?text=' + encodeURIComponent(body + WA_SIGN);
}

document.querySelectorAll('[data-wa]').forEach((el) => {
  el.href = buildWhatsAppLink(el.dataset.wa);
});


/* ---------------------------------------------------------
   1. MOBILE NAVIGATION
   Visibility is CSS-driven so links are removed from the
   tab order when the drawer is closed (WCAG 2.4.3).
--------------------------------------------------------- */
(function initMobileNav() {
  const toggle   = document.querySelector('[data-nav-toggle]');
  const nav      = document.querySelector('[data-nav]');
  const backdrop = document.querySelector('[data-nav-backdrop]');
  if (!toggle || !nav) return;

  let lastFocused = null;
  let isOpen = false;

  function setOpen(open) {
    isOpen = open;
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    nav.classList.toggle('is-open', open);
    document.body.style.overflow = open ? 'hidden' : '';

    if (backdrop) {
      backdrop.hidden = !open;
      if (open) requestAnimationFrame(() => backdrop.classList.add('is-open'));
      else backdrop.classList.remove('is-open');
    }

    if (open) {
      lastFocused = document.activeElement;
      const firstLink = nav.querySelector('a[href]');
      if (firstLink) firstLink.focus();
    } else if (lastFocused && typeof lastFocused.focus === 'function') {
      lastFocused.focus();
      lastFocused = null;
    }
  }

  toggle.addEventListener('click', () => setOpen(!isOpen));
  if (backdrop) backdrop.addEventListener('click', () => setOpen(false));
  nav.addEventListener('click', (e) => {
    if (e.target.closest('a')) setOpen(false);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen) { setOpen(false); return; }
    if (isOpen) trapFocus(nav, e);
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth >= 900 && isOpen) setOpen(false);
  });
})();


/* ---------------------------------------------------------
   2. STICKY HEADER SHADOW ON SCROLL
--------------------------------------------------------- */
(function initHeaderShadow() {
  const header = document.querySelector('[data-header]');
  if (!header) return;
  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
})();


/* ---------------------------------------------------------
   3. FILTERABLE GALLERY
--------------------------------------------------------- */
(function initGalleryFilter() {
  const filtersEl = document.querySelector('[data-filters]');
  const gallery   = document.querySelector('[data-gallery]');
  const status    = document.querySelector('[data-gallery-status]');
  if (!filtersEl || !gallery) return;

  const buttons = Array.from(filtersEl.querySelectorAll('[data-filter]'));
  const items   = Array.from(gallery.children);

  const counts = { all: items.length };
  items.forEach((item) => {
    const btn = item.querySelector('.project');
    const cat = btn && btn.dataset.cat;
    if (cat) counts[cat] = (counts[cat] || 0) + 1;
  });

  buttons.forEach((b) => {
    const badge = b.querySelector('[data-count]');
    if (badge) badge.textContent = counts[b.dataset.filter] || 0;
  });

  function apply(filter) {
    let visible = 0;
    items.forEach((item) => {
      const btn = item.querySelector('.project');
      const cat = btn ? btn.dataset.cat : '';
      const show = filter === 'all' || cat === filter;
      item.classList.toggle('is-hidden', !show);
      if (show) visible += 1;
    });

    gallery.classList.toggle('is-filtered', filter !== 'all');

    buttons.forEach((b) => {
      b.setAttribute('aria-pressed', b.dataset.filter === filter ? 'true' : 'false');
    });

    if (status) {
      const label = filter === 'all' ? 'all projects' : filter + ' projects';
      status.textContent = 'Showing ' + visible + ' ' + label + '.';
    }
  }

  buttons.forEach((btn) => {
    btn.addEventListener('click', () => apply(btn.dataset.filter));
  });
})();


/* ---------------------------------------------------------
   4. GALLERY "SHOW ALL" TOGGLE (mobile only)
--------------------------------------------------------- */
(function initGalleryToggle() {
  const gallery = document.querySelector('[data-gallery]');
  const toggle  = document.querySelector('[data-gallery-toggle]');
  if (!gallery || !toggle) return;

  toggle.addEventListener('click', () => {
    const expanded = gallery.classList.toggle('is-expanded');
    toggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    toggle.textContent = expanded ? 'Show fewer projects' : 'Show all 12 projects';

    if (expanded) {
      const firstExtra = gallery.querySelector('li[data-extra]');
      if (firstExtra) firstExtra.scrollIntoView({ block: 'nearest' });
    } else {
      gallery.scrollIntoView({ block: 'start' });
    }
  });
})();


/* ---------------------------------------------------------
   5. LIGHTBOX
   FIX (audit §3.3): state is driven purely by the `is-open`
   class — the `hidden` attribute is not used, so the CSS
   opacity/visibility transition can actually animate.
   FIX (audit §6): the descriptive alt text from the thumbnail
   is passed through, and background regions are made inert
   while the dialog is open.
--------------------------------------------------------- */
(function initLightbox() {
  const lightbox  = document.querySelector('[data-lightbox]');
  const imgEl     = document.querySelector('[data-lightbox-img]');
  const captionEl = document.querySelector('[data-lightbox-caption]');
  const closeBtn  = document.querySelector('[data-lightbox-close]');
  if (!lightbox || !imgEl || !closeBtn) return;

  // Regions we hide from assistive tech (and, where supported, from focus)
  // while the dialog is open.
  const backgroundRegions = [
    document.querySelector('.site-header'),
    document.querySelector('main'),
    document.querySelector('.site-footer'),
    document.querySelector('.sticky-wa'),
    document.querySelector('.to-top')
  ].filter(Boolean);

  function setBackgroundInert(on) {
    backgroundRegions.forEach((el) => {
      if (on) {
        el.setAttribute('inert', '');
        el.setAttribute('aria-hidden', 'true');
      } else {
        el.removeAttribute('inert');
        el.removeAttribute('aria-hidden');
      }
    });
  }

  let lastFocused = null;
  let touchStartY = 0;

  function isOpen() {
    return lightbox.classList.contains('is-open');
  }

  function open(src, caption, alt) {
    lastFocused = document.activeElement;
    imgEl.src = src;
    imgEl.alt = alt || caption || 'Project image';
    captionEl.textContent = caption || '';
    setBackgroundInert(true);
    lightbox.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    closeBtn.focus();
  }

  function close() {
    lightbox.classList.remove('is-open');
    document.body.style.overflow = '';
    setBackgroundInert(false);

    if (lastFocused && typeof lastFocused.focus === 'function') {
      lastFocused.focus();
      lastFocused = null;
    }

    // Clear the src after the fade completes so a stale image isn't
    // kept in memory, and so a screen reader on the page underneath
    // doesn't encounter it if the user navigates back.
    window.setTimeout(() => {
      if (!isOpen()) imgEl.removeAttribute('src');
    }, 260);
  }

  document.querySelectorAll('.project').forEach((btn) => {
    btn.addEventListener('click', () => {
      const img     = btn.querySelector('img');
      const src     = btn.dataset.img || (img && img.src) || '';
      const title   = btn.querySelector('.project__title');
      const caption = btn.dataset.caption || (title ? title.textContent : '');
      const alt     = img ? img.alt : caption;
      if (src) open(src, caption, alt);
    });
  });

  closeBtn.addEventListener('click', close);
  lightbox.addEventListener('click', (e) => { if (e.target === lightbox) close(); });

  lightbox.addEventListener('touchstart', (e) => {
    touchStartY = e.changedTouches[0].clientY;
  }, { passive: true });

  lightbox.addEventListener('touchend', (e) => {
    const deltaY = e.changedTouches[0].clientY - touchStartY;
    if (deltaY > 90) close();
  }, { passive: true });

  document.addEventListener('keydown', (e) => {
    if (!isOpen()) return;
    if (e.key === 'Escape') { close(); return; }
    trapFocus(lightbox, e);
  });
})();


/* ---------------------------------------------------------
   6. QUOTE FORM
   FIX (audit §4.1 / §4.2 / §5):
   - Trims, collapses whitespace and length-caps each field
     before composing the WhatsApp message.
   - Uses an anchor click rather than window.open() so popup
     blockers and popup-blocker-hiding browsers don't eat it.
   - Reports validation errors and success in a live status
     region instead of silently doing nothing.
--------------------------------------------------------- */
(function initQuoteForm() {
  const form = document.querySelector('[data-quote-form]');
  if (!form) return;

  const status = form.querySelector('[data-quote-status]');

  function setStatus(message, state) {
    if (!status) return;
    status.textContent = message || '';
    if (state) status.dataset.state = state;
    else status.removeAttribute('data-state');
  }

  function clean(value, max) {
    return String(value == null ? '' : value)
      .trim()
      .replace(/\s+/g, ' ')
      .slice(0, max);
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const data     = new FormData(form);
    const name     = clean(data.get('name'), 80);
    const location = clean(data.get('location'), 120);
    const type     = clean(data.get('project_type'), 60);

    if (!name || !location || !type) {
      const missing = !name ? 'name' : (!location ? 'location' : 'project_type');
      setStatus('Please fill in your name, project location and project type.', 'error');
      const field = form.querySelector('[name="' + missing + '"]');
      if (field && typeof field.focus === 'function') field.focus();
      return;
    }

    const message =
      'Hi Jasho Works,\n\n' +
      'I\'d like a free quote.\n\n' +
      'Name: ' + name + '\n' +
      'Location: ' + location + '\n' +
      'Project type: ' + type;

    // Anchor click instead of window.open: never blocked, keeps the
    // user gesture intact, and works in every browser.
    const link = document.createElement('a');
    link.href = buildWhatsAppLink(message);
    link.target = '_blank';
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();

    setStatus('Opening WhatsApp… if nothing happens, call 0702 555 093.', 'success');
  });
})();


/* ---------------------------------------------------------
   7. FAQ — CLOSE ANY OPEN ITEM WHEN CLICKING OUTSIDE
--------------------------------------------------------- */
(function initFaqOutsideClose() {
  const faqs = document.querySelectorAll('.faq');
  if (!faqs.length) return;

  document.addEventListener('click', (e) => {
    faqs.forEach((faq) => {
      faq.querySelectorAll('details[open]').forEach((d) => {
        if (!d.contains(e.target)) d.open = false;
      });
    });
  });
})();


/* ---------------------------------------------------------
   8. BACK TO TOP — visible after a short scroll
--------------------------------------------------------- */
(function initBackToTop() {
  const btn = document.querySelector('[data-to-top]');
  if (!btn) return;

  const onScroll = () => btn.classList.toggle('is-visible', window.scrollY > 400);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  btn.addEventListener('click', () => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  });
})();


/* ---------------------------------------------------------
   9. SCROLL REVEAL
   Auto-applies [data-reveal] to key blocks. Staggers grid
   children. Uses `translate` (not `transform`) so component
   hover transforms keep working. Respects prefers-reduced-motion.
--------------------------------------------------------- */
(function initReveal() {
  // Mark ready before the early-return so the initJsClass safety
  // net knows this script reached the end successfully.
  window.__jashoRevealReady = true;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const SELECTORS = [
    '.section__head',
    '.proof-bar__badge', '.proof-bar__quote', '.proof-bar__stat',
    '.card', '.why-card', '.cost-card', '.area', '.step', '.quote',
    '.split__media', '.split__body',
    '.cta-box > div'
  ];

  const GRIDS = ['.grid--cards', '.why-grid', '.cost-grid', '.areas-grid', '.process', '.quotes'];

  const els = [];
  SELECTORS.forEach((sel) => {
    document.querySelectorAll(sel).forEach((el) => {
      if (el.hasAttribute('data-reveal')) return;
      el.setAttribute('data-reveal', '');
      els.push(el);
    });
  });

  // Stagger grid children
  GRIDS.forEach((sel) => {
    document.querySelectorAll(sel).forEach((grid) => {
      Array.from(grid.children).forEach((child, i) => {
        if (child.hasAttribute('data-reveal')) {
          child.style.animationDelay = Math.min(i * 70, 420) + 'ms';
        }
      });
    });
  });

  if (!('IntersectionObserver' in window)) {
    els.forEach((el) => el.classList.add('is-revealed'));
    return;
  }

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-revealed');
        io.unobserve(entry.target);
      }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });

  els.forEach((el) => io.observe(el));
})();


/* ---------------------------------------------------------
   10. FOOTER — CURRENT YEAR
--------------------------------------------------------- */
(function initFooterYear() {
  document.querySelectorAll('[data-year]').forEach((el) => {
    el.textContent = new Date().getFullYear();
  });
})();