/* =========================================================
   Study Desk – script.js
   Everything is stored in this browser (localStorage).
   ========================================================= */
(() => {
  'use strict';

  /* ---------------------------------------------------------
     Small helpers
  --------------------------------------------------------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const uid = () => Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = (n) => String(n).padStart(2, '0');

  /* Dates are handled as local "YYYY-MM-DD" strings so time zones never shift a due date. */
  const toStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const today = () => toStr(new Date());
  const fromStr = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (s, n) => { const d = fromStr(s); d.setDate(d.getDate() + n); return toStr(d); };
  const diffDays = (a, b) => Math.round((fromStr(a) - fromStr(b)) / 864e5);
  const nowHM = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const fmtTime = (hm) => {
    const [h, m] = hm.split(':').map(Number);
    return `${((h + 11) % 12) + 1}:${pad(m)} ${h < 12 ? 'AM' : 'PM'}`;
  };
  const monthDay = (s) => fromStr(s).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const weekdayLong = (s) => fromStr(s).toLocaleDateString(undefined, { weekday: 'long' });

  /* ---------------------------------------------------------
     Icons (inline SVG, filled into [data-icon] elements)
  --------------------------------------------------------- */
  const ICONS = {
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
    play: '<path d="M8 5l11 7-11 7z"/>',
    cal: '<path d="M4 6h16v14H4zM4 10h16M8 3v4M16 3v4"/>',
    repeat: '<path d="M4 12a8 8 0 0 1 14-5.3L20 9M20 4v5h-5M20 12a8 8 0 0 1-14 5.3L4 15M4 20v-5h5"/>',
    flag: '<path d="M5 21V4M5 5h12l-2 4 2 4H5"/>',
    grip: '<path d="M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01" stroke-width="3.2"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6L7 7M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/>',
    moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/>',
    download: '<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>',
    upload: '<path d="M12 16V5M7 9l5-5 5 5M5 20h14"/>',
    keyboard: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 10h.01M11 10h.01M15 10h.01M7 14h10"/>',
    list: '<path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" />',
    timer: '<circle cx="12" cy="13.5" r="7.5"/><path d="M12 9.5v4l2.5 2M9.5 3h5"/>',
    note: '<path d="M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h7"/>',
    bolt: '<path d="M13 3L5 14h6l-1 7 8-11h-6z"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
    reset: '<path d="M4 12a8 8 0 1 0 2.6-5.9L4 8.5M4 4v4.5h4.5"/>',
    pause: '<path d="M8 5v14M16 5v14" stroke-width="3"/>',
    sliders: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>'
  };
  const ic = (name, size = 18) =>
    `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;
  const paintIcons = (root = document) => $$('[data-icon]', root).forEach((el) => { el.innerHTML = ic(el.dataset.icon); });

  /* ---------------------------------------------------------
     State & persistence
  --------------------------------------------------------- */
  const STORE_KEY = 'studydesk.v1';
  const SUBJECT_COLORS = ['#3B4BDB', '#E5484D', '#F5A524', '#2FA36B', '#0EA5B7', '#B14BDB', '#E5568A', '#7A8194'];
  const PRIO_RANK = { high: 0, med: 1, low: 2, none: 3 };
  const PRIO_LABEL = { high: 'High', med: 'Medium', low: 'Low', none: 'None' };
  const REPEAT_LABEL = { daily: 'Daily', weekdays: 'Weekdays', weekly: 'Weekly' };
  const VIEW_TITLE = { today: 'Today', upcoming: 'Upcoming', all: 'All tasks', done: 'Completed' };
  const VIEW_ORDER = ['today', 'upcoming', 'all', 'done'];

  function normTask(t) {
    return {
      id: t.id || uid(),
      title: String(t.title || 'Untitled task'),
      notes: t.notes || '',
      subject: t.subject || null,
      priority: ['high', 'med', 'low'].includes(t.priority) ? t.priority : 'none',
      due: t.due || '',
      time: t.due && t.time ? t.time : '',
      repeat: ['daily', 'weekdays', 'weekly'].includes(t.repeat) ? t.repeat : 'none',
      done: !!t.done,
      doneAt: t.doneAt || null,
      created: t.created || Date.now(),
      subtasks: Array.isArray(t.subtasks)
        ? t.subtasks.map((s) => ({ id: s.id || uid(), text: String(s.text || ''), done: !!s.done }))
        : [],
      pomodoros: t.pomodoros || 0,
      spawnedId: t.spawnedId || null
    };
  }

  function defaults() {
    return {
      tasks: [],
      subjects: [
        { id: 'math', name: 'Math', color: '#3B4BDB' },
        { id: 'science', name: 'Science', color: '#2FA36B' },
        { id: 'english', name: 'English', color: '#E5568A' },
        { id: 'history', name: 'History', color: '#F5A524' }
      ],
      log: {},        // { 'YYYY-MM-DD': tasks completed }
      focusLog: {},   // { 'YYYY-MM-DD': minutes focused }
      settings: { theme: null, focusMin: 25, breakMin: 5 },
      ui: { view: 'today', subject: null, sort: 'smart' }
    };
  }

  function seed(s) {
    const td = today();
    const mk = (o) => normTask({ created: Date.now(), ...o });
    s.tasks = [
      mk({
        title: 'Finish chemistry lab report', subject: 'science', priority: 'high', due: td, time: '18:00',
        notes: 'Tick a step to see progress. Click the title to open notes and steps.',
        subtasks: [{ text: 'Write the introduction' }, { text: 'Add graphs and tables' }, { text: 'Proofread' }]
      }),
      mk({ title: 'Math problem set 3', subject: 'math', priority: 'med', due: td }),
      mk({ title: 'Read chapter 4', subject: 'history', due: addDays(td, 1), repeat: 'none' })
    ];
  }

  function load() {
    const base = defaults();
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) { seed(base); return base; }
      const p = JSON.parse(raw);
      return {
        tasks: Array.isArray(p.tasks) ? p.tasks.map(normTask) : [],
        subjects: Array.isArray(p.subjects) ? p.subjects : base.subjects,
        log: p.log || {},
        focusLog: p.focusLog || {},
        settings: { ...base.settings, ...(p.settings || {}) },
        ui: { ...base.ui, ...(p.ui || {}) }
      };
    } catch (e) {
      return base;
    }
  }

  const state = load();
  if (!VIEW_ORDER.includes(state.ui.view)) state.ui.view = 'today';
  if (state.ui.subject && !state.subjects.some((s) => s.id === state.ui.subject)) state.ui.subject = null;

  const save = () => {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
    catch (e) { toast('Could not save. Your browser storage may be full or blocked.'); }
  };

  /* Transient (not saved) */
  let search = '';
  const expanded = new Set();
  let lastDoneId = null;
  let pendingFocus = null;
  let undoSnap = null;
  let dragId = null;

  const byId = (id) => state.tasks.find((t) => t.id === id);
  const subj = (id) => state.subjects.find((s) => s.id === id);

  function commit() { save(); render(); }

  /* ---------------------------------------------------------
     Toasts & undo
  --------------------------------------------------------- */
  function toast(msg, opts = {}) {
    const box = $('#toasts');
    while (box.children.length >= 3) box.firstElementChild.remove();
    const el = document.createElement('div');
    el.className = 'toast';
    const span = document.createElement('span');
    span.textContent = msg;
    el.append(span);
    const remove = () => { el.classList.add('out'); setTimeout(() => el.remove(), 220); };
    if (opts.action) {
      const b = document.createElement('button');
      b.textContent = opts.action;
      b.addEventListener('click', () => { opts.fn(); remove(); });
      el.append(b);
    }
    box.append(el);
    setTimeout(remove, opts.ms || 5000);
  }

  function snapshot() {
    undoSnap = JSON.stringify({ tasks: state.tasks, subjects: state.subjects, log: state.log, focusLog: state.focusLog });
  }
  function undo() {
    if (!undoSnap) return;
    const s = JSON.parse(undoSnap);
    state.tasks = s.tasks.map(normTask);
    state.subjects = s.subjects;
    state.log = s.log;
    state.focusLog = s.focusLog || state.focusLog;
    undoSnap = null;
    commit();
  }

  /* ---------------------------------------------------------
     Quick-add parser
     "Read ch. 4 #history fri 5pm !high daily"
  --------------------------------------------------------- */
  const MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11 };
  const DOW = { sun: 0, sunday: 0, mon: 1, monday: 1, tue: 2, tues: 2, tuesday: 2, wed: 3, wednesday: 3, thu: 4, thur: 4, thurs: 4, thursday: 4, fri: 5, friday: 5, sat: 6, saturday: 6 };

  function findSubject(q) {
    q = q.toLowerCase();
    const slug = (n) => n.toLowerCase().replace(/\s+/g, '-');
    return state.subjects.find((s) => slug(s.name) === q) || state.subjects.find((s) => slug(s.name).startsWith(q));
  }

  function parseQuick(raw) {
    let text = ` ${raw} `;
    const out = { title: '', subject: null, priority: null, due: null, time: null, repeat: null };
    const td = today();

    const take = (re, fn) => {
      let hit = false;
      const g = re.flags.includes('g') ? re : new RegExp(re.source, `${re.flags}g`);
      text = text.replace(g, (...m) => {
        if (hit) return m[0];
        const ok = fn(...m);
        if (ok === false) return m[0];
        hit = true;
        return ' ';
      });
      return hit;
    };

    take(/(\s)#([\w-]+)(?=\s)/i, (m, sp, name) => {
      const s = findSubject(name);
      if (!s) return false;
      out.subject = s.id;
    });

    take(/(\s)!(high|h|medium|med|m|low|l|none)(?=\s)/i, (m, sp, p) => {
      p = p.toLowerCase();
      out.priority = p[0] === 'h' ? 'high' : p[0] === 'm' ? 'med' : p[0] === 'l' ? 'low' : 'none';
    });

    take(/(\s)(every\s+weekday|weekdays|every\s+day|daily|every\s+week|weekly)(?=\s)/i, (m, sp, r) => {
      r = r.toLowerCase();
      out.repeat = r.includes('weekday') ? 'weekdays' : r.includes('day') || r === 'daily' ? 'daily' : 'weekly';
    });

    /* time */
    const gotTime = take(/(\s)(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)(?=\s)/i, (m, sp, h, min, ap) => {
      h = +h; min = +(min || 0);
      if (h < 1 || h > 12 || min > 59) return false;
      if (/pm/i.test(ap) && h < 12) h += 12;
      if (/am/i.test(ap) && h === 12) h = 0;
      out.time = `${pad(h)}:${pad(min)}`;
    });
    if (!gotTime) {
      take(/(\s)(?:at\s+)?([01]?\d|2[0-3]):([0-5]\d)(?=\s)/, (m, sp, h, min) => { out.time = `${pad(+h)}:${min}`; });
    }

    /* date – first matching pattern wins */
    const dateRules = [
      [/(\s)(\d{4}-\d{2}-\d{2})(?=\s)/, (m, sp, iso) => {
        const d = fromStr(iso);
        if (isNaN(d) || toStr(d) !== iso) return false;
        out.due = iso;
      }],
      [/(\s)(?:tomorrow|tmrw|tmr)(?=\s)/i, () => { out.due = addDays(td, 1); }],
      [/(\s)today(?=\s)/i, () => { out.due = td; }],
      [/(\s)in\s+(\d+)\s*(d|day|days|w|wk|wks|week|weeks)(?=\s)/i, (m, sp, n, u) => {
        out.due = addDays(td, +n * (/^w/i.test(u) ? 7 : 1));
      }],
      [/(\s)next\s+week(?=\s)/i, () => { out.due = addDays(td, 7); }],
      [/(\s)(?:next\s+|on\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday|sun|mon|tues|tue|wed|thurs|thur|thu|fri|sat)(?=\s)/i, (m, sp, w) => {
        if (w === 'SAT') return false; /* the exam, not Saturday */
        const target = DOW[w.toLowerCase()];
        const cur = new Date().getDay();
        out.due = addDays(td, ((target - cur + 7) % 7) || 7);
      }],
      [/(\s)(jan|feb|mar|apr|may|jun|jul|aug|sept|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?=\s)/i, (m, sp, mo, day) => {
        const d = monthDate(MONTHS[mo.toLowerCase()], +day);
        if (!d) return false;
        out.due = d;
      }],
      [/(\s)(\d{1,2})(?:st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sept|sep|oct|nov|dec)[a-z]*(?=\s)/i, (m, sp, day, mo) => {
        const d = monthDate(MONTHS[mo.toLowerCase()], +day);
        if (!d) return false;
        out.due = d;
      }]
    ];
    for (const [re, fn] of dateRules) { if (take(re, fn)) break; }

    let title = text.replace(/\s+/g, ' ').trim();
    title = title.replace(/(\s|^)(on|by|due|at|for|before)$/i, '').trim();
    out.title = title || raw.trim();
    return out;
  }

  function monthDate(month, day) {
    const now = new Date();
    let y = now.getFullYear();
    let d = new Date(y, month, day);
    if (d.getMonth() !== month) return null; /* e.g. Feb 30 */
    if (toStr(d) < today()) { y += 1; d = new Date(y, month, day); if (d.getMonth() !== month) return null; }
    return toStr(d);
  }

  /* ---------------------------------------------------------
     Due-date labels
  --------------------------------------------------------- */
  function dueInfo(t) {
    if (!t.due) return null;
    const td = today();
    const n = diffDays(t.due, td);
    const time = t.time ? ` ${fmtTime(t.time)}` : '';
    let text; let cls = '';
    if (n === 0) {
      text = 'Today';
      if (!t.done) cls = t.time && nowHM() > t.time ? 'overdue' : 'soon';
    } else if (n === 1) text = 'Tomorrow';
    else if (n === -1) { text = 'Yesterday'; if (!t.done) cls = 'overdue'; }
    else if (n < -1) { text = `${-n} days ago`; if (!t.done) cls = 'overdue'; }
    else if (n < 7) text = weekdayLong(t.due);
    else text = monthDay(t.due);
    return { text: text + time, cls, title: fromStr(t.due).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }) + time };
  }

  /* ---------------------------------------------------------
     Task operations
  --------------------------------------------------------- */
  function bumpLog(day, delta) {
    state.log[day] = Math.max(0, (state.log[day] || 0) + delta);
    if (!state.log[day]) delete state.log[day];
  }

  function advance(dateStr, repeat) {
    let d = addDays(dateStr, repeat === 'weekly' ? 7 : 1);
    if (repeat === 'weekdays') while ([0, 6].includes(fromStr(d).getDay())) d = addDays(d, 1);
    return d;
  }

  function spawnNext(t) {
    const td = today();
    let next = advance(t.due || td, t.repeat);
    let guard = 0;
    while (next <= td && guard++ < 400) next = advance(next, t.repeat);
    const n = normTask({
      ...t, id: uid(), done: false, doneAt: null, due: next, created: Date.now(), pomodoros: 0, spawnedId: null,
      subtasks: t.subtasks.map((s) => ({ ...s, id: uid(), done: false }))
    });
    t.spawnedId = n.id;
    state.tasks.splice(state.tasks.indexOf(t) + 1, 0, n);
    return n;
  }

  function toggleTask(id) {
    const t = byId(id);
    if (!t) return;
    t.done = !t.done;
    if (t.done) {
      t.doneAt = Date.now();
      bumpLog(today(), 1);
      lastDoneId = id;
      if (t.repeat !== 'none') {
        const n = spawnNext(t);
        toast(`Next "${t.title}" is set for ${dueInfo(n).text}.`);
      }
    } else {
      if (t.doneAt) bumpLog(toStr(new Date(t.doneAt)), -1);
      t.doneAt = null;
      if (t.spawnedId) {
        const sp = byId(t.spawnedId);
        if (sp && !sp.done) state.tasks.splice(state.tasks.indexOf(sp), 1);
        t.spawnedId = null;
      }
    }
    commit();
  }

  function deleteTask(id) {
    const t = byId(id);
    if (!t) return;
    snapshot();
    state.tasks.splice(state.tasks.indexOf(t), 1);
    expanded.delete(id);
    if (timer.taskId === id) timer.taskId = '';
    commit();
    toast('Task deleted.', { action: 'Undo', fn: undo });
  }

  function addTask(data) {
    const t = normTask({ id: uid(), created: Date.now(), ...data });
    if (t.repeat !== 'none' && !t.due) t.due = today();
    state.tasks.push(t);
    return t;
  }

  function moveTask(dragged, target, before) {
    const a = byId(dragged);
    const b = byId(target);
    if (!a || !b || a === b) return;
    state.tasks.splice(state.tasks.indexOf(a), 1);
    const i = state.tasks.indexOf(b);
    state.tasks.splice(before ? i : i + 1, 0, a);
    commit();
  }

  /* ---------------------------------------------------------
     Filtering & sorting
  --------------------------------------------------------- */
  function matchesFilters(t) {
    if (state.ui.subject && t.subject !== state.ui.subject) return false;
    if (search) {
      const q = search.toLowerCase();
      const hay = `${t.title} ${t.notes} ${t.subtasks.map((s) => s.text).join(' ')}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }

  function filterTasks() {
    const td = today();
    const { view } = state.ui;
    return state.tasks.filter((t) => {
      if (!matchesFilters(t)) return false;
      if (view === 'done') return t.done;
      if (t.done) return false;
      if (view === 'today') return !!t.due && t.due <= td;
      if (view === 'upcoming') return !!t.due && t.due > td;
      return true;
    });
  }

  const dueKey = (t) => (t.due ? t.due + (t.time || '23:59') : '9999');
  const cmpDue = (a, b) => (dueKey(a) < dueKey(b) ? -1 : dueKey(a) > dueKey(b) ? 1 : 0);

  function sortTasks(list) {
    const { sort, view } = state.ui;
    if (view === 'done') return list.sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0));
    const idx = new Map(state.tasks.map((t, i) => [t.id, i]));
    const byIdx = (a, b) => idx.get(a.id) - idx.get(b.id);
    const byPrio = (a, b) => PRIO_RANK[a.priority] - PRIO_RANK[b.priority];
    const fns = {
      smart: (a, b) => cmpDue(a, b) || byPrio(a, b) || byIdx(a, b),
      due: (a, b) => cmpDue(a, b) || byIdx(a, b),
      priority: (a, b) => byPrio(a, b) || cmpDue(a, b) || byIdx(a, b),
      newest: (a, b) => b.created - a.created,
      manual: byIdx
    };
    return list.sort(fns[sort] || fns.smart);
  }

  /* ---------------------------------------------------------
     Rendering – sidebar & header
  --------------------------------------------------------- */
  function renderSidebar() {
    const td = today();
    const active = state.tasks.filter((t) => !t.done);
    const counts = {
      today: active.filter((t) => t.due && t.due <= td).length,
      upcoming: active.filter((t) => t.due && t.due > td).length,
      all: active.length,
      done: state.tasks.length - active.length
    };
    $$('#viewNav [data-view]').forEach((b) => {
      b.setAttribute('aria-current', String(b.dataset.view === state.ui.view));
      $('.count', b).textContent = counts[b.dataset.view] || '';
    });

    const list = $('#subjectList');
    const rows = [`<li class="subject-row"><button class="side-item ${state.ui.subject ? '' : 'active'}" data-subject="">All subjects</button></li>`];
    state.subjects.forEach((s) => {
      const n = active.filter((t) => t.subject === s.id).length;
      rows.push(`
        <li class="subject-row">
          <button class="side-item ${state.ui.subject === s.id ? 'active' : ''}" data-subject="${s.id}">
            <i class="dot" style="background:${s.color}"></i><span class="name">${esc(s.name)}</span>
            <span class="count">${n || ''}</span>
          </button>
          <button class="side-edit" data-edit-subject="${s.id}" aria-label="Edit ${esc(s.name)}">${ic('edit', 15)}</button>
        </li>`);
    });
    list.innerHTML = rows.join('');

    const dark = document.documentElement.dataset.theme === 'dark';
    $('#themeBtn').innerHTML = `${ic(dark ? 'sun' : 'moon')}<span>${dark ? 'Light mode' : 'Dark mode'}</span>`;
  }

  function renderHead() {
    const { view, subject } = state.ui;
    $('#viewTitle').textContent = VIEW_TITLE[view];
    document.title = `${VIEW_TITLE[view]} – Study Desk`;
    const n = filterTasks().length;
    const dateText = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
    const countText = view === 'done' ? `${n} completed` : n === 0 ? 'Nothing here' : `${n} ${n === 1 ? 'task' : 'tasks'}`;
    let html = `<span>${esc(dateText)}</span><span>${countText}</span>`;
    const s = subject && subj(subject);
    if (s) html += `<button class="chip-btn" data-clear-subject aria-label="Clear ${esc(s.name)} filter"><i class="dot" style="background:${s.color}"></i>${esc(s.name)}${ic('x', 14)}</button>`;
    $('#subline').innerHTML = html;

    $('#sortSel').value = state.ui.sort;
    $('#sortSel').disabled = view === 'done';
    $('#taskList').closest('.main').classList.toggle('sort-manual', state.ui.sort === 'manual' && view !== 'done');
  }

  /* ---------------------------------------------------------
     Rendering – tasks
  --------------------------------------------------------- */
  function taskHTML(t) {
    const sj = subj(t.subject);
    const di = dueInfo(t);
    const open = expanded.has(t.id);
    const doneSubs = t.subtasks.filter((s) => s.done).length;
    const chips = [];
    if (sj) chips.push(`<span class="chip"><i class="dot" style="background:${sj.color}"></i>${esc(sj.name)}</span>`);
    if (di) chips.push(`<span class="chip ${di.cls}" title="${esc(di.title)}">${ic('cal', 14)}${esc(di.text)}</span>`);
    if (t.priority !== 'none') chips.push(`<span class="chip prio-${t.priority}">${ic('flag', 14)}${PRIO_LABEL[t.priority]}</span>`);
    if (t.repeat !== 'none') chips.push(`<span class="chip">${ic('repeat', 14)}${REPEAT_LABEL[t.repeat]}</span>`);
    if (t.subtasks.length) chips.push(`<span class="chip">${ic('list', 14)}${doneSubs}/${t.subtasks.length}</span>`);
    if (t.notes) chips.push(`<span class="chip" title="Has notes">${ic('note', 14)}Notes</span>`);
    if (t.pomodoros) chips.push(`<span class="chip">${ic('timer', 14)}${t.pomodoros} ${t.pomodoros === 1 ? 'session' : 'sessions'}</span>`);
    if (t.done && t.doneAt) chips.push(`<span class="chip">Done ${esc(monthDay(toStr(new Date(t.doneAt))))}</span>`);

    const detail = open ? `
      <div class="task-detail">
        ${t.notes ? `<p class="notes">${esc(t.notes)}</p>` : ''}
        ${t.subtasks.length ? `<ul class="subtasks">${t.subtasks.map((s) => `
          <li class="${s.done ? 'is-done' : ''}">
            <input type="checkbox" data-act="sub-toggle" data-sid="${s.id}" ${s.done ? 'checked' : ''} aria-label="${esc(s.text)}">
            <span>${esc(s.text)}</span>
            <button class="icon-btn sub-del" data-act="sub-del" data-sid="${s.id}" aria-label="Remove step">${ic('x', 14)}</button>
          </li>`).join('')}</ul>` : ''}
        <input class="input sub-input" type="text" placeholder="Add a step and press Enter" aria-label="Add a step" maxlength="120">
      </div>` : '';

    return `
      <li class="task prio-${t.priority} ${t.done ? 'done' : ''} ${t.id === lastDoneId ? 'just-done' : ''}" data-id="${t.id}">
        <div class="task-main">
          <span class="handle" data-act="drag" aria-hidden="true" title="Drag to reorder">${ic('grip', 16)}</span>
          <button class="check" data-act="toggle" role="checkbox" aria-checked="${t.done}" aria-label="${t.done ? 'Mark as not done' : 'Mark as done'}: ${esc(t.title)}">${ic('check', 15)}</button>
          <button class="task-body" data-act="expand" aria-expanded="${open}">
            <span class="task-title">${esc(t.title)}</span>
            <span class="task-meta">${chips.join('')}</span>
          </button>
          <div class="task-actions">
            ${t.done ? '' : `<button class="icon-btn" data-act="focus" aria-label="Focus on this task" title="Focus on this task">${ic('play', 16)}</button>`}
            <button class="icon-btn" data-act="edit" aria-label="Edit task" title="Edit">${ic('edit', 16)}</button>
            <button class="icon-btn" data-act="delete" aria-label="Delete task" title="Delete">${ic('trash', 16)}</button>
          </div>
        </div>
        ${detail}
      </li>`;
  }

  function emptyHTML() {
    const { view } = state.ui;
    if (search) return `<div class="empty"><strong>No matches for “${esc(search)}”</strong>Try a different word, or clear the search.</div>`;
    const map = {
      today: ['You’re clear for today', 'Add a task above, or look at what’s coming up.'],
      upcoming: ['Nothing scheduled ahead', 'Add a due date to a task and it will show up here.'],
      all: ['No tasks yet', 'Type a task above and press Enter.'],
      done: ['Nothing completed yet', 'Finished tasks will collect here.']
    };
    const [h, p] = map[view];
    return `<div class="empty"><strong>${h}</strong>${p}</div>`;
  }

  function renderList() {
    const { view, sort } = state.ui;
    const td = today();
    const tasks = sortTasks(filterTasks());
    const dueSorted = sort === 'smart' || sort === 'due';
    let html = '';

    if (view === 'today' && dueSorted) {
      const over = tasks.filter((t) => t.due < td);
      const rest = tasks.filter((t) => t.due >= td);
      if (over.length) html += `<li class="group-title danger">Overdue</li>${over.map(taskHTML).join('')}`;
      if (rest.length) html += `${over.length ? '<li class="group-title">Due today</li>' : ''}${rest.map(taskHTML).join('')}`;
    } else if (view === 'upcoming' && dueSorted) {
      let last = null;
      tasks.forEach((t) => {
        if (t.due !== last) {
          last = t.due;
          const n = diffDays(t.due, td);
          const label = n === 1 ? 'Tomorrow' : fromStr(t.due).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' });
          html += `<li class="group-title">${label}</li>`;
        }
        html += taskHTML(t);
      });
    } else {
      html = tasks.map(taskHTML).join('');
    }

    if (view === 'today') {
      const doneToday = state.tasks
        .filter((t) => t.done && t.doneAt && toStr(new Date(t.doneAt)) === td && matchesFilters(t))
        .sort((a, b) => b.doneAt - a.doneAt);
      if (doneToday.length) html += `<li class="group-title">Completed today</li>${doneToday.map(taskHTML).join('')}`;
    }

    $('#taskList').innerHTML = html || emptyHTML();
    lastDoneId = null;

    if (pendingFocus) {
      const el = $(pendingFocus);
      if (el) { el.focus(); if (el.setSelectionRange && el.type === 'text') el.setSelectionRange(el.value.length, el.value.length); }
      pendingFocus = null;
    }
  }

  /* ---------------------------------------------------------
     Rendering – right panel stats
  --------------------------------------------------------- */
  function streakCount() {
    let d = today();
    let n = 0;
    if (!(state.log[d] > 0)) d = addDays(d, -1);
    while (state.log[d] > 0 && n < 3650) { n++; d = addDays(d, -1); }
    return n;
  }

  function renderStats() {
    const td = today();
    const doneToday = state.log[td] || 0;
    const left = state.tasks.filter((t) => !t.done && t.due && t.due <= td).length;
    const total = doneToday + left;
    const pct = total ? Math.round((doneToday / total) * 100) : 0;
    $('#dayBig').textContent = `${doneToday} done`;
    $('#daySmall').textContent = total === 0 ? 'Nothing due today' : left === 0 ? 'All clear' : `${left} to go`;
    $('#dayBar').setAttribute('aria-valuenow', pct);
    $('#dayBar i').style.width = `${pct}%`;
    const st = streakCount();
    $('#statStreak').textContent = `${st} ${st === 1 ? 'day' : 'days'}`;
    $('#statFocus').textContent = `${state.focusLog[td] || 0} min`;

    const days = Array.from({ length: 7 }, (_, i) => addDays(td, i - 6));
    const vals = days.map((d) => state.log[d] || 0);
    const max = Math.max(1, ...vals);
    $('#week').innerHTML = days.map((d, i) => {
      const h = Math.round((vals[i] / max) * 68);
      const lbl = fromStr(d).toLocaleDateString(undefined, { weekday: 'narrow' });
      return `<div class="col ${d === td ? 'today' : ''}" title="${vals[i]} completed on ${esc(monthDay(d))}"><div class="b" style="height:${h}px"></div><span class="l">${lbl}</span></div>`;
    }).join('');
    const sum = vals.reduce((a, b) => a + b, 0);
    $('#weekTotal').textContent = sum ? `${sum} ${sum === 1 ? 'task' : 'tasks'} completed in the last 7 days.` : 'Complete a task to start your chart.';
  }

  function renderFocusTasks() {
    const sel = $('#focusTask');
    const active = state.tasks.filter((t) => !t.done);
    if (timer.taskId && !active.some((t) => t.id === timer.taskId)) timer.taskId = '';
    sel.innerHTML = `<option value="">No specific task</option>` +
      active.map((t) => `<option value="${t.id}">${esc(t.title.length > 42 ? t.title.slice(0, 41) + '…' : t.title)}</option>`).join('');
    sel.value = timer.taskId;
  }

  function render() {
    renderSidebar();
    renderHead();
    renderList();
    renderStats();
    renderFocusTasks();
    renderTimer();
  }

  /* ---------------------------------------------------------
     Focus timer (Pomodoro)
  --------------------------------------------------------- */
  const RING_LEN = 2 * Math.PI * 88;
  const timer = { mode: 'focus', total: 0, remaining: 0, running: false, endAt: 0, tick: null, taskId: '' };
  let audioCtx = null;

  function ensureAudio() {
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
    } catch (e) { /* sound is optional */ }
  }
  function beep() {
    if (!audioCtx) return;
    [0, 0.28, 0.56].forEach((t, i) => {
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      const at = audioCtx.currentTime + t;
      o.frequency.value = i === 2 ? 880 : 660;
      o.connect(g); g.connect(audioCtx.destination);
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(0.25, at + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, at + 0.24);
      o.start(at); o.stop(at + 0.26);
    });
  }
  function notify(title, body) {
    if ('Notification' in window && Notification.permission === 'granted') {
      try { new Notification(title, { body }); } catch (e) { /* ignore */ }
    }
  }

  function setMode(mode) {
    stopTimer();
    timer.mode = mode;
    timer.total = (mode === 'focus' ? state.settings.focusMin : state.settings.breakMin) * 60;
    timer.remaining = timer.total;
    renderTimer();
  }
  function stopTimer() { clearInterval(timer.tick); timer.running = false; }
  function startTimer() {
    if (timer.running) return;
    ensureAudio();
    if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
    timer.running = true;
    timer.endAt = Date.now() + timer.remaining * 1000;
    timer.tick = setInterval(tick, 250);
    renderTimer();
  }
  function pauseTimer() {
    if (!timer.running) return;
    timer.remaining = Math.max(1, Math.ceil((timer.endAt - Date.now()) / 1000));
    stopTimer();
    renderTimer();
  }
  function resetTimer() { stopTimer(); timer.remaining = timer.total; renderTimer(); }
  function toggleTimer() { timer.running ? pauseTimer() : startTimer(); }

  function tick() {
    const left = Math.ceil((timer.endAt - Date.now()) / 1000);
    if (left <= 0) { finishTimer(); return; }
    if (left !== timer.remaining) { timer.remaining = left; renderTimer(); }
  }

  function finishTimer() {
    stopTimer();
    beep();
    const wasFocus = timer.mode === 'focus';
    if (wasFocus) {
      const d = today();
      state.focusLog[d] = (state.focusLog[d] || 0) + state.settings.focusMin;
      const t = byId(timer.taskId);
      if (t) t.pomodoros = (t.pomodoros || 0) + 1;
      save();
      notify('Focus session complete', `Take a ${state.settings.breakMin} minute break.`);
      toast(`Focus session done. Take ${state.settings.breakMin} minutes.`);
    } else {
      notify('Break over', 'Ready for another round?');
      toast('Break over. Ready when you are.');
    }
    setMode(wasFocus ? 'break' : 'focus');
    render();
  }

  function renderTimer() {
    const mm = pad(Math.floor(timer.remaining / 60));
    const ss = pad(timer.remaining % 60);
    $('#timeText').textContent = `${mm}:${ss}`;
    $('#modeText').textContent = timer.mode === 'focus' ? 'Focus' : 'Break';
    $('#ring').classList.toggle('break', timer.mode === 'break');
    $('#ringBar').style.strokeDasharray = RING_LEN;
    $('#ringBar').style.strokeDashoffset = RING_LEN * (1 - timer.remaining / timer.total);
    $('#modeFocus').setAttribute('aria-pressed', String(timer.mode === 'focus'));
    $('#modeBreak').setAttribute('aria-pressed', String(timer.mode === 'break'));
    const b = $('#startBtn');
    b.textContent = timer.running ? 'Pause' : timer.remaining < timer.total ? 'Resume' : 'Start';
    $('#focusLen').value = String(state.settings.focusMin);
    $('#breakLen').value = String(state.settings.breakMin);
    const base = VIEW_TITLE[state.ui.view];
    document.title = timer.running ? `${mm}:${ss} ${timer.mode === 'focus' ? 'Focus' : 'Break'} – Study Desk` : `${base} – Study Desk`;
  }

  /* ---------------------------------------------------------
     Dialogs
  --------------------------------------------------------- */
  const taskDlg = $('#taskDialog');
  const subjDlg = $('#subjectDialog');
  const helpDlg = $('#helpDialog');
  let editingId = null;
  let draftSubs = [];
  let editingSubject = null;
  let pickedColor = SUBJECT_COLORS[0];

  function openTaskDialog(id, prefill = {}) {
    editingId = id || null;
    const t = id ? byId(id) : null;
    const d = t || { title: '', subject: state.ui.subject, priority: 'none', due: '', time: '', repeat: 'none', notes: '', subtasks: [], ...prefill };
    $('#taskDialogTitle').textContent = t ? 'Edit task' : 'New task';
    $('#fTitle').value = d.title;
    $('#fSubject').innerHTML = `<option value="">No subject</option>` + state.subjects.map((s) => `<option value="${s.id}">${esc(s.name)}</option>`).join('');
    $('#fSubject').value = d.subject || '';
    $('#fRepeat').value = d.repeat;
    $('#fDue').value = d.due;
    $('#fTime').value = d.time;
    $('#fTime').disabled = !d.due;
    $('#fNotes').value = d.notes;
    $$('#fPriority input').forEach((r) => { r.checked = r.value === d.priority; });
    draftSubs = d.subtasks.map((s) => ({ ...s }));
    $('#fSubNew').value = '';
    renderDraftSubs();
    $('#fDelete').hidden = !t;
    $('#fSave').textContent = t ? 'Save task' : 'Add task';
    taskDlg.showModal();
    $('#fTitle').focus();
  }

  function renderDraftSubs() {
    $('#fSubs').innerHTML = draftSubs.map((s, i) => `
      <li>
        <input type="checkbox" data-i="${i}" ${s.done ? 'checked' : ''} aria-label="Step done">
        <input class="input" type="text" data-i="${i}" value="${esc(s.text)}" maxlength="120" aria-label="Step ${i + 1}">
        <button type="button" class="icon-btn" data-rm="${i}" aria-label="Remove step">${ic('x', 15)}</button>
      </li>`).join('');
  }

  $('#fSubs').addEventListener('input', (e) => {
    const i = e.target.dataset.i;
    if (i !== undefined && e.target.type === 'text') draftSubs[i].text = e.target.value;
  });
  $('#fSubs').addEventListener('change', (e) => {
    const i = e.target.dataset.i;
    if (i !== undefined && e.target.type === 'checkbox') draftSubs[i].done = e.target.checked;
  });
  $('#fSubs').addEventListener('click', (e) => {
    const b = e.target.closest('[data-rm]');
    if (b) { draftSubs.splice(+b.dataset.rm, 1); renderDraftSubs(); }
  });
  $('#fSubNew').addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const v = e.target.value.trim();
    if (!v) return;
    draftSubs.push({ id: uid(), text: v, done: false });
    e.target.value = '';
    renderDraftSubs();
  });
  $('#fDue').addEventListener('input', (e) => {
    $('#fTime').disabled = !e.target.value;
    if (!e.target.value) $('#fTime').value = '';
  });

  $('#taskForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const title = $('#fTitle').value.trim();
    if (!title) { $('#fTitle').focus(); $('#fTitle').setCustomValidity('Give the task a name.'); $('#fTitle').reportValidity(); $('#fTitle').setCustomValidity(''); return; }
    const pending = $('#fSubNew').value.trim();
    if (pending) draftSubs.push({ id: uid(), text: pending, done: false });
    const data = {
      title,
      subject: $('#fSubject').value || null,
      priority: ($('#fPriority input:checked') || {}).value || 'none',
      due: $('#fDue').value,
      time: $('#fDue').value ? $('#fTime').value : '',
      repeat: $('#fRepeat').value,
      notes: $('#fNotes').value.trim(),
      subtasks: draftSubs.filter((s) => s.text.trim()).map((s) => ({ ...s, text: s.text.trim() }))
    };
    if (data.repeat !== 'none' && !data.due) data.due = today();
    if (editingId) Object.assign(byId(editingId), normTask({ ...byId(editingId), ...data }));
    else { addTask(data); $('#quickInput').value = ''; updatePreview(); }
    taskDlg.close();
    commit();
    toast(editingId ? 'Task saved.' : 'Task added.');
  });

  $('#fDelete').addEventListener('click', () => {
    if (!editingId) return;
    const id = editingId;
    taskDlg.close();
    deleteTask(id);
  });

  /* Subject dialog */
  function openSubjectDialog(id) {
    editingSubject = id || null;
    const s = id ? subj(id) : null;
    $('#subjectDialogTitle').textContent = s ? 'Edit subject' : 'New subject';
    $('#sName').value = s ? s.name : '';
    pickedColor = s ? s.color : SUBJECT_COLORS[state.subjects.length % SUBJECT_COLORS.length];
    $('#swatches').innerHTML = SUBJECT_COLORS.map((c) => `
      <label class="swatch"><input type="radio" name="color" value="${c}" ${c === pickedColor ? 'checked' : ''} aria-label="Colour ${c}"><span style="background:${c}"></span></label>`).join('');
    $('#sDelete').hidden = !s;
    subjDlg.showModal();
    $('#sName').focus();
  }
  $('#swatches').addEventListener('change', (e) => { if (e.target.name === 'color') pickedColor = e.target.value; });
  $('#subjectForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = $('#sName').value.trim();
    if (!name) { $('#sName').focus(); return; }
    const dupe = state.subjects.some((s) => s.id !== editingSubject && s.name.toLowerCase() === name.toLowerCase());
    if (dupe) { toast(`You already have a subject called ${name}.`); return; }
    if (editingSubject) {
      const s = subj(editingSubject);
      s.name = name; s.color = pickedColor;
    } else {
      state.subjects.push({ id: uid(), name, color: pickedColor });
    }
    subjDlg.close();
    commit();
  });
  $('#sDelete').addEventListener('click', () => {
    if (!editingSubject) return;
    snapshot();
    const id = editingSubject;
    state.tasks.forEach((t) => { if (t.subject === id) t.subject = null; });
    state.subjects = state.subjects.filter((s) => s.id !== id);
    if (state.ui.subject === id) state.ui.subject = null;
    subjDlg.close();
    commit();
    toast('Subject deleted. Its tasks are kept.', { action: 'Undo', fn: undo });
  });

  /* Dialog chrome: close buttons + click on backdrop */
  $$('dialog').forEach((dlg) => {
    dlg.addEventListener('click', (e) => {
      if (e.target === dlg || e.target.closest('[data-close]')) dlg.close();
    });
  });

  /* ---------------------------------------------------------
     Quick add
  --------------------------------------------------------- */
  const quickInput = $('#quickInput');

  function defaultDue() { return state.ui.view === 'today' ? today() : ''; }

  function updatePreview() {
    const raw = quickInput.value.trim();
    const box = $('#preview');
    if (!raw) { box.innerHTML = ''; return; }
    const p = parseQuick(raw);
    const chips = [];
    const sj = subj(p.subject);
    if (sj) chips.push(`<span class="chip new"><i class="dot" style="background:${sj.color}"></i>${esc(sj.name)}</span>`);
    if (p.due) chips.push(`<span class="chip new">${ic('cal', 14)}${esc(dueInfo({ due: p.due, time: p.time, done: false }).text)}</span>`);
    else if (p.time) chips.push(`<span class="chip new">${ic('cal', 14)}${esc(fmtTime(p.time))}</span>`);
    if (p.priority && p.priority !== 'none') chips.push(`<span class="chip new">${ic('flag', 14)}${PRIO_LABEL[p.priority]}</span>`);
    if (p.repeat) chips.push(`<span class="chip new">${ic('repeat', 14)}${REPEAT_LABEL[p.repeat]}</span>`);
    box.innerHTML = chips.join('');
  }
  quickInput.addEventListener('input', updatePreview);

  $('#quickForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const raw = quickInput.value.trim();
    if (!raw) { quickInput.focus(); return; }
    const p = parseQuick(raw);
    const t = addTask({
      title: p.title,
      subject: p.subject || state.ui.subject || null,
      priority: p.priority || 'none',
      due: p.due || defaultDue(),
      time: p.time || '',
      repeat: p.repeat || 'none'
    });
    quickInput.value = '';
    updatePreview();
    commit();

    const td = today();
    const inView = state.ui.view === 'all' || (state.ui.view === 'today' && t.due && t.due <= td) || (state.ui.view === 'upcoming' && t.due > td);
    if (!inView || (search && !matchesFilters(t))) {
      const dest = !t.due ? 'all' : t.due <= td ? 'today' : 'upcoming';
      toast(`Added to ${VIEW_TITLE[dest]}.`, { action: 'Show', fn: () => { search = ''; $('#search').value = ''; setView(dest); } });
    }
  });

  $('#detailsBtn').addEventListener('click', () => {
    const raw = quickInput.value.trim();
    const p = raw ? parseQuick(raw) : {};
    openTaskDialog(null, {
      title: p.title || '', subject: p.subject || state.ui.subject || '', priority: p.priority || 'none',
      due: p.due || defaultDue(), time: p.time || '', repeat: p.repeat || 'none'
    });
  });

  /* ---------------------------------------------------------
     Task list events
  --------------------------------------------------------- */
  const listEl = $('#taskList');

  listEl.addEventListener('click', (e) => {
    const li = e.target.closest('.task');
    if (!li) return;
    const id = li.dataset.id;
    const actEl = e.target.closest('[data-act]');
    const act = actEl && actEl.dataset.act;
    switch (act) {
      case 'toggle': toggleTask(id); break;
      case 'expand':
        expanded.has(id) ? expanded.delete(id) : expanded.add(id);
        renderList();
        break;
      case 'edit': openTaskDialog(id); break;
      case 'delete': deleteTask(id); break;
      case 'focus': startFocusOn(id); break;
      case 'sub-toggle': {
        const t = byId(id); const s = t && t.subtasks.find((x) => x.id === actEl.dataset.sid);
        if (s) { s.done = !s.done; pendingFocus = `.task[data-id="${id}"] [data-sid="${s.id}"]`; commit(); }
        break;
      }
      case 'sub-del': {
        const t = byId(id);
        if (t) { t.subtasks = t.subtasks.filter((x) => x.id !== actEl.dataset.sid); pendingFocus = `.task[data-id="${id}"] .sub-input`; commit(); }
        break;
      }
      default: break;
    }
  });

  listEl.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || !e.target.classList.contains('sub-input')) return;
    e.preventDefault();
    const v = e.target.value.trim();
    const id = e.target.closest('.task').dataset.id;
    const t = byId(id);
    if (!v || !t) return;
    t.subtasks.push({ id: uid(), text: v, done: false });
    pendingFocus = `.task[data-id="${id}"] .sub-input`;
    commit();
  });

  /* Drag to reorder (Manual sort only) */
  listEl.addEventListener('mousedown', (e) => {
    const h = e.target.closest('.handle');
    if (h) h.closest('.task').draggable = true;
  });
  document.addEventListener('mouseup', () => {
    if (!dragId) $$('.task[draggable="true"]').forEach((el) => { el.draggable = false; });
  });
  listEl.addEventListener('dragstart', (e) => {
    const li = e.target.closest && e.target.closest('.task');
    if (!li || !li.draggable) return;
    dragId = li.dataset.id;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', dragId);
    requestAnimationFrame(() => li.classList.add('dragging'));
  });
  const clearDrop = () => $$('.task.drop-before, .task.drop-after').forEach((el) => el.classList.remove('drop-before', 'drop-after'));
  listEl.addEventListener('dragover', (e) => {
    if (!dragId) return;
    const li = e.target.closest('.task');
    if (!li || li.dataset.id === dragId) return;
    e.preventDefault();
    clearDrop();
    const r = li.getBoundingClientRect();
    li.classList.add(e.clientY < r.top + r.height / 2 ? 'drop-before' : 'drop-after');
  });
  listEl.addEventListener('drop', (e) => {
    if (!dragId) return;
    const li = e.target.closest('.task');
    if (!li || li.dataset.id === dragId) return;
    e.preventDefault();
    const r = li.getBoundingClientRect();
    const before = e.clientY < r.top + r.height / 2;
    const from = dragId;
    dragId = null; /* the dragged node is replaced on render, so dragend won't reach us */
    moveTask(from, li.dataset.id, before);
  });
  listEl.addEventListener('dragend', () => {
    dragId = null;
    $$('.task').forEach((el) => { el.classList.remove('dragging'); el.draggable = false; });
    clearDrop();
  });

  /* ---------------------------------------------------------
     Focus timer wiring
  --------------------------------------------------------- */
  function startFocusOn(id) {
    timer.taskId = id;
    if (timer.mode !== 'focus') setMode('focus');
    renderFocusTasks();
    if (!timer.running) startTimer();
    const t = byId(id);
    toast(`Focusing on "${t.title}".`);
  }

  $('#startBtn').addEventListener('click', toggleTimer);
  $('#resetBtn').addEventListener('click', resetTimer);
  $('#modeFocus').addEventListener('click', () => setMode('focus'));
  $('#modeBreak').addEventListener('click', () => setMode('break'));
  $('#focusTask').addEventListener('change', (e) => { timer.taskId = e.target.value; });
  $('#focusLen').addEventListener('change', (e) => { state.settings.focusMin = +e.target.value; save(); if (timer.mode === 'focus') setMode('focus'); });
  $('#breakLen').addEventListener('change', (e) => { state.settings.breakMin = +e.target.value; save(); if (timer.mode === 'break') setMode('break'); });

  /* ---------------------------------------------------------
     Sidebar, search, sort
  --------------------------------------------------------- */
  function setView(v) {
    state.ui.view = v;
    save();
    render();
    closeNav();
  }
  const closeNav = () => document.body.classList.remove('nav-open');

  $('#viewNav').addEventListener('click', (e) => {
    const b = e.target.closest('[data-view]');
    if (b) setView(b.dataset.view);
  });
  $('#subjectList').addEventListener('click', (e) => {
    const ed = e.target.closest('[data-edit-subject]');
    if (ed) { openSubjectDialog(ed.dataset.editSubject); return; }
    const b = e.target.closest('[data-subject]');
    if (b) { state.ui.subject = b.dataset.subject || null; save(); render(); closeNav(); }
  });
  $('#subline').addEventListener('click', (e) => {
    if (e.target.closest('[data-clear-subject]')) { state.ui.subject = null; save(); render(); }
  });
  $('#addSubject').addEventListener('click', () => openSubjectDialog(null));
  $('#menuBtn').addEventListener('click', () => document.body.classList.add('nav-open'));
  $('#scrim').addEventListener('click', closeNav);

  $('#search').addEventListener('input', (e) => { search = e.target.value.trim(); renderHead(); renderList(); });
  $('#sortSel').addEventListener('change', (e) => { state.ui.sort = e.target.value; save(); renderHead(); renderList(); });

  /* ---------------------------------------------------------
     Theme, backup, housekeeping
  --------------------------------------------------------- */
  const mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  function applyTheme() {
    const th = state.settings.theme || (mq && mq.matches ? 'dark' : 'light');
    document.documentElement.dataset.theme = th;
  }
  function toggleTheme() {
    state.settings.theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    save(); applyTheme(); renderSidebar();
  }
  if (mq && mq.addEventListener) mq.addEventListener('change', () => { if (!state.settings.theme) { applyTheme(); renderSidebar(); } });
  $('#themeBtn').addEventListener('click', toggleTheme);

  $('#exportBtn').addEventListener('click', () => {
    const payload = { app: 'study-desk', version: 1, exportedAt: new Date().toISOString(), tasks: state.tasks, subjects: state.subjects, log: state.log, focusLog: state.focusLog, settings: state.settings };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url; a.download = `study-desk-${today()}.json`;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('Backup downloaded.');
  });

  $('#importBtn').addEventListener('click', () => $('#importFile').click());
  $('#importFile').addEventListener('change', (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const p = JSON.parse(reader.result);
        if (!p || !Array.isArray(p.tasks)) throw new Error('bad file');
        snapshot();
        state.tasks = p.tasks.map(normTask);
        if (Array.isArray(p.subjects)) state.subjects = p.subjects;
        state.log = p.log || {};
        state.focusLog = p.focusLog || {};
        state.ui.subject = null;
        commit();
        toast(`Imported ${state.tasks.length} tasks.`, { action: 'Undo', fn: undo });
      } catch (err) {
        toast('That file is not a Study Desk backup.');
      }
    };
    reader.readAsText(file);
  });

  $('#clearDoneBtn').addEventListener('click', () => {
    const n = state.tasks.filter((t) => t.done).length;
    if (!n) { toast('No completed tasks to clear.'); return; }
    snapshot();
    state.tasks = state.tasks.filter((t) => !t.done);
    commit();
    toast(`Cleared ${n} completed ${n === 1 ? 'task' : 'tasks'}.`, { action: 'Undo', fn: undo });
  });

  $('#helpBtn').addEventListener('click', () => helpDlg.showModal());

  /* ---------------------------------------------------------
     Keyboard shortcuts
  --------------------------------------------------------- */
  document.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const tag = (e.target.tagName || '').toLowerCase();
    const typing = ['input', 'textarea', 'select'].includes(tag) || e.target.isContentEditable;
    if (e.key === 'Escape') {
      if (typing) e.target.blur();
      closeNav();
      return;
    }
    if (typing || document.querySelector('dialog[open]')) return;
    switch (e.key) {
      case 'n': case 'N': e.preventDefault(); quickInput.focus(); break;
      case '/': e.preventDefault(); $('#search').focus(); break;
      case '?': helpDlg.showModal(); break;
      case 't': case 'T': toggleTheme(); break;
      case 'f': case 'F': toggleTimer(); break;
      case '1': case '2': case '3': case '4': setView(VIEW_ORDER[+e.key - 1]); break;
      default: break;
    }
  });

  /* Refresh when the date rolls over (left open overnight) */
  let lastDay = today();
  setInterval(() => { if (today() !== lastDay) { lastDay = today(); render(); } }, 30000);

  /* Recompute the timer when the tab wakes up */
  document.addEventListener('visibilitychange', () => { if (!document.hidden && timer.running) tick(); });

  /* ---------------------------------------------------------
     Boot
  --------------------------------------------------------- */
  paintIcons();
  applyTheme();
  timer.total = state.settings.focusMin * 60;
  timer.remaining = timer.total;
  render();
})();
