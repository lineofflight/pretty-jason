// The site's theme switch: Auto follows the system, Light and Dark override it.
// Loaded in <head> before the stylesheets, so a saved choice applies before
// first paint. The demo's own Auto follows whatever this sets (see demo.css).
// Icons from Lucide, ISC licence (moon derived from Feather, MIT); see
// lucide-LICENSE.txt.

(function () {
  const root = document.documentElement;
  const KEY = 'theme';
  const NEXT = { auto: 'light', light: 'dark', dark: 'auto' };
  const LABELS = { auto: 'Auto', light: 'Light', dark: 'Dark' };
  const TINTS = { light: '#ffffff', dark: '#0d1117' };

  const svg = (body) => `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
  const ICONS = {
    auto: svg('<path d="M12 2v2"/><path d="M14.837 16.385a6 6 0 1 1-7.223-7.222c.624-.147.97.66.715 1.248a4 4 0 0 0 5.26 5.259c.589-.255 1.396.09 1.248.715"/><path d="M16 12a4 4 0 0 0-4-4"/><path d="m19 5-1.256 1.256"/><path d="M20 12h2"/>'),
    light: svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>'),
    dark: svg('<path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401"/>')
  };

  let theme = 'auto';
  try { theme = localStorage.getItem(KEY) || 'auto'; } catch (e) { /* storage blocked */ }
  if (!LABELS[theme]) theme = 'auto';

  function apply() {
    if (theme === 'auto') delete root.dataset.theme;
    else root.dataset.theme = theme;

    // Tint the browser chrome to match: both tags take the chosen colour, or
    // each its own scheme's colour in Auto
    for (const meta of document.querySelectorAll('meta[name="theme-color"]')) {
      const scheme = theme === 'auto' ? (meta.media.includes('dark') ? 'dark' : 'light') : theme;
      meta.content = TINTS[scheme];
    }
  }

  apply();

  document.addEventListener('DOMContentLoaded', () => {
    const page = document.querySelector('.page');
    if (!page) return;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'theme-toggle';

    function label() {
      const text = `Theme: ${LABELS[theme]}`;
      button.innerHTML = ICONS[theme];
      button.title = text;
      button.setAttribute('aria-label', text);
    }

    button.addEventListener('click', () => {
      theme = NEXT[theme];
      try { localStorage.setItem(KEY, theme); } catch (e) { /* storage blocked */ }
      apply();
      label();
    });

    label();
    page.prepend(button);
  });
})();
