/**
 * 秘密基地主程式
 * ------------------------------------------------------------
 * 1. 解鎖畫面（選人 + 4 位數密碼）
 * 2. 分頁切換（首頁 / 交換秘密 / 清單）
 * 3. 首頁：問候語、在一起天數
 * 4. 兔兔信差：點一下說一句話
 */
(function () {
  const CONFIG = window.BASE_CONFIG;
  const API = window.BaseAPI;
  const PIN_LENGTH = 4;

  const $ = id => document.getElementById(id);

  // ---------- 共用：把設定值填進畫面 ----------
  document.querySelectorAll('[data-bind]').forEach(el => {
    const value = CONFIG[el.dataset.bind];
    if (value) el.textContent = value;
  });
  document.title = CONFIG.baseName;

  if (API.isDemo) {
    const flag = document.createElement('div');
    flag.className = 'demo-flag';
    flag.textContent = '試玩模式・資料只存在這台裝置';
    document.body.appendChild(flag);
  }

  // ============================================================
  // 1. 解鎖畫面
  // ============================================================
  const lockScreen = $('lockScreen');
  const whoStep = $('whoStep');
  const pinStep = $('pinStep');
  const pinDots = $('pinDots');
  const pinMsg = $('pinMsg');
  const keypad = $('keypad');
  let selectedUser = null;
  let pinBuffer = '';
  let verifying = false;

  function renderWhoButtons() {
    whoStep.innerHTML = '';
    ['a', 'b'].forEach(key => {
      const person = CONFIG.people[key];
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'who-btn';
      btn.innerHTML = `<span class="who-emoji"></span><span class="who-name"></span>`;
      btn.querySelector('.who-emoji').textContent = person.emoji;
      btn.querySelector('.who-name').textContent = `我是${person.name}`;
      btn.addEventListener('click', () => choosePerson(key));
      whoStep.appendChild(btn);
    });
  }

  function renderKeypad() {
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'back', '0', 'del'];
    keypad.innerHTML = '';
    keys.forEach(k => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'key' + (k === 'back' || k === 'del' ? ' ghost' : '');
      btn.textContent = k === 'back' ? '換人' : k === 'del' ? '刪除' : k;
      btn.addEventListener('click', () => onKey(k));
      keypad.appendChild(btn);
    });
  }

  function renderDots() {
    pinDots.innerHTML = '';
    for (let i = 0; i < PIN_LENGTH; i++) {
      const dot = document.createElement('span');
      dot.className = 'pin-dot' + (i < pinBuffer.length ? ' filled' : '');
      pinDots.appendChild(dot);
    }
  }

  function choosePerson(key) {
    selectedUser = key;
    pinBuffer = '';
    pinMsg.textContent = '';
    $('pinWhoName').textContent = CONFIG.people[key].name;
    whoStep.hidden = true;
    pinStep.hidden = false;
    renderDots();
  }

  function backToWho() {
    selectedUser = null;
    pinBuffer = '';
    pinStep.hidden = true;
    whoStep.hidden = false;
  }

  function onKey(k) {
    if (verifying) return;
    if (k === 'back') return backToWho();
    if (k === 'del') {
      pinBuffer = pinBuffer.slice(0, -1);
    } else if (pinBuffer.length < PIN_LENGTH) {
      pinBuffer += k;
    }
    pinMsg.textContent = '';
    renderDots();
    if (pinBuffer.length === PIN_LENGTH) verifyPin();
  }

  async function verifyPin() {
    verifying = true;
    pinMsg.style.color = 'var(--ink-soft)';
    pinMsg.textContent = '兔兔正在開門…';
    try {
      await API.login(selectedUser, pinBuffer);
      pinMsg.textContent = '';
      enterApp();
    } catch (err) {
      pinMsg.style.color = '';
      if (err.code === 'unauthorized') {
        pinMsg.textContent = '密碼不對喔，再試一次';
      } else if (err.code === 'backend-outdated') {
        pinMsg.textContent = '後台還沒更新，請先部署新版 Apps Script';
      } else {
        pinMsg.textContent = '連線失敗，檢查一下網路再試試';
      }
      pinDots.classList.remove('shake');
      void pinDots.offsetWidth; // 讓動畫可以重播
      pinDots.classList.add('shake');
      pinBuffer = '';
      renderDots();
    } finally {
      verifying = false;
    }
  }

  function showLock() {
    $('app').hidden = true;
    lockScreen.hidden = false;
    renderWhoButtons();
    renderKeypad();
    backToWho();
  }

  // ============================================================
  // 2. 分頁切換
  // ============================================================
  const views = document.querySelectorAll('[data-view]');
  const tabs = document.querySelectorAll('[data-tab]');

  function showView(name) {
    if (!document.querySelector(`[data-view="${name}"]`)) name = 'home';
    views.forEach(v => { v.hidden = v.dataset.view !== name; });
    tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === name));
    window.scrollTo(0, 0);
    if (location.hash !== '#' + name) history.replaceState(null, '', '#' + name);
  }

  tabs.forEach(t => t.addEventListener('click', () => showView(t.dataset.tab)));
  document.querySelectorAll('[data-go]').forEach(el => {
    el.addEventListener('click', () => showView(el.dataset.go));
  });

  // ============================================================
  // 3. 首頁
  // ============================================================
  function renderGreeting() {
    const auth = API.getAuth();
    const person = auth ? CONFIG.people[auth.user] : null;
    const hour = new Date().getHours();
    const hello = hour < 5 ? '夜深了' : hour < 11 ? '早安' : hour < 14 ? '午安' : hour < 18 ? '下午好' : '晚安';
    $('greet').textContent = person ? `${hello}，${person.name} ${person.emoji}` : hello;
  }

  function renderDays() {
    const [y, m, d] = CONFIG.anniversary.split('-').map(Number);
    const start = new Date(y, m - 1, d);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    // 在一起的那天算第 1 天
    const days = Math.max(1, Math.round((today - start) / 86400000) + 1);
    animateNumber($('daysNum'), days);
    $('daysSince').textContent = `從 ${y} 年 ${m} 月 ${d} 日開始`;
  }

  function animateNumber(el, target) {
    const duration = 900;
    const startTime = performance.now();
    function tick(now) {
      const p = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased).toLocaleString();
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  $('switchUserBtn').addEventListener('click', () => {
    if (confirm('要登出，換另一個人登入嗎？')) {
      API.clearAuth();
      location.reload();
    }
  });

  // ============================================================
  // 4. 兔兔信差
  // ============================================================
  const bubble = $('bubble');
  let bubbleTimer = null;

  function bunnySay(text, ms = 3600) {
    bubble.textContent = text;
    bubble.classList.add('show');
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(() => bubble.classList.remove('show'), ms);
  }

  $('messenger').addEventListener('click', () => {
    const lines = CONFIG.bunnyLines;
    bunnySay(lines[Math.floor(Math.random() * lines.length)]);
  });

  // ============================================================
  // 啟動
  // ============================================================
  function enterApp() {
    lockScreen.hidden = true;
    $('app').hidden = false;
    renderGreeting();
    renderDays();
    showView((location.hash || '#home').slice(1));
    setTimeout(() => {
      const person = CONFIG.people[API.getAuth().user];
      bunnySay(`歡迎回到基地，${person.name}！`);
    }, 700);

    // 進入基地時背景預載秘密與清單
    if (window.SecretApp && window.SecretApp.init) {
      window.SecretApp.init();
    }
  }

  // 記住登入：手機打開就直接進來
  if (API.getAuth()) {
    enterApp();
  } else {
    showLock();
  }

  // 方便其他模組（第二、三階段）使用
  window.BaseApp = { showView, bunnySay };
})();
