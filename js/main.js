/* ═══════════════════════════════════════════════════
   main.js — App initialization + all event listeners
═══════════════════════════════════════════════════ */

import * as storage     from './storage.js';
import * as nm          from './noteManager.js';
import * as ui          from './ui.js';
import * as themes      from './themes.js';

// ─── App State ────────────────────────────────────

const state = {
  selectedNoteId: null,
  currentView:    'all',   // 'all'|'archived'|'search'|'tag'|'settings'
  activeTag:      null,
  searchQuery:    '',
  prefs:          { theme: 'light', font: 'sans-serif' },
  pendingDeleteId: null,
};

// ─── DOM shortcuts ────────────────────────────────

const $ = (id) => document.getElementById(id);
const $$ = (sel) => document.querySelectorAll(sel);

// ─── Init ─────────────────────────────────────────

function init() {
  // Load data
  const savedNotes = storage.loadNotes();
  nm.initNotes(savedNotes);
  state.prefs = storage.loadPreferences();

  // Apply saved theme + font
  themes.applyTheme(state.prefs.theme);
  themes.applyFont(state.prefs.font);
  ui.updateSettingsUI(state.prefs);

  // Render initial view
  renderCurrentView();
  ui.showView('all');
  ui.resetDetailToEmpty(); // ensure clean state: form hidden, empty-detail visible

  // Draft is checked when the user opens the Create form (see bindEvents)

  // Bind all event listeners
  bindEvents();
}

// ─── Render helpers ───────────────────────────────

function renderCurrentView(keepSelection = false) {
  const tags = nm.getAllTags();
  ui.renderTagList(tags);

  if (state.currentView === 'all') {
    const notes = nm.getActiveNotes();
    ui.renderNoteList(notes, keepSelection ? state.selectedNoteId : null);
    ui.setListDescription('');
    ui.setEmptyStateText("You don't have any notes yet. Start a new note to capture your thoughts and ideas.");

  } else if (state.currentView === 'archived') {
    const notes = nm.getArchivedNotes();
    ui.renderNoteList(notes, keepSelection ? state.selectedNoteId : null);
    ui.setListDescription('All your archived notes are stored here. You can restore or delete them anytime.');
    ui.setEmptyStateText('No archived notes.');

  } else if (state.currentView === 'search') {
    const notes = nm.searchNotes(state.searchQuery);
    ui.renderNoteList(notes, keepSelection ? state.selectedNoteId : null);
    ui.updateSearchHeading(state.searchQuery);

  } else if (state.currentView === 'tag') {
    const notes = nm.filterByTag(state.activeTag);
    ui.renderNoteList(notes, keepSelection ? state.selectedNoteId : null);
    ui.showTagFilteredView(state.activeTag, notes);
    ui.setActiveTag(state.activeTag);
  }
}

function refreshAfterMutation() {
  renderCurrentView(true);
  // If selected note was deleted, reset detail panel
  if (state.selectedNoteId && !nm.getNoteById(state.selectedNoteId)) {
    state.selectedNoteId = null;
    ui.resetDetailToEmpty();
  }
}

// ─── Note selection ───────────────────────────────

function selectNote(id) {
  const note = nm.getNoteById(id);
  if (!note) return;
  state.selectedNoteId = id;
  ui.setSelectedCard(id);
  ui.showDetailPanel(note);
  ui.hideDraftBanner(); // hide draft banner when viewing existing note
}

// ─── Save note ────────────────────────────────────

function handleSaveNote(e) {
  e.preventDefault();
  ui.clearValidationErrors();

  const title   = $('note-title').value.trim();
  const tagsRaw = $('note-tags').value;
  const content = $('note-content').value;
  const tags    = nm.parseTags(tagsRaw);

  if (!title) {
    ui.showValidationError('note-title', 'Title is required.');
    return;
  }

  const existingId = $('note-form').dataset.noteId;

  if (existingId) {
    // Update existing note
    const updated = nm.updateNote(existingId, { title, content, tags });
    if (updated) {
      ui.renderNoteDetail(updated);
      ui.showToast('Note saved.', 'success');
      refreshAfterMutation();
      // Try to get location (bonus) if not already set
      if (!updated.location) requestGeolocation(existingId);
    }
  } else {
    // Create new note
    const note = nm.createNote(title, content, tags);
    state.selectedNoteId = note.id;
    $('note-form').dataset.noteId = note.id;
    ui.renderNoteDetail(note);
    ui.showToast('Note created.', 'success');
    refreshAfterMutation();
    ui.setSelectedCard(note.id);
    if (!note.location) requestGeolocation(note.id);
  }

  storage.clearDraft();
  ui.hideDraftBanner();
}

// ─── Archive ──────────────────────────────────────

function handleArchive() {
  if (!state.selectedNoteId) return;
  nm.archiveNote(state.selectedNoteId);
  const note = nm.getNoteById(state.selectedNoteId);
  if (note) ui.renderNoteDetail(note);
  ui.showToast('Note archived.', 'success');
  refreshAfterMutation();
  // Switch to archived view to remain in context
  if (state.currentView === 'all') {
    // stay in all view, note just disappears from list
    state.selectedNoteId = null;
    ui.resetDetailToEmpty();
    renderCurrentView();
  }
}

// ─── Restore ──────────────────────────────────────

function handleRestore() {
  if (!state.selectedNoteId) return;
  nm.restoreNote(state.selectedNoteId);
  const note = nm.getNoteById(state.selectedNoteId);
  if (note) ui.renderNoteDetail(note);
  ui.showToast('Note restored.', 'success');
  refreshAfterMutation();
}

// ─── Delete ───────────────────────────────────────

function handleDeleteRequest() {
  if (!state.selectedNoteId) return;
  state.pendingDeleteId = state.selectedNoteId;
  ui.showDeleteModal();
}

function handleDeleteConfirm() {
  if (!state.pendingDeleteId) return;
  nm.deleteNote(state.pendingDeleteId);
  if (state.selectedNoteId === state.pendingDeleteId) {
    state.selectedNoteId = null;
    ui.resetDetailToEmpty();
  }
  state.pendingDeleteId = null;
  ui.closeDeleteModal();
  ui.showToast('Note deleted.', 'success');
  refreshAfterMutation();
}

// ─── Search ───────────────────────────────────────

function handleSearch(query) {
  state.searchQuery = query;
  state.currentView = 'search';
  state.selectedNoteId = null;
  ui.resetDetailToEmpty();
  ui.showView('all'); // keep sidebar "All Notes" active for desktop

  const results = nm.searchNotes(query);
  ui.renderNoteList(results, null);
  ui.updateSearchHeading(query);
  ui.renderSearchResults(results, query); // mobile
  ui.setListDescription(
    query.trim() ? `All notes matching "${query}" are displayed below.` : ''
  );
}

// ─── Navigation ───────────────────────────────────

function handleNavClick(viewName) {
  state.currentView = viewName;
  state.activeTag   = null;
  state.searchQuery = '';
  state.selectedNoteId = null;

  ui.showView(viewName);
  ui.resetDetailToEmpty();
  ui.setActiveTag(null);

  // Clear desktop search input
  const desktopSearch = $('desktop-search-input');
  if (desktopSearch) desktopSearch.value = '';

  renderCurrentView();
}

function handleTagClick(tag) {
  state.currentView    = 'tag';
  state.activeTag      = tag;
  state.selectedNoteId = null;

  ui.resetDetailToEmpty();
  ui.setActiveTag(tag);

  const filteredNotes = nm.filterByTag(tag);
  // Desktop: re-render list panel
  ui.renderNoteList(filteredNotes, null);
  ui.showTagFilteredView(tag, filteredNotes);

  // Desktop heading
  const headingEl = $('main-heading');
  if (headingEl) headingEl.innerHTML = `Notes Tagged: <strong>${escapeHtml(tag)}</strong>`;
  ui.setListDescription(`All notes with the "${tag}" tag are shown here.`);

  // Deactivate sidebar nav links (since we're on a tag filter)
  $$('.nav-link').forEach(l => {
    l.classList.remove('active');
    l.setAttribute('aria-current', 'false');
  });
}

// ─── Geolocation (bonus) ──────────────────────────

function requestGeolocation(noteId) {
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude: lat, longitude: lon } = pos.coords;
      // Use reverse geocoding via a simple lat/lon display (no API key needed)
      const locationData = { city: `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`, lat, lon };

      // Try to get a readable city name via free Nominatim API
      fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`)
        .then(r => r.json())
        .then(data => {
          const city = data.address?.city || data.address?.town || data.address?.village || data.address?.county || null;
          if (city) locationData.city = city;
          nm.updateNote(noteId, { location: locationData });
          const note = nm.getNoteById(noteId);
          if (note && note.id === state.selectedNoteId) {
            ui.renderNoteDetail(note);
          }
        })
        .catch(() => {
          nm.updateNote(noteId, { location: locationData });
          const note = nm.getNoteById(noteId);
          if (note && note.id === state.selectedNoteId) {
            ui.renderNoteDetail(note);
          }
        });
    },
    () => { /* permission denied or error — silently ignore */ }
  );
}

// ─── Draft auto-save (debounced) ──────────────────

let _draftTimer = null;

function scheduleDraftSave() {
  if (_draftTimer) clearTimeout(_draftTimer);
  // Only auto-save when creating a new note (no data-note-id)
  if ($('note-form').dataset.noteId) return;
  _draftTimer = setTimeout(() => {
    const draft = {
      title:   $('note-title').value,
      content: $('note-content').value,
      tags:    $('note-tags').value,
    };
    if (draft.title || draft.content) {
      storage.saveDraft(draft);
    }
  }, 500);
}

// ─── Event binding ────────────────────────────────

function bindEvents() {

  // Create new note button
  $('create-note-btn').addEventListener('click', () => {
    state.selectedNoteId = null;
    $$('.note-card').forEach(c => { c.classList.remove('selected'); c.setAttribute('aria-selected', 'false'); });
    ui.showCreateForm();
    // Check draft
    const draft = storage.loadDraft();
    if (draft && (draft.title || draft.content)) {
      ui.showDraftBanner();
    }
  });

  // Note form submit
  $('note-form').addEventListener('submit', handleSaveNote);

  // Save buttons (mobile/tablet)
  $('save-btn-mobile')?.addEventListener('click', () => $('note-form').requestSubmit());

  // Cancel buttons
  $('cancel-btn')?.addEventListener('click', () => {
    storage.clearDraft();
    ui.hideDraftBanner();
    if (state.selectedNoteId) {
      const note = nm.getNoteById(state.selectedNoteId);
      if (note) { ui.renderNoteDetail(note); return; }
    }
    ui.closeDetailPanel();
    ui.resetDetailToEmpty();
  });

  $('cancel-btn-mobile')?.addEventListener('click', () => {
    storage.clearDraft();
    ui.hideDraftBanner();
    state.selectedNoteId = null;
    ui.closeDetailPanel();
    renderCurrentView();
  });

  // Note list — event delegation
  $('note-list').addEventListener('click', (e) => {
    const card = e.target.closest('[data-note-id]');
    if (!card) return;
    selectNote(card.dataset.noteId);
  });

  $('note-list').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      const card = e.target.closest('[data-note-id]');
      if (card) { e.preventDefault(); selectNote(card.dataset.noteId); }
    }
  });

  // Mobile search results — delegation
  $('mobile-search-results').addEventListener('click', (e) => {
    const card = e.target.closest('[data-note-id]');
    if (!card) return;
    selectNote(card.dataset.noteId);
    ui.showView('all'); // go back to main view after selecting
  });

  // Tag filtered list — delegation
  $('tag-filtered-list').addEventListener('click', (e) => {
    const card = e.target.closest('[data-note-id]');
    if (!card) return;
    selectNote(card.dataset.noteId);
    if (window.innerWidth < 1024) ui.showView('all'); // show detail on mobile
  });

  // Desktop archive/restore/delete buttons
  $('archive-btn')?.addEventListener('click', handleArchive);
  $('restore-btn')?.addEventListener('click', handleRestore);
  $('delete-btn')?.addEventListener('click', handleDeleteRequest);

  // Mobile archive/restore/delete
  $('mobile-archive-btn')?.addEventListener('click', handleArchive);
  $('mobile-restore-btn')?.addEventListener('click', handleRestore);
  $('mobile-delete-btn')?.addEventListener('click', handleDeleteRequest);

  // Delete modal
  $('modal-confirm-delete').addEventListener('click', handleDeleteConfirm);
  $('modal-cancel').addEventListener('click', () => {
    ui.closeDeleteModal();
    state.pendingDeleteId = null;
  });
  $('modal-overlay').addEventListener('click', () => {
    ui.closeDeleteModal();
    state.pendingDeleteId = null;
  });

  // Desktop search input (debounced)
  let _searchTimer = null;
  $('desktop-search-input').addEventListener('input', (e) => {
    if (_searchTimer) clearTimeout(_searchTimer);
    _searchTimer = setTimeout(() => handleSearch(e.target.value), 300);
  });

  // Mobile search input
  $('mobile-search-input').addEventListener('input', (e) => {
    if (_searchTimer) clearTimeout(_searchTimer);
    _searchTimer = setTimeout(() => {
      const q = e.target.value;
      state.searchQuery = q;
      const results = nm.searchNotes(q);
      ui.renderSearchResults(results, q);
    }, 300);
  });

  // Sidebar nav links
  $$('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      handleNavClick(link.dataset.view);
    });
  });

  // Sidebar tag list — delegation
  $('sidebar-tag-list').addEventListener('click', (e) => {
    const item = e.target.closest('[data-tag]');
    if (!item) return;
    handleTagClick(item.dataset.tag);
  });

  $('sidebar-tag-list').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      const item = e.target.closest('[data-tag]');
      if (item) { e.preventDefault(); handleTagClick(item.dataset.tag); }
    }
  });

  // Bottom nav
  $$('.bottom-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      handleNavClick(view);
      if (view === 'settings' && window.innerWidth >= 1024) {
        ui.showSettingsPage('color');
      }
    });
  });

  // Mobile tag list — delegation
  $('mobile-tag-list').addEventListener('click', (e) => {
    const item = e.target.closest('[data-tag]');
    if (!item) return;
    handleTagClick(item.dataset.tag);
  });

  // Tag filter back button
  $('tag-filter-back-btn').addEventListener('click', () => {
    state.currentView = 'tags';
    state.activeTag   = null;
    ui.showView('tags');
    ui.setActiveTag(null);
  });

  // Go back button (mobile detail → list)
  $('go-back-btn').addEventListener('click', () => {
    storage.clearDraft();
    ui.hideDraftBanner();
    state.selectedNoteId = null;
    ui.closeDetailPanel();
    ui.showView(state.currentView === 'search' ? 'search' : 'all');
    renderCurrentView();
  });

  // Settings button (desktop)
  $('settings-btn')?.addEventListener('click', () => {
    handleNavClick('settings');
    if (window.innerWidth >= 1024) ui.showSettingsPage('color');
  });

  // Settings — menu navigation
  $$('.settings-menu-item[data-settings-page]').forEach(item => {
    item.addEventListener('click', () => {
      ui.showSettingsPage(item.dataset.settingsPage);
    });
  });

  // Settings — back buttons
  $$('.settings-back-btn').forEach(btn => {
    btn.addEventListener('click', () => ui.showSettingsNav());
  });

  // Settings — apply theme
  $('apply-theme-btn')?.addEventListener('click', () => {
    const selected = document.querySelector('input[name="theme-select"]:checked');
    if (!selected) return;
    state.prefs.theme = selected.value;
    themes.applyTheme(selected.value);
    storage.savePreferences(state.prefs);
    ui.showToast('Theme updated', 'success');
  });

  // Settings — apply font
  $('apply-font-btn')?.addEventListener('click', () => {
    const selected = document.querySelector('input[name="font-select"]:checked');
    if (!selected) return;
    state.prefs.font = selected.value;
    themes.applyFont(selected.value);
    storage.savePreferences(state.prefs);
    ui.showToast('Font updated', 'success');
  });

  // Settings — logout (placeholder)
  $('logout-btn')?.addEventListener('click', () => {
    ui.showToast('Logout is not available in this version', 'error');
  });

  // Password eye toggles
  $$('.pw-eye-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.dataset.target);
      if (!input) return;
      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      btn.setAttribute('aria-label', isPassword ? 'Hide password' : 'Toggle password visibility');
    });
  });

  // Change password form
  $('change-password-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const oldPw = $('pw-old')?.value.trim();
    const newPw = $('pw-new')?.value.trim();
    const confirmPw = $('pw-confirm')?.value.trim();
    if (!oldPw || !newPw || !confirmPw) {
      ui.showToast('Please fill in all password fields.', 'error');
      return;
    }
    if (newPw.length < 8) {
      ui.showToast('New password must be at least 8 characters.', 'error');
      return;
    }
    if (newPw !== confirmPw) {
      ui.showToast('New passwords do not match.', 'error');
      return;
    }
    $('pw-old').value = '';
    $('pw-new').value = '';
    $('pw-confirm').value = '';
    ui.showToast('Password updated successfully.', 'success');
  });

  // FABs (mobile create)
  $('list-fab')?.addEventListener('click', () => {
    state.selectedNoteId = null;
    $$('.note-card').forEach(c => { c.classList.remove('selected'); c.setAttribute('aria-selected', 'false'); });
    ui.showCreateForm();
    const draft = storage.loadDraft();
    if (draft && (draft.title || draft.content)) ui.showDraftBanner();
  });
  $('fab-search')?.addEventListener('click', () => {
    state.selectedNoteId = null;
    ui.showView('all');
    ui.showCreateForm();
  });
  $('fab-tags')?.addEventListener('click', () => {
    state.selectedNoteId = null;
    ui.showView('all');
    ui.showCreateForm();
  });

  // Draft restore/dismiss
  $('restore-draft-btn').addEventListener('click', () => {
    const draft = storage.loadDraft();
    if (draft) {
      $('note-title').value   = draft.title   || '';
      $('note-tags').value    = draft.tags    || '';
      $('note-content').value = draft.content || '';
    }
    ui.hideDraftBanner();
  });

  $('dismiss-draft-btn').addEventListener('click', () => {
    storage.clearDraft();
    ui.hideDraftBanner();
  });

  // Auto-save draft while typing in create form
  ['note-title', 'note-tags', 'note-content'].forEach(id => {
    $(id).addEventListener('input', scheduleDraftSave);
  });

  // Clear validation error on input
  $('note-title').addEventListener('input', () => {
    if ($('note-title').value.trim()) {
      $('title-error').hidden = true;
      $('note-title').removeAttribute('aria-invalid');
    }
  });

  // Keyboard: Escape to close modal or cancel edit
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!$('delete-modal').hidden) {
        ui.closeDeleteModal();
        state.pendingDeleteId = null;
        return;
      }
    }

    // Modal focus trap (Tab / Shift+Tab)
    if (!$('delete-modal').hidden && e.key === 'Tab') {
      const focusable = [...$('delete-modal').querySelectorAll('button')].filter(el => !el.hidden);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last  = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });

  // Handle window resize (responsive layout changes)
  window.addEventListener('resize', debounce(() => {
    if (window.innerWidth >= 1024) {
      // On desktop: always show list + detail base structure
      $('list-panel').hidden   = false;
      $('detail-panel').hidden = false;
    }
  }, 150));
}

// ─── Utilities ────────────────────────────────────

function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ─── Boot ─────────────────────────────────────────

document.addEventListener('DOMContentLoaded', init);
