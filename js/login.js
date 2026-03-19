/* ═══════════════════════════════════════════════════
   login.js — Login page controller
═══════════════════════════════════════════════════ */

import * as auth from './auth.js';

// Apply saved theme before render (prevents flash)
const prefs = JSON.parse(localStorage.getItem('notes-app-prefs') || '{}');
const theme = prefs.theme || 'light';
if (theme === 'system') {
  document.documentElement.setAttribute('data-theme',
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
} else {
  document.documentElement.setAttribute('data-theme', theme);
}

// Redirect if already logged in
if (auth.isLoggedIn()) {
  window.location.replace('index.html');
}

const $ = (id) => document.getElementById(id);

// ─── Password toggle ───────────────────────────────

$('toggle-password').addEventListener('click', () => {
  const input = $('auth-password');
  input.type = input.type === 'password' ? 'text' : 'password';
});

document.querySelectorAll('.auth-eye-btn[data-target]').forEach(btn => {
  btn.addEventListener('click', () => {
    const input = $(btn.dataset.target);
    if (input) input.type = input.type === 'password' ? 'text' : 'password';
  });
});

// ─── Login form ────────────────────────────────────

$('login-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const email    = $('auth-email').value.trim();
  const password = $('auth-password').value;

  if (!email || !password) {
    showError('auth-error', 'Please enter your email and password.');
    return;
  }

  const result = auth.login(email, password);
  if (result.ok) {
    window.location.replace('index.html');
  } else {
    showError('auth-error', result.error);
  }
});

// ─── Forgot password ───────────────────────────────

$('forgot-btn').addEventListener('click', () => {
  showError('auth-error', 'Password reset is not available in this version.');
});

// ─── Google sign-in ────────────────────────────────

$('google-btn').addEventListener('click', () => {
  showError('auth-error', 'Google sign-in is not available in this version.');
});

// ─── Sign up toggle ────────────────────────────────

$('signup-toggle').addEventListener('click', () => {
  $('signup-overlay').hidden = false;
  $('signup-email').focus();
});

$('back-to-login').addEventListener('click', () => {
  $('signup-overlay').hidden = true;
});

$('signup-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const email    = $('signup-email').value.trim();
  const password = $('signup-password').value;

  if (!email || !password) {
    showError('signup-error', 'Please fill in all fields.');
    return;
  }
  if (password.length < 8) {
    showError('signup-error', 'Password must be at least 8 characters.');
    return;
  }

  const result = auth.register(email, password);
  if (result.ok) {
    window.location.replace('index.html');
  } else {
    showError('signup-error', result.error);
  }
});

// ─── Helper ────────────────────────────────────────

function showError(id, message) {
  const el = $(id);
  el.textContent = message;
  el.hidden = false;
  setTimeout(() => { el.hidden = true; }, 4000);
}
