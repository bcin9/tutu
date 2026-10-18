/**
 * 約會計畫：盲盒抽卡與約會清單邏輯 (雙端即時同步版)
 */
(function() {
  const API = window.BaseAPI;
  const CONFIG = window.BASE_CONFIG;
  const IDEAS = window.COUPLE_IDEAS || [];
  const $ = id => document.getElementById(id);
  
  let currentTab = 'gacha';
  let currentCategory = null;
  let currentCards = [];
  let currentCardIndex = 0;
  let isSyncing = false;

  // 雙人同步狀態
  let gachaState = {
    myLikes: [],
    partnerLikes: [],
    matches: []
  };

  const GACHA_CACHE_KEY = 'tutu_gacha_synced_state';

  function getCacheKey() {
    const auth = API.getAuth();
    return `${GACHA_CACHE_KEY}_${auth ? auth.user : 'guest'}`;
  }

  function loadLocalGacha() {
    try {
      const saved = localStorage.getItem(getCacheKey());
      if (saved) {
        gachaState = Object.assign(gachaState, JSON.parse(saved));
      }
    } catch (_) {}
  }

  function saveLocalGacha() {
    try {
      localStorage.setItem(getCacheKey(), JSON.stringify(gachaState));
    } catch (_) {}
  }

  /**
   * 與 Google Apps Script 雙向同步抽卡與配對資料
   */
  async function syncGachaState(silent = true) {
    const auth = API.getAuth();
    if (!auth) return;
    if (isSyncing) return;
    isSyncing = true;

    try {
      const data = await API.gachaState();
      if (data && data.ok) {
        const prevMatchCount = gachaState.matches.length;
        gachaState.myLikes = data.myLikes || [];
        gachaState.partnerLikes = data.partnerLikes || [];
        gachaState.matches = data.matches || [];
        saveLocalGacha();

        if (currentTab === 'matches') {
          renderMatches();
        }

        // 若偵測到另一端配對成功產生了新項目
        if (gachaState.matches.length > prevMatchCount && !silent && window.BaseApp) {
          window.BaseApp.bunnySay('🎉 兔兔發現你們有新的約會配對成功囉！快去清單看看～');
        }
      }
    } catch (e) {
      console.warn('同步抽卡資料失敗，使用本地快取:', e);
    } finally {
      isSyncing = false;
    }
  }
  
  const CATEGORY_INFO = {
    daily: { name: '日常', icon: '🛋️' },
    travel: { name: '旅行', icon: '✈️' },
    food: { name: '美食', icon: '🥩' },
    crazy: { name: '瘋狂', icon: '🎢' }
  };

  function getTodayKey() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function getDailyGachaRecord() {
    const auth = API.getAuth();
    const user = auth ? auth.user : 'a';
    const todayKey = getTodayKey();
    try {
      const raw = localStorage.getItem(`tutu_gacha_daily_${todayKey}_${user}`);
      return raw ? JSON.parse(raw) : {};
    } catch (_) {
      return {};
    }
  }

  function markCategoryDone(cat) {
    const auth = API.getAuth();
    const user = auth ? auth.user : 'a';
    const todayKey = getTodayKey();
    const record = getDailyGachaRecord();
    record[cat] = true;
    try {
      localStorage.setItem(`tutu_gacha_daily_${todayKey}_${user}`, JSON.stringify(record));
    } catch (_) {}
    renderCategoryButtons();
  }

  function renderCategoryButtons() {
    const record = getDailyGachaRecord();
    const buttons = document.querySelectorAll('[data-cat]');
    let allDone = true;

    buttons.forEach(btn => {
      const cat = btn.dataset.cat;
      const info = CATEGORY_INFO[cat];
      if (!info) return;

      const isDone = !!record[cat];
      if (!isDone) allDone = false;

      if (isDone) {
        btn.classList.add('is-done');
        btn.disabled = true;
        btn.innerHTML = `${info.icon} ${info.name}<span class="gacha-done-badge">✓ 今日已翻</span>`;
      } else {
        btn.classList.remove('is-done');
        btn.disabled = false;
        btn.innerHTML = `${info.icon} ${info.name}`;
      }
    });

    const banner = $('gachaAllDoneBanner');
    if (banner) {
      banner.hidden = !allDone;
    }
  }

  // Tab 切換
  document.querySelectorAll('.list-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.list-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentTab = tab.dataset.listType;
      $('gachaView').hidden = (currentTab !== 'gacha');
      $('matchesView').hidden = (currentTab !== 'matches');
      if (currentTab === 'gacha') {
        renderCategoryButtons();
        syncGachaState(true);
      }
      if (currentTab === 'matches') {
        renderMatches();
        syncGachaState(true);
      }
    });
  });

  // 選擇類別開始抽卡
  document.querySelectorAll('[data-cat]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const cat = btn.dataset.cat;
      const record = getDailyGachaRecord();
      if (record[cat]) {
        alert('今天已經翻過這個主題的牌子囉！明天再來抽吧～');
        return;
      }
      currentCategory = cat;
      await prepareGachaCards(currentCategory);
    });
  });

  $('btnResetGacha').addEventListener('click', () => {
    renderCategoryButtons();
    $('categorySelector').style.display = 'block';
    $('swipeArea').style.display = 'none';
    $('swipeDone').style.display = 'none';
  });

  async function prepareGachaCards(category) {
    const auth = API.getAuth();
    if (!auth) return;
    const user = auth.user;
    
    // 再次檢查今天是否已經翻過這個主題（防止點擊連按）
    const record = getDailyGachaRecord();
    if (record[category]) {
      alert('今天已經翻過這個主題的牌子囉！明天再來抽吧～');
      return;
    }

    // 背景同步最新狀態（確認對方是否剛按了愛心）
    syncGachaState(true);

    // 依類別篩選題目
    const catIdeas = IDEAS.filter(i => i.category === category);
    
    // 找出我還沒按過喜歡的任務卡
    let available = catIdeas.filter(i => !gachaState.myLikes.includes(i.id));
    
    if (available.length === 0) {
      alert('這個類別的任務卡已經被你抽完囉！換一個類別吧！');
      return;
    }

    // 智能配對演算法：優先找出「對方已經按過喜歡，但我還沒抽過」的心動隱藏卡
    const hiddenMatches = available.filter(i => gachaState.partnerLikes.includes(i.id));
    
    currentCards = [];
    
    // 1. 如果有對方喜歡的卡，70% 高機率抽進卡堆，製造兩人不謀而合的浪漫驚喜！
    if (hiddenMatches.length > 0 && Math.random() < 0.7) {
      const match = hiddenMatches[Math.floor(Math.random() * hiddenMatches.length)];
      currentCards.push(match);
      available = available.filter(i => i.id !== match.id);
    }
    
    // 2. 隨機填滿 3 張
    available.sort(() => Math.random() - 0.5);
    while (currentCards.length < 3 && available.length > 0) {
      currentCards.push(available.pop());
    }
    
    // 抽卡成功後立即鎖定該類別，防止重新整理刷牌
    markCategoryDone(category);

    // 洗牌
    currentCards.sort(() => Math.random() - 0.5);
    currentCardIndex = 0;
    
    const info = CATEGORY_INFO[category];
    if ($('swipeDoneTitle')) $('swipeDoneTitle').textContent = `今天的【${info ? info.name : ''}】牌子翻完囉！`;
    if ($('swipeDoneDesc')) $('swipeDoneDesc').textContent = '換個類別繼續抽，或是去約會清單看看～';

    $('categorySelector').style.display = 'none';
    $('swipeArea').style.display = 'block';
    $('swipeDone').style.display = 'none';
    
    showCard();
  }

  function showCard() {
    if (currentCardIndex >= currentCards.length) {
      $('swipeArea').style.display = 'none';
      $('swipeDone').style.display = 'block';
      return;
    }
    const card = currentCards[currentCardIndex];
    $('cardDeck').innerHTML = `<div>${card.text}</div>`;
  }

  $('btnPass').addEventListener('click', () => {
    currentCardIndex++;
    showCard();
  });

  $('btnLike').addEventListener('click', async () => {
    const card = currentCards[currentCardIndex];
    const auth = API.getAuth();
    if (!card || !auth) return;
    
    // 1. 本地立即記錄 myLikes
    if (!gachaState.myLikes.includes(card.id)) {
      gachaState.myLikes.push(card.id);
    }

    // 2. 檢查對方是否已經喜歡過這張卡片 -> 即時觸發配對！
    const partnerLiked = gachaState.partnerLikes.includes(card.id);
    
    if (partnerLiked) {
      if (!gachaState.matches.some(m => m.ideaId === card.id)) {
        gachaState.matches.unshift({
          ideaId: card.id,
          matchedAt: new Date().toISOString(),
          status: 'pending',
          target: ''
        });
      }
      saveLocalGacha();
      
      // 觸發兔兔慶祝與配對彈窗
      if (window.BaseApp) window.BaseApp.bunnySay('🎉 配對成功！你們都想做這件事！');
      setTimeout(() => {
        alert(`🎉 配對成功！\n\n你們都想：${card.text}\n\n已經自動收進「約會清單」囉！❤️`);
      }, 100);
    } else {
      saveLocalGacha();
    }
    
    // 3. 同步傳送給後台（並檢查伺服器端是否剛好也配對上了）
    API.gachaLike(card.id).then(res => {
      if (res && res.matched) {
        if (!partnerLiked) {
          if (res.match && !gachaState.matches.some(m => m.ideaId === card.id)) {
            gachaState.matches.unshift(res.match);
          }
          saveLocalGacha();
          if (window.BaseApp) window.BaseApp.bunnySay('🎉 配對成功！你們都想做這件事！');
          setTimeout(() => {
            alert(`🎉 配對成功！\n\n你們都想：${card.text}\n\n已經自動收進「約會清單」囉！❤️`);
          }, 100);
        }
      }
    }).catch(err => {
      console.warn('API.gachaLike 同步失敗:', err);
    });
    
    currentCardIndex++;
    showCard();
  });

  // ==========================================
  // 約會清單 (Matches List)
  // ==========================================
  function renderMatches() {
    const matches = gachaState.matches || [];
    if (matches.length === 0) {
      $('matchesList').innerHTML = '';
      $('matchesEmpty').style.display = 'block';
      return;
    }
    
    $('matchesEmpty').style.display = 'none';
    const sorted = [...matches].sort((a,b) => new Date(b.matchedAt || 0) - new Date(a.matchedAt || 0));
    
    $('matchesList').innerHTML = sorted.map(m => {
      const idea = IDEAS.find(i => i.id === m.ideaId);
      if (!idea) return '';
      
      let statusBadge = '<span style="background:var(--pink); color:#fff; padding:2px 8px; border-radius:10px; font-size:0.8rem;">剛配對 ❤️</span>';
      if (m.target === 'week') statusBadge = '<span style="background:var(--sage); color:#fff; padding:2px 8px; border-radius:10px; font-size:0.8rem;">這週出發 🚗</span>';
      if (m.target === 'month') statusBadge = '<span style="background:var(--accent); color:#fff; padding:2px 8px; border-radius:10px; font-size:0.8rem;">這個月計畫 📅</span>';
      if (m.status === 'done') statusBadge = '<span style="background:#ccc; color:#fff; padding:2px 8px; border-radius:10px; font-size:0.8rem;">已完成 ✔</span>';
      
      return `
        <div class="card" style="margin-bottom:0; padding:16px;">
          <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
            <div style="font-size:0.85rem; color:var(--ink-soft);">${new Date(m.matchedAt || Date.now()).toLocaleDateString()}</div>
            ${statusBadge}
          </div>
          <div style="font-size:1.05rem; font-weight:bold; margin-bottom:16px;">${idea.text}</div>
          ${m.status !== 'done' ? `
            <div style="display:flex; gap:8px;">
              <button class="btn secondary small" onclick="setTarget('${m.ideaId}', 'week')">這週去</button>
              <button class="btn secondary small" onclick="setTarget('${m.ideaId}', 'month')">這月去</button>
              <button class="btn primary small" onclick="completeMatch('${m.ideaId}')">✔ 完成</button>
            </div>
          ` : ''}
        </div>
      `;
    }).join('');
  }

  window.setTarget = function(ideaId, target) {
    let m = gachaState.matches.find(x => x.ideaId === ideaId);
    if (m) {
      m.target = target;
      saveLocalGacha();
      renderMatches();
      API.gachaUpdateMatch(ideaId, { target }).catch(() => {});
      if (window.BaseApp) {
        window.BaseApp.bunnySay(target === 'week' ? '太棒了！這週就出發！' : '約好了這個月喔！');
      }
    }
  };
  
  window.completeMatch = function(ideaId) {
    let m = gachaState.matches.find(x => x.ideaId === ideaId);
    if (m) {
      m.status = 'done';
      m.target = '';
      saveLocalGacha();
      renderMatches();
      API.gachaUpdateMatch(ideaId, { status: 'done', target: '' }).catch(() => {});
      if (window.BaseApp) {
        window.BaseApp.bunnySay('恭喜你們又創造了一個美好回憶！');
      }
    }
  };

  // 初始化
  loadLocalGacha();
  document.addEventListener('DOMContentLoaded', () => {
    renderCategoryButtons();
    syncGachaState(true);
  });

  window.GachaApp = {
    sync: syncGachaState,
    render: renderCategoryButtons
  };

})();
