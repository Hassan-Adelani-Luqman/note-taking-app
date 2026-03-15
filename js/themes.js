/* ═══════════════════════════════════════════════════
   themes.js — color theme + font theme management
═══════════════════════════════════════════════════ */

const FONT_MAP = {
  'sans-serif': "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  'serif':      "'Georgia', 'Times New Roman', serif",
  'monospace':  "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
};

// ─── Theme ────────────────────────────────────────

let _systemDarkMQ = null;
let _onSystemChange = null;

export const applyTheme = (themeName) => {
  // Remove any existing system-change listener
  if (_systemDarkMQ && _onSystemChange) {
    _systemDarkMQ.removeEventListener('change', _onSystemChange);
    _systemDarkMQ = null;
    _onSystemChange = null;
  }

  if (themeName === 'system') {
    _systemDarkMQ = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = (e) => {
      document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
    };
    _onSystemChange = apply;
    _systemDarkMQ.addEventListener('change', _onSystemChange);
    apply(_systemDarkMQ); // apply immediately
  } else {
    document.documentElement.setAttribute('data-theme', themeName);
  }

  // Update settings button states
  document.querySelectorAll('[data-theme-option]').forEach(btn => {
    btn.setAttribute('aria-pressed', String(btn.dataset.themeOption === themeName));
  });
};

// ─── Font ─────────────────────────────────────────

export const applyFont = (fontName) => {
  const fontStack = FONT_MAP[fontName] || FONT_MAP['sans-serif'];
  document.documentElement.setAttribute('data-font', fontName);
  document.documentElement.style.setProperty('--font-body', fontStack);

  // Update settings button states
  document.querySelectorAll('[data-font-option]').forEach(btn => {
    btn.setAttribute('aria-pressed', String(btn.dataset.fontOption === fontName));
  });
};
