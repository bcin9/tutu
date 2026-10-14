/**
 * 交換秘密功能
 */
(function() {
  const API = window.BaseAPI;
  const $ = id => document.getElementById(id);
  const CONFIG = window.BASE_CONFIG;
  
  let currentSecret = null;
  
  async function loadTodaySecret() {
    try {
      $('secretContent').hidden = true;
      $('secretLoading').hidden = false;
      const data = await API.secretToday();
      currentSecret = data;
      renderSecret(data);
    } catch (e) {
      console.error(e);
      $('secretLoading').textContent = '載入失敗，請稍後再試。';
    }
  }
  
  function renderSecret(data) {
    $('secretLoading').hidden = true;
    $('secretContent').hidden = false;
    
    $('secretDate').textContent = data.date;
    $('secretQ').textContent = data.question;
    $('homeSecretQ').textContent = data.question; // Update home page widget
    
    const mySection = $('myAnswerSection');
    const partnerSection = $('partnerAnswerSection');
    
    if (data.myAnswer) {
      // I have answered
      mySection.innerHTML = `
        <div class="answer-card mine">
          <div class="answer-meta">我的回答</div>
          <p>${escapeHTML(data.myAnswer)}</p>
        </div>
      `;
      $('homeSecretStatus').textContent = '你已回答';
      
      if (data.partnerAnswered) {
        // Both answered
        const partnerName = getPartnerName();
        partnerSection.innerHTML = `
          <div class="answer-card partner">
            <div class="answer-meta">${partnerName}的回答</div>
            <p>${escapeHTML(data.partnerAnswer)}</p>
          </div>
        `;
        $('homeSecretStatus').textContent = '雙方已解鎖';
        $('secretTabDot').hidden = true;
      } else {
        // Waiting for partner
        const partnerName = getPartnerName();
        partnerSection.innerHTML = `
          <div class="wait-card">
            等待 ${partnerName} 回答後解鎖... 🐰
          </div>
        `;
        $('homeSecretStatus').textContent = `等待${partnerName}回答`;
      }
    } else {
      // I haven't answered
      mySection.innerHTML = `
        <textarea id="myAnswerInput" placeholder="寫下你的回答..." rows="4"></textarea>
        <button type="button" class="btn primary" id="submitAnswerBtn">送出回答</button>
        <p class="error-msg" id="answerError"></p>
      `;
      $('submitAnswerBtn').addEventListener('click', submitAnswer);
      
      partnerSection.innerHTML = `
        <div class="wait-card">
          ${data.partnerAnswered ? getPartnerName() + ' 已經回答了！快寫下你的答案來解鎖吧 🔒' : '回答後即可看到對方的答案 🔒'}
        </div>
      `;
      $('homeSecretStatus').textContent = data.partnerAnswered ? '對方已回答' : '尚未回答';
      $('secretTabDot').hidden = !data.partnerAnswered;
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
    
    try {
      const data = await API.secretAnswer(currentSecret.date, input);
      currentSecret = data;
      renderSecret(data);
      window.BaseApp.bunnySay('秘密已經幫你收好囉！');
    } catch (e) {
      console.error(e);
      errorEl.textContent = '發生錯誤，請重試。';
      btn.disabled = false;
      btn.textContent = '送出回答';
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
  
  // Expose init
  window.SecretApp = { init: loadTodaySecret };
  
  // Listen to app enter
  document.addEventListener('DOMContentLoaded', () => {
    // If we are already logged in (checked by app.js), let's load it
    // But since API auth might be checked late, let's hook into app.js
    // Or just run it when tab is clicked for the first time
    const tab = document.querySelector('[data-tab="secret"]');
    if(tab) {
      tab.addEventListener('click', () => {
        if (!currentSecret) loadTodaySecret();
      });
    }
    // Preload for home widget
    if (API.getAuth()) {
      loadTodaySecret();
    }
  });

})();
