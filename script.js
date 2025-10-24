(function () {
  // ---------- tiny helpers ----------
  const $  = (s, c=document) => c.querySelector(s);
  const $$ = (s, c=document) => Array.from(c.querySelectorAll(s));

  // Footer year
  const year = $('#year'); if (year) year.textContent = new Date().getFullYear();

  // Elements
  const gallery  = $('#gallery');
  const lightbox = $('#lightbox');
  const lbImg    = $('#lb-image');
  const lbCap    = $('#lb-caption');
  const lbTitle  = $('#lb-title');
  const lbIdx    = $('#lb-index');
  const lbTot    = $('#lb-total');
  const meta     = $('#meta');
  const metaGrid = $('#meta-grid');

  if (!gallery || !lightbox || !lbImg) return;

  // ---------- CLS: reserve space so masonry doesn't jump ----------
  (function reserveAspectRatio() {
    const figs = $$('.card', gallery).filter(f => f.querySelector('img'));
    const parseDims = (s) => {
      if (!s) return null;
      const m = String(s).replace(/[×X]/g,'x').match(/(\d{2,})\s*x\s*(\d{2,})/);
      return m ? { w: +m[1], h: +m[2] } : null;
    };
    figs.forEach(fig => {
      const img = fig.querySelector('img'); if (!img) return;
      let w = parseInt(img.getAttribute('width')||'', 10);
      let h = parseInt(img.getAttribute('height')||'', 10);
      if (!(w && h)) {
        const d = parseDims(img.dataset.dimensions) ||
                  (img.dataset.w && img.dataset.h ? { w:+img.dataset.w, h:+img.dataset.h } : null);
        if (d) { w = d.w; h = d.h; }
      }
      fig.style.aspectRatio = (w && h) ? `${w} / ${h}` : '3 / 2';
      const correct = () => {
        if (img.naturalWidth && img.naturalHeight) {
          fig.style.aspectRatio = `${img.naturalWidth} / ${img.naturalHeight}`;
        }
      };
      if (img.complete) { correct(); queueMicrotask(correct); }
      else { img.addEventListener('load', correct, { once: true }); }
    });
  })();

  // Build items (skip placeholders)
  const figures = $$('.card', gallery).filter(f => f.querySelector('img'));
  const imgNodes = figures.map(f => f.querySelector('img'));
  const items = imgNodes.map(img => ({
    src: img.getAttribute('src'),
    alt: img.getAttribute('alt') || '',
    el : img
  }));
  if (lbTot) lbTot.textContent = items.length;

  // Optional: tag portrait/landscape for CSS if you want different ratios there
  imgNodes.forEach((img, i) => {
    const fig = figures[i];
    const tag = () => {
      const w = img.naturalWidth, h = img.naturalHeight;
      if (!w || !h) return;
      if (h > w * 1.1) { fig.classList.add('portrait'); fig.classList.remove('landscape'); }
      else { fig.classList.add('landscape'); fig.classList.remove('portrait'); }
    };
    img.complete && img.naturalWidth ? (tag(), queueMicrotask(tag)) : img.addEventListener('load', tag, { once: true });
  });

  // ---------- Lightbox ----------
  let current = 0, startX = 0;

  function open(i) {
    if (!items.length) return;
    current = (i + items.length) % items.length;
    const { src, alt } = items[current];
    lbImg.src = src;
    lbImg.alt = alt;
    if (lbTitle) lbTitle.textContent = alt;
    if (lbCap && lbTitle && !lbCap.contains(lbTitle)) lbCap.prepend(lbTitle);
    if (lbIdx) lbIdx.textContent = String(current + 1);
    lightbox.hidden = false;
    document.documentElement.style.overflow = 'hidden';
  }
  function close() {
    lightbox.hidden = true;
    document.documentElement.style.overflow = '';
  }
  const next = () => open(current + 1);
  const prev = () => open(current - 1);

  // Click / keyboard activate
  imgNodes.forEach((img, i) => {
    const fig = figures[i];
    const go = () => open(i);
    fig.tabIndex = 0;
    fig.setAttribute('role', 'button');
    fig.setAttribute('aria-label', 'Open image');
    fig.addEventListener('click', go);
    fig.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); }
    });
    img.addEventListener('click', go);
  });

  // Lightbox buttons + backdrop
  lightbox.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) { if (e.target === lightbox) close(); return; }
    const a = btn.getAttribute('data-action');
    if (a === 'close') close();
    if (a === 'next') next();
    if (a === 'prev') prev();
    if (a === 'open-original') {
      const el = items[current].el;
      const url = el.dataset.original || items[current].src;
      window.open(url, '_blank', 'noopener,noreferrer');
    }
    if (a === 'details') openDetails();
  });

  // Keyboard + swipe
  window.addEventListener('keydown', (e) => {
    const lbHidden = lightbox?.hidden ?? true;
    const metaHidden = meta?.hidden ?? true;
    if (lbHidden && metaHidden) return;
    if (e.key === 'Escape') { if (!metaHidden) hideDetails(); else close(); return; }
    if (!lbHidden) {
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
    }
  });
  lightbox.addEventListener('touchstart', e => { startX = e.changedTouches[0].clientX; }, { passive: true });
  lightbox.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 40) (dx < 0 ? next() : prev());
  });

  // Details popup
  function openDetails(){
    if (!meta || !metaGrid) return;
    const el = items[current].el;
    const fields = [
      ['Camera', el.dataset.camera], ['Lens', el.dataset.lens],
      ['Focal length', el.dataset.focal], ['Shutter speed', el.dataset.shutter],
      ['Aperture', el.dataset.aperture], ['ISO', el.dataset.iso],
      ['Dimensions', el.dataset.dimensions], ['File size', el.dataset.filesize],
      ['Format', el.dataset.format],
    ].filter(([,v]) => !!v);

    metaGrid.innerHTML = fields.length
      ? fields.map(([k,v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')
      : '<dt>Info</dt><dd>No details provided.</dd>';
    meta.hidden = false;
  }
  function hideDetails(){ if (meta) meta.hidden = true; }
  meta?.addEventListener('click', e => {
    if (e.target === meta || e.target.closest('[data-action="meta-close"]')) hideDetails();
  });
})();

// ====== THEME TOGGLE ======
(function () {
  const root = document.documentElement;
  const btn = document.getElementById("theme-toggle");

  if (!btn) return;

  // Load initial theme or system preference
  const saved = localStorage.getItem("theme-pref");
  const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const current = saved || (systemPrefersDark ? "dark" : "light");
  root.setAttribute("data-theme", current);

  // Set correct icon
  updateIcon(current);

  btn.addEventListener("click", () => {
    const now = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", now);
    localStorage.setItem("theme-pref", now);
    updateIcon(now);
  });

  function updateIcon(theme) {
    // You can replace these with icons if you prefer
    btn.textContent = theme === "dark" ? "☀️" : "🌙";
    btn.title = theme === "dark" ? "Switch to light mode" : "Switch to dark mode";
  }

  // React to system theme changes if no user pref
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", e => {
    if (!localStorage.getItem("theme-pref")) {
      const newTheme = e.matches ? "dark" : "light";
      root.setAttribute("data-theme", newTheme);
      updateIcon(newTheme);
    }
  });
})();