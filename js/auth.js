/* ═══════════════════════════════════════════════════
   auth.js — localStorage-based authentication
═══════════════════════════════════════════════════ */

const USERS_KEY   = 'notes-app-users';
const SESSION_KEY = 'notes-app-session';

export const isLoggedIn = () => !!localStorage.getItem(SESSION_KEY);

export const getCurrentUser = () => {
  const s = localStorage.getItem(SESSION_KEY);
  return s ? JSON.parse(s) : null;
};

export const login = (email, password) => {
  const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  const user  = users.find(u => u.email === email && u.password === password);
  if (!user) return { ok: false, error: 'Invalid email or password.' };
  localStorage.setItem(SESSION_KEY, JSON.stringify({ email, loggedAt: Date.now() }));
  return { ok: true };
};

export const register = (email, password) => {
  const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  if (users.find(u => u.email === email))
    return { ok: false, error: 'An account with this email already exists.' };
  users.push({ email, password });
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  localStorage.setItem(SESSION_KEY, JSON.stringify({ email, loggedAt: Date.now() }));
  return { ok: true };
};

export const logout = () => localStorage.removeItem(SESSION_KEY);
