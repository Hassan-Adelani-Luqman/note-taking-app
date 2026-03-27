/* ═══════════════════════════════════════════════════
   sharing.js — Shareable link generation via URL hash
═══════════════════════════════════════════════════ */

// ─── UTF-8 safe base64 helpers ────────────────────

const toBase64 = (str) => {
  const bytes     = new TextEncoder().encode(str);
  const binString = Array.from(bytes, b => String.fromCodePoint(b)).join('');
  return btoa(binString);
};

const fromBase64 = (b64) => {
  const binString = atob(b64);
  const bytes     = Uint8Array.from(binString, c => c.codePointAt(0));
  return new TextDecoder().decode(bytes);
};

// ─── Share link generation ────────────────────────

export const generateShareLink = (note) => {
  const payload = JSON.stringify({
    id:        note.id,
    title:     note.title,
    content:   note.content,
    tags:      note.tags,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  });

  const encoded = toBase64(payload);
  const base    = `${location.origin}${location.pathname}`;
  return `${base}#share=${encoded}`;
};

// ─── Hash parsing ─────────────────────────────────

export const getSharedNoteFromHash = () => {
  const hash = location.hash;
  if (!hash.startsWith('#share=')) return null;

  try {
    const encoded = hash.slice(7); // strip '#share='
    return JSON.parse(fromBase64(encoded));
  } catch {
    return null;
  }
};
