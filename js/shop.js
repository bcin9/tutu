/**
 * 兔兔願望市集、情侶特權券與點數商城
 * ------------------------------------------------------------
 * 1. 兔兔幣點數系統（新手見面禮 100 幣、每日答題 +10 幣、打賞誇誇）
 * 2. 通用卡券市集（兌換、新增自訂券）
 * 3. 我的卡包（出示使用、等待履約、核銷印章）
 * 4. 待履行提醒（對方出示特權券時，提醒我履行核銷）
 * 5. 0ms 本地秒開與離線快取
 */
(function() {
  const API = window.BaseAPI;
  const $ = id => document.getElementById(id);
  const CONFIG = window.BASE_CONFIG;

  const DEFAULT_COUPONS = [
    { id: 'C_MASSAGE', title: '全身舒壓按摩 20 分鐘券', desc: '對方無條件提供 20 分鐘舒服按摩（搥背、捏肩、精油）', cost: 40, icon: '💆‍♂️' },
    { id: 'C_PEACE', title: '吵架立刻和好 / 主動抱抱券', desc: '出示時雙方必須停止爭吵，對方主動擁抱，不許翻舊帳', cost: 30, icon: '🤫' },
    { id: 'C_DINNER', title: '任選大餐券（對方買單）', desc: '今天的約會餐廳由持有者任選，對方豪爽結帳', cost: 80, icon: '🍽️' },
    { id: 'C_CHORES', title: '家事全包 / 讓我賴床券', desc: '今天所有家事由對方包辦，自己可以安心賴床放空', cost: 50, icon: '🛌' },
    { id: 'C_GAMING', title: '打電動 / 追劇暢玩放空一天券', desc: '一整天不被打擾、不被催促，盡情玩遊戲或追劇', cost: 40, icon: '🎮' },
    { id: 'C_KISS', title: '隨時索取親親抱抱券', desc: '隨時隨地無條件討一個深吻或大大的擁抱', cost: 20, icon: '💋' },
    { id: 'C_ERRAND', title: '專屬外送跑腿券', desc: '對方負責幫忙買飲料或宵夜送上桌', cost: 30, icon: '🥤' }
  ];

  const SHOP_CACHE_KEY = 'tutu_shop_state_cache';

  function getCacheKey() {
    const auth = API.getAuth();
    return `${SHOP_CACHE_KEY}_${auth ? auth.user : 'guest'}`;
  }

  let shopState = {
    balance: 100,
    partnerBalance: 100,
    shopCoupons: [...DEFAULT_COUPONS],
    myCoupons: [],
    partnerPendingCoupons: [],
    praises: []
  };

  let currentShopTab = 'market';

  function loadLocalShop() {
    try {
      const raw = localStorage.getItem(getCacheKey());
      if (raw) {
        const parsed = JSON.parse(raw);
        shopState = Object.assign(shopState, parsed);
      }
    } catch (_) {}

    // 確保預設卡券永遠齊全
    DEFAULT_COUPONS.forEach(dc => {
      if (!shopState.shopCoupons.some(c => c.id === dc.id)) {
        shopState.shopCoupons.unshift(dc);
      }
    });
  }

  function saveLocalShop() {
    try {
      localStorage.setItem(getCacheKey(), JSON.stringify(shopState));
    } catch (_) {}
  }

  function getPartnerName() {
    const auth = API.getAuth();
    if (!auth) return '對方';
    const partnerKey = auth.user === 'a' ? 'b' : 'a';
    return CONFIG.people[partnerKey].name;
  }

  function getMyName() {
    const auth = API.getAuth();
    if (!auth) return '我';
    return CONFIG.people[auth.user].name;
  }

  // ==========================================
  // 後台同步
  // ==========================================
  async function syncShop(silent = false) {
    const auth = API.getAuth();
    if (!auth) return;

    try {
      const data = await API.shopState();
      if (data && data.ok) {
        shopState.balance = Number(data.balance || 0);
        shopState.partnerBalance = Number(data.partnerBalance || 0);
        if (data.shopCoupons && data.shopCoupons.length > 0) {
          shopState.shopCoupons = data.shopCoupons;
        }
        shopState.myCoupons = data.myCoupons || [];
        shopState.partnerPendingCoupons = data.partnerPendingCoupons || [];
        shopState.praises = data.praises || [];

        saveLocalShop();
        renderShop();
      }
    } catch (e) {
      if (!silent) console.warn('同步市集狀態失敗:', e);
    }
  }

  // ==========================================
  // 渲染畫面
  // ==========================================
  function renderShop() {
    // 1. 兔兔幣點數徽章
    const amountEl = $('shopCoinAmount');
    if (amountEl) {
      amountEl.textContent = String(shopState.balance);
    }
    const homeDesc = $('homeShopDesc');
    if (homeDesc) {
      homeDesc.textContent = `${shopState.balance} 兔兔幣可用 🐰`;
    }

    // 2. 我的卡包徽章計數（只計可使用＋履約中）
    const usableCount = shopState.myCoupons.filter(c => c.status !== 'completed').length;
    const countEl = $('myCouponsCount');
    if (countEl) {
      countEl.textContent = usableCount > 0 ? String(usableCount) : '';
      countEl.hidden = (usableCount === 0);
    }

    // 3. 待履行橫幅通知
    const pendingList = shopState.partnerPendingCoupons || [];
    const banner = $('partnerPendingBanner');
    if (banner) {
      if (pendingList.length > 0) {
        banner.hidden = false;
        const partnerName = getPartnerName();
        $('pendingBannerTitle').textContent = `${partnerName} 出示了【${pendingList[0].title}】！`;
        $('pendingBannerDesc').textContent = `共有 ${pendingList.length} 項特權等待你確認履行喔 ⏳`;
      } else {
        banner.hidden = true;
      }
    }

    // 4. 各分頁內容渲染
    renderMarket();
    renderBackpack();
    renderPraises();
  }

  // 渲染市集卡券列表
  function renderMarket() {
    const listEl = $('shopCouponsList');
    if (!listEl) return;

    listEl.innerHTML = '';
    shopState.shopCoupons.forEach(coupon => {
      const card = document.createElement('div');
      card.className = 'coupon-ticket';
      const canAfford = shopState.balance >= coupon.cost;

      card.innerHTML = `
        <div class="coupon-main">
          <div class="coupon-title-wrap">
            <span class="coupon-icon">${coupon.icon || '🎟️'}</span>
            <h4 class="coupon-title">${escapeHTML(coupon.title)}</h4>
          </div>
          <p class="coupon-desc">${escapeHTML(coupon.desc || '')}</p>
        </div>
        <div class="coupon-divider"></div>
        <div class="coupon-stub">
          <span class="stub-cost-num">${coupon.cost}</span>
          <span class="stub-cost-unit">兔兔幣</span>
          <button type="button" class="stub-btn ${canAfford ? 'primary' : 'disabled'} redeem-btn" ${canAfford ? '' : 'disabled'}>
            ${canAfford ? '兌換' : '不夠'}
          </button>
        </div>
      `;

      if (canAfford) {
        card.querySelector('.redeem-btn').addEventListener('click', () => redeemCoupon(coupon));
      }
      listEl.appendChild(card);
    });
  }

  // 渲染我的卡包
  function renderBackpack() {
    const listEl = $('backpackCouponsList');
    const emptyEl = $('backpackEmpty');
    if (!listEl || !emptyEl) return;

    const coupons = shopState.myCoupons || [];
    if (coupons.length === 0) {
      listEl.innerHTML = '';
      emptyEl.style.display = 'block';
      return;
    }
    emptyEl.style.display = 'none';
    listEl.innerHTML = '';

    const sorted = [...coupons].sort((a, b) => {
      const order = { using: 0, available: 1, completed: 2 };
      return (order[a.status] || 1) - (order[b.status] || 1);
    });

    sorted.forEach(uc => {
      const card = document.createElement('div');
      const partnerName = getPartnerName();
      card.className = `coupon-ticket ${uc.status === 'using' ? 'is-using' : ''} ${uc.status === 'completed' ? 'is-completed' : ''}`;

      let stubContent = '';
      let stamp = '';

      if (uc.status === 'using') {
        stubContent = `
          <span style="font-size:0.7rem; color:#856404; font-weight:800;">履約中</span>
          <span style="font-size:0.62rem; color:var(--ink-soft);">等${partnerName}</span>
        `;
      } else if (uc.status === 'completed') {
        stamp = `<div class="stamp-seal">已履行</div>`;
        stubContent = `
          <span style="font-size:0.68rem; color:var(--ink-soft); font-weight:600;">已核銷</span>
        `;
      } else {
        stubContent = `
          <span style="font-size:0.68rem; color:var(--sage); font-weight:700;">可使用</span>
          <button type="button" class="stub-btn primary use-btn">出示</button>
        `;
      }

      card.innerHTML = `
        <div class="coupon-main">
          <div class="coupon-title-wrap">
            <span class="coupon-icon">${uc.icon || '🎟️'}</span>
            <h4 class="coupon-title">${escapeHTML(uc.title)}</h4>
          </div>
          <p class="coupon-desc">${escapeHTML(uc.desc || '')}</p>
        </div>
        <div class="coupon-divider"></div>
        <div class="coupon-stub">
          ${stubContent}
        </div>
        ${stamp}
      `;

      const useBtn = card.querySelector('.use-btn');
      if (useBtn) {
        useBtn.addEventListener('click', () => useCoupon(uc));
      }

      listEl.appendChild(card);
    });
  }

  // 渲染甜蜜誇誇牆
  function renderPraises() {
    const listEl = $('praisesList');
    const emptyEl = $('praisesEmpty');
    if (!listEl || !emptyEl) return;

    const praises = shopState.praises || [];
    if (praises.length === 0) {
      listEl.innerHTML = '';
      emptyEl.style.display = 'block';
      return;
    }
    emptyEl.style.display = 'none';
    listEl.innerHTML = '';

    praises.forEach(p => {
      const card = document.createElement('div');
      card.className = 'praise-card';
      const fromName = CONFIG.people[p.fromUser] ? CONFIG.people[p.fromUser].name : p.fromUser;
      const toName = CONFIG.people[p.user] ? CONFIG.people[p.user].name : p.user;

      card.innerHTML = `
        <div class="praise-meta">
          <span>${fromName} 贈送給 ${toName}</span>
          <span class="praise-badge">+${p.amount} 兔兔幣 🐰</span>
        </div>
        <p class="praise-text">「${escapeHTML(p.reason)}」</p>
        <div style="font-size:0.72rem; color:var(--ink-soft); text-align:right;">
          ${p.createdAt ? new Date(p.createdAt).toLocaleDateString([], {month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit'}) : ''}
        </div>
      `;
      listEl.appendChild(card);
    });
  }

  // ==========================================
  // 卡券操作邏輯
  // ==========================================

  // 1. 兌換卡券
  async function redeemCoupon(coupon) {
    if (shopState.balance < coupon.cost) {
      alert('兔兔幣不足喔！快去回答今日秘密，或向另一半撒嬌討打賞吧～');
      return;
    }

    if (!confirm(`確定要花費 ${coupon.cost} 兔兔幣兌換【${coupon.title}】嗎？`)) {
      return;
    }

    // 樂觀更新
    shopState.balance -= coupon.cost;
    const newUc = {
      id: 'UC_' + Date.now(),
      couponId: coupon.id,
      title: coupon.title,
      desc: coupon.desc,
      cost: coupon.cost,
      icon: coupon.icon || '🎟️',
      owner: (API.getAuth() ? API.getAuth().user : 'a'),
      status: 'available',
      usedAt: '',
      completedAt: '',
      createdAt: new Date().toISOString()
    };
    shopState.myCoupons.unshift(newUc);
    saveLocalShop();
    renderShop();

    // 點數彈跳動畫與兔兔說話
    const badge = $('shopCoinBadge');
    if (badge) {
      badge.classList.remove('bounce');
      void badge.offsetWidth;
      badge.classList.add('bounce');
    }
    if (window.BaseApp) {
      window.BaseApp.bunnySay(`成功兌換【${coupon.title}】！已放進你的卡包囉 🎒`);
    }

    // 背景同步後台
    try {
      await API.shopRedeem(coupon.id);
      syncShop(true);
    } catch (e) {
      console.warn('兌換後台同步失敗:', e);
    }
  }

  // 2. 出示使用卡券
  async function useCoupon(uc) {
    const partnerName = getPartnerName();
    if (!confirm(`確定要現在向 ${partnerName} 出示使用【${uc.title}】嗎？`)) {
      return;
    }

    uc.status = 'using';
    uc.usedAt = new Date().toISOString();
    saveLocalShop();
    renderShop();

    if (window.BaseApp) {
      window.BaseApp.bunnySay(`💌 已出示【${uc.title}】！等待 ${partnerName} 履行核銷～`);
    }

    try {
      await API.shopUse(uc.id);
      syncShop(true);
    } catch (e) {
      console.warn('出示使用後台同步失敗:', e);
    }
  }

  // 3. 確認履行完成
  async function completeCoupon(uc) {
    if (!confirm(`確定已經為對方履行了【${uc.title}】嗎？核銷後這張券就會蓋上已履行章囉！`)) {
      return;
    }

    uc.status = 'completed';
    uc.completedAt = new Date().toISOString();
    shopState.partnerPendingCoupons = shopState.partnerPendingCoupons.filter(c => c.id !== uc.id);
    saveLocalShop();
    renderShop();
    closeModal('pendingModal');

    if (window.BaseApp) {
      window.BaseApp.bunnySay(`🎉 太棒了！已確認履行核銷，你們真是太甜蜜了！`);
    }

    try {
      await API.shopComplete(uc.id);
      syncShop(true);
    } catch (e) {
      console.warn('履約完成後台同步失敗:', e);
    }
  }

  // ==========================================
  // 彈窗交互邏輯
  // ==========================================
  function openModal(id) {
    const el = $(id);
    if (el) el.classList.add('show');
  }

  function closeModal(id) {
    const el = $(id);
    if (el) el.classList.remove('show');
  }

  function setupModals() {
    // 關閉按鈕
    document.querySelectorAll('[data-modal-close]').forEach(btn => {
      btn.addEventListener('click', () => closeModal(btn.dataset.modalClose));
    });

    // 點擊背景關閉
    document.querySelectorAll('.modal-overlay').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal(modal.id);
      });
    });

    // 1. 打賞彈窗
    $('openRewardModalBtn').addEventListener('click', () => {
      openModal('rewardModal');
    });

    let selectedAmount = 10;
    const amountBtns = document.querySelectorAll('#rewardAmountGroup button');
    amountBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        amountBtns.forEach(b => {
          b.style.borderColor = '';
          b.style.background = '';
        });
        btn.style.borderColor = 'var(--pink)';
        btn.style.background = 'var(--pink-soft)';
        selectedAmount = parseInt(btn.dataset.amount, 10);
      });
    });

    $('submitRewardBtn').addEventListener('click', async () => {
      const reason = $('rewardReasonInput').value.trim() || '表現超棒！給予甜甜獎勵 ❤️';
      const auth = API.getAuth();
      const user = auth ? auth.user : 'a';
      const partner = user === 'a' ? 'b' : 'a';

      // 樂觀更新誇誇
      const newPraise = {
        id: 'REW_' + Date.now(),
        user: partner,
        amount: selectedAmount,
        reason: reason,
        fromUser: user,
        createdAt: new Date().toISOString()
      };
      shopState.praises.unshift(newPraise);
      saveLocalShop();
      renderShop();

      closeModal('rewardModal');
      $('rewardReasonInput').value = '';

      if (window.BaseApp) {
        window.BaseApp.bunnySay(`🎁 成功犒賞 ${getPartnerName()} +${selectedAmount} 兔兔幣！`);
      }

      try {
        await API.shopReward(selectedAmount, reason);
        syncShop(true);
      } catch (e) {
        console.warn('打賞同步失敗:', e);
      }
    });

    // 2. 新增自訂券彈窗
    $('openAddCouponModalBtn').addEventListener('click', () => {
      openModal('addCouponModal');
    });

    let selectedIcon = '🎟️';
    const iconBtns = document.querySelectorAll('#couponIconGroup button');
    iconBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        iconBtns.forEach(b => {
          b.style.borderColor = '';
          b.style.background = '';
        });
        btn.style.borderColor = 'var(--pink)';
        btn.style.background = 'var(--pink-soft)';
        selectedIcon = btn.dataset.icon;
      });
    });

    $('submitAddCouponBtn').addEventListener('click', async () => {
      const title = $('couponTitleInput').value.trim();
      const desc = $('couponDescInput').value.trim();
      const cost = parseInt($('couponCostInput').value || '30', 10);

      if (!title) {
        alert('請填寫卡券名稱喔！');
        return;
      }

      const customCoupon = {
        id: 'CUSTOM_' + Date.now(),
        title,
        desc,
        cost,
        icon: selectedIcon,
        createdBy: (API.getAuth() ? API.getAuth().user : 'a'),
        createdAt: new Date().toISOString()
      };

      shopState.shopCoupons.push(customCoupon);
      saveLocalShop();
      renderShop();

      closeModal('addCouponModal');
      $('couponTitleInput').value = '';
      $('couponDescInput').value = '';

      if (window.BaseApp) {
        window.BaseApp.bunnySay(`🛒 願望券【${title}】已成功上架！`);
      }

      try {
        await API.shopAddCoupon(title, desc, cost, selectedIcon);
        syncShop(true);
      } catch (e) {
        console.warn('新增卡券同步失敗:', e);
      }
    });

    // 3. 待履約彈窗
    $('openPendingModalBtn').addEventListener('click', () => {
      const pendingList = shopState.partnerPendingCoupons || [];
      const contentEl = $('pendingModalContent');
      contentEl.innerHTML = '';

      if (pendingList.length === 0) {
        contentEl.innerHTML = '<p style="text-align:center; color:var(--ink-soft);">目前沒有待履行的特權券喔！</p>';
      } else {
        pendingList.forEach(uc => {
          const item = document.createElement('div');
          item.className = 'coupon-ticket is-using';
          item.innerHTML = `
            <div class="coupon-main">
              <div class="coupon-title-wrap">
                <span class="coupon-icon">${uc.icon || '🎟️'}</span>
                <h4 class="coupon-title">${escapeHTML(uc.title)}</h4>
              </div>
              <p class="coupon-desc">${escapeHTML(uc.desc || '')}</p>
            </div>
            <div class="coupon-divider"></div>
            <div class="coupon-stub" style="width:78px; min-width:78px;">
              <button type="button" class="stub-btn primary complete-btn" style="font-size:0.72rem; padding:6px 4px;">完成核銷</button>
            </div>
          `;
          item.querySelector('.complete-btn').addEventListener('click', () => completeCoupon(uc));
          contentEl.appendChild(item);
        });
      }
      openModal('pendingModal');
    });

    // 前往市集按鈕
    const goToMarket = $('goToMarketBtn');
    if (goToMarket) {
      goToMarket.addEventListener('click', () => switchShopTab('market'));
    }
  }

  // ==========================================
  // 分頁切換
  // ==========================================
  function switchShopTab(tabType) {
    currentShopTab = tabType;
    document.querySelectorAll('[data-shop-tab]').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.shopTab === tabType);
    });

    $('shopMarketView').hidden = (tabType !== 'market');
    $('shopBackpackView').hidden = (tabType !== 'backpack');
    $('shopPraisesView').hidden = (tabType !== 'praises');
  }

  function setupTabs() {
    document.querySelectorAll('[data-shop-tab]').forEach(tab => {
      tab.addEventListener('click', () => switchShopTab(tab.dataset.shopTab));
    });
  }

  function escapeHTML(str) {
    return String(str || '').replace(/[&<>'"]/g, tag => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[tag] || tag));
  }

  // 初始化
  loadLocalShop();
  document.addEventListener('DOMContentLoaded', () => {
    setupTabs();
    setupModals();
    renderShop();
    syncShop(true);
  });

  window.ShopApp = {
    sync: syncShop,
    render: renderShop,
    switchTab: switchShopTab
  };

})();

