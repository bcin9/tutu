/**
 * 後台連線
 * ------------------------------------------------------------
 * 正式模式：呼叫 Apps Script（couple_ 開頭的 action）。
 * 試玩模式：網址加上 ?demo=1，資料只存在這台裝置的瀏覽器裡，
 *           不會碰到正式後台，方便你在電腦上先看效果。
 *           試玩密碼：a = 0000、b = 1111
 */
(function () {
  const CONFIG = window.BASE_CONFIG;
  const AUTH_KEY = 'base_auth';

  if (new URLSearchParams(location.search).get('demo') === '1') {
    sessionStorage.setItem('base_demo', '1');
  }
  const isDemo = sessionStorage.getItem('base_demo') === '1';

  // ===== 登入狀態 =====
  function getAuth() {
    try {
      const auth = JSON.parse(localStorage.getItem(AUTH_KEY) || 'null');
      return auth && auth.user && auth.pin ? auth : null;
    } catch (_) {
      return null;
    }
  }

  function setAuth(user, pin) {
    localStorage.setItem(AUTH_KEY, JSON.stringify({ user, pin }));
  }

  function clearAuth() {
    localStorage.removeItem(AUTH_KEY);
  }

  // ===== 正式後台 =====
  async function callRemote(action, params) {
    const query = new URLSearchParams(Object.assign({ action, t: String(Date.now()) }, params));
    const response = await fetch(`${CONFIG.api}?${query.toString()}`, { cache: 'no-store' });
    const data = await response.json();
    if (!data.ok) {
      const error = new Error(data.error || 'request-failed');
      error.code = data.error;
      throw error;
    }
    return data;
  }

  // ===== 試玩模式（假後台）=====
  const demoStore = {
    read(key, fallback) {
      try { return JSON.parse(localStorage.getItem('base_demo_' + key)) || fallback; } catch (_) { return fallback; }
    },
    write(key, value) {
      localStorage.setItem('base_demo_' + key, JSON.stringify(value));
    }
  };
  const DEMO_PINS = { a: '0819', b: '0410' };
  const DEMO_QUESTIONS = [
    '你第一次覺得「完了，我喜歡上對方了」是什麼時候？',
    '最近有什麼小事讓你覺得很幸福？',
    '五年後的今天，你希望我們在做什麼？',
    '兔兔做過最好笑的蠢事是什麼？',
    '說一個你從來沒跟我說過的小秘密。'
  ];

  function demoToday() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function demoQuestion(dateKey) {
    const [y, m, d] = dateKey.split('-').map(Number);
    const n = Math.floor(Date.UTC(y, m - 1, d) / 86400000);
    return DEMO_QUESTIONS[n % DEMO_QUESTIONS.length];
  }

  function demoSecretView(dateKey, user, answers) {
    const partner = user === 'a' ? 'b' : 'a';
    const mine = answers.find(a => a.date === dateKey && a.user === user);
    const theirs = answers.find(a => a.date === dateKey && a.user === partner);
    return {
      date: dateKey,
      question: demoQuestion(dateKey),
      myAnswer: mine ? mine.answer : null,
      myAnsweredAt: mine ? mine.answeredAt : null,
      partnerAnswered: !!theirs,
      partnerAnswer: mine && theirs ? theirs.answer : null,
      partnerAnsweredAt: mine && theirs ? theirs.answeredAt : null
    };
  }

  async function callDemo(action, params) {
    await new Promise(r => setTimeout(r, 250));
    const { user, pin } = params;
    if (DEMO_PINS[user] !== pin) {
      const error = new Error('unauthorized');
      error.code = 'unauthorized';
      throw error;
    }
    const answers = demoStore.read('answers', []);
    const today = demoToday();

    switch (action) {
      case 'couple_login':
        return { ok: true, user, today };
      case 'couple_secret_today':
        return Object.assign({ ok: true }, demoSecretView(today, user, answers));
      case 'couple_secret_get':
        return Object.assign({ ok: true }, demoSecretView(params.date, user, answers));
      case 'couple_secret_answer': {
        const date = params.date || today;
        if (answers.some(a => a.date === date && a.user === user)) {
          const error = new Error('already-answered');
          error.code = 'already-answered';
          throw error;
        }
        answers.push({ date, user, answer: params.answer, answeredAt: new Date().toISOString() });
        demoStore.write('answers', answers);
        return Object.assign({ ok: true }, demoSecretView(date, user, answers));
      }
      case 'couple_secret_history': {
        const dates = [...new Set(answers.map(a => a.date))].sort().reverse();
        return { ok: true, today, items: dates.map(d => demoSecretView(d, user, answers)) };
      }
      case 'couple_list_get': {
        let items = demoStore.read('list_' + params.type, []);
        return { ok: true, type: params.type, items: items };
      }
      case 'couple_list_add': {
        const items = demoStore.read('list_' + params.type, []);
        const fields = JSON.parse(params.fields || '{}');
        const item = Object.assign({
          id: (params.type === 'todo' ? 'T_' : 'P_') + Date.now(),
          addedBy: user,
          createdAt: new Date().toISOString(),
          done: false,
          rating: 0
        }, fields);
        items.unshift(item);
        demoStore.write('list_' + params.type, items);
        return { ok: true, item };
      }
      case 'couple_list_update': {
        const items = demoStore.read('list_' + params.type, []);
        const item = items.find(i => i.id === params.id);
        Object.assign(item, JSON.parse(params.fields || '{}'));
        demoStore.write('list_' + params.type, items);
        return { ok: true, item };
      }
      case 'couple_list_delete': {
        const items = demoStore.read('list_' + params.type, []).filter(i => i.id !== params.id);
        demoStore.write('list_' + params.type, items);
        return { ok: true, id: params.id };
      }
      case 'couple_gacha_state': {
        const likes = demoStore.read('gacha_likes', []);
        const matches = demoStore.read('gacha_matches', []);
        const partner = user === 'a' ? 'b' : 'a';
        return {
          ok: true,
          user,
          myLikes: likes.filter(l => l.user === user).map(l => l.ideaId),
          partnerLikes: likes.filter(l => l.user === partner).map(l => l.ideaId),
          matches
        };
      }
      case 'couple_gacha_like': {
        let likes = demoStore.read('gacha_likes', []);
        let matches = demoStore.read('gacha_matches', []);
        const partner = user === 'a' ? 'b' : 'a';
        const ideaId = params.ideaId;
        const now = new Date().toISOString();

        if (!likes.some(l => l.ideaId === ideaId && l.user === user)) {
          likes.push({ ideaId, user, likedAt: now });
          demoStore.write('gacha_likes', likes);
        }

        const partnerLiked = likes.some(l => l.ideaId === ideaId && l.user === partner);
        let match = null;
        if (partnerLiked) {
          match = matches.find(m => m.ideaId === ideaId);
          if (!match) {
            match = { ideaId, matchedAt: now, status: 'pending', target: '' };
            matches.push(match);
            demoStore.write('gacha_matches', matches);
          }
        }
        return { ok: true, ideaId, matched: !!partnerLiked, match };
      }
      case 'couple_gacha_update_match': {
        let matches = demoStore.read('gacha_matches', []);
        const fields = JSON.parse(params.fields || '{}');
        const match = matches.find(m => m.ideaId === params.ideaId);
        if (match) {
          Object.assign(match, fields);
          demoStore.write('gacha_matches', matches);
        }
        return { ok: true };
      }
      default:
        throw new Error('unknown-action');
    }
  }

  // ===== 對外介面 =====
  async function call(action, params = {}, authOverride) {
    const auth = authOverride || getAuth();
    const merged = Object.assign({}, params, auth ? { user: auth.user, pin: auth.pin } : {});
    return isDemo ? callDemo(action, merged) : callRemote(action, merged);
  }

  window.BaseAPI = {
    isDemo,
    getAuth,
    clearAuth,

    async login(user, pin) {
      const data = await call('couple_login', {}, { user, pin });
      if (data.user !== user) {
        // 後台還是舊版（沒有 couple_login），會回傳沒有 user 的資料
        const error = new Error('backend-outdated');
        error.code = 'backend-outdated';
        throw error;
      }
      setAuth(user, pin);
      return data;
    },

    secretToday: () => call('couple_secret_today'),
    secretGet: date => call('couple_secret_get', { date }),
    secretAnswer: (date, answer) => call('couple_secret_answer', { date, answer }),
    secretHistory: (limit = 60) => call('couple_secret_history', { limit: String(limit) }),

    listGet: type => call('couple_list_get', { type }),
    listAdd: (type, fields) => call('couple_list_add', { type, fields: JSON.stringify(fields) }),
    listUpdate: (type, id, fields) => call('couple_list_update', { type, id, fields: JSON.stringify(fields) }),
    listDelete: (type, id) => call('couple_list_delete', { type, id }),

    gachaState: () => call('couple_gacha_state'),
    gachaLike: ideaId => call('couple_gacha_like', { ideaId }),
    gachaUpdateMatch: (ideaId, fields) => call('couple_gacha_update_match', { ideaId, fields: JSON.stringify(fields) })
  };
})();
