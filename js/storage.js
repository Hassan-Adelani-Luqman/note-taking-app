/* ═══════════════════════════════════════════════════
   storage.js — localStorage / sessionStorage helpers
═══════════════════════════════════════════════════ */

const NOTES_KEY = 'notes-app-notes';
const PREFS_KEY = 'notes-app-prefs';
const DRAFT_KEY = 'notes-app-draft';

// ─── Notes ────────────────────────────────────────

export const saveNotes = (notes) => {
  try {
    localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
  } catch (e) {
    if (e.name === 'QuotaExceededError') {
      console.error('localStorage quota exceeded. Could not save notes.');
      throw e; // let caller handle
    }
  }
};

export const loadNotes = () => {
  try {
    const raw = localStorage.getItem(NOTES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

// ─── Preferences ──────────────────────────────────

export const savePreferences = (prefs) => {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // non-critical, silently ignore
  }
};

export const loadPreferences = () => {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw ? { theme: 'light', font: 'sans-serif', ...JSON.parse(raw) } : { theme: 'light', font: 'sans-serif' };
  } catch {
    return { theme: 'light', font: 'sans-serif' };
  }
};

// ─── Draft (sessionStorage) ───────────────────────

export const saveDraft = (draft) => {
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // non-critical
  }
};

export const loadDraft = () => {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const clearDraft = () => {
  try {
    sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    // non-critical
  }
};
