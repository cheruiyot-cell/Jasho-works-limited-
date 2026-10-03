/* =========================================================
   JASHO WORKS — MAIN SCRIPT
   Progressive enhancement only. Site works without JS for
   navigation, content and contact — the gallery limit,
   form interception, FAQ auto-close, back-to-top and
   scroll-reveal are the only JS-dependent behaviours.

   CHANGELOG
   - initJsClass applies the .js hook that gates every
     animation rule, with a 2.5s safety net.
   - data-wa templating rewrites every WhatsApp href from a
     single number + sign-off.
   - Lightbox toggles via is-open only; no display flag, so
     the transition plays.
   - Form submission uses an anchor click, not window.open.
   - Form has explicit validation, length caps, live status
     region and screen-reader announcements.

   CHANGELOG — gallery
   - G1: live-status count reflects what is actually rendered
     on mobile (was over-reporting on the limited view).
   - G2: "show more" toggle is hidden while a filter is
     active — it had nothing left to reveal.
   - G3: toggle label and its initial hidden state are
     derived from the real [data-extra] count.
   - G4: expand centres the first new card; collapse uses
     `nearest` so the page doesn't jump.
   - G5: [data-limit] is the single source of truth for the
     mobile cutoff; [data-extra] is re-derived at init.

   CHANGELOG — gallery responsiveness (G6–G9)
   - G6: one isTileVisible() predicate, shared by the filter
     counter and the lightbox project list. The lightbox
     used to walk all 12 tiles even when the gallery was
     collapsed to 6 on mobile — wrong counter, unreachable
     images, and focus lost on close.
   - G7: GALLERY_WIDE_MQ + a change listener re-sync the
     lightbox list and the live status when the 1000px
     breakpoint flips mid-session.
   - G8: the toggle's own [hidden] state is the single
     source of truth; the filter no longer un-hides a
     button that has no click handler.
   - G9: expand/collapse fires `gallery:toggled` so the
     live status is recomputed for screen-reader users.

   CHANGELOG — lightbox
   - L1: prev/next navigation (buttons, swipe, arrow keys),
     live counter, and a loading spinner.
   - L2: explicit zoom — button, double-click / double-tap,
     native pinch, single-click to unzoom. Escape backs out
     of zoom before it closes.
   - L3: swipe-down closes, but is suppressed while zoomed
     so vertical drags pan the image instead.
   - L4: background regions inert while open; focus returns
     to the last-viewed tile on close.
   - L5: one-per-session hint line under the caption.
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
   The 1000px cutoff lives here and in style.css. Everything
   that asks "is this tile on screen right now?" must go
   through isTileVisible(): the filter's live count and the
   lightbox's prev/next list. If those two ever disagree you
   get a counter that lies and a viewer that steps through
   images the user cannot see.
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
   Sets html.js so the animation rules in style.css activate.
   The setTimeout is a safety net: if main.js fails to load
   or throws before initReveal runs, the class is stripped
   and every [data-reveal] element goes back to full opacity.
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
   3. MOBILE NAVIGATION
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
   `data-limit` is the single source of truth for how many
   projects show before the "show more" toggle appears. Items
   past the limit get [data-extra], which the CSS hides below
   1000px. The markup already ships [data-extra] applied so
   mobile visitors never see a flash of all 12 cards before
   this runs; the loop just keeps the two in sync.
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
   G1: the live-status count reflects what is actually
       rendered on mobile (was over-reporting on the
       limited view). Now via the shared isTileVisible().
   G2: the "show more" toggle is hidden while a filter is
       active — it had nothing left to reveal.
   G7: crossing the 1000px breakpoint flips [data-extra]
       visibility, so the status is recomputed.
   G8: the toggle's own [hidden] state is the source of
       truth — a filter never un-hides a dead button.
   G9: expand/collapse fires `gallery:toggled` so the
       status is recomputed for screen readers.
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

  /* `options.announce === false` suppresses the live-status write.
     Used for the initial paint only: an aria-live region populated
     during load can be read aloud by some screen readers, and
     "Showing 12 of 12 projects" is not an answer to anything the
     user asked. */
  function apply(filter, options) {
    const announce = !options || options.announce !== false;
    currentFilter = filter;

    items.forEach((item) => {
      const btn = item.querySelector('.project');
      const cat = btn ? btn.dataset.cat : '';
      item.classList.toggle('is-hidden', !(filter === 'all' || cat === filter));
    });

    gallery.classList.toggle('is-filtered', filter !== 'all');

    // While a filter is active every match is already on screen, so the
    // "show more" toggle has nothing left to reveal — hide it. It also
    // stays hidden if initGalleryToggle found nothing to reveal and
    // removed the button itself.
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

  // Expanding/collapsing changes what is rendered, so the status has
  // to be recomputed even though the filter itself didn't change.
  gallery.addEventListener('gallery:toggled', () => apply(currentFilter));

  // Crossing 1000px flips [data-extra] visibility. Without this the
  // status keeps reporting the count from the other side of the
  // breakpoint until the user happens to click a filter.
  GALLERY_WIDE_MQ.addEventListener('change', () => apply(currentFilter));

  // Initial paint, minus the announcement.
  apply('all', { announce: false });
})();


/* ---------------------------------------------------------
   7. GALLERY "SHOW MORE" TOGGLE (mobile only)
   G3: the label and the wrap's hidden state are derived from
       the real [data-extra] count.
   G4: expanding centres the first new card; collapsing uses
       `nearest` so the page doesn't jump to the top of the
       section. Both respect the page's `scroll-behavior`,
       which is `auto` under prefers-reduced-motion.
   G8: when there is nothing to reveal, the button itself is
       hidden — not just its wrapper — so the filter's
       `toggleUsable` check has something honest to read.
--------------------------------------------------------- */
(function initGalleryToggle() {
  const gallery = document.querySelector('[data-gallery]');
  const toggle  = document.querySelector('[data-gallery-toggle]');
  if (!gallery || !toggle) return;

  const toggleWrap = toggle.closest('.gallery-toggle-wrap');

  const extraCount     = gallery.querySelectorAll('li[data-extra]').length;
  const collapsedLabel = 'Show ' + extraCount + ' more projects';
  const expandedLabel  = 'Show fewer projects';

  // Nothing to reveal → the toggle would be a no-op. Hide the button
  // itself as well as the wrapper so initGalleryFilter can tell the
  // difference between "hidden by a filter" and "never existed".
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

    // Let the filter recompute the live status — the set of rendered
    // tiles just changed, so the previously announced count is stale.
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
   Full flow: click → view → zoom → exit.

   - Click: every .project tile is a <button>; a descriptive
     aria-label is derived once at init.
   - View: prev/next navigation (buttons, swipe, ←/→ keys),
     a live "n / total" counter, and a loading spinner.
     The navigation list is recomputed on open, so it respects
     the active filter.
   - Zoom: explicit button, double-click / double-tap, plus
     native pinch. Single-click on a zoomed image zooms back
     out. Escape unzooms before it closes.
   - Exit: close button, click-backdrop, Escape, swipe-down.
     Swipe-down is suppressed while zoomed. Focus returns to
     the last-viewed tile.
   - First-visit hint: one line under the caption, shown once
     per session, device-aware.

   G6: the project list is filtered through the shared
       isTileVisible(), so a collapsed mobile gallery gives
       a 6-item viewer, not a 12-item one. Counter, arrow
       keys, swipe and focus-return all agree with what is
       on screen.
   G7: crossing the 1000px breakpoint while the viewer is
       open rebuilds the list and keeps the current image.
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

  /* --- Give every tile a proper accessible name ----------- */
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

  /* --- Background regions made inert while open ----------- */
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

  /* --- State ---------------------------------------------- */
  let projects    = [];   // visible .project buttons, in DOM order
  let index       = 0;    // which one is on screen
  let lastFocused = null; // element to restore focus to on close
  let touchStartX = 0;
  let touchStartY = 0;
  let lastSwipeAt = 0;
  let lastTapAt   = 0;
  let hintTimer   = null;

  const isOpen   = () => lightbox.classList.contains('is-open');
  const isZoomed = () => lightbox.classList.contains('is-zoomed');

  /* G6: the single source of truth for what the viewer may step
     through. A tile hidden by the mobile limit — not just by a
     filter — must not appear in the list. */
  function getVisibleProjects() {
    return Array.from(document.querySelectorAll('.project'))
      .filter((btn) => isTileVisible(btn.closest('li')));
  }

  /* --- Zoom ----------------------------------------------- */
  function setZoom(on) {
    lightbox.classList.toggle('is-zoomed', on);
    if (zoomBtn) {
      zoomBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
      zoomBtn.setAttribute('aria-label', on ? 'Zoom out' : 'Zoom in');
    }
    if (!on) stage.scrollTo(0, 0);
  }

  /* --- Load an image into the viewer ---------------------- */
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

  /* --- First-visit hint ----------------------------------- */
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
    // Next frame so the opacity transition runs from 0 → 1.
    requestAnimationFrame(() => hintEl.classList.add('is-visible'));

    window.clearTimeout(hintTimer);
    hintTimer = window.setTimeout(hideHint, 5000);

    try { sessionStorage.setItem(HINT_KEY, '1'); } catch (_) {}
  }

  /* --- Open / close --------------------------------------- */
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

    // Clear the src after the fade so a stale image isn't kept
    // around, and so a screen reader on the page underneath
    // doesn't run into it.
    window.setTimeout(() => {
      if (!isOpen()) {
        imgEl.removeAttribute('src');
        lightbox.classList.remove('is-loading');
      }
    }, 260);
  }

  /* --- Wiring --------------------------------------------- */
  document.querySelectorAll('.project').forEach((btn) => {
    btn.addEventListener('click', () => open(btn));
  });

  closeBtn.addEventListener('click', close);
  if (prevBtn) prevBtn.addEventListener('click', () => navigate(-1));
  if (nextBtn) nextBtn.addEventListener('click', () => navigate(1));
  if (zoomBtn) zoomBtn.addEventListener('click', () => setZoom(!isZoomed()));

  /* Click on empty backdrop (or empty stage area) closes.
     Ignored for 400ms after a swipe so the touchend-synthesised
     click doesn't accidentally close the viewer. */
  lightbox.addEventListener('click', (e) => {
    if (Date.now() - lastSwipeAt < 400) return;
    if (e.target === lightbox || e.target === stage) close();
  });

  /* Click on a zoomed image zooms out. */
  imgEl.addEventListener('click', () => {
    if (isZoomed()) setZoom(false);
  });

  /* Double-click on desktop zooms in. */
  imgEl.addEventListener('dblclick', (e) => {
    e.preventDefault();
    setZoom(!isZoomed());
  });

  /* Double-tap on touch zooms in. Single tap on a zoomed image
     zooms out (handled by the click listener above). */
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

  /* --- Swipe gestures ------------------------------------- */
  lightbox.addEventListener('touchstart', (e) => {
    const t = e.changedTouches[0];
    touchStartX = t.clientX;
    touchStartY = t.clientY;
  }, { passive: true });

  lightbox.addEventListener('touchend', (e) => {
    // While zoomed the image is the scroll target — let it pan.
    if (isZoomed()) return;

    const t  = e.changedTouches[0];
    const dx = t.clientX - touchStartX;
    const dy = t.clientY - touchStartY;
    const ax = Math.abs(dx);
    const ay = Math.abs(dy);

    if (ax < 60 && ay < 60) return; // tap, not swipe

    lastSwipeAt = Date.now();

    if (ay > ax && dy > 90) { close(); return; }            // swipe down → close
    if (ax > ay && ax > 60) { navigate(dx < 0 ? 1 : -1); }  // swipe L/R → nav
  }, { passive: true });

  /* --- Keyboard ------------------------------------------- */
  document.addEventListener('keydown', (e) => {
    if (!isOpen()) return;

    if (e.key === 'Escape') {
      // First Escape backs out of zoom, a second closes.
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

  /* --- Loading / error states ----------------------------- */
  imgEl.addEventListener('load', () => {
    lightbox.classList.remove('is-loading');
  });
  imgEl.addEventListener('error', () => {
    lightbox.classList.remove('is-loading');
    if (captionEl) captionEl.textContent = 'Sorry, this image could not be loaded.';
  });

  /* --- G7: re-sync when the 1000px breakpoint flips --------
     A tablet rotated to landscape mid-view suddenly has 12 tiles
     instead of 6 (or the reverse). Rebuild the list and hold the
     user's place. `load()` is skipped when the list length is
     unchanged, so resizing within the same side of the breakpoint
     doesn't reload the image. */
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
   9. QUOTE FORM
   - Trims, collapses whitespace and length-caps each field
     before composing the WhatsApp message.
   - Uses an anchor click rather than window.open() so popup
     blockers don't eat it.
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
   11. BACK TO TOP — visible after a short scroll
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
   Auto-applies [data-reveal] to key blocks. Staggers grid
   children. Uses `translate` (not `transform`) so component
   hover transforms keep working. Respects reduced motion.
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
   13. FOOTER — CURRENT YEAR
--------------------------------------------------------- */
(function initFooterYear() {
  document.querySelectorAll('[data-year]').forEach((el) => {
    el.textContent = new Date().getFullYear();
  });
})();