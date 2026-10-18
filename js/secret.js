/**
 * 交換秘密功能 (極速版：近 3 天快速切換補答 + 永久歷史回憶錄 + 本地快取秒開)
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

  // 日期工具
  function getDateKeyOffset(offsetDays = 0) {
    const d = new Date();
    d.setDate(d.getDate() - offsetDays);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function formatMD(dateKey) {
    const parts = dateKey.split('-');
    return `${parseInt(parts[1], 10)}/${parseInt(parts[2], 10)}`;
  }

  function formatFullDate(dateKey) {
    const parts = dateKey.split('-').map(Number);
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
    return `${parts[0]}年${parts[1]}月${parts[2]}日 (週${weekdays[d.getDay()]})`;
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

  // 狀態管理
  let selectedDateKey = getDateKeyOffset(0); // 預設為今天
  let currentSecret = null;
  let isFetching = false;
  let isHistoryOpen = false;

  /**
   * 渲染「近 3 天」切換標籤列
   */
  function renderDaysNav() {
    const nav = $('secretDaysNav');
    if (!nav) return;
    const auth = API.getAuth();
    const user = auth ? auth.user : 'a';

    const recentItems = [
      { offset: 2, label: '前天' },
      { offset: 1, label: '昨天' },
      { offset: 0, label: '🌟 今天' }
    ];

    const todayKey = getDateKeyOffset(0);
    const recentDateKeys = recentItems.map(i => getDateKeyOffset(i.offset));
    const isViewingOlder = !recentDateKeys.includes(selectedDateKey);

    let html = recentItems.map(item => {
      const dateKey = getDateKeyOffset(item.offset);
      const isActive = dateKey === selectedDateKey;
      const cached = getCachedSecret(dateKey, user);

      let tagText = '待回答';
      let tagClass = '';
      if (cached) {
        if (cached.myAnswer && cached.partnerAnswered) {
          tagText = '✨ 解鎖';
          tagClass = 'unlocked';
        } else if (cached.myAnswer) {
          tagText = '⏳ 等對方';
          tagClass = 'pending';
        } else if (cached.partnerAnswered) {
          tagText = '🔒 對方已答';
          tagClass = 'pending';
        }
      }

      return `
        <button type="button" class="secret-day-btn ${isActive ? 'active' : ''}" data-date="${dateKey}">
          <span class="day-title">${item.label}</span>
          <span class="day-date">${formatMD(dateKey)}</span>
          <span class="day-tag ${tagClass}">${tagText}</span>
        </button>
      `;
    }).join('');

    // 若使用者點了歷史回憶中的更早日期，動態追加一個膠囊標籤
    if (isViewingOlder) {
      html += `
        <button type="button" class="secret-day-btn active" data-date="${selectedDateKey}">
          <span class="day-title">往日</span>
          <span class="day-date">${formatMD(selectedDateKey)}</span>
          <span class="day-tag unlocked">回憶中</span>
        </button>
      `;
    }

    nav.innerHTML = html;

    nav.querySelectorAll('[data-date]').forEach(btn => {
      btn.addEventListener('click', () => {
        const date = btn.dataset.date;
        if (date !== selectedDateKey) {
          selectDate(date);
        }
      });
    });
  }

  /**
   * 切換選擇特定日期
   */
  async function selectDate(dateKey) {
    selectedDateKey = dateKey;
    renderDaysNav();

    const auth = API.getAuth();
    const user = auth ? auth.user : 'a';
    const q = questionForDate(dateKey);

    // 0ms 秒開：優先從本地快取或預算渲染
    const cached = getCachedSecret(dateKey, user);
    if (cached) {
      currentSecret = cached;
      renderSecret(cached);
    } else {
      currentSecret = {
        date: dateKey,
        question: q,
        myAnswer: null,
        myAnsweredAt: null,
        partnerAnswered: false,
        partnerAnswer: null,
        partnerAnsweredAt: null
      };
      renderSecret(currentSecret);
    }

    // 更新日期徽章提示
    updateDateBadge(dateKey);

    // 背景同步後台最新狀態
    if (!auth) return;
    try {
      const todayKey = getDateKeyOffset(0);
      const data = dateKey === todayKey ? await API.secretToday() : await API.secretGet(dateKey);
      if (data && data.ok) {
        setCachedSecret(dateKey, user, data);
        if (selectedDateKey === dateKey) {
          currentSecret = data;
          renderSecret(data);
          renderDaysNav();
        }
      }
    } catch (e) {
      console.warn('同步日期秘密失敗:', e);
    }
  }

  function updateDateBadge(dateKey) {
    const badge = $('secretBadge');
    if (!badge) return;
    const today = getDateKeyOffset(0);
    const yesterday = getDateKeyOffset(1);
    const dayBefore = getDateKeyOffset(2);

    if (dateKey === today) {
      badge.textContent = '🌟 今日秘密';
      badge.style.background = 'var(--accent-soft)';
      badge.style.color = 'var(--accent)';
    } else if (dateKey === yesterday) {
      badge.textContent = '昨天補答';
      badge.style.background = 'var(--pink-soft)';
      badge.style.color = 'var(--pink)';
    } else if (dateKey === dayBefore) {
      badge.textContent = '前天補答';
      badge.style.background = 'var(--sage-soft)';
      badge.style.color = 'var(--sage)';
    } else {
      badge.textContent = '往日時光';
      badge.style.background = 'rgba(74, 63, 53, 0.08)';
      badge.style.color = 'var(--ink-soft)';
    }
  }

  /**
   * 渲染題目與答案內容
   */
  function renderSecret(data) {
    if (!data) return;

    if ($('secretLoading')) $('secretLoading').hidden = true;
    if ($('secretContent')) $('secretContent').hidden = false;

    if ($('secretDate')) $('secretDate').textContent = formatFullDate(data.date);
    if ($('secretQ')) $('secretQ').textContent = data.question;

    // 若顯示的是今天，同步更新首頁卡片
    if (data.date === getDateKeyOffset(0)) {
      if ($('homeSecretQ')) $('homeSecretQ').textContent = data.question;
      if ($('homeSecretStatus')) {
        $('homeSecretStatus').textContent = data.myAnswer
          ? (data.partnerAnswered ? '雙方已解鎖 ✨' : '你已回答')
          : (data.partnerAnswered ? '對方已回答' : '尚未回答');
      }
    }

    updateDateBadge(data.date);

    const mySection = $('myAnswerSection');
    const partnerSection = $('partnerAnswerSection');
    if (!mySection || !partnerSection) return;

    const partnerName = getPartnerName();
    const isToday = data.date === getDateKeyOffset(0);

    if (data.myAnswer) {
      // 我已經回答過
      mySection.innerHTML = `
        <div class="answer-card mine">
          <div class="answer-meta">我的回答 · ${data.myAnsweredAt ? new Date(data.myAnsweredAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}</div>
          <p>${escapeHTML(data.myAnswer)}</p>
        </div>
      `;

      if (data.partnerAnswered) {
        // 雙方皆已回答（解鎖顯示）
        partnerSection.innerHTML = `
          <div class="answer-card partner">
            <div class="answer-meta">${partnerName}的回答 · ${data.partnerAnsweredAt ? new Date(data.partnerAnsweredAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}</div>
            <p>${escapeHTML(data.partnerAnswer || '')}</p>
          </div>
        `;
        if (isToday && $('secretTabDot')) $('secretTabDot').hidden = true;
      } else {
        // 等待對方回答
        partnerSection.innerHTML = `
          <div class="wait-card">
            等待 ${partnerName} 回答後解鎖... 🐰
          </div>
        `;
      }
    } else {
      // 我尚未回答（可作答或補答）
      const existingInput = $('myAnswerInput');
      const draft = existingInput ? existingInput.value : '';
      const placeholder = isToday ? '寫下你的回答...' : `補寫 ${formatMD(data.date)} 的回答...`;
      const btnText = isToday ? '送出回答' : '補交回答 ✉️';

      mySection.innerHTML = `
        <textarea id="myAnswerInput" placeholder="${placeholder}" rows="4"></textarea>
        <button type="button" class="btn primary" id="submitAnswerBtn">${btnText}</button>
        <p class="error-msg" id="answerError"></p>
      `;
      if (draft && $('myAnswerInput')) {
        $('myAnswerInput').value = draft;
      }
      $('submitAnswerBtn').addEventListener('click', submitAnswer);

      partnerSection.innerHTML = `
        <div class="wait-card">
          ${data.partnerAnswered ? `${partnerName} 已經回答了！快寫下你的答案來解鎖吧 🔒` : '回答後即可看到對方的答案 🔒'}
        </div>
      `;
      if (isToday && $('secretTabDot')) $('secretTabDot').hidden = !data.partnerAnswered;
    }
  }

  /**
   * 送出回答
   */
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

    const auth = API.getAuth();
    const user = auth ? auth.user : 'a';
    const targetDate = currentSecret.date;

    // 樂觀更新
    const optimisticData = Object.assign({}, currentSecret, {
      myAnswer: input,
      myAnsweredAt: new Date().toISOString()
    });
    setCachedSecret(targetDate, user, optimisticData);
    renderSecret(optimisticData);
    renderDaysNav();

    try {
      const data = await API.secretAnswer(targetDate, input);
      currentSecret = data;
      setCachedSecret(targetDate, user, data);
      renderSecret(data);
      renderDaysNav();

      if (window.BaseApp) window.BaseApp.bunnySay('秘密已經幫你收好囉！');

      // 若回憶錄展開中，同步更新歷史紀錄
      if (isHistoryOpen) {
        loadSecretHistory(true);
      }
    } catch (e) {
      console.error(e);
      if (errorEl) errorEl.textContent = '送出失敗，請檢查網路後再試。';
      btn.disabled = false;
      btn.textContent = '重新送出';
    }
  }

  // ==========================================
  // 歷史回憶錄邏輯 (永久保存)
  // ==========================================
  const HISTORY_CACHE_KEY = 'tutu_secret_history_cache';

  async function loadSecretHistory(forceSync = false) {
    const listEl = $('secretHistoryList');
    if (!listEl) return;
    const auth = API.getAuth();
    const user = auth ? auth.user : 'a';
    const partnerName = getPartnerName();

    // 讀取本地快取秒開
    const cacheKey = `${HISTORY_CACHE_KEY}_${user}`;
    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null');
      if (cached && cached.items) {
        renderHistoryItems(cached.items, listEl, partnerName);
      }
    } catch (_) {}

    try {
      const res = await API.secretHistory(100);
      if (res && res.ok && Array.isArray(res.items)) {
        localStorage.setItem(cacheKey, JSON.stringify(res));
        renderHistoryItems(res.items, listEl, partnerName);
      }
    } catch (err) {
      console.warn('載入歷史秘密失敗:', err);
    }
  }

  function renderHistoryItems(items, container, partnerName) {
    if (!items || items.length === 0) {
      container.innerHTML = `
        <div style="text-align:center; padding:30px 20px; color:var(--ink-soft); font-size:0.9rem;">
          目前還沒有更多歷史秘密，每天一起寫下回憶吧 🐰
        </div>
      `;
      if ($('historyCount')) $('historyCount').textContent = '';
      return;
    }

    const unlockedCount = items.filter(i => i.myAnswer && i.partnerAnswered).length;
    if ($('historyCount')) $('historyCount').textContent = `(${unlockedCount} 篇已解鎖)`;

    container.innerHTML = items.map(item => {
      const isUnlocked = item.myAnswer && item.partnerAnswered;
      let statusHtml = isUnlocked
        ? `<span style="background:var(--sage-soft); color:var(--sage); padding:2px 8px; border-radius:10px; font-weight:600; font-size:0.75rem;">✨ 雙方已解鎖</span>`
        : (item.myAnswer
          ? `<span style="background:var(--accent-soft); color:var(--accent); padding:2px 8px; border-radius:10px; font-size:0.75rem;">⏳ 等待對方</span>`
          : `<span style="background:var(--pink-soft); color:var(--pink); padding:2px 8px; border-radius:10px; font-size:0.75rem;">🔒 待補答</span>`);

      let answersHtml = '';
      if (isUnlocked) {
        answersHtml = `
          <div class="history-answers-box">
            <div class="history-ans-row">
              <div class="history-ans-name">我的回答：</div>
              <div>${escapeHTML(item.myAnswer)}</div>
            </div>
            <div class="history-ans-row">
              <div class="history-ans-name">${partnerName}的回答：</div>
              <div>${escapeHTML(item.partnerAnswer)}</div>
            </div>
          </div>
        `;
      } else if (item.myAnswer) {
        answersHtml = `
          <div class="history-answers-box">
            <div class="history-ans-row">
              <div class="history-ans-name">我的回答：</div>
              <div>${escapeHTML(item.myAnswer)}</div>
            </div>
            <div style="font-size:0.8rem; color:var(--ink-soft); margin-top:4px;">等待 ${partnerName} 回答後解鎖對方內容 🐰</div>
          </div>
        `;
      } else {
        answersHtml = `
          <div style="background:rgba(255,255,255,0.6); padding:10px 14px; border-radius:12px; border:1px dashed var(--line); font-size:0.85rem; color:var(--ink-soft);">
            ${item.partnerAnswered ? `${partnerName} 已經寫下答案囉！` : '這一天你們都還沒寫下秘密'}
            <br>
            <button type="button" class="history-catchup-btn" onclick="window.SecretApp.selectDate('${item.date}')">補寫這天 ✏️</button>
          </div>
        `;
      }

      return `
        <div class="history-card">
          <div class="history-card-top">
            <span>📅 ${formatFullDate(item.date)}</span>
            ${statusHtml}
          </div>
          <div class="history-card-q">${escapeHTML(item.question)}</div>
          ${answersHtml}
        </div>
      `;
    }).join('');
  }

  function toggleHistory() {
    isHistoryOpen = !isHistoryOpen;
    const wrap = $('secretHistoryWrap');
    const arrow = $('historyArrow');
    if (!wrap || !arrow) return;

    wrap.hidden = !isHistoryOpen;
    arrow.textContent = isHistoryOpen ? '▲ 收起' : '▼ 展開';

    if (isHistoryOpen) {
      loadSecretHistory();
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

  // 對外介面
  window.SecretApp = {
    init: () => {
      renderDaysNav();
      selectDate(getDateKeyOffset(0));
    },
    selectDate: dateKey => {
      selectDate(dateKey);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    refresh: () => {
      selectDate(selectedDateKey);
      if (isHistoryOpen) loadSecretHistory(true);
    }
  };

  // 畫面載入就緒
  document.addEventListener('DOMContentLoaded', () => {
    renderDaysNav();
    selectDate(getDateKeyOffset(0));

    const toggleBtn = $('toggleHistoryBtn');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', toggleHistory);
    }

    const tab = document.querySelector('[data-tab="secret"]');
    if (tab) {
      tab.addEventListener('click', () => {
        if (!currentSecret) selectDate(getDateKeyOffset(0));
      });
    }
  });

})();
