/**
 * 約會計畫：盲盒抽卡與約會清單邏輯
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
  
  // Tab switching
  document.querySelectorAll('.list-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.list-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentTab = tab.dataset.listType;
      $('gachaView').hidden = (currentTab !== 'gacha');
      $('matchesView').hidden = (currentTab !== 'matches');
      if (currentTab === 'matches') renderMatches();
    });
  });

  // Start Gacha
  document.querySelectorAll('[data-cat]').forEach(btn => {
    btn.addEventListener('click', async () => {
      currentCategory = btn.dataset.cat;
      await prepareGachaCards(currentCategory);
    });
  });

  $('btnResetGacha').addEventListener('click', () => {
    $('categorySelector').style.display = 'block';
    $('swipeArea').style.display = 'none';
    $('swipeDone').style.display = 'none';
  });

  async function prepareGachaCards(category) {
    const auth = API.getAuth();
    if (!auth) return;
    const user = auth.user;
    
    // Get all likes from db
    const likes = JSON.parse(localStorage.getItem('base_demo_list_likes') || '[]');
    
    // Filter ideas by category
    const catIdeas = IDEAS.filter(i => i.category === category);
    
    // Find what I haven't liked yet
    const myLikes = likes.filter(l => l.user === user).map(l => l.ideaId);
    let available = catIdeas.filter(i => !myLikes.includes(i.id));
    
    if (available.length === 0) {
      alert('這個類別的任務卡已經被你抽完囉！換一個類別吧！');
      return;
    }

    // Smart Algorithm: find partner's likes that I haven't liked
    const partner = user === 'a' ? 'b' : 'a';
    const partnerLikes = likes.filter(l => l.user === partner).map(l => l.ideaId);
    const hiddenMatches = available.filter(i => partnerLikes.includes(i.id));
    
    currentCards = [];
    
    // 1. If there's a hidden match, 50% chance to guarantee it appears in the 3 cards
    if (hiddenMatches.length > 0 && Math.random() > 0.5) {
      const match = hiddenMatches[Math.floor(Math.random() * hiddenMatches.length)];
      currentCards.push(match);
      available = available.filter(i => i.id !== match.id);
    }
    
    // 2. Fill the rest randomly up to 3
    // Shuffle available
    available.sort(() => Math.random() - 0.5);
    while (currentCards.length < 3 && available.length > 0) {
      currentCards.push(available.pop());
    }
    
    // Shuffle final deck
    currentCards.sort(() => Math.random() - 0.5);
    currentCardIndex = 0;
    
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
    
    // Save like
    let likes = JSON.parse(localStorage.getItem('base_demo_list_likes') || '[]');
    likes.push({ ideaId: card.id, user: auth.user, likedAt: new Date().toISOString() });
    localStorage.setItem('base_demo_list_likes', JSON.stringify(likes));
    
    // Check match
    const partner = auth.user === 'a' ? 'b' : 'a';
    const partnerLiked = likes.some(l => l.user === partner && l.ideaId === card.id);
    
    if (partnerLiked) {
      // Create match
      let matches = JSON.parse(localStorage.getItem('base_demo_list_matches') || '[]');
      if (!matches.some(m => m.ideaId === card.id)) {
        matches.push({
          ideaId: card.id,
          matchedAt: new Date().toISOString(),
          status: 'pending',
          target: null // week, month, year
        });
        localStorage.setItem('base_demo_list_matches', JSON.stringify(matches));
      }
      
      // Fire confetti and alert
      window.BaseApp.bunnySay('🎉 配對成功！你們都想做這件事！');
      alert(`🎉 配對成功！\n\n你們都想：${card.text}\n已經加入約會清單囉！`);
    }
    
    currentCardIndex++;
    showCard();
  });

  // ==========================================
  // Matches List Logic
  // ==========================================
  function renderMatches() {
    const matches = JSON.parse(localStorage.getItem('base_demo_list_matches') || '[]');
    if (matches.length === 0) {
      $('matchesList').innerHTML = '';
      $('matchesEmpty').style.display = 'block';
      return;
    }
    
    $('matchesEmpty').style.display = 'none';
    matches.sort((a,b) => new Date(b.matchedAt) - new Date(a.matchedAt));
    
    $('matchesList').innerHTML = matches.map(m => {
      const idea = IDEAS.find(i => i.id === m.ideaId);
      if(!idea) return '';
      
      let statusBadge = '<span style="background:var(--pink); color:#fff; padding:2px 8px; border-radius:10px; font-size:0.8rem;">剛配對</span>';
      if (m.target === 'week') statusBadge = '<span style="background:var(--sage); color:#fff; padding:2px 8px; border-radius:10px; font-size:0.8rem;">這週出發</span>';
      if (m.target === 'month') statusBadge = '<span style="background:var(--sage-soft); color:var(--ink); padding:2px 8px; border-radius:10px; font-size:0.8rem;">這個月計畫</span>';
      if (m.status === 'done') statusBadge = '<span style="background:#ccc; color:#fff; padding:2px 8px; border-radius:10px; font-size:0.8rem;">已完成</span>';
      
      return `
        <div class="card" style="margin-bottom:0; padding:16px;">
          <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
            <div style="font-size:0.85rem; color:var(--ink-soft);">${new Date(m.matchedAt).toLocaleDateString()}</div>
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
    let matches = JSON.parse(localStorage.getItem('base_demo_list_matches') || '[]');
    let m = matches.find(x => x.ideaId === ideaId);
    if(m) m.target = target;
    localStorage.setItem('base_demo_list_matches', JSON.stringify(matches));
    renderMatches();
    window.BaseApp.bunnySay(target === 'week' ? '太棒了！這週就出發！' : '約好了這個月喔！');
  };
  
  window.completeMatch = function(ideaId) {
    let matches = JSON.parse(localStorage.getItem('base_demo_list_matches') || '[]');
    let m = matches.find(x => x.ideaId === ideaId);
    if(m) {
      m.status = 'done';
      m.target = null;
    }
    localStorage.setItem('base_demo_list_matches', JSON.stringify(matches));
    renderMatches();
    window.BaseApp.bunnySay('恭喜你們又創造了一個回憶！');
  };

})();
