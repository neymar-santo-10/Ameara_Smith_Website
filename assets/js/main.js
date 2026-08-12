/* ============================================================================
   MAIN.JS
   ----------------------------------------------------------------------------
   No dependencies, no build step. Five small behaviours:

     1. Hero entrance      — masked line reveal, once, on load
     2. Scroll reveals     — IntersectionObserver, fires once per element
     3. Header state       — solid background after the hero scrolls past
     4. Scroll spy         — highlights the nav link for the visible section
     5. Mobile nav         — open/close, with Esc and outside-click

   Everything degrades gracefully: with JS off, all content is visible and
   the page works. Nothing here is required to READ the site.

   Tuning knobs are in assets/css/tokens.css (--dur-reveal, --stagger,
   --reveal-lift), not in here.
============================================================================ */

(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------------------
     1. HERO ENTRANCE
     Adding .is-loaded triggers the CSS transitions on the hero. We wait for
     fonts so the name doesn't animate in one typeface and settle in another.
  ------------------------------------------------------------------------ */
  function startHero() {
    // rAF twice: guarantees the browser has painted the "before" state first,
    // otherwise the transition is skipped entirely.
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        document.body.classList.add('is-loaded');
      });
    });
  }

  if (document.fonts && document.fonts.ready) {
    // Don't let a slow font request hold the hero hostage.
    Promise.race([
      document.fonts.ready,
      new Promise(function (r) { setTimeout(r, 900); })
    ]).then(startHero);
  } else {
    startHero();
  }

  /* ------------------------------------------------------------------------
     2. SCROLL REVEALS

     Design constraints being enforced here:
       · reveal once — we unobserve immediately, so scrolling back up never
         re-hides or re-animates anything (NN/g: repeated fades add load)
       · stagger siblings inside [data-reveal-group], capped at 6 steps so a
         long list never ends up with a two-second tail
       · anything already on screen at load reveals right away
  ------------------------------------------------------------------------ */
  var MAX_STAGGER_STEPS = 6;

  function assignStagger() {
    var groups = document.querySelectorAll('[data-reveal-group]');
    Array.prototype.forEach.call(groups, function (group) {
      var items = group.querySelectorAll(':scope > [data-reveal]');
      Array.prototype.forEach.call(items, function (el, i) {
        el.style.setProperty('--d', Math.min(i, MAX_STAGGER_STEPS));
      });
    });
  }

  function initReveals() {
    var targets = Array.prototype.slice.call(document.querySelectorAll('[data-reveal]'));
    if (!targets.length) return;

    // No IntersectionObserver, or user prefers reduced motion → just show it.
    if (reduceMotion || !('IntersectionObserver' in window)) {
      targets.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }

    var pending = targets.slice();

    function show(el) {
      el.classList.add('is-visible');
      observer.unobserve(el);                 // ← "fire once" lives here
      var i = pending.indexOf(el);
      if (i > -1) pending.splice(i, 1);
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) show(entry.target);
      });
    }, {
      // Fire slightly BEFORE the element enters the viewport. The reveal runs
      // ~1s now, so triggering on 12%-visible (as it did when reveals were
      // 620ms) meant things were still arriving well after you'd started
      // reading them. Starting early lets the animation land as the element
      // settles into view instead of chasing it.
      threshold: 0,
      rootMargin: '0px 0px 4% 0px'
    });

    targets.forEach(function (el) { observer.observe(el); });

    /* --- Safety sweep -----------------------------------------------------
       Reveals anything that ended up ABOVE the viewport without ever
       intersecting: a deep link like /#contact, a restored scroll position,
       or an instant anchor jump past several sections.

       IntersectionObserver cannot cover this on its own. Those elements go
       from "below the viewport, not intersecting" straight to "above the
       viewport, not intersecting" — isIntersecting never flips to true, so
       no callback fires and the sections stay permanently blank.

       Cost is negligible: it only runs on rAF-throttled scroll, only walks
       the not-yet-revealed list, and unbinds itself once that list empties.
    --------------------------------------------------------------------- */
    var ticking = false;

    function sweep() {
      ticking = false;
      if (!pending.length) {
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('hashchange', onScroll);
        return;
      }
      pending.slice().forEach(function (el) {
        if (el.getBoundingClientRect().bottom < 0) show(el);
      });
    }

    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(sweep);
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('hashchange', onScroll);
    window.addEventListener('load', onScroll);   // hash scrolling lands after load
    onScroll();
  }

  /* ------------------------------------------------------------------------
     3. HEADER STATE
     A short invisible sentinel pinned to the top of the document. While any
     part of it is on screen we're still "at the top" and the header stays
     transparent over the hero; once it scrolls away the header goes solid.

     The sentinel's HEIGHT is the trigger distance — don't use a 1px sentinel
     plus a negative rootMargin, because then the sentinel starts out inside
     the margin and the header would render solid at scroll position 0.

     Cheaper and smoother than a scroll listener, and it can't jitter.
  ------------------------------------------------------------------------ */
  var HEADER_TRIGGER = 28; // px scrolled before the header solidifies

  function initHeader() {
    var header = document.getElementById('header');
    if (!header) return;

    var sentinel = document.createElement('div');
    sentinel.setAttribute('aria-hidden', 'true');
    sentinel.style.cssText =
      'position:absolute;top:0;left:0;width:1px;pointer-events:none;visibility:hidden;' +
      'height:' + HEADER_TRIGGER + 'px;';
    document.body.prepend(sentinel);

    if (!('IntersectionObserver' in window)) {
      header.classList.add('is-scrolled');
      return;
    }

    new IntersectionObserver(function (entries) {
      header.classList.toggle('is-scrolled', !entries[0].isIntersecting);
    }, { threshold: 0 }).observe(sentinel);
  }

  /* ------------------------------------------------------------------------
     4. SCROLL SPY
     Marks the nav link whose section is currently in view. We track only
     sections that actually have a nav link, and pick the one nearest the
     top of the viewport so overlapping sections don't fight.
  ------------------------------------------------------------------------ */
  function initSpy() {
    var links = document.querySelectorAll('.nav__link[href^="#"]');
    if (!links.length || !('IntersectionObserver' in window)) return;

    var map = {};
    var sections = [];

    Array.prototype.forEach.call(links, function (link) {
      var id = link.getAttribute('href').slice(1);
      var section = document.getElementById(id);
      if (!section) return;
      map[id] = link;
      sections.push(section);
    });

    var visible = {};

    function update() {
      var best = null;
      var bestTop = Infinity;

      sections.forEach(function (section) {
        if (!visible[section.id]) return;
        var top = Math.abs(section.getBoundingClientRect().top);
        if (top < bestTop) { bestTop = top; best = section.id; }
      });

      Object.keys(map).forEach(function (id) {
        if (id === best) {
          map[id].setAttribute('aria-current', 'true');
        } else {
          map[id].removeAttribute('aria-current');
        }
      });
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        visible[entry.target.id] = entry.isIntersecting;
      });
      update();
    }, {
      // Watch a band across the upper-middle of the screen, offset for the
      // fixed header — so a section counts as "current" when you're reading it.
      rootMargin: '-72px 0px -55% 0px',
      threshold: 0
    });

    sections.forEach(function (s) { observer.observe(s); });
  }

  /* ------------------------------------------------------------------------
     5. MOBILE NAV
  ------------------------------------------------------------------------ */
  function initNav() {
    var header = document.getElementById('header');
    var toggle = document.querySelector('.nav-toggle');
    var nav = document.getElementById('nav');
    if (!header || !toggle || !nav) return;

    function setOpen(open) {
      header.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
    }

    toggle.addEventListener('click', function () {
      setOpen(!header.classList.contains('is-open'));
    });

    // Close after tapping a link (it's a single-page site, so the panel
    // would otherwise sit over the section you just jumped to).
    nav.addEventListener('click', function (e) {
      if (e.target.closest('.nav__link')) setOpen(false);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && header.classList.contains('is-open')) {
        setOpen(false);
        toggle.focus();
      }
    });

    document.addEventListener('click', function (e) {
      if (!header.classList.contains('is-open')) return;
      if (!header.contains(e.target)) setOpen(false);
    });

    // If the viewport grows past the mobile breakpoint while the panel is
    // open, drop the open state so the desktop nav isn't stuck in it.
    window.matchMedia('(min-width: 861px)').addEventListener('change', function (e) {
      if (e.matches) setOpen(false);
    });
  }

  /* ------------------------------------------------------------------------
     Footer year — so nobody has to remember to update it.
  ------------------------------------------------------------------------ */
  function initYear() {
    var el = document.getElementById('year');
    if (el) el.textContent = new Date().getFullYear();
  }

  /* ---------------------------------------------------------------------- */
  function init() {
    assignStagger();
    initReveals();
    initHeader();
    initSpy();
    initNav();
    initYear();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
