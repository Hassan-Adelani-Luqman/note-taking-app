/* ═══════════════════════════════════════════════════
   noteManager.js — Note class + CRUD operations
═══════════════════════════════════════════════════ */

import { saveNotes } from './storage.js';

// ─── Note class ───────────────────────────────────

export class Note {
  constructor(title, content, tags = []) {
    this.id        = crypto.randomUUID();
    this.title     = title.trim();
    this.content   = content;
    this.tags      = Array.isArray(tags) ? tags.map(t => t.trim()).filter(Boolean) : [];
    this.archived  = false;
    this.category  = null;
    this.createdAt = Date.now();
    this.updatedAt = Date.now();
    this.location  = null;
  }

  archive() {
    this.archived  = true;
    this.updatedAt = Date.now();
  }

  restore() {
    this.archived  = false;
    this.updatedAt = Date.now();
  }

  addTag(tag) {
    const trimmed = tag.trim();
    if (trimmed && !this.tags.includes(trimmed)) {
      this.tags.push(trimmed);
    }
  }
}

// ─── Internal state (in-memory cache) ─────────────

let _notes = [];

export const initNotes = (notes) => {
  _notes = notes;
};

export const getNotes = () => _notes;

// ─── CRUD ─────────────────────────────────────────

export const createNote = (title, content, tags, category = null) => {
  const note      = new Note(title, content, tags);
  note.category   = category;
  _notes.unshift(note); // newest first
  saveNotes(_notes);
  return note;
};

export const deleteNote = (id) => {
  _notes = _notes.filter(n => n.id !== id);
  saveNotes(_notes);
};

export const updateNote = (id, updates) => {
  const note = _notes.find(n => n.id === id);
  if (!note) return null;

  if (updates.title   !== undefined) note.title   = updates.title.trim();
  if (updates.content !== undefined) note.content = updates.content;
  if (updates.tags    !== undefined) {
    note.tags = Array.isArray(updates.tags)
      ? updates.tags.map(t => t.trim()).filter(Boolean)
      : parseTags(updates.tags);
  }
  if (updates.category !== undefined) note.category = updates.category;
  if (updates.location !== undefined) note.location = updates.location;

  note.updatedAt = Date.now();
  saveNotes(_notes);
  return note;
};

export const archiveNote = (id) => {
  const note = _notes.find(n => n.id === id);
  if (!note) return null;
  note.archived  = true;
  note.updatedAt = Date.now();
  saveNotes(_notes);
  return note;
};

export const restoreNote = (id) => {
  const note = _notes.find(n => n.id === id);
  if (!note) return null;
  note.archived  = false;
  note.updatedAt = Date.now();
  saveNotes(_notes);
  return note;
};

export const getNoteById = (id) => _notes.find(n => n.id === id) || null;

// ─── Filtering ────────────────────────────────────

export const getActiveNotes = () => _notes.filter(n => !n.archived);

export const getArchivedNotes = () => _notes.filter(n => n.archived);

export const filterByTag = (tag) =>
  _notes.filter(n => !n.archived && n.tags.map(t => t.toLowerCase()).includes(tag.toLowerCase()));

export const searchNotes = (query) => {
  if (!query.trim()) return _notes.filter(n => !n.archived);
  const q = query.toLowerCase().trim();
  return _notes.filter(n => {
    const inTitle   = n.title.toLowerCase().includes(q);
    const inContent = n.content.toLowerCase().includes(q);
    const inTags    = n.tags.some(t => t.toLowerCase().includes(q));
    return inTitle || inContent || inTags;
  });
};

// ─── Tags ─────────────────────────────────────────

export const getAllTags = () => {
  const tagSet = new Set();
  _notes.forEach(note => note.tags.forEach(t => tagSet.add(t)));
  return [...tagSet].sort((a, b) => a.localeCompare(b));
};

// ─── Helpers ──────────────────────────────────────

export const parseTags = (str) =>
  str.split(',').map(t => t.trim()).filter(Boolean);

export const formatDate = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};
