/**
 * 秘密基地後台（兩人專用）
 * ------------------------------------------------------------
 * 這個檔案跟 google-apps-script.gs 放在「同一個」Apps Script 專案裡
 * （在 Apps Script 編輯器左側按「＋」→「指令碼」新增一個檔案，貼上這份內容）。
 *
 * 所有 action 都以 couple_ 開頭，由 google-apps-script.gs 的 doGet 轉進來。
 * 舊的兔兔信箱功能完全不受影響。
 */

// ===== 1) 兩個人的密碼（第一次部署前請改掉！）=====
// a = 你，b = 女朋友。密碼建議 4~6 位數字。
// 部署後也可以到「專案設定 → 指令碼屬性」新增 pin_a / pin_b 來覆蓋這裡的值。
const COUPLE_DEFAULT_PINS = {
  a: '0000',
  b: '1111'
};

const COUPLE_TZ = 'Asia/Taipei';

const SECRET_ANSWERS_SHEET = 'secret_answers';
const SECRET_ANSWERS_HEADER = ['date', 'user', 'answer', 'answeredAt'];

const COUPLE_LISTS = {
  places: {
    sheet: 'places',
    header: ['id', 'name', 'url', 'note', 'addedBy', 'createdAt', 'done', 'review', 'rating', 'doneAt'],
    editable: ['name', 'url', 'note', 'done', 'review', 'rating', 'doneAt']
  },
  countries: {
    sheet: 'countries',
    header: ['id', 'name', 'flag', 'status', 'note', 'visitedDate', 'addedBy', 'createdAt'],
    editable: ['name', 'flag', 'status', 'note', 'visitedDate']
  }
};

// ===== 2) 交換秘密題庫 =====
// 每天依日期輪流出一題，兩個人看到的一定是同一題。
// 想加題目直接往下加就好（加在最後面，才不會打亂以前的題目）。
const SECRET_QUESTIONS = [
  // 回憶
  '你第一次覺得「完了，我喜歡上對方了」是什麼時候？',
  '我們第一次約會，你印象最深的是什麼？',
  '有沒有哪一天，你回家後一直偷笑想著我？是哪一天？',
  '你記得我們第一次牽手的情況嗎？描述一下。',
  '認識我之前，你想像中的另一半是什麼樣子？',
  '在一起之後，你最常偷偷回想的一個畫面是什麼？',
  '我們吵過最好笑的一次架是什麼？',
  '你第一次見到我的時候，第一印象是什麼？（要誠實）',
  '我們一起去過的地方，你最想再去一次的是哪裡？',
  '你最喜歡我們的哪一張合照？為什麼？',
  '我做過最讓你感動的一件小事是什麼？',
  '有沒有一句我說過的話，你到現在都還記得？',
  '你覺得我們最有默契的一次是什麼時候？',
  '和兔兔有關的回憶裡，你最常想起的是哪一個畫面？',
  '兔兔做過最好笑的蠢事是什麼？',
  // 日常
  '最近有什麼小事讓你覺得很幸福？',
  '如果明天可以請一天假只陪對方，你想怎麼過？',
  '你最喜歡我穿哪一件衣服？',
  '我身上有什麼小習慣，是你偷偷覺得很可愛的？',
  '最近有沒有什麼事想跟我說，但一直沒說出口？',
  '你覺得我最近最辛苦的是什麼事？',
  '你最喜歡我們一起吃的哪一道料理？',
  '如果今天晚餐由你決定，你會選什麼？',
  '你心情不好的時候，最希望我怎麼做？',
  '你最喜歡我叫你的哪一個稱呼？',
  '我做什麼事的時候，你覺得我最帥／最美？',
  '最近一次因為我而笑出來是什麼事？',
  '你覺得我們兩個最像的地方是什麼？',
  '你覺得我們兩個最不一樣的地方是什麼？',
  '有沒有什麼事，你很想跟我一起學？',
  // 未來
  '五年後的今天，你希望我們在做什麼？',
  '如果可以和我一起住在任何一個國家，你會選哪裡？',
  '你夢想中我們的家，一定要有什麼？',
  '如果我們存到一筆錢，你第一個想拿去做什麼？',
  '有沒有一個地方，你想等「某個特別的日子」再跟我一起去？',
  '你覺得我們老了以後會是什麼樣子？',
  '未來如果再養一隻小動物，你想取什麼名字？',
  '今年結束前，你最想跟我一起完成的一件事？',
  '如果可以和我一起挑戰一件瘋狂的事，你會選什麼？',
  '你希望我們每年都一定要做的一件事是什麼？',
  // 有點害羞
  '你最喜歡我身上的哪個部位？',
  '你覺得我什麼時候最讓你心動？',
  '有沒有什麼時候你超想抱我，但沒有說？',
  '說一個你從來沒跟我說過的小秘密。',
  '如果用三個詞形容我，你會選哪三個？',
  '你偷偷吃過我的醋嗎？是什麼時候？',
  '你覺得我們之間最浪漫的一刻是什麼？',
  '如果現在可以傳一句話給一年前的我，你會說什麼？',
  '你最想再聽我說一次的一句話是什麼？',
  '說一件你覺得「只有我們兩個知道」的事。',
  // 輕鬆好玩
  '如果我變成一種動物，你覺得我會是什麼？',
  '如果我們兩個一起開一間店，你想開什麼店？',
  '如果我們的愛情是一部電影，片名叫什麼？',
  '你覺得我在殭屍末日裡能活多久？',
  '如果只能帶一樣東西跟我去無人島，你帶什麼？',
  '如果交換身體一天，你最想用我的身體做什麼？',
  '我們兩個誰比較會撒嬌？舉個例子。',
  '如果幫我們的秘密基地取一個新名字，你會取什麼？',
  '你覺得兔兔在彩虹星球上，現在每天都在幹嘛？',
  '用一個 emoji 形容今天的你，為什麼？'
];

// ============================================================
// 入口：由 google-apps-script.gs 的 doGet 呼叫
// ============================================================
function handleCoupleAction(action, params) {
  if (action === 'couple_ping') {
    return jsonResponse({ ok: true, service: 'secret-base', version: 1 });
  }

  const user = sanitizeText(params.user || '', 2);
  const pin = sanitizeText(params.pin || '', 20);
  if (!isCoupleAuthValid(user, pin)) {
    return jsonResponse({ ok: false, error: 'unauthorized' }, 403);
  }

  switch (action) {
    case 'couple_login':
      return jsonResponse({ ok: true, user: user, today: coupleToday() });
    case 'couple_secret_today':
      return jsonResponse(Object.assign({ ok: true }, getSecretForDate(coupleToday(), user)));
    case 'couple_secret_get':
      return coupleSecretGet(params, user);
    case 'couple_secret_answer':
      return coupleSecretAnswer(params, user);
    case 'couple_secret_history':
      return coupleSecretHistory(params, user);
    case 'couple_list_get':
      return coupleListGet(params);
    case 'couple_list_add':
      return coupleListAdd(params, user);
    case 'couple_list_update':
      return coupleListUpdate(params);
    case 'couple_list_delete':
      return coupleListDelete(params);
    default:
      return jsonResponse({ ok: false, error: 'unknown-action' }, 400);
  }
}

// ===== 驗證 =====
function getCouplePin(user) {
  const saved = PropertiesService.getScriptProperties().getProperty('pin_' + user);
  return saved || COUPLE_DEFAULT_PINS[user] || '';
}

function isCoupleAuthValid(user, pin) {
  if (user !== 'a' && user !== 'b') return false;
  const expected = getCouplePin(user);
  return !!expected && pin === expected;
}

function partnerOf(user) {
  return user === 'a' ? 'b' : 'a';
}

// ===== 日期與題目 =====
function coupleToday() {
  return Utilities.formatDate(new Date(), COUPLE_TZ, 'yyyy-MM-dd');
}

function isValidDateKey(dateKey) {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateKey);
}

function questionForDate(dateKey) {
  const parts = dateKey.split('-').map(Number);
  const dayNumber = Math.floor(Date.UTC(parts[0], parts[1] - 1, parts[2]) / 86400000);
  const index = ((dayNumber % SECRET_QUESTIONS.length) + SECRET_QUESTIONS.length) % SECRET_QUESTIONS.length;
  return SECRET_QUESTIONS[index];
}

// ===== 交換秘密 =====
const CACHE_KEY_ANSWERS = 'couple_answers_cache';

function readAllAnswers() {
  try {
    const cache = CacheService.getScriptCache();
    const cached = cache.get(CACHE_KEY_ANSWERS);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (_) {}

  const sheet = getOrCreateSheet(SECRET_ANSWERS_SHEET, SECRET_ANSWERS_HEADER);
  const rows = sheet.getDataRange().getValues().slice(1);
  const answers = rows.map(function (row) {
    return {
      date: normalizeDateCell(row[0]),
      user: String(row[1] || ''),
      answer: String(row[2] || ''),
      answeredAt: String(row[3] || '')
    };
  });

  try {
    CacheService.getScriptCache().put(CACHE_KEY_ANSWERS, JSON.stringify(answers), 21600);
  } catch (_) {}

  return answers;
}

function normalizeDateCell(value) {
  if (value instanceof Date) {
    return Utilities.formatDate(value, COUPLE_TZ, 'yyyy-MM-dd');
  }
  return String(value || '');
}

/**
 * 核心規則：自己回答過，才拿得到對方的答案。
 * 對方的答案只有在這裡、條件成立時才會被放進回傳資料。
 */
function buildSecretView(dateKey, user, answers) {
  const mine = answers.filter(function (a) { return a.date === dateKey && a.user === user; })[0];
  const theirs = answers.filter(function (a) { return a.date === dateKey && a.user === partnerOf(user); })[0];

  const view = {
    date: dateKey,
    question: questionForDate(dateKey),
    myAnswer: mine ? mine.answer : null,
    myAnsweredAt: mine ? mine.answeredAt : null,
    partnerAnswered: !!theirs,
    partnerAnswer: null,
    partnerAnsweredAt: null
  };

  if (mine && theirs) {
    view.partnerAnswer = theirs.answer;
    view.partnerAnsweredAt = theirs.answeredAt;
  }
  return view;
}

function getSecretForDate(dateKey, user) {
  return buildSecretView(dateKey, user, readAllAnswers());
}

function coupleSecretGet(params, user) {
  const dateKey = sanitizeText(params.date || '', 10);
  if (!isValidDateKey(dateKey) || dateKey > coupleToday()) {
    return jsonResponse({ ok: false, error: 'invalid-date' }, 400);
  }
  return jsonResponse(Object.assign({ ok: true }, getSecretForDate(dateKey, user)));
}

function coupleSecretAnswer(params, user) {
  const dateKey = sanitizeText(params.date || coupleToday(), 10);
  const answer = sanitizeText(params.answer || '', 1000);

  if (!isValidDateKey(dateKey) || dateKey > coupleToday()) {
    return jsonResponse({ ok: false, error: 'invalid-date' }, 400);
  }
  if (!answer) {
    return jsonResponse({ ok: false, error: 'answer-required' }, 400);
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const answers = readAllAnswers();
    const already = answers.some(function (a) { return a.date === dateKey && a.user === user; });
    if (already) {
      // 交出去就不能改，避免看完對方答案再修改
      return jsonResponse({ ok: false, error: 'already-answered' }, 409);
    }
    const sheet = getOrCreateSheet(SECRET_ANSWERS_SHEET, SECRET_ANSWERS_HEADER);
    const now = new Date().toISOString();
    // 日期前面加 ' 讓試算表當成文字，不會被自動轉成日期格式
    sheet.appendRow(["'" + dateKey, user, answer, now]);
    answers.push({ date: dateKey, user: user, answer: answer, answeredAt: now });
    try {
      CacheService.getScriptCache().put(CACHE_KEY_ANSWERS, JSON.stringify(answers), 21600);
    } catch (_) {}
    return jsonResponse(Object.assign({ ok: true }, buildSecretView(dateKey, user, answers)));
  } finally {
    lock.releaseLock();
  }
}

function coupleSecretHistory(params, user) {
  const limitValue = parseInt(sanitizeText(params.limit || '60', 4), 10);
  const limit = Number.isNaN(limitValue) ? 60 : Math.max(1, Math.min(limitValue, 365));
  const answers = readAllAnswers();
  const today = coupleToday();

  const dateSet = {};
  answers.forEach(function (a) {
    if (isValidDateKey(a.date) && a.date <= today) dateSet[a.date] = true;
  });

  const items = Object.keys(dateSet)
    .sort()
    .reverse()
    .slice(0, limit)
    .map(function (dateKey) { return buildSecretView(dateKey, user, answers); });

  return jsonResponse({ ok: true, today: today, items: items });
}

// ===== 清單（美食、國家）=====
function getListConfig(params) {
  const type = sanitizeText(params.type || '', 20);
  return COUPLE_LISTS[type] ? { type: type, conf: COUPLE_LISTS[type] } : null;
}

function rowToItem(header, row) {
  const item = {};
  header.forEach(function (key, i) {
    const value = row[i];
    if (key === 'done') {
      item[key] = value === true || value === 'TRUE' || value === 'true';
    } else if (key === 'rating') {
      item[key] = Number(value) || 0;
    } else if (value instanceof Date) {
      item[key] = Utilities.formatDate(value, COUPLE_TZ, 'yyyy-MM-dd');
    } else {
      item[key] = String(value === undefined || value === null ? '' : value);
    }
  });
  return item;
}

function parseFields(params) {
  try {
    const parsed = JSON.parse(params.fields || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (_) {
    return {};
  }
}

function cleanFieldValue(key, value) {
  if (key === 'done') return value === true || value === 'true';
  if (key === 'rating') return Math.max(0, Math.min(5, parseInt(value, 10) || 0));
  if (key === 'url') {
    const url = sanitizeText(value, 1000);
    return /^https?:\/\//i.test(url) ? url : '';
  }
  return sanitizeText(value, key === 'note' || key === 'review' ? 1000 : 200);
}

function coupleListGet(params) {
  const list = getListConfig(params);
  if (!list) return jsonResponse({ ok: false, error: 'invalid-type' }, 400);
  const sheet = getOrCreateSheet(list.conf.sheet, list.conf.header);
  const items = sheet.getDataRange().getValues().slice(1)
    .filter(function (row) { return row[0]; })
    .map(function (row) { return rowToItem(list.conf.header, row); });
  items.reverse();
  return jsonResponse({ ok: true, type: list.type, items: items });
}

function coupleListAdd(params, user) {
  const list = getListConfig(params);
  if (!list) return jsonResponse({ ok: false, error: 'invalid-type' }, 400);
  const fields = parseFields(params);
  const name = cleanFieldValue('name', fields.name || '');
  if (!name) return jsonResponse({ ok: false, error: 'name-required' }, 400);

  const item = {};
  list.conf.header.forEach(function (key) { item[key] = ''; });
  list.conf.editable.forEach(function (key) {
    if (fields[key] !== undefined) item[key] = cleanFieldValue(key, fields[key]);
  });
  item.id = (list.type === 'places' ? 'P_' : 'C_') + new Date().getTime();
  item.name = name;
  item.addedBy = user;
  item.createdAt = new Date().toISOString();
  if (list.type === 'places') {
    item.done = item.done === true;
    item.rating = item.rating || 0;
  }
  if (list.type === 'countries' && !item.status) item.status = 'dream';

  const sheet = getOrCreateSheet(list.conf.sheet, list.conf.header);
  sheet.appendRow(list.conf.header.map(function (key) { return item[key]; }));
  return jsonResponse({ ok: true, item: item });
}

function findRowIndexById(sheet, id) {
  const ids = sheet.getRange(1, 1, Math.max(sheet.getLastRow(), 1), 1).getValues();
  for (let i = 1; i < ids.length; i++) {
    if (String(ids[i][0]) === id) return i + 1; // 1-based row number
  }
  return -1;
}

function coupleListUpdate(params) {
  const list = getListConfig(params);
  if (!list) return jsonResponse({ ok: false, error: 'invalid-type' }, 400);
  const id = sanitizeText(params.id || '', 40);
  const fields = parseFields(params);

  const sheet = getOrCreateSheet(list.conf.sheet, list.conf.header);
  const rowIndex = findRowIndexById(sheet, id);
  if (rowIndex < 0) return jsonResponse({ ok: false, error: 'not-found' }, 404);

  const range = sheet.getRange(rowIndex, 1, 1, list.conf.header.length);
  const row = range.getValues()[0];
  list.conf.editable.forEach(function (key) {
    if (fields[key] !== undefined) {
      row[list.conf.header.indexOf(key)] = cleanFieldValue(key, fields[key]);
    }
  });
  range.setValues([row]);
  return jsonResponse({ ok: true, item: rowToItem(list.conf.header, row) });
}

function coupleListDelete(params) {
  const list = getListConfig(params);
  if (!list) return jsonResponse({ ok: false, error: 'invalid-type' }, 400);
  const id = sanitizeText(params.id || '', 40);
  const sheet = getOrCreateSheet(list.conf.sheet, list.conf.header);
  const rowIndex = findRowIndexById(sheet, id);
  if (rowIndex < 0) return jsonResponse({ ok: false, error: 'not-found' }, 404);
  sheet.deleteRow(rowIndex);
  return jsonResponse({ ok: true, id: id });
}
