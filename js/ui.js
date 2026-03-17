/* ═══════════════════════════════════════════════════
   ui.js — All DOM rendering and view-state functions
═══════════════════════════════════════════════════ */

import { formatDate } from './noteManager.js';

// ─── DOM refs ─────────────────────────────────────

const $ = (id) => document.getElementById(id);
const $$ = (sel) => document.querySelectorAll(sel);

// ─── View management ──────────────────────────────
// Desktop: sidebar nav + list panel always visible, detail/actions toggled
// Mobile/tablet: one section visible at a time

const MOBILE_VIEWS = {
  all:       () => { showEl('list-panel'); hideEl('detail-panel'); hideEl('search-view'); hideEl('tags-view'); hideEl('tag-filtered-view'); hideEl('settings-view'); },
  archived:  () => { showEl('list-panel'); hideEl('detail-panel'); hideEl('search-view'); hideEl('tags-view'); hideEl('tag-filtered-view'); hideEl('settings-view'); },
  search:    () => { hideEl('list-panel'); hideEl('detail-panel'); showEl('search-view'); hideEl('tags-view'); hideEl('tag-filtered-view'); hideEl('settings-view'); },
  tags:      () => { hideEl('list-panel'); hideEl('detail-panel'); hideEl('search-view'); showEl('tags-view'); hideEl('tag-filtered-view'); hideEl('settings-view'); },
  tagFilter: () => { hideEl('list-panel'); hideEl('detail-panel'); hideEl('search-view'); hideEl('tags-view'); showEl('tag-filtered-view'); hideEl('settings-view'); },
  detail:    () => { hideEl('list-panel'); showEl('detail-panel'); hideEl('search-view'); hideEl('tags-view'); hideEl('tag-filtered-view'); hideEl('settings-view'); },
  settings:  () => { hideEl('list-panel'); hideEl('detail-panel'); hideEl('search-view'); hideEl('tags-view'); hideEl('tag-filtered-view'); showEl('settings-view'); },
};

const showEl = (id) => {
  const el = $(id);
  if (el) el.hidden = false;
};

const hideEl = (id) => {
  const el = $(id);
  if (el) el.hidden = true;
};

const isMobile = () => window.innerWidth < 1024;

export const showView = (viewName) => {
  if (isMobile()) {
    (MOBILE_VIEWS[viewName] || MOBILE_VIEWS['all'])();
    $('detail-subheader').hidden = true;
  } else {
    // Desktop: settings view replaces detail+actions; all other views show list+detail+actions
    const isSettings = viewName === 'settings';
    $('list-panel').hidden    = isSettings;
    $('detail-panel').hidden  = isSettings;
    // When entering settings, always hide the actions panel.
    // When leaving settings, actions-panel remains hidden until a note is selected.
    if (isSettings) {
      const ap = $('actions-panel');
      if (ap) ap.hidden = true;
    }
    $('settings-view').hidden = !isSettings;
  }

  // Update sidebar active nav
  $$('.nav-link').forEach(link => {
    const isActive = link.dataset.view === viewName;
    link.classList.toggle('active', isActive);
    link.setAttribute('aria-current', isActive ? 'page' : 'false');
  });

  // Update bottom nav active state
  $$('.bottom-nav-btn').forEach(btn => {
    const isActive = btn.dataset.view === viewName;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-current', isActive ? 'page' : 'false');
  });

  // Update main heading (desktop)
  updateHeading(viewName);
};

const updateHeading = (viewName, extra = '') => {
  const headingEl = $('main-heading');
  if (!headingEl) return;
  const map = { all: 'All Notes', archived: 'Archived Notes', search: '', tags: 'Tags', settings: 'Settings' };
  headingEl.textContent = extra || map[viewName] || '';
};

// ─── Search heading ───────────────────────────────

export const updateSearchHeading = (query) => {
  const headingEl = $('main-heading');
  if (!headingEl) return;
  if (query.trim()) {
    headingEl.innerHTML = `Showing results for: <strong>${escapeHtml(query)}</strong>`;
  } else {
    headingEl.textContent = 'All Notes';
  }
};

// ─── Note list rendering ──────────────────────────

export const renderNoteList = (notes, selectedId = null) => {
  const list = $('note-list');
  const emptyState = $('empty-state');
  list.innerHTML = '';

  if (notes.length === 0) {
    emptyState.hidden = false;
    return;
  }
  emptyState.hidden = true;

  const fragment = document.createDocumentFragment();
  notes.forEach(note => {
    fragment.appendChild(renderNoteCard(note, note.id === selectedId));
  });
  list.appendChild(fragment);
};

export const renderNoteCard = (note, isSelected = false) => {
  const li = document.createElement('li');
  li.className = 'note-card' + (isSelected ? ' selected' : '');
  li.dataset.noteId = note.id;
  li.setAttribute('role', 'button');
  li.setAttribute('tabindex', '0');
  li.setAttribute('aria-selected', String(isSelected));
  li.setAttribute('aria-label', note.title || 'Untitled note');

  const tagsHtml = note.tags.length
    ? `<div class="note-card-tags">${note.tags.map(t => `<span class="tag-pill">${escapeHtml(t)}</span>`).join('')}</div>`
    : '';

  li.innerHTML = `
    <div class="note-card-title">${escapeHtml(note.title || 'Untitled Note')}</div>
    ${tagsHtml}
    <div class="note-card-date">${formatDate(note.updatedAt)}</div>
  `;

  return li;
};

export const setSelectedCard = (id) => {
  $$('.note-card').forEach(card => {
    const isSelected = card.dataset.noteId === id;
    card.classList.toggle('selected', isSelected);
    card.setAttribute('aria-selected', String(isSelected));
  });
};

// ─── Flat note card (search results / tag filter) ─

export const renderFlatNoteCard = (note, searchQuery = '') => {
  const li = document.createElement('li');
  li.className = 'note-card-flat';
  li.dataset.noteId = note.id;
  li.setAttribute('role', 'button');
  li.setAttribute('tabindex', '0');
  li.setAttribute('aria-label', note.title || 'Untitled note');

  const tagsHtml = note.tags.length
    ? `<div class="note-card-tags" style="margin-top:6px;">${note.tags.map(t => `<span class="tag-pill">${escapeHtml(t)}</span>`).join('')}</div>`
    : '';

  const title = searchQuery
    ? highlightText(note.title || 'Untitled Note', searchQuery)
    : escapeHtml(note.title || 'Untitled Note');

  li.innerHTML = `
    <div class="note-card-title">${title}</div>
    ${tagsHtml}
    <div class="note-card-date" style="margin-top:6px;">${formatDate(note.updatedAt)}</div>
  `;

  return li;
};

// ─── Note detail rendering ────────────────────────

export const renderNoteDetail = (note) => {
  $('note-title').value   = note.title;
  $('note-tags').value    = note.tags.join(', ');
  $('note-content').value = note.content;
  $('note-last-edited').textContent = formatDate(note.updatedAt);
  $('note-form').dataset.noteId = note.id;

  // Status row (archived notes)
  const statusRow = $('status-row');
  if (note.archived) {
    statusRow.hidden = false;
    $('note-status').textContent = 'Archived';
  } else {
    statusRow.hidden = true;
  }

  // Location row
  const locationRow = $('location-row');
  if (note.location) {
    locationRow.hidden = false;
    $('note-location').textContent = note.location.city || `${note.location.lat?.toFixed(2)}, ${note.location.lon?.toFixed(2)}`;
  } else {
    locationRow.hidden = true;
  }

  // Desktop action panel buttons
  const archiveBtn  = $('archive-btn');
  const restoreBtn  = $('restore-btn');
  const actionsPanel = $('actions-panel');
  if (actionsPanel) actionsPanel.hidden = false;

  if (archiveBtn && restoreBtn) {
    archiveBtn.hidden = note.archived;
    restoreBtn.hidden = !note.archived;
  }

  // Mobile action buttons
  const mobileArchiveBtn = $('mobile-archive-btn');
  const mobileRestoreBtn = $('mobile-restore-btn');
  if (mobileArchiveBtn) mobileArchiveBtn.hidden = note.archived;
  if (mobileRestoreBtn) mobileRestoreBtn.hidden = !note.archived;

  $('empty-detail').hidden = true;
  $('note-form').hidden = false;
  $('form-actions-desktop') && ($('form-actions-desktop').hidden = false);

  clearValidationErrors();
};

export const showCreateForm = () => {
  $('note-title').value   = '';
  $('note-tags').value    = '';
  $('note-content').value = '';
  $('note-last-edited').textContent = 'Not yet saved';
  $('note-form').removeAttribute('data-note-id');
  $('status-row').hidden    = true;
  $('location-row').hidden  = true;
  $('empty-detail').hidden  = true;
  $('note-form').hidden     = false;

  const actionsPanel = $('actions-panel');
  if (actionsPanel) actionsPanel.hidden = true;

  clearValidationErrors();
  $('note-title').focus();

  // Show sub-header on mobile/tablet
  if (isMobile()) {
    $('detail-subheader').hidden = false;
    MOBILE_VIEWS['detail']();
  }
};

export const showDetailPanel = (note) => {
  renderNoteDetail(note);

  // On mobile/tablet: switch to detail view
  if (isMobile()) {
    $('detail-subheader').hidden = false;
    MOBILE_VIEWS['detail']();
  }
};

export const closeDetailPanel = () => {
  $('note-form').hidden     = true;
  $('empty-detail').hidden  = false;
  $('detail-subheader').hidden = true;

  const actionsPanel = $('actions-panel');
  if (actionsPanel) actionsPanel.hidden = true;

  // On mobile/tablet: go back to list
  if (isMobile()) {
    MOBILE_VIEWS['all']();
  }
};

export const resetDetailToEmpty = () => {
  $('note-form').hidden    = true;
  $('note-form').removeAttribute('data-note-id');
  $('empty-detail').hidden = false;
  const actionsPanel = $('actions-panel');
  if (actionsPanel) actionsPanel.hidden = true;
};

// ─── Tag lists ────────────────────────────────────

export const renderTagList = (tags) => {
  // Sidebar
  const sidebarList = $('sidebar-tag-list');
  sidebarList.innerHTML = '';
  const tagIconSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>`;
  const arrowSvg = `<svg class="tag-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>`;

  tags.forEach(tag => {
    const li = document.createElement('li');
    li.className = 'sidebar-tag-item';
    li.dataset.tag = tag;
    li.setAttribute('role', 'button');
    li.setAttribute('tabindex', '0');
    li.setAttribute('aria-label', `Filter by tag: ${tag}`);
    li.innerHTML = `${tagIconSvg}<span>${escapeHtml(tag)}</span>${arrowSvg}`;
    sidebarList.appendChild(li);
  });

  // Mobile tags view
  const mobileList = $('mobile-tag-list');
  const mobileEmpty = $('mobile-tags-empty');
  mobileList.innerHTML = '';
  if (tags.length === 0) {
    if (mobileEmpty) mobileEmpty.hidden = false;
    return;
  }
  if (mobileEmpty) mobileEmpty.hidden = true;

  tags.forEach(tag => {
    const li = document.createElement('li');
    li.className = 'tag-list-item';
    li.dataset.tag = tag;
    li.setAttribute('role', 'button');
    li.setAttribute('tabindex', '0');
    li.setAttribute('aria-label', `View notes tagged: ${tag}`);
    li.innerHTML = `${tagIconSvg}<span>${escapeHtml(tag)}</span>`;
    mobileList.appendChild(li);
  });
};

export const setActiveTag = (tag) => {
  $$('.sidebar-tag-item').forEach(item => {
    const isActive = item.dataset.tag === tag;
    item.classList.toggle('active', isActive);
  });
};

// ─── Tag filtered view ────────────────────────────

export const showTagFilteredView = (tag, notes) => {
  $('active-tag-name').textContent = tag;
  $('tag-filter-description').textContent = `All notes with the "${tag}" tag are shown here.`;

  // Desktop: update heading
  const headingEl = $('main-heading');
  if (headingEl) headingEl.innerHTML = `Notes Tagged: <strong>${escapeHtml(tag)}</strong>`;

  // Desktop: re-render the main note-list with filtered notes
  // (list panel stays visible on desktop, just re-rendered)
  const listDescEl = $('list-description');
  if (listDescEl) {
    listDescEl.hidden = false;
    listDescEl.textContent = `All notes with the "${tag}" tag are shown here.`;
  }

  // Mobile: render tag-filtered-view list
  const filteredList = $('tag-filtered-list');
  const emptyEl = $('tag-filter-empty');
  filteredList.innerHTML = '';

  if (notes.length === 0) {
    if (emptyEl) emptyEl.hidden = false;
    return;
  }
  if (emptyEl) emptyEl.hidden = true;

  const frag = document.createDocumentFragment();
  notes.forEach(note => frag.appendChild(renderFlatNoteCard(note)));
  filteredList.appendChild(frag);

  if (isMobile()) {
    MOBILE_VIEWS['tagFilter']();
  }
};

// ─── Search results ───────────────────────────────

export const renderSearchResults = (notes, query) => {
  const list    = $('mobile-search-results');
  const infoEl  = $('mobile-search-info');
  const emptyEl = $('mobile-search-empty');
  list.innerHTML = '';

  if (query.trim()) {
    infoEl.textContent = `All notes matching "${query}" are displayed below.`;
  } else {
    infoEl.textContent = '';
  }

  if (notes.length === 0 && query.trim()) {
    if (emptyEl) emptyEl.hidden = false;
    return;
  }
  if (emptyEl) emptyEl.hidden = true;

  const frag = document.createDocumentFragment();
  notes.forEach(note => frag.appendChild(renderFlatNoteCard(note, query)));
  list.appendChild(frag);
};

// ─── Empty state ──────────────────────────────────

export const setEmptyStateText = (text) => {
  const el = $('empty-state-text');
  if (el) el.textContent = text;
};

// ─── List description (desktop archived/tag views) ─

export const setListDescription = (text) => {
  const el = $('list-description');
  if (!el) return;
  if (text) {
    el.textContent = text;
    el.hidden = false;
  } else {
    el.hidden = true;
  }
};

// ─── Validation ───────────────────────────────────

export const showValidationError = (fieldId, message) => {
  const errorEl = $(`${fieldId}-error`);
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.hidden = false;
  }
  const fieldEl = $(fieldId);
  if (fieldEl) {
    fieldEl.setAttribute('aria-invalid', 'true');
    fieldEl.classList.add('field-invalid');
    fieldEl.focus();
  }
};

export const clearValidationErrors = () => {
  $$('.field-error').forEach(el => { el.hidden = true; el.textContent = ''; });
  $$('[aria-invalid]').forEach(el => {
    el.removeAttribute('aria-invalid');
    el.classList.remove('field-invalid');
  });
};

// ─── Modal ────────────────────────────────────────

export const showDeleteModal = () => {
  const modal = $('delete-modal');
  modal.hidden = false;
  // Trap focus to Cancel by default
  setTimeout(() => $('modal-cancel')?.focus(), 50);
};

export const closeDeleteModal = () => {
  $('delete-modal').hidden = true;
};

// ─── Draft banner ─────────────────────────────────

export const showDraftBanner = () => { $('draft-banner').hidden = false; };
export const hideDraftBanner = () => { $('draft-banner').hidden = true; };

// ─── Toast ────────────────────────────────────────

let _toastTimer = null;

export const showToast = (message, type = 'success') => {
  const toast = $('toast');
  toast.textContent = message;
  toast.className = `show ${type}`;
  toast.hidden = false;

  if (_toastTimer) clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => { toast.hidden = true; }, 300);
  }, 2500);
};

// ─── Shared note view ─────────────────────────────

export const showSharedNote = (note) => {
  // Overlay the entire app with the read-only view
  const view = $('shared-view');
  if (!view) return;

  $('shared-title').textContent  = note.title || 'Untitled Note';
  $('shared-content').innerHTML  = note.content || '';
  $('shared-date').textContent   = note.updatedAt
    ? `Last edited ${formatDate(note.updatedAt)}`
    : '';

  const tagsEl = $('shared-tags');
  tagsEl.innerHTML = (note.tags || [])
    .map(t => `<span class="tag-pill">${escapeHtml(t)}</span>`)
    .join('');

  view.hidden = false;
};

// ─── Settings panel active states ─────────────────

export const updateSettingsUI = (prefs) => {
  $$('[data-theme-option]').forEach(btn => {
    btn.setAttribute('aria-pressed', String(btn.dataset.themeOption === prefs.theme));
  });
  $$('[data-font-option]').forEach(btn => {
    btn.setAttribute('aria-pressed', String(btn.dataset.fontOption === prefs.font));
  });
};

// ─── Helpers ──────────────────────────────────────

const escapeHtml = (str) =>
  String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const highlightText = (text, query) => {
  if (!query.trim()) return escapeHtml(text);
  const safe = escapeHtml(text);
  const q = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return safe.replace(new RegExp(`(${q})`, 'gi'), '<mark>$1</mark>');
};
