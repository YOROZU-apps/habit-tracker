// ---- スタンプの定義 ----
// アプリを開くこと自体も習慣の一つ。開いた日は必ずスタンプが付く。
const STAMPS = {
  check: {
    name: '習慣チェック完了',
    desc: 'アプリを開いた',
    svg: '<svg viewBox="0 0 24 24"><path d="M6 12.5l4 4 8-9"/></svg>',
  },
  star: {
    name: '習慣クリア',
    desc: '登録した習慣を1つ以上できた',
    svg: '<svg viewBox="0 0 24 24"><path d="M12 3.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.8l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z"/></svg>',
  },
  crown: {
    name: '全部達成！',
    desc: '登録した習慣を全部できた',
    svg: '<svg viewBox="0 0 24 24"><path d="M4.5 18h15M5 18L3.5 8.5l5 3.5L12 5.5l3.5 6.5 5-3.5L19 18"/></svg>',
  },
};

// ---- メッセージ ----
const WELCOME = { title: 'ようこそ！全ては今日ここから。さあ始めよう' };
const COMEBACK = { title: 'おかえり！大丈夫！ここから始めよう！' };
const MILESTONES = {
  7: {
    title: '1週間達成！すばらしい！！この調子！',
    quote: '千里の行も足下に始まる',
    note: '千里の道のりも、足もとの一歩から始まる',
    by: '『老子』第六十四章',
  },
  30: {
    title: '30日達成！！もう立派な習慣だ！！',
    quote: 'これを知る者はこれを好む者に如かず。これを好む者はこれを楽しむ者に如かず',
    note: '知っている人は好きな人にかなわない。好きな人は楽しんでいる人にかなわない',
    by: '孔子『論語』雍也篇',
  },
  100: {
    title: '100日達成！！！あなたは本物だ！！',
    quote: '小さいことを積み重ねることが、とんでもないところへ行くただひとつの道だと思っています',
    by: 'イチロー（2004年、メジャーリーグ年間最多安打記録を更新した際の会見より）',
  },
};

// ---- 日付ユーティリティ（ローカル時刻） ----
const pad = (n) => String(n).padStart(2, '0');
const toKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
function addDays(key, n) {
  const [y, m, d] = key.split('-').map(Number);
  return toKey(new Date(y, m - 1, d + n));
}
const todayKey = toKey(new Date());

// ---- データ保存（各自のブラウザの localStorage） ----
// data = { habits: [{id, name}], days: { 'YYYY-MM-DD': { visited: bool, done: [habitId...] } } }
// visited: その日にアプリを開いた、または後から記録を編集したか（スタンプは visited の日だけ付く）
const STORAGE_KEY = 'habit-tracker:data';
const isDemo = new URLSearchParams(location.search).has('demo');
let storageOk = true;

function emptyData() {
  return { habits: [], days: {} };
}

// 読み込んだデータの形を確かめ、不正な部分は捨てる（バックアップの読み込みにも使う）
function normalize(raw) {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.habits) || typeof raw.days !== 'object') {
    throw new Error('習慣トラッカーのデータではありません');
  }
  const habits = raw.habits
    .filter((h) => h && typeof h.id === 'string' && typeof h.name === 'string')
    .map((h) => ({ id: h.id, name: h.name.slice(0, 40) }));
  const days = {};
  for (const [k, v] of Object.entries(raw.days || {})) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(k) || !v || typeof v !== 'object') continue;
    days[k] = {
      visited: !!v.visited,
      done: Array.isArray(v.done) ? v.done.filter((id) => typeof id === 'string') : [],
    };
  }
  return { habits, days };
}

function loadData() {
  if (isDemo) return demoData();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? normalize(JSON.parse(raw)) : emptyData();
  } catch {
    storageOk = false;
    return emptyData();
  }
}

// お試しモードでは保存しない
function saveData() {
  if (isDemo) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    storageOk = false;
    renderStorageWarning();
  }
}

const newId = () =>
  crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

function getDay(date) {
  if (!state.days[date]) state.days[date] = { visited: false, done: [] };
  return state.days[date];
}

// ---- 操作 ----
function visit(date) {
  getDay(date).visited = true;
  saveData();
}

function addHabit(name) {
  state.habits.push({ id: newId(), name: name.slice(0, 40) });
  saveData();
  render();
}

function deleteHabit(id) {
  state.habits = state.habits.filter((h) => h.id !== id);
  saveData();
  render();
}

// 過去の日も編集可。編集した日にはスタンプが付き、継続日数もつながる
function toggleHabit(date, habitId) {
  const day = getDay(date);
  day.visited = true;
  day.done = day.done.includes(habitId) ? day.done.filter((id) => id !== habitId) : [...day.done, habitId];
  saveData();
  render();
}

// ---- お試しモード用のサンプルデータ ----
// 昨日まで6日連続 → 開いた瞬間に「7日達成」のお祝いが見られる
function demoData() {
  const habits = [
    { id: 'd1', name: '読書10分' },
    { id: 'd2', name: 'ストレッチ' },
    { id: 'd3', name: '水を1杯飲む' },
  ];
  const pattern = {
    1: ['d1', 'd2', 'd3'],
    2: ['d1'],
    3: [],
    4: ['d1', 'd3'],
    5: ['d1', 'd2', 'd3'],
    6: ['d2'],
    9: ['d1', 'd2', 'd3'],
    10: ['d3'],
    11: [],
  };
  const days = {};
  for (const [ago, done] of Object.entries(pattern)) {
    days[addDays(todayKey, -Number(ago))] = { visited: true, done };
  }
  return { habits, days };
}

// ---- 状態 ----
let state = loadData();
let selectedKey = todayKey;
let viewYear = new Date().getFullYear();
let viewMonth = new Date().getMonth();
let lastStampShown = null;

// 削除済みの習慣は数えない
function doneCountOf(day) {
  if (!day) return 0;
  const ids = new Set(state.habits.map((h) => h.id));
  return day.done.filter((id) => ids.has(id)).length;
}

const isVisited = (key) => !!(state.days[key] && state.days[key].visited);

// 開いても編集してもいない日はスタンプなし（null）
function stampTypeFor(day) {
  if (!day || !day.visited) return null;
  const done = doneCountOf(day);
  const total = state.habits.length;
  if (total > 0 && done >= total) return 'crown';
  if (done >= 1) return 'star';
  return 'check';
}

function stampEl(type) {
  const el = document.createElement('span');
  el.className = `stamp stamp-${type}`;
  el.innerHTML = STAMPS[type].svg;
  el.title = STAMPS[type].name;
  return el;
}

// ---- 継続日数 ----
function currentStreak() {
  let n = 0;
  for (let k = todayKey; isVisited(k); k = addDays(k, -1)) n++;
  return n;
}

function longestStreak() {
  const keys = Object.keys(state.days).filter(isVisited).sort();
  let best = 0;
  let run = 0;
  let prev = null;
  for (const k of keys) {
    run = prev && addDays(prev, 1) === k ? run + 1 : 1;
    best = Math.max(best, run);
    prev = k;
  }
  return best;
}

// ---- 描画 ----
function renderStreak() {
  document.getElementById('streak-count').textContent = currentStreak();
  document.getElementById('streak-best').textContent = longestStreak();
}

function renderDay() {
  const isToday = selectedKey === todayKey;
  const [, m, d] = selectedKey.split('-').map(Number);
  document.getElementById('day-title').textContent = isToday ? '今日の習慣' : `${m}月${d}日の習慣`;
  document.getElementById('day-label').textContent = isToday ? selectedKey.replace(/-/g, '/') : '（過去の記録を編集中）';
  document.getElementById('back-today').hidden = isToday;

  const day = state.days[selectedKey];
  const type = stampTypeFor(day);
  const stampBox = document.getElementById('day-stamp');
  stampBox.innerHTML = '';
  const note = document.getElementById('day-note');
  if (type) {
    const el = stampEl(type);
    const shownId = `${selectedKey}:${type}`;
    if (lastStampShown !== shownId) el.classList.add('pop');
    lastStampShown = shownId;
    stampBox.append(el);
    document.getElementById('day-stamp-name').textContent = `スタンプ：${STAMPS[type].name}`;
    note.hidden = true;
  } else {
    lastStampShown = null;
    document.getElementById('day-stamp-name').textContent = 'スタンプなし';
    note.textContent = 'この日はまだ記録がありません。習慣にチェックを付けるとスタンプが付きます。';
    note.hidden = false;
  }

  const list = document.getElementById('habit-list');
  list.innerHTML = '';
  if (state.habits.length === 0) {
    list.innerHTML = '<li class="empty">まだ習慣がありません。下から追加しましょう。</li>';
  }
  const doneIds = new Set(day ? day.done : []);
  for (const h of state.habits) {
    const li = document.createElement('li');
    const done = doneIds.has(h.id);
    li.className = done ? 'done' : '';

    const label = document.createElement('label');
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = done;
    cb.addEventListener('change', () => toggleHabit(selectedKey, h.id));
    const span = document.createElement('span');
    span.textContent = h.name;
    label.append(cb, span);

    const del = document.createElement('button');
    del.className = 'del';
    del.textContent = '✕';
    del.title = '削除';
    del.addEventListener('click', () => {
      if (confirm(`「${h.name}」を削除しますか？\n（過去の記録からも数えなくなります）`)) deleteHabit(h.id);
    });

    li.append(label, del);
    list.append(li);
  }
}

function renderCalendar() {
  document.getElementById('month-label').textContent = `${viewYear}年 ${viewMonth + 1}月`;
  const cal = document.getElementById('calendar');
  cal.innerHTML = '';

  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  for (let i = 0; i < firstWeekday; i++) {
    const blank = document.createElement('div');
    blank.className = 'day blank';
    cal.append(blank);
  }

  let stampCount = 0;
  let crownCount = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const key = toKey(new Date(viewYear, viewMonth, d));
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = 'day' + (key === todayKey ? ' today' : '') + (key === selectedKey ? ' selected' : '');
    cell.innerHTML = `<span class="num">${d}</span>`;
    if (key > todayKey) {
      cell.disabled = true;
    } else {
      cell.addEventListener('click', () => {
        selectedKey = key;
        render();
      });
    }

    const type = stampTypeFor(state.days[key]);
    if (type) {
      cell.append(stampEl(type));
      stampCount++;
      if (type === 'crown') crownCount++;
    }
    cal.append(cell);
  }

  document.getElementById('month-summary').textContent =
    `今月のスタンプ：${stampCount}個（うち王冠 ${crownCount}個）`;
}

function renderLegend() {
  const legend = document.getElementById('legend');
  legend.innerHTML = '';
  for (const type of ['check', 'star', 'crown']) {
    const li = document.createElement('li');
    const text = document.createElement('div');
    text.textContent = STAMPS[type].name;
    const small = document.createElement('small');
    small.textContent = STAMPS[type].desc;
    text.append(small);
    li.append(stampEl(type), text);
    legend.append(li);
  }
}

function renderStorageWarning() {
  document.getElementById('storage-warning').hidden = storageOk || isDemo;
}

function render() {
  renderStreak();
  renderDay();
  renderCalendar();
}

function showMessage(msg, milestone) {
  const box = document.getElementById('message');
  box.classList.toggle('milestone', !!milestone);
  document.getElementById('message-title').textContent = msg.title;
  const quote = document.getElementById('message-quote');
  quote.hidden = !msg.quote;
  if (msg.quote) {
    document.getElementById('message-quote-text').textContent = `「${msg.quote}」`;
    const note = document.getElementById('message-quote-note');
    note.textContent = msg.note || '';
    note.hidden = !msg.note;
    document.getElementById('message-quote-by').textContent = `— ${msg.by}`;
  }
  box.hidden = false;
}

// ---- バックアップ ----
function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `habit-tracker-backup-${todayKey}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

async function importData(file) {
  try {
    const data = normalize(JSON.parse(await file.text()));
    const days = Object.keys(data.days).length;
    if (!confirm(`習慣${data.habits.length}件・記録${days}日分を読み込みます。\n今のデータは上書きされます。よろしいですか？`)) return;
    state = data;
    visit(todayKey);
    selectedKey = todayKey;
    render();
    alert('読み込みました');
  } catch (e) {
    alert(`読み込めませんでした：${e.message}`);
  }
}

// ---- イベント ----
document.getElementById('habit-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const input = document.getElementById('habit-input');
  const name = input.value.trim();
  if (!name) return;
  input.value = '';
  addHabit(name);
});

document.getElementById('back-today').addEventListener('click', () => {
  selectedKey = todayKey;
  const now = new Date();
  viewYear = now.getFullYear();
  viewMonth = now.getMonth();
  render();
});
document.getElementById('message-close').addEventListener('click', () => {
  document.getElementById('message').hidden = true;
});
document.getElementById('prev').addEventListener('click', () => {
  viewMonth--;
  if (viewMonth < 0) { viewMonth = 11; viewYear--; }
  renderCalendar();
});
document.getElementById('next').addEventListener('click', () => {
  viewMonth++;
  if (viewMonth > 11) { viewMonth = 0; viewYear++; }
  renderCalendar();
});
document.getElementById('export').addEventListener('click', exportData);
document.getElementById('import').addEventListener('click', () => document.getElementById('import-file').click());
document.getElementById('import-file').addEventListener('change', (e) => {
  if (e.target.files[0]) importData(e.target.files[0]);
  e.target.value = '';
});

// ---- 起動：開いた時点で今日のスタンプを押し、その日最初の起動ならメッセージを出す ----
function start() {
  document.getElementById('demo-banner').hidden = !isDemo;
  document.getElementById('data-section').hidden = isDemo;
  renderLegend();
  renderStorageWarning();

  const firstOpenToday = !isVisited(todayKey);
  const usedBefore = Object.keys(state.days).some((k) => isVisited(k) && k !== todayKey);
  visit(todayKey);
  render();

  if (!firstOpenToday) return;
  const streak = currentStreak();
  if (!usedBefore) showMessage(WELCOME);
  else if (MILESTONES[streak]) showMessage(MILESTONES[streak], true);
  else if (!isVisited(addDays(todayKey, -1))) showMessage(COMEBACK);
}

start();

// ホーム画面に追加したときのオフライン対応
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
