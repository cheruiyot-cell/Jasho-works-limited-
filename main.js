/* =========================================================
   JASHO WORKS — MAIN SCRIPT
   Progressive enhancement only. Site works without JS for
   navigation, content and contact — the gallery limit,
   form interception, FAQ auto-close, back-to-top and
   scroll-reveal are the only JS-dependent behaviours.

   AUDIT UPDATES APPLIED:
   - initQuoteForm rewritten: no reliance on novalidate.
     Native reportValidity() runs first, then JS composes
     the WhatsApp message. Status auto-resets after 30s.
     Optional analytics event hook fires on success.
   - pagehide listener clears stale status.
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
   GALLERY GEOMETRY — one breakpoint, one predicate
--------------------------------------------------------- */
const GALLERY_WIDE_MQ = window.matchMedia('(min-width: 1000px)');

function isTileVisible(li) {
  if (!li || li.classList.contains('is-hidden')) return false;
  if (!li.hasAttribute('data-extra')) return true;
  if (GALLERY_WIDE_MQ.matches) return true;
  const gallery = li.closest('[data-gallery]');
  return !!gallery && (
    gallery.classList.contains('is-expanded') ||
    gallery.classList.contains('is-filtered')
  );
}


/* ---------------------------------------------------------
   1. JS-CLASS HOOK
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
   2. WHATSAPP TEMPLATE
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
   3. MOBILE NAVIGATION
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
   4. STICKY HEADER SHADOW ON SCROLL
--------------------------------------------------------- */
(function initHeaderShadow() {
  const header = document.querySelector('[data-header]');
  if (!header) return;
  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
})();


/* ---------------------------------------------------------
   5. GALLERY MOBILE LIMIT
--------------------------------------------------------- */
(function initGalleryLimit() {
  const gallery = document.querySelector('[data-gallery][data-limit]');
  if (!gallery) return;

  const limit = parseInt(gallery.dataset.limit, 10);
  if (!Number.isFinite(limit) || limit <= 0) return;

  Array.from(gallery.children).forEach((item, i) => {
    if (i >= limit) item.setAttribute('data-extra', '');
    else item.removeAttribute('data-extra');
  });
})();


/* ---------------------------------------------------------
   6. FILTERABLE GALLERY
--------------------------------------------------------- */
(function initGalleryFilter() {
  const filtersEl  = document.querySelector('[data-filters]');
  const gallery    = document.querySelector('[data-gallery]');
  const status     = document.querySelector('[data-gallery-status]');
  const toggleWrap = document.querySelector('.gallery-toggle-wrap');
  const toggle     = document.querySelector('[data-gallery-toggle]');
  if (!filtersEl || !gallery) return;

  const buttons = Array.from(filtersEl.querySelectorAll('[data-filter]'));
  const items   = Array.from(gallery.children);

  let currentFilter = 'all';

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

  function apply(filter, options) {
    const announce = !options || options.announce !== false;
    currentFilter = filter;

    items.forEach((item) => {
      const btn = item.querySelector('.project');
      const cat = btn ? btn.dataset.cat : '';
      item.classList.toggle('is-hidden', !(filter === 'all' || cat === filter));
    });

    gallery.classList.toggle('is-filtered', filter !== 'all');

    if (toggleWrap) {
      const toggleUsable = toggle && !toggle.hidden;
      toggleWrap.hidden = (filter !== 'all') || !toggleUsable;
    }

    buttons.forEach((b) => {
      b.setAttribute('aria-pressed', b.dataset.filter === filter ? 'true' : 'false');
    });

    if (status && announce) {
      const visible = items.filter(isTileVisible).length;
      status.textContent = filter === 'all'
        ? 'Showing ' + visible + ' of ' + items.length + ' projects.'
        : 'Showing ' + visible + ' ' + filter + ' projects.';
    }
  }

  buttons.forEach((btn) => {
    btn.addEventListener('click', () => apply(btn.dataset.filter));
  });

  gallery.addEventListener('gallery:toggled', () => apply(currentFilter));
  GALLERY_WIDE_MQ.addEventListener('change', () => apply(currentFilter));

  apply('all', { announce: false });
})();


/* ---------------------------------------------------------
   7. GALLERY "SHOW MORE" TOGGLE (mobile only)
--------------------------------------------------------- */
(function initGalleryToggle() {
  const gallery = document.querySelector('[data-gallery]');
  const toggle  = document.querySelector('[data-gallery-toggle]');
  if (!gallery || !toggle) return;

  const toggleWrap = toggle.closest('.gallery-toggle-wrap');

  const extraCount     = gallery.querySelectorAll('li[data-extra]').length;
  const collapsedLabel = 'Show ' + extraCount + ' more projects';
  const expandedLabel  = 'Show fewer projects';

  if (extraCount === 0) {
    toggle.hidden = true;
    if (toggleWrap) toggleWrap.hidden = true;
    return;
  }

  toggle.hidden = false;
  if (toggleWrap) toggleWrap.hidden = false;
  toggle.textContent = collapsedLabel;

  toggle.addEventListener('click', () => {
    const expanded = gallery.classList.toggle('is-expanded');
    toggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    toggle.textContent = expanded ? expandedLabel : collapsedLabel;

    gallery.dispatchEvent(new CustomEvent('gallery:toggled'));

    if (expanded) {
      const firstExtra = gallery.querySelector('li[data-extra]');
      if (firstExtra) firstExtra.scrollIntoView({ block: 'center' });
    } else {
      gallery.scrollIntoView({ block: 'nearest' });
    }
  });
})();


/* ---------------------------------------------------------
   8. LIGHTBOX
--------------------------------------------------------- */
(function initLightbox() {
  const lightbox  = document.querySelector('[data-lightbox]');
  const stage     = document.querySelector('[data-lightbox-stage]');
  const imgEl     = document.querySelector('[data-lightbox-img]');
  const captionEl = document.querySelector('[data-lightbox-caption]');
  const counterEl = document.querySelector('[data-lightbox-counter]');
  const closeBtn  = document.querySelector('[data-lightbox-close]');
  const prevBtn   = document.querySelector('[data-lightbox-prev]');
  const nextBtn   = document.querySelector('[data-lightbox-next]');
  const zoomBtn   = document.querySelector('[data-lightbox-zoom]');
  const hintEl    = document.querySelector('[data-lightbox-hint]');
  if (!lightbox || !stage || !imgEl || !closeBtn) return;

  const HINT_KEY = 'jasho-lb-hint-seen';

  document.querySelectorAll('.project').forEach((btn) => {
    if (btn.hasAttribute('aria-label')) return;
    const title = btn.querySelector('.project__title');
    const loc   = btn.querySelector('.project__loc');
    btn.setAttribute(
      'aria-label',
      'View project: ' +
        (title ? title.textContent.trim() : '') +
        (loc ? ', ' + loc.textContent.trim() : '')
    );
  });

  const backgroundRegions = [
    document.querySelector('.site-header'),
    document.querySelector('main'),
    document.querySelector('.site-footer'),
    document.querySelector('.sticky-wa'),
    document.querySelector('.to-top')
  ].filter(Boolean);

  function setBackgroundInert(on) {
    backgroundRegions.forEach((el) => {
      if (on) { el.setAttribute('inert', ''); el.setAttribute('aria-hidden', 'true'); }
      else    { el.removeAttribute('inert'); el.removeAttribute('aria-hidden'); }
    });
  }

  let projects    = [];
  let index       = 0;
  let lastFocused = null;
  let touchStartX = 0;
  let touchStartY = 0;
  let lastSwipeAt = 0;
  let lastTapAt   = 0;
  let hintTimer   = null;

  const isOpen   = () => lightbox.classList.contains('is-open');
  const isZoomed = () => lightbox.classList.contains('is-zoomed');

  function getVisibleProjects() {
    return Array.from(document.querySelectorAll('.project'))
      .filter((btn) => isTileVisible(btn.closest('li')));
  }

  function setZoom(on) {
    lightbox.classList.toggle('is-zoomed', on);
    if (zoomBtn) {
      zoomBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
      zoomBtn.setAttribute('aria-label', on ? 'Zoom out' : 'Zoom in');
    }
    if (!on) stage.scrollTo(0, 0);
  }

  function load(i) {
    const btn = projects[i];
    if (!btn) return;

    const thumb   = btn.querySelector('img');
    const src     = btn.dataset.img || (thumb && thumb.currentSrc) || (thumb && thumb.src) || '';
    const title   = btn.querySelector('.project__title');
    const caption = btn.dataset.caption || (title ? title.textContent : '');
    const alt     = thumb ? thumb.alt : caption;

    setZoom(false);
    lightbox.classList.add('is-loading');
    imgEl.alt = alt || caption || 'Project image';
    imgEl.src = src;
    captionEl.textContent = caption || '';

    if (counterEl) counterEl.textContent = (i + 1) + ' / ' + projects.length;
    const many = projects.length > 1;
    if (prevBtn) prevBtn.hidden = !many;
    if (nextBtn) nextBtn.hidden = !many;
  }

  function navigate(delta) {
    if (projects.length < 2) return;
    index = (index + delta + projects.length) % projects.length;
    load(index);
  }

  function hintText() {
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    return fine
      ? 'Double-click to zoom · Arrow keys to browse'
      : 'Pinch or double-tap to zoom · Swipe to browse';
  }

  function hideHint() {
    if (!hintEl) return;
    hintEl.classList.remove('is-visible');
    window.clearTimeout(hintTimer);
    hintTimer = null;
    window.setTimeout(() => {
      if (!hintEl.classList.contains('is-visible')) hintEl.hidden = true;
    }, 420);
  }

  function maybeShowHint() {
    if (!hintEl) return;

    let seen = false;
    try { seen = sessionStorage.getItem(HINT_KEY) === '1'; } catch (_) {}
    if (seen) return;

    hintEl.textContent = hintText();
    hintEl.hidden = false;
    requestAnimationFrame(() => hintEl.classList.add('is-visible'));

    window.clearTimeout(hintTimer);
    hintTimer = window.setTimeout(hideHint, 5000);

    try { sessionStorage.setItem(HINT_KEY, '1'); } catch (_) {}
  }

  function open(btn) {
    projects = getVisibleProjects();
    index = Math.max(0, projects.indexOf(btn));

    lastFocused = btn || document.activeElement;
    setBackgroundInert(true);
    lightbox.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    load(index);
    closeBtn.focus();
    maybeShowHint();
  }

  function close() {
    lightbox.classList.remove('is-open');
    setZoom(false);
    document.body.style.overflow = '';
    setBackgroundInert(false);

    const focusBack = projects[index] || lastFocused;
    if (focusBack && typeof focusBack.focus === 'function') {
      focusBack.focus({ preventScroll: true });
    }
    lastFocused = null;

    hideHint();

    window.setTimeout(() => {
      if (!isOpen()) {
        imgEl.removeAttribute('src');
        lightbox.classList.remove('is-loading');
      }
    }, 260);
  }

  document.querySelectorAll('.project').forEach((btn) => {
    btn.addEventListener('click', () => open(btn));
  });

  closeBtn.addEventListener('click', close);
  if (prevBtn) prevBtn.addEventListener('click', () => navigate(-1));
  if (nextBtn) nextBtn.addEventListener('click', () => navigate(1));
  if (zoomBtn) zoomBtn.addEventListener('click', () => setZoom(!isZoomed()));

  lightbox.addEventListener('click', (e) => {
    if (Date.now() - lastSwipeAt < 400) return;
    if (e.target === lightbox || e.target === stage) close();
  });

  imgEl.addEventListener('click', () => {
    if (isZoomed()) setZoom(false);
  });

  imgEl.addEventListener('dblclick', (e) => {
    e.preventDefault();
    setZoom(!isZoomed());
  });

  imgEl.addEventListener('touchend', (e) => {
    const now = Date.now();
    if (now - lastTapAt < 300) {
      e.preventDefault();
      setZoom(!isZoomed());
      lastTapAt = 0;
    } else {
      lastTapAt = now;
    }
  }, { passive: false });

  lightbox.addEventListener('touchstart', (e) => {
    const t = e.changedTouches[0];
    touchStartX = t.clientX;
    touchStartY = t.clientY;
  }, { passive: true });

  lightbox.addEventListener('touchend', (e) => {
    if (isZoomed()) return;

    const t  = e.changedTouches[0];
    const dx = t.clientX - touchStartX;
    const dy = t.clientY - touchStartY;
    const ax = Math.abs(dx);
    const ay = Math.abs(dy);

    if (ax < 60 && ay < 60) return;

    lastSwipeAt = Date.now();

    if (ay > ax && dy > 90) { close(); return; }
    if (ax > ay && ax > 60) { navigate(dx < 0 ? 1 : -1); }
  }, { passive: true });

  document.addEventListener('keydown', (e) => {
    if (!isOpen()) return;

    if (e.key === 'Escape') {
      if (isZoomed()) setZoom(false);
      else close();
      return;
    }
    if (e.key === 'ArrowRight') { navigate(1);  return; }
    if (e.key === 'ArrowLeft')  { navigate(-1); return; }
    if (e.key === '+' || e.key === '=') { setZoom(true);  return; }
    if (e.key === '-')                  { setZoom(false); return; }

    trapFocus(lightbox, e);
  });

  imgEl.addEventListener('load', () => {
    lightbox.classList.remove('is-loading');
  });
  imgEl.addEventListener('error', () => {
    lightbox.classList.remove('is-loading');
    if (captionEl) captionEl.textContent = 'Sorry, this image could not be loaded.';
  });

  GALLERY_WIDE_MQ.addEventListener('change', () => {
    if (!isOpen()) return;

    const before  = projects.length;
    const current = projects[index];
    projects = getVisibleProjects();
    if (!projects.length) return;

    const found = projects.indexOf(current);
    index = found >= 0 ? found : Math.min(index, projects.length - 1);

    if (projects.length !== before) load(index);
  });
})();


/* ---------------------------------------------------------
   9. QUOTE FORM (audit-updated)
   - No novalidate: native constraint validation runs first
     via form.reportValidity().
   - :user-invalid CSS handles the visual error state after
     user interaction.
   - JS still composes the WhatsApp message and handles status.
   - Status auto-resets after 30s and on pagehide.
   - Fires an optional analytics hook (no-op if not loaded).
--------------------------------------------------------- */
(function initQuoteForm() {
  const form = document.querySelector('[data-quote-form]');
  if (!form) return;

  const status = form.querySelector('[data-quote-status]');
  let statusTimer = null;

  function setStatus(message, state) {
    if (!status) return;
    status.textContent = message || '';
    if (state) status.dataset.state = state;
    else status.removeAttribute('data-state');

    window.clearTimeout(statusTimer);
    if (message && state === 'success') {
      statusTimer = window.setTimeout(() => {
        if (status.textContent === message) setStatus('');
      }, 30000);
    }
  }

  function clean(value, max) {
    return String(value == null ? '' : value)
      .trim()
      .replace(/\s+/g, ' ')
      .slice(0, max);
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    // Native constraint validation first — gives the user the browser's
    // own error UI without needing a custom one.
    if (typeof form.reportValidity === 'function' && !form.checkValidity()) {
      form.reportValidity();
      setStatus('Please fill in your name, project location and project type.', 'error');
      return;
    }

    const data     = new FormData(form);
    const name     = clean(data.get('name'), 80);
    const location = clean(data.get('location'), 120);
    const type     = clean(data.get('project_type'), 60);

    // Fallback check (covers browsers where checkValidity is missing).
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

    const link = document.createElement('a');
    link.href = buildWhatsAppLink(message);
    link.target = '_blank';
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();

    setStatus('Opening WhatsApp… if nothing happens, call 0702 555 093.', 'success');

    // Analytics hook — no-op if no analytics script is loaded.
    try {
      if (typeof window.plausible === 'function') {
        window.plausible('Quote Submitted', { props: { type: type } });
      } else if (typeof window.fathom === 'object' && window.fathom.trackEvent) {
        window.fathom.trackEvent('Quote Submitted');
      } else if (typeof window.umami === 'object' && window.umami.track) {
        window.umami.track('Quote Submitted', { type: type });
      }
    } catch (_) {}
  });

  // Clear stale success messages on back-navigation.
  window.addEventListener('pagehide', () => setStatus(''));
})();


/* ---------------------------------------------------------
   10. FAQ — CLOSE ANY OPEN ITEM WHEN CLICKING OUTSIDE
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
   11. BACK TO TOP
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
   12. SCROLL REVEAL
--------------------------------------------------------- */
(function initReveal() {
  window.__jashoRevealReady = true;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const SELECTORS = [
    '.section__head',
    '.proof-bar__badge', '.proof-bar__quote', '.proof-bar__stat',
    '.card', '.why-card', '.cost-card', '.area', '.step', '.quote',
    '.split__media', '.split__body',
    '.case', '.case__media', '.case__body',
    '.team__member',
    '.cta-box > div'
  ];

  const GRIDS = [
    '.grid--cards', '.why-grid', '.cost-grid', '.areas-grid',
    '.process', '.quotes', '.team__grid'
  ];

  const els = [];
  SELECTORS.forEach((sel) => {
    document.querySelectorAll(sel).forEach((el) => {
      if (el.hasAttribute('data-reveal')) return;
      el.setAttribute('data-reveal', '');
      els.push(el);
    });
  });

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
   13. FOOTER — CURRENT YEAR
--------------------------------------------------------- */
(function initFooterYear() {
  document.querySelectorAll('[data-year]').forEach((el) => {
    el.textContent = new Date().getFullYear();
  });
})();