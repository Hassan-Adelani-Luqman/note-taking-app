/* ═══════════════════════════════════════════════════
   editor.js — Rich text formatting commands
   Uses document.execCommand (widely supported, simplest
   approach for contenteditable-based editors).
═══════════════════════════════════════════════════ */

const $ = (id) => document.getElementById(id);

// ─── Core exec wrapper ────────────────────────────

const exec = (command, value = null) => {
  document.execCommand(command, false, value);
  $('note-content')?.focus();
  updateToolbarState();
};

// ─── Formatting commands ──────────────────────────

export const bold          = () => exec('bold');
export const italic        = () => exec('italic');
export const underline     = () => exec('underline');
export const strikethrough = () => exec('strikeThrough');
export const orderedList   = () => exec('insertOrderedList');
export const unorderedList = () => exec('insertUnorderedList');

// ─── Toolbar state ────────────────────────────────

// Maps execCommand command names → toolbar button IDs
const COMMAND_MAP = {
  bold:                'toolbar-bold',
  italic:              'toolbar-italic',
  underline:           'toolbar-underline',
  strikeThrough:       'toolbar-strikethrough',
  insertOrderedList:   'toolbar-ol',
  insertUnorderedList: 'toolbar-ul',
};

export const updateToolbarState = () => {
  Object.entries(COMMAND_MAP).forEach(([cmd, btnId]) => {
    const btn = $(btnId);
    if (btn) btn.classList.toggle('active', document.queryCommandState(cmd));
  });
};

// ─── Event binding ────────────────────────────────

export const bindEditorEvents = () => {
  const editor = $('note-content');
  if (!editor) return;

  // Keyboard shortcuts inside the editor
  editor.addEventListener('keydown', (e) => {
    if (!(e.ctrlKey || e.metaKey)) return;
    switch (e.key.toLowerCase()) {
      case 'b': e.preventDefault(); bold();          break;
      case 'i': e.preventDefault(); italic();        break;
      case 'u': e.preventDefault(); underline();     break;
    }
  });

  // Update active states when the cursor moves or text is selected
  editor.addEventListener('keyup',   updateToolbarState);
  editor.addEventListener('mouseup', updateToolbarState);
  editor.addEventListener('focus',   updateToolbarState);

  // Toolbar button clicks
  const toolbar = document.getElementById('editor-toolbar');
  if (!toolbar) return;

  toolbar.addEventListener('mousedown', (e) => {
    // Prevent editor losing focus when toolbar button is clicked
    e.preventDefault();
  });

  toolbar.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-command]');
    if (!btn) return;
    switch (btn.dataset.command) {
      case 'bold':          bold();          break;
      case 'italic':        italic();        break;
      case 'underline':     underline();     break;
      case 'strikethrough': strikethrough(); break;
      case 'ol':            orderedList();   break;
      case 'ul':            unorderedList(); break;
    }
  });
};
