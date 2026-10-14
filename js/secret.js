/**
 * 交換秘密功能 (極速優化版：0ms 本地預算題目 + 本地快取秒開 + 背景無感同步)
 */
(function() {
  const API = window.BaseAPI;
  const $ = id => document.getElementById(id);
  const CONFIG = window.BASE_CONFIG;

  // 60 題交換秘密題庫（與後台完全同步）
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

  let currentSecret = null;
  let isFetching = false;

  function getTodayKey() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function questionForDate(dateKey) {
    const parts = dateKey.split('-').map(Number);
    const dayNumber = Math.floor(Date.UTC(parts[0], parts[1] - 1, parts[2]) / 86400000);
    const index = ((dayNumber % SECRET_QUESTIONS.length) + SECRET_QUESTIONS.length) % SECRET_QUESTIONS.length;
    return SECRET_QUESTIONS[index];
  }

  function getCacheKey(dateKey, user) {
    return `tutu_secret_cache_${dateKey}_${user || 'guest'}`;
  }

  function getCachedSecret(dateKey, user) {
    try {
      const raw = localStorage.getItem(getCacheKey(dateKey, user));
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function setCachedSecret(dateKey, user, data) {
    try {
      localStorage.setItem(getCacheKey(dateKey, user), JSON.stringify(data));
    } catch (_) {}
  }

  /**
   * 秒開載入：
   * 1. 0ms：直接計算今日題目與從 localStorage 讀取快取渲染畫面，不顯示加載動畫
   * 2. 背景非同步向後台同步最新答題狀態
   */
  async function loadTodaySecret() {
    const auth = API.getAuth();
    const user = auth ? auth.user : 'a';
    const today = getTodayKey();
    const todayQ = questionForDate(today);

    // 0ms 瞬間顯示題目在首頁與內頁
    if ($('homeSecretQ')) $('homeSecretQ').textContent = todayQ;
    if ($('secretDate')) $('secretDate').textContent = today;
    if ($('secretQ')) $('secretQ').textContent = todayQ;

    const cached = getCachedSecret(today, user);
    if (cached) {
      currentSecret = cached;
      renderSecret(cached);
    } else if (!currentSecret) {
      // 樂觀預設：題目已經算出，先讓使用者可以開始打字
      currentSecret = {
        date: today,
        question: todayQ,
        myAnswer: null,
        myAnsweredAt: null,
        partnerAnswered: false,
        partnerAnswer: null,
        partnerAnsweredAt: null
      };
      renderSecret(currentSecret);
    }

    if ($('secretLoading')) $('secretLoading').hidden = true;
    if ($('secretContent')) $('secretContent').hidden = false;

    // 若未登入，不向後台發送請求
    if (!auth) return;

    // 背景同步：靜默向後台更新
    if (isFetching) return;
    isFetching = true;

    try {
      const data = await API.secretToday();
      const prevPartnerAnswered = currentSecret ? currentSecret.partnerAnswered : false;
      currentSecret = data;
      setCachedSecret(today, user, data);
      renderSecret(data);

      // 若背景偵測到對方剛回答，且自己也回答過，兔兔主動通知
      if (!prevPartnerAnswered && data.partnerAnswered && data.myAnswer && window.BaseApp) {
        window.BaseApp.bunnySay(`💌 ${getPartnerName()} 剛剛回答了秘密！答案已解鎖～`);
      }
    } catch (e) {
      console.warn('背景同步秘密失敗（使用離線快取）:', e);
    } finally {
      isFetching = false;
    }
  }

  function renderSecret(data) {
    if (!data) return;

    if ($('secretLoading')) $('secretLoading').hidden = true;
    if ($('secretContent')) $('secretContent').hidden = false;

    if ($('secretDate')) $('secretDate').textContent = data.date;
    if ($('secretQ')) $('secretQ').textContent = data.question;
    if ($('homeSecretQ')) $('homeSecretQ').textContent = data.question;

    const mySection = $('myAnswerSection');
    const partnerSection = $('partnerAnswerSection');
    if (!mySection || !partnerSection) return;

    if (data.myAnswer) {
      // 我已經回答
      mySection.innerHTML = `
        <div class="answer-card mine">
          <div class="answer-meta">我的回答</div>
          <p>${escapeHTML(data.myAnswer)}</p>
        </div>
      `;
      if ($('homeSecretStatus')) $('homeSecretStatus').textContent = '你已回答';

      if (data.partnerAnswered) {
        // 雙方皆已回答（解鎖）
        const partnerName = getPartnerName();
        partnerSection.innerHTML = `
          <div class="answer-card partner">
            <div class="answer-meta">${partnerName}的回答</div>
            <p>${escapeHTML(data.partnerAnswer || '')}</p>
          </div>
        `;
        if ($('homeSecretStatus')) $('homeSecretStatus').textContent = '雙方已解鎖 ✨';
        if ($('secretTabDot')) $('secretTabDot').hidden = true;
      } else {
        // 等待對方回答
        const partnerName = getPartnerName();
        partnerSection.innerHTML = `
          <div class="wait-card">
            等待 ${partnerName} 回答後解鎖... 🐰
          </div>
        `;
        if ($('homeSecretStatus')) $('homeSecretStatus').textContent = `等待${partnerName}回答`;
      }
    } else {
      // 我尚未回答
      // 若使用者已經在輸入框打字，保留現有草稿，不要被背景同步清空
      const existingInput = $('myAnswerInput');
      const draft = existingInput ? existingInput.value : '';

      mySection.innerHTML = `
        <textarea id="myAnswerInput" placeholder="寫下你的回答..." rows="4"></textarea>
        <button type="button" class="btn primary" id="submitAnswerBtn">送出回答</button>
        <p class="error-msg" id="answerError"></p>
      `;
      if (draft && $('myAnswerInput')) {
        $('myAnswerInput').value = draft;
      }
      $('submitAnswerBtn').addEventListener('click', submitAnswer);

      partnerSection.innerHTML = `
        <div class="wait-card">
          ${data.partnerAnswered ? getPartnerName() + ' 已經回答了！快寫下你的答案來解鎖吧 🔒' : '回答後即可看到對方的答案 🔒'}
        </div>
      `;
      if ($('homeSecretStatus')) $('homeSecretStatus').textContent = data.partnerAnswered ? '對方已回答' : '尚未回答';
      if ($('secretTabDot')) $('secretTabDot').hidden = !data.partnerAnswered;
    }
  }

  async function submitAnswer() {
    const input = $('myAnswerInput').value.trim();
    const errorEl = $('answerError');
    if (!input) {
      errorEl.textContent = '請先寫點什麼喔！';
      return;
    }

    const btn = $('submitAnswerBtn');
    btn.disabled = true;
    btn.textContent = '送出中...';
    errorEl.textContent = '';

    // 樂觀更新：立刻記錄到本地並切換為已回答狀態（0秒延遲體驗）
    const auth = API.getAuth();
    const user = auth ? auth.user : 'a';
    const optimisticData = Object.assign({}, currentSecret, {
      myAnswer: input,
      myAnsweredAt: new Date().toISOString()
    });
    setCachedSecret(optimisticData.date, user, optimisticData);
    renderSecret(optimisticData);

    try {
      const data = await API.secretAnswer(currentSecret.date, input);
      currentSecret = data;
      setCachedSecret(data.date, user, data);
      renderSecret(data);
      if (window.BaseApp) window.BaseApp.bunnySay('秘密已經幫你收好囉！');
    } catch (e) {
      console.error(e);
      if (errorEl) errorEl.textContent = '送出失敗，請檢查網路後再試。';
      btn.disabled = false;
      btn.textContent = '重新送出';
    }
  }

  function getPartnerName() {
    const auth = API.getAuth();
    if (!auth) return '對方';
    const partnerKey = auth.user === 'a' ? 'b' : 'a';
    return CONFIG.people[partnerKey].name;
  }

  function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, tag => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[tag] || tag));
  }

  // 對外提供 init
  window.SecretApp = {
    init: loadTodaySecret,
    refresh: () => loadTodaySecret(true)
  };

  // 畫面就緒時立刻預算題目與秒開渲染
  document.addEventListener('DOMContentLoaded', () => {
    loadTodaySecret();

    const tab = document.querySelector('[data-tab="secret"]');
    if (tab) {
      tab.addEventListener('click', () => {
        loadTodaySecret();
      });
    }
  });

})();
