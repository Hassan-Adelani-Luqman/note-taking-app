/* ═══════════════════════════════════════════════════
   categories.js — Category creation and persistence
═══════════════════════════════════════════════════ */

const CATEGORIES_KEY = 'notes-app-categories';

// ─── Persistence ──────────────────────────────────

export const getCategories = () => {
  try {
    const raw = localStorage.getItem(CATEGORIES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveCategories = (cats) => {
  try {
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(cats));
  } catch {
    // non-critical
  }
};

// ─── CRUD ─────────────────────────────────────────

export const createCategory = (name) => {
  const trimmed = name.trim();
  if (!trimmed) return null;

  const cats = getCategories();

  // Prevent exact duplicates (case-insensitive)
  if (cats.some(c => c.name.toLowerCase() === trimmed.toLowerCase())) return null;

  const category = { id: crypto.randomUUID(), name: trimmed };
  cats.push(category);
  saveCategories(cats);
  return category;
};

export const deleteCategory = (id) => {
  const cats = getCategories().filter(c => c.id !== id);
  saveCategories(cats);
};
