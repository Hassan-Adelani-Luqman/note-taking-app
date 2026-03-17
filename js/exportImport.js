/* ═══════════════════════════════════════════════════
   exportImport.js — Export and import notes as JSON
═══════════════════════════════════════════════════ */

import { getNotes, initNotes } from './noteManager.js';
import { saveNotes } from './storage.js';

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

// ─── Import ───────────────────────────────────────

export const importNotes = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      let data;
      try {
        data = JSON.parse(e.target.result);
      } catch {
        return reject(new Error('Could not parse file. Make sure it is a valid JSON file.'));
      }

      if (!Array.isArray(data)) {
        return reject(new Error('Invalid format: expected an array of notes.'));
      }

      // Keep only items that look like note objects
      const valid = data.filter(
        item => item && typeof item === 'object' &&
                typeof item.id === 'string' &&
                typeof item.title === 'string'
      );

      if (valid.length === 0) {
        return reject(new Error('No valid notes found in the file.'));
      }

      // Skip notes whose IDs already exist (duplicate prevention)
      const existingIds = new Set(getNotes().map(n => n.id));
      const toImport    = valid.filter(n => !existingIds.has(n.id));
      const skipped     = valid.length - toImport.length;

      if (toImport.length > 0) {
        const merged = [...toImport, ...getNotes()]; // imported notes at the top
        initNotes(merged);
        saveNotes(merged);
      }

      resolve({ imported: toImport.length, skipped });
    };

    reader.onerror = () => reject(new Error('Could not read the file.'));
    reader.readAsText(file);
  });
};
