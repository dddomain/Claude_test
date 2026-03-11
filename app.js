'use strict';

/* ============================================================
   STATE
   ============================================================ */
const STORAGE_KEY = 'taskgrid_v1';

let state = {
  tasks: [],
  nextId: 1,
  sort: { col: 'id', dir: 'asc' },
  filter: { search: '', status: '', priority: '' },
  editingId: null,   // task being edited in modal
  selectedIds: new Set(),
};

/* ============================================================
   PERSISTENCE
   ============================================================ */
function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      state.tasks  = saved.tasks  || [];
      state.nextId = saved.nextId || (state.tasks.length + 1);
    }
  } catch (_) { /* ignore */ }
  if (state.tasks.length === 0) seedDemo();
}

function save() {
  setSaveIndicator('saving');
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ tasks: state.tasks, nextId: state.nextId }));
  setTimeout(() => setSaveIndicator('saved'), 400);
}

function setSaveIndicator(s) {
  const el = document.getElementById('save-indicator');
  el.className = s;
  el.textContent = s === 'saving' ? '● 保存中...' : '● 保存済み';
}

/* ============================================================
   DEMO DATA
   ============================================================ */
function seedDemo() {
  const today = new Date();
  const fmt = d => d.toISOString().slice(0, 10);
  const add = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

  const demos = [
    { name: '企画書の作成',      category: '仕事',  priority: '高', status: '進行中', due: fmt(add(today, 2)),  note: 'Q2ロードマップ向け' },
    { name: 'デザインレビュー',  category: '仕事',  priority: '中', status: '未着手', due: fmt(add(today, 5)),  note: '' },
    { name: '週次ミーティング準備', category: '仕事', priority: '高', status: '未着手', due: fmt(add(today, 1)),  note: 'アジェンダを共有する' },
    { name: '経費精算',          category: '事務',  priority: '低', status: '未着手', due: fmt(add(today, 7)),  note: '' },
    { name: '技術書を読む',      category: '学習',  priority: '中', status: '進行中', due: fmt(add(today, 14)), note: '第3章まで' },
    { name: 'ジムに行く',        category: '健康',  priority: '中', status: '完了',   due: fmt(add(today,-1)),  note: '' },
    { name: 'コードリファクタリング', category: '仕事', priority: '低', status: '保留', due: fmt(add(today, 10)), note: 'v2.0後に対応' },
    { name: '歯医者の予約',      category: '健康',  priority: '中', status: '完了',   due: fmt(add(today,-3)),  note: '' },
    { name: 'プレゼン資料作成',  category: '仕事',  priority: '高', status: '未着手', due: fmt(add(today, 3)),  note: '社内発表用' },
    { name: 'ブログ記事を書く',  category: '個人',  priority: '低', status: '未着手', due: fmt(add(today, 20)), note: '' },
  ];

  demos.forEach(d => {
    state.tasks.push({ ...d, id: state.nextId++, createdAt: new Date().toISOString() });
  });
  save();
}

/* ============================================================
   COMPUTED HELPERS
   ============================================================ */
function getStats() {
  const tasks = state.tasks;
  const total    = tasks.length;
  const done     = tasks.filter(t => t.status === '完了').length;
  const wip      = tasks.filter(t => t.status === '進行中').length;
  const todo     = tasks.filter(t => t.status === '未着手').length;
  const pct      = total ? Math.round(done / total * 100) : 0;

  const byPriority = { '高': 0, '中': 0, '低': 0 };
  tasks.forEach(t => { if (byPriority[t.priority] !== undefined) byPriority[t.priority]++; });

  const byCategory = {};
  tasks.forEach(t => {
    const c = t.category || 'その他';
    byCategory[c] = (byCategory[c] || 0) + 1;
  });

  return { total, done, wip, todo, pct, byPriority, byCategory };
}

function getUpcoming() {
  const today = new Date(); today.setHours(0,0,0,0);
  return state.tasks
    .filter(t => t.status !== '完了' && t.due)
    .sort((a, b) => a.due.localeCompare(b.due))
    .slice(0, 6);
}

function filteredSortedTasks() {
  const { search, status, priority } = state.filter;
  let list = state.tasks.filter(t => {
    if (status   && t.status   !== status)   return false;
    if (priority && t.priority !== priority) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!t.name.toLowerCase().includes(q) &&
          !(t.category||'').toLowerCase().includes(q) &&
          !(t.note||'').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const { col, dir } = state.sort;
  list.sort((a, b) => {
    let va = a[col] ?? '', vb = b[col] ?? '';
    if (col === 'id') { va = +va; vb = +vb; }
    if (va < vb) return dir === 'asc' ? -1 : 1;
    if (va > vb) return dir === 'asc' ?  1 : -1;
    return 0;
  });
  return list;
}

/* ============================================================
   DASHBOARD RENDER
   ============================================================ */
function renderDashboard() {
  const { total, done, wip, todo, pct, byPriority, byCategory } = getStats();

  document.getElementById('kpi-total').textContent    = total;
  document.getElementById('kpi-done').textContent     = done;
  document.getElementById('kpi-progress').textContent = wip;
  document.getElementById('kpi-todo').textContent     = todo;

  document.getElementById('pct-label').textContent = `${pct}%`;
  document.getElementById('progress-fill').style.width = `${pct}%`;

  const msgs = [
    [100, 'すべてのタスクが完了しました！素晴らしい！'],
    [75,  'あと少し！ゴールが見えてきました'],
    [50,  '折り返し地点。このまま頑張りましょう'],
    [25,  '順調にスタートしています。継続しましょう'],
    [0,   'タスクを始めましょう。最初の一歩が大切です'],
  ];
  const msg = msgs.find(([t]) => pct >= t);
  document.getElementById('progress-msg').textContent = msg ? msg[1] : '';

  // Priority bars
  const priMax = Math.max(1, ...Object.values(byPriority));
  const priColors = { '高': 'pri-high', '中': 'pri-mid', '低': 'pri-low' };
  document.getElementById('priority-bars').innerHTML = Object.entries(byPriority).map(([k, v]) =>
    `<div class="flex items-center gap-2.5 mb-2.5">
      <div class="text-xs text-gray-500 w-6 flex-shrink-0">${k}</div>
      <div class="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div class="bar-fill ${priColors[k]} h-full rounded-full transition-colors" style="width:${v/priMax*100}%"></div>
      </div>
      <div class="text-xs text-gray-500 w-6 text-right flex-shrink-0">${v}</div>
    </div>`
  ).join('');

  // Category bars
  const cats = Object.entries(byCategory).sort((a,b) => b[1]-a[1]).slice(0, 6);
  const catMax = Math.max(1, ...cats.map(([,v]) => v));
  const catColors = ['#2563eb','#7c3aed','#db2777','#d97706','#16a34a','#0891b2'];
  document.getElementById('category-bars').innerHTML = cats.length
    ? cats.map(([k, v], i) =>
        `<div class="flex items-center gap-2.5 mb-2.5">
          <div class="text-xs text-gray-500 w-14 flex-shrink-0 overflow-hidden whitespace-nowrap" title="${esc(k)}">${k.length > 5 ? k.slice(0,5)+'…' : k}</div>
          <div class="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div class="h-full rounded-full transition-colors" style="width:${v/catMax*100}%;background:${catColors[i%catColors.length]}"></div>
          </div>
          <div class="text-xs text-gray-500 w-6 text-right flex-shrink-0">${v}</div>
        </div>`
      ).join('')
    : '<p class="text-gray-400 text-xs">カテゴリなし</p>';

  // Upcoming
  const upcoming = getUpcoming();
  const todayStr = new Date().toISOString().slice(0, 10);
  document.getElementById('upcoming-list').innerHTML = upcoming.length
    ? upcoming.map(t => {
        const overdue = t.due < todayStr;
        const daysLeft = Math.round((new Date(t.due) - new Date(todayStr)) / 86400000);
        const dueLabel = overdue ? `${Math.abs(daysLeft)}日超過` : daysLeft === 0 ? '今日' : `${daysLeft}日後`;
        return `<div class="flex items-center gap-3 py-2.5 border-b border-gray-200 text-[13px]">
          ${statusBadge(t.status)}
          <span class="flex-1 font-medium">${esc(t.name)}</span>
          <span class="upcoming-due text-gray-500 text-xs whitespace-nowrap ${overdue ? 'overdue' : ''}">${dueLabel} (${t.due})</span>
        </div>`;
      }).join('')
    : '<p class="text-gray-400 text-[13px] text-center py-4">期限が近いタスクはありません</p>';
}

/* ============================================================
   TABLE RENDER
   ============================================================ */
function renderTable() {
  const tasks = filteredSortedTasks();
  const tbody = document.getElementById('task-tbody');
  const empty = document.getElementById('empty-state');

  // Update sort arrows
  document.querySelectorAll('#task-table th.sortable').forEach(th => {
    th.classList.remove('sort-asc', 'sort-desc');
    if (th.dataset.col === state.sort.col) {
      th.classList.add(state.sort.dir === 'asc' ? 'sort-asc' : 'sort-desc');
    }
  });

  if (tasks.length === 0) {
    tbody.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  const todayStr = new Date().toISOString().slice(0, 10);

  tbody.innerHTML = tasks.map(t => {
    const sel = state.selectedIds.has(t.id);
    const dueClass = t.due
      ? (t.due < todayStr && t.status !== '完了' ? 'due-overdue' : t.due === todayStr ? 'due-soon' : '')
      : '';
    return `<tr data-id="${t.id}" class="${sel ? 'selected' : ''}">
      <td class="w-9 px-3.5 py-2.5 border-b border-gray-200"><input type="checkbox" class="row-check" ${sel ? 'checked' : ''} /></td>
      <td class="w-12 px-3.5 py-2.5 border-b border-gray-200 text-[13px] text-gray-400">${t.id}</td>
      <td class="min-w-[200px] px-3.5 py-2.5 border-b border-gray-200 text-[13px]"><span class="editable" data-field="name" data-id="${t.id}">${esc(t.name)}</span></td>
      <td class="w-[110px] px-3.5 py-2.5 border-b border-gray-200 text-[13px] max-md:hidden"><span class="editable" data-field="category" data-id="${t.id}">${esc(t.category||'—')}</span></td>
      <td class="w-20 px-3.5 py-2.5 border-b border-gray-200 text-[13px]">${priorityBadge(t.priority)}</td>
      <td class="w-[90px] px-3.5 py-2.5 border-b border-gray-200 text-[13px]">${statusBadge(t.status)}</td>
      <td class="w-[110px] px-3.5 py-2.5 border-b border-gray-200 text-[13px] ${dueClass}">${t.due || '—'}</td>
      <td class="min-w-[140px] px-3.5 py-2.5 border-b border-gray-200 text-[13px] text-gray-500 max-md:hidden"><span class="editable" data-field="note" data-id="${t.id}">${esc(t.note||'')}</span></td>
      <td class="w-[72px] px-3.5 py-2.5 border-b border-gray-200">
        <div class="row-actions">
          <button class="btn-row" title="編集" data-action="edit" data-id="${t.id}">✎</button>
          <button class="btn-row danger" title="削除" data-action="delete" data-id="${t.id}">✕</button>
        </div>
      </td>
    </tr>`;
  }).join('');

  // Update select-all state
  const allChecked = tasks.length > 0 && tasks.every(t => state.selectedIds.has(t.id));
  document.getElementById('select-all').checked = allChecked;
  updateBulkBar();

  // Update category datalist
  const cats = [...new Set(state.tasks.map(t => t.category).filter(Boolean))];
  document.getElementById('category-list').innerHTML = cats.map(c => `<option value="${esc(c)}">`).join('');
}

/* ============================================================
   BADGE HELPERS
   ============================================================ */
function statusBadge(s) {
  const map = { '未着手': 'badge-todo', '進行中': 'badge-wip', '完了': 'badge-done', '保留': 'badge-hold' };
  return `<span class="badge ${map[s]||'badge-todo'}">${esc(s)}</span>`;
}
function priorityBadge(p) {
  const map = { '高': 'badge-pri-high', '中': 'badge-pri-mid', '低': 'badge-pri-low' };
  return `<span class="badge ${map[p]||''}">${esc(p)}</span>`;
}

function esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ============================================================
   INLINE EDITING
   ============================================================ */
function startInlineEdit(span) {
  const { field, id } = span.dataset;
  const task = state.tasks.find(t => t.id === +id);
  if (!task) return;

  const val = task[field] || '';

  if (field === 'note') {
    const ta = document.createElement('textarea');
    ta.className = 'inline-textarea';
    ta.value = val;
    span.replaceWith(ta);
    ta.focus();
    ta.addEventListener('blur', () => commitInline(ta, task, field));
    ta.addEventListener('keydown', e => { if (e.key === 'Escape') renderTable(); });
  } else {
    const inp = document.createElement('input');
    inp.type = 'text';
    inp.className = 'inline-input';
    inp.value = val === '—' ? '' : val;
    span.replaceWith(inp);
    inp.focus(); inp.select();
    inp.addEventListener('blur', () => commitInline(inp, task, field));
    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter')  inp.blur();
      if (e.key === 'Escape') renderTable();
    });
  }
}

function commitInline(el, task, field) {
  task[field] = el.value.trim();
  save();
  renderAll();
}

/* ============================================================
   MODAL
   ============================================================ */
function openModal(task = null) {
  state.editingId = task ? task.id : null;
  document.getElementById('modal-title').textContent = task ? 'タスクを編集' : 'タスクを追加';
  document.getElementById('f-name').value     = task?.name     || '';
  document.getElementById('f-category').value = task?.category || '';
  document.getElementById('f-priority').value = task?.priority || '中';
  document.getElementById('f-status').value   = task?.status   || '未着手';
  document.getElementById('f-due').value      = task?.due      || '';
  document.getElementById('f-note').value     = task?.note     || '';

  document.getElementById('modal-overlay').style.display = 'flex';
  document.getElementById('f-name').focus();
}

function closeModal() {
  document.getElementById('modal-overlay').style.display = 'none';
  state.editingId = null;
}

function handleFormSubmit(e) {
  e.preventDefault();
  const data = {
    name:     document.getElementById('f-name').value.trim(),
    category: document.getElementById('f-category').value.trim(),
    priority: document.getElementById('f-priority').value,
    status:   document.getElementById('f-status').value,
    due:      document.getElementById('f-due').value,
    note:     document.getElementById('f-note').value.trim(),
  };
  if (!data.name) return;

  if (state.editingId) {
    const task = state.tasks.find(t => t.id === state.editingId);
    if (task) Object.assign(task, data);
  } else {
    state.tasks.push({ ...data, id: state.nextId++, createdAt: new Date().toISOString() });
  }

  save();
  closeModal();
  renderAll();
}

/* ============================================================
   CONFIRM DIALOG
   ============================================================ */
let _confirmResolve = null;
function confirm(msg) {
  return new Promise(resolve => {
    _confirmResolve = resolve;
    document.getElementById('confirm-msg').textContent = msg;
    document.getElementById('confirm-overlay').style.display = 'flex';
  });
}

/* ============================================================
   DELETE
   ============================================================ */
async function deleteTask(id) {
  const task = state.tasks.find(t => t.id === id);
  if (!task) return;
  const ok = await confirm(`「${task.name}」を削除しますか？この操作は取り消せません。`);
  if (!ok) return;
  state.tasks = state.tasks.filter(t => t.id !== id);
  state.selectedIds.delete(id);
  save();
  renderAll();
}

async function deleteSelected() {
  const count = state.selectedIds.size;
  if (!count) return;
  const ok = await confirm(`選択した ${count} 件のタスクを削除しますか？`);
  if (!ok) return;
  state.tasks = state.tasks.filter(t => !state.selectedIds.has(t.id));
  state.selectedIds.clear();
  save();
  renderAll();
}

/* ============================================================
   SELECTION
   ============================================================ */
function updateBulkBar() {
  const bar  = document.getElementById('bulk-bar');
  const cnt  = state.selectedIds.size;
  bar.style.display = cnt ? 'flex' : 'none';
  document.getElementById('bulk-count').textContent = cnt;
}

/* ============================================================
   VIEW SWITCHING
   ============================================================ */
function switchView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(`view-${name}`).classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.view === name);
  });
  if (name === 'dashboard') renderDashboard();
  if (name === 'tasks')     renderTable();
}

/* ============================================================
   RENDER ALL
   ============================================================ */
function renderAll() {
  const activeView = document.querySelector('.view.active')?.id?.replace('view-', '');
  if (activeView === 'dashboard') renderDashboard();
  if (activeView === 'tasks')     renderTable();
}

/* ============================================================
   EVENT WIRING
   ============================================================ */
function init() {
  load();

  // Date
  document.getElementById('today-date').textContent =
    new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });

  // Nav
  document.querySelectorAll('.nav-btn, .btn-text[data-view]').forEach(btn => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });

  // Add task button
  document.getElementById('btn-add-task').addEventListener('click', () => openModal());

  // Modal form
  document.getElementById('task-form').addEventListener('submit', handleFormSubmit);
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal-cancel').addEventListener('click', closeModal);
  document.getElementById('modal-overlay').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeModal();
  });

  // Confirm dialog
  document.getElementById('confirm-ok').addEventListener('click', () => {
    document.getElementById('confirm-overlay').style.display = 'none';
    _confirmResolve?.(true);
  });
  document.getElementById('confirm-cancel').addEventListener('click', () => {
    document.getElementById('confirm-overlay').style.display = 'none';
    _confirmResolve?.(false);
  });

  // Table: sort
  document.querySelectorAll('#task-table th.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const col = th.dataset.col;
      if (state.sort.col === col) {
        state.sort.dir = state.sort.dir === 'asc' ? 'desc' : 'asc';
      } else {
        state.sort.col = col;
        state.sort.dir = 'asc';
      }
      renderTable();
    });
  });

  // Table: row actions + inline edit (event delegation)
  document.getElementById('task-tbody').addEventListener('click', e => {
    const btn  = e.target.closest('[data-action]');
    const span = e.target.closest('.editable');

    if (btn) {
      const id = +btn.dataset.id;
      if (btn.dataset.action === 'edit')   openModal(state.tasks.find(t => t.id === id));
      if (btn.dataset.action === 'delete') deleteTask(id);
      return;
    }
    if (span) {
      startInlineEdit(span);
    }
  });

  // Table: row checkbox
  document.getElementById('task-tbody').addEventListener('change', e => {
    if (!e.target.classList.contains('row-check')) return;
    const id = +e.target.closest('tr').dataset.id;
    if (e.target.checked) state.selectedIds.add(id);
    else state.selectedIds.delete(id);
    const tr = e.target.closest('tr');
    tr.classList.toggle('selected', e.target.checked);
    document.getElementById('select-all').checked =
      filteredSortedTasks().every(t => state.selectedIds.has(t.id));
    updateBulkBar();
  });

  // Select all
  document.getElementById('select-all').addEventListener('change', e => {
    filteredSortedTasks().forEach(t => {
      if (e.target.checked) state.selectedIds.add(t.id);
      else state.selectedIds.delete(t.id);
    });
    renderTable();
  });

  // Bulk actions
  document.getElementById('btn-delete-selected').addEventListener('click', deleteSelected);
  document.getElementById('btn-status-done').addEventListener('click', () => {
    state.selectedIds.forEach(id => {
      const t = state.tasks.find(t => t.id === id);
      if (t) t.status = '完了';
    });
    state.selectedIds.clear();
    save();
    renderAll();
  });

  // Filters
  document.getElementById('search-input').addEventListener('input', e => {
    state.filter.search = e.target.value;
    renderTable();
  });
  document.getElementById('filter-status').addEventListener('change', e => {
    state.filter.status = e.target.value;
    renderTable();
  });
  document.getElementById('filter-priority').addEventListener('change', e => {
    state.filter.priority = e.target.value;
    renderTable();
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (document.getElementById('modal-overlay').style.display !== 'none') closeModal();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
      e.preventDefault();
      switchView('tasks');
      openModal();
    }
  });

  // Initial render
  renderDashboard();
}

document.addEventListener('DOMContentLoaded', init);
