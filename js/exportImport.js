/* ═══════════════════════════════════════════════════
   exportImport.js — Export and import notes as JSON
═══════════════════════════════════════════════════ */

import { getNotes } from './noteManager.js';

// ─── Export ───────────────────────────────────────

export const exportNotes = () => {
  const notes    = getNotes();
  const json     = JSON.stringify(notes, null, 2);
  const blob     = new Blob([json], { type: 'application/json' });
  const url      = URL.createObjectURL(blob);
  const date     = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const filename = `notes-export-${date}.json`;

  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};
