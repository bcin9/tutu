/**
 * 兔兔秘密基地・推播通知與對象動態監聽模組
 * ------------------------------------------------------------
 * 1. 系統通知授權（Notification API / Service Worker showNotification）
 * 2. 懸浮橫幅通知（In-app Toast）
 * 3. 即時輪詢監聽對方的動態：
 *    - 當對方回答今日秘密 -> 手機立即跳出通知！
 *    - 當對方在願望市集買東西 (兌換卡券) -> 手機立即跳出通知！
 *    - 當對方出示卡券要求履行 -> 手機立即跳出通知！
 *    - 當對方打賞兔兔幣與誇誇 -> 手機立即跳出通知！
 */
(function() {
  const API = window.BaseAPI;
  const CONFIG = window.BASE_CONFIG;
  const $ = id => document.getElementById(id);

  const NOTIF_STATE_KEY = 'tutu_notif_last_state';

  function getPartnerName() {
    const auth = API.getAuth();
    if (!auth) return '對方';
    const partnerKey = auth.user === 'a' ? 'b' : 'a';
    return CONFIG.people[partnerKey].name;
  }

  function getLastState() {
    try {
      const auth = API.getAuth();
      const raw = localStorage.getItem(`${NOTIF_STATE_KEY}_${auth ? auth.user : 'guest'}`);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function saveLastState(state) {
    try {
      const auth = API.getAuth();
      localStorage.setItem(`${NOTIF_STATE_KEY}_${auth ? auth.user : 'guest'}`, JSON.stringify(state));
    } catch (_) {}
  }

  // ==========================================
  // 1. 權限管理
  // ==========================================
  function isNotificationSupported() {
    return ('Notification' in window);
  }

  function getPermission() {
    if (!isNotificationSupported()) return 'denied';
    return Notification.permission;
  }

  async function requestNotificationPermission() {
    if (!isNotificationSupported()) {
      alert('你的瀏覽器暫時不支援通知功能喔！如果是 iPhone，請先點「分享 → 加入主畫面」安裝成 App 即可開啟通知。');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      updateBellButton();
      if (result === 'granted') {
        sendNotification('🔔 兔兔基地通知已開啟', '當對方回答秘密、在市集買券或出示特權時，手機都會第一時間收到提醒！', { tag: 'welcome' });
        if (window.BaseApp) window.BaseApp.bunnySay('🔔 成功開啟手機推播通知囉！');
        return true;
      } else {
        alert('若想接收通知，可以在手機設定中允許通知喔！');
        return false;
      }
    } catch (e) {
      console.warn('請求通知權限失敗:', e);
      return false;
    }
  }

  function updateBellButton() {
    const btn = $('notifBellBtn');
    if (!btn) return;
    const perm = getPermission();
    if (perm === 'granted') {
      btn.textContent = '🔔 通知已開';
      btn.style.opacity = '0.75';
      btn.style.borderColor = 'var(--sage)';
      btn.style.color = 'var(--sage)';
    } else {
      btn.textContent = '🔔 開啟通知';
      btn.style.opacity = '1';
      btn.style.borderColor = 'var(--pink)';
      btn.style.color = 'var(--pink)';
    }
  }

  // ==========================================
  // 2. 發送手機與站內通知
  // ==========================================
  let toastTimer = null;

  function showInAppToast(title, body, targetView) {
    const toast = $('inappToast');
    if (!toast) return;

    toast.innerHTML = `
      <div class="inapp-toast-icon">💌</div>
      <div class="inapp-toast-body">
        <h4 class="inapp-toast-title">${title}</h4>
        <p class="inapp-toast-desc">${body}</p>
      </div>
      <div class="inapp-toast-arrow">查看 →</div>
    `;

    toast.onclick = () => {
      toast.classList.remove('show');
      if (targetView && window.BaseApp) {
        window.BaseApp.showView(targetView);
      }
    };

    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove('show');
    }, 5500);

    if ('vibrate' in navigator) {
      try { navigator.vibrate([150, 70, 150]); } catch (_) {}
    }
  }

  function sendNotification(title, body, options = {}) {
    showInAppToast(title, body, options.view || 'home');

    if (getPermission() === 'granted') {
      const notifOptions = {
        body: body,
        icon: 'images/IMG_4011-icon-192.png',
        badge: 'images/IMG_4011-icon-192.png',
        tag: options.tag || 'tutu-notice',
        vibrate: [200, 100, 200],
        requireInteraction: false
      };

      if ('serviceWorker' in navigator && navigator.serviceWorker.ready) {
        navigator.serviceWorker.ready.then(reg => {
          reg.showNotification(title, notifOptions).catch(() => {
            try { new Notification(title, notifOptions); } catch (_) {}
          });
        }).catch(() => {
          try { new Notification(title, notifOptions); } catch (_) {}
        });
      } else {
        try { new Notification(title, notifOptions); } catch (_) {}
      }
    }
  }

  // ==========================================
  // 3. 背景輪詢監聽對方的動態 (Activity Tracker)
  // ==========================================
  let isTracking = false;
  let trackerInterval = null;

  async function checkPartnerActivity() {
    const auth = API.getAuth();
    if (!auth) return;

    const partnerName = getPartnerName();
    let lastState = getLastState();

    try {
      // 1. 檢查今日交換秘密
      const secretData = await API.secretToday().catch(() => null);
      if (secretData && secretData.ok) {
        if (lastState && lastState.secretDate === secretData.date) {
          if (!lastState.partnerAnswered && secretData.partnerAnswered) {
            sendNotification(
              `🔒 交換秘密・${partnerName}已回答！`,
              `${partnerName} 已經寫下今日秘密囉，快來解鎖對方的真心話 ✨`,
              { tag: 'secret-answered', view: 'secret' }
            );
          }
        }
      }

      // 2. 檢查願望市集
      const shopData = await API.shopState().catch(() => null);
      if (shopData && shopData.ok) {
        const partnerCoupons = shopData.partnerCoupons || [];
        const partnerPending = shopData.partnerPendingCoupons || [];
        const praises = shopData.praises || [];

        if (lastState) {
          // (a) 檢查是否有新出示的特權券（待我履行）
          const prevPendingIds = (lastState.pendingCouponIds || []);
          const newlyUsed = partnerPending.filter(c => !prevPendingIds.includes(c.id));
          if (newlyUsed.length > 0) {
            sendNotification(
              `💌 ${partnerName} 向你出示了特權券！`,
              `【${newlyUsed[0].title}】等待你來履行核銷喔 ⏳`,
              { tag: 'coupon-used', view: 'shop' }
            );
          }

          // (b) 檢查對方是否剛在市集買了新卡券
          const prevCouponsCount = Number(lastState.partnerCouponsCount || 0);
          if (partnerCoupons.length > prevCouponsCount) {
            const latestCoupon = partnerCoupons[partnerCoupons.length - 1];
            const title = latestCoupon ? latestCoupon.title : '特權券';
            sendNotification(
              `🛒 願望市集・${partnerName}兌換了新卡券！`,
              `${partnerName} 剛剛在市集買了【${title}】🎒！`,
              { tag: 'coupon-bought', view: 'shop' }
            );
          }

          // (c) 檢查對方是否剛打賞我兔兔幣
          const prevPraiseCount = Number(lastState.praisesCount || 0);
          if (praises.length > prevPraiseCount) {
            const latestPraise = praises[0];
            if (latestPraise && latestPraise.fromUser !== auth.user) {
              sendNotification(
                `🎁 ${partnerName} 犒賞了你兔兔幣！`,
                `送給你 +${latestPraise.amount} 幣：「${latestPraise.reason}」❤️`,
                { tag: 'praises-rewarded', view: 'shop' }
              );
            }
          }
        }

        // 更新最後已知狀態
        saveLastState({
          secretDate: secretData ? secretData.date : (lastState ? lastState.secretDate : ''),
          partnerAnswered: secretData ? !!secretData.partnerAnswered : false,
          partnerCouponsCount: partnerCoupons.length,
          pendingCouponIds: partnerPending.map(c => c.id),
          praisesCount: praises.length,
          lastChecked: Date.now()
        });
      }
    } catch (e) {
      console.warn('動態追蹤檢查失敗:', e);
    }
  }

  function startTracker() {
    if (isTracking) return;
    isTracking = true;
    checkPartnerActivity();
    trackerInterval = setInterval(checkPartnerActivity, 15000);
  }

  // ==========================================
  // 初始化與事件綁定
  // ==========================================
  document.addEventListener('DOMContentLoaded', () => {
    updateBellButton();

    const bellBtn = $('notifBellBtn');
    if (bellBtn) {
      bellBtn.addEventListener('click', () => {
        const perm = getPermission();
        if (perm === 'granted') {
          sendNotification('🐰 測試通知', '手機推播通知運作正常！隨時為你接收另一半的新動態～', { tag: 'test' });
        } else {
          requestNotificationPermission();
        }
      });
    }

    if (API.getAuth()) {
      startTracker();
    }
  });

  window.TutuNotify = {
    requestPermission: requestNotificationPermission,
    send: sendNotification,
    check: checkPartnerActivity,
    start: startTracker
  };
})();
