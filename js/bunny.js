/**
 * 兔兔彩虹星球專屬邏輯 (Bunny's Rainbow Planet)
 * 包含：對兔兔說話、互動餵食、相簿回憶、每日一信
 */
(function() {
  const API = window.BaseAPI;
  const CONFIG = window.BASE_CONFIG;
  const $ = id => document.getElementById(id);

  if (!$('rabbit')) return; // 確保在 bunny.html 內

  // ===== 1. 對兔兔說說話 =====
  const bunnyMessageInput = $('bunnyMessageInput');
  const bunnySendBtn = $('bunnySendBtn');
  const bunnySendStatus = $('bunnySendStatus');
  const mailboxBadge = $('mailboxBadge');

  async function submitBunnyMessage() {
    const message = bunnyMessageInput.value.trim();
    if (!message) {
      bunnySendStatus.innerText = '請先寫下想對兔兔說的話。';
      return;
    }
    
    bunnySendBtn.disabled = true;
    bunnySendStatus.innerText = '兔兔正在收信中...';
    
    try {
      // Use the generic call to Apps Script endpoint via fetch directly if api doesn't have it
      // or we can just keep using the old direct POST logic to ensure backwards compatibility
      const url = new URLSearchParams({
        action: 'submit',
        message: message,
        createdAt: new Date().toISOString(),
        userAgent: navigator.userAgent
      });
      
      const response = await fetch(`${CONFIG.api}?${url.toString()}`);
      const data = await response.json();
      
      if (!response.ok || !data.ok) throw new Error('request-failed');
      
      bunnyMessageInput.value = '';
      bunnySendStatus.innerText = '信件已寄往彩虹星球，兔兔收到後會認真讀 💌';
      
      // Save local IDs for unread badge logic
      let ids = JSON.parse(localStorage.getItem('tutu_user_message_ids') || '[]');
      if (!ids.includes(data.msgId)) ids.push(data.msgId);
      localStorage.setItem('tutu_user_message_ids', JSON.stringify(ids.slice(-200)));
      
      showToast('留言已送達兔兔信箱');
    } catch (err) {
      bunnySendStatus.innerText = '發生錯誤，請稍後再試。';
    } finally {
      bunnySendBtn.disabled = false;
    }
  }
  
  if (bunnySendBtn) {
    bunnySendBtn.addEventListener('click', submitBunnyMessage);
  }

  // ===== 2. 互動餵食 =====
  let feedCount = 0;
  const feedMessage = $('feedMessage');
  const feedCounter = $('feedCounter');
  const bunnyMood = $('bunnyMood');
  const rabbit = $('rabbit');

  const feedResponses = {
    hay: [
      '謝謝！好香，兔兔忍不住咬了一大口，肚子好溫暖～',
      '這一口草讓兔兔覺得今天特別幸福，開心地抖了抖耳朵。',
      '兔兔吃著吃著，閉上眼睛像在做一個甜甜的夢。'
    ],
    cabbage: [
      '高麗菜超級好吃！兔兔的最愛就是你的溫柔味道。',
      '這片高麗菜讓兔兔覺得自己好幸福。',
      '兔兔咬了一口高麗菜，眼睛亮晶晶的。'
    ],
    apple: [
      '蘋果甜甜的，兔兔吃了一口就把尾巴甩給你看，好開心！',
      '這顆蘋果太香了，兔兔覺得今天真的很幸福。',
      '兔兔咬下蘋果時，心裡也像陽光一樣甜。'
    ],
    banana: [
      '香蕉香香的，兔兔覺得這是今天最幸福的點心。',
      '兔兔喜歡這個香甜的香蕉，吃完後眼睛都亮了起來。',
      '香蕉的香氣像溫柔的陪伴，讓兔兔覺得好安心。'
    ],
    pet: [
      '摸摸小腦袋好舒服，兔兔覺得今天會特別幸運❤️',
      '被摸頭的時候，兔兔想著你也一定會變得很幸福。',
      '兔兔溫柔地蹭了蹭你的手掌。'
    ]
  };

  const bunnyMoodMessages = [
    '兔兔高興地抖了抖耳朵！',
    '兔兔一邊嚼草一邊看著你～',
    '兔兔舒服地瞇起眼睛了。',
    '兔兔湊近你的手掌，輕輕蹭了一下。',
    '兔兔在原地跳了一小下，心情超好！'
  ];

  let feedMessageTimeout;

  function updateFeed(type, sourceElement) {
    const texts = feedResponses[type] || feedResponses.hay;
    const text = texts[Math.floor(Math.random() * texts.length)];
    feedCount++;
    feedMessage.innerText = text;
    bunnyMood.innerText = bunnyMoodMessages[Math.floor(Math.random() * bunnyMoodMessages.length)];
    feedCounter.innerText = `今天已被寵愛了 ${feedCount} 次`;
    
    rabbit.classList.remove('kicked');
    void rabbit.offsetWidth;
    rabbit.classList.add('kicked');
    
    feedMessage.classList.add('show');
    clearTimeout(feedMessageTimeout);
    feedMessageTimeout = setTimeout(() => feedMessage.classList.remove('show'), 3000);
    
    if (sourceElement && type !== 'pet') animateFoodToBunny(type, sourceElement);
    if (type === 'pet' && sourceElement) animatePetHand(sourceElement);
    else emitBunnyBurst(type);
  }

  function emitBunnyBurst(type) {
    const rabbitRect = rabbit.getBoundingClientRect();
    const icons = { hay: ['🌾','✨'], cabbage: ['🥬','✨'], apple: ['🍎','✨'], banana: ['🍌','✨'], pet: ['❤️','✨'] }[type] || ['✨'];
    
    for (let i = 0; i < 6; i++) {
      const p = document.createElement('div');
      p.className = 'bunny-burst';
      p.innerText = icons[i % icons.length];
      p.style.left = `${rabbitRect.left + rabbitRect.width * (0.3 + Math.random() * 0.4)}px`;
      p.style.top = `${rabbitRect.top + rabbitRect.height * (0.2 + Math.random() * 0.2)}px`;
      p.style.animationDelay = `${i * 0.05}s`;
      document.body.appendChild(p);
      setTimeout(() => p.remove(), 1400);
    }
  }

  function animateFoodToBunny(type, sourceElement) {
    const icons = { hay: '🌾', cabbage: '🥬', apple: '🍎', banana: '🍌' };
    const icon = icons[type];
    if (!icon) return;
    const sRect = sourceElement.getBoundingClientRect();
    const tRect = rabbit.getBoundingClientRect();
    const fly = document.createElement('div');
    fly.className = 'flying-food';
    fly.innerText = icon;
    fly.style.left = `${sRect.left + sRect.width/2}px`;
    fly.style.top = `${sRect.top + sRect.height/2}px`;
    document.body.appendChild(fly);
    
    requestAnimationFrame(() => {
      const deltaX = (tRect.left + tRect.width*0.5) - (sRect.left + sRect.width/2);
      const deltaY = (tRect.top + tRect.height*0.4) - (sRect.top + sRect.height/2);
      fly.style.transform = `translate(calc(-50% + ${deltaX}px), calc(-50% + ${deltaY}px)) scale(0.9)`;
    });
    setTimeout(() => fly.style.opacity = '0.2', 1800);
    setTimeout(() => fly.remove(), 2400);
  }

  function animatePetHand(sourceElement) {
    const sRect = sourceElement.getBoundingClientRect();
    const tRect = rabbit.getBoundingClientRect();
    const hand = document.createElement('div');
    hand.className = 'pet-hand';
    hand.innerText = '🤚';
    hand.style.left = `${sRect.left + sRect.width/2}px`;
    hand.style.top = `${sRect.top + sRect.height/2}px`;
    document.body.appendChild(hand);
    
    const deltaX = (tRect.left + tRect.width*0.5) - (sRect.left + sRect.width/2);
    const deltaY = (tRect.top + tRect.height*0.2) - (sRect.top + sRect.height/2);
    
    requestAnimationFrame(() => {
      hand.style.transform = `translate(calc(-50% + ${deltaX}px), calc(-50% + ${deltaY}px)) scale(1)`;
    });
    setTimeout(() => hand.style.opacity = '0', 2000);
    setTimeout(() => hand.remove(), 2500);
    emitBunnyBurst('pet');
  }

  document.querySelectorAll('[data-feed]').forEach(btn => {
    btn.addEventListener('click', (e) => updateFeed(btn.dataset.feed, btn));
  });

  // ===== 3. 相簿與記憶星星 =====
  const galleryPhotos = [
    { src: 'images/IMG_0452.jpg', caption: '' },
    { src: 'images/IMG_20200816_124504.jpg', caption: '' },
    { src: 'images/IMG_20200816_191124.jpg', caption: '' },
    { src: 'images/IMG_20200831_183158.jpg', caption: '' },
    { src: 'images/IMG_20200902_185430.jpg', caption: '' },
    { src: 'images/IMG_20200906_133521.jpg', caption: '' },
    { src: 'images/IMG_20200917_205452.jpg', caption: '' }
  ];
  const galleryTrack = $('galleryTrack');
  const memoryToast = $('memoryToast');
  const memoryMessage = $('memoryMessage');
  const starOverlay = $('starOverlay');
  let currentMemory = 0;
  let galleryCards = [];

  function renderGallery() {
    if (!galleryTrack) return;
    galleryPhotos.forEach(photo => {
      const card = document.createElement('div');
      card.className = 'polaroid-card';
      card.innerHTML = `<img src="${photo.src}" alt="${photo.caption}" loading="lazy"><div class="polaroid-caption">${photo.caption}</div>`;
      galleryTrack.appendChild(card);
    });
    galleryCards = Array.from(galleryTrack.querySelectorAll('.polaroid-card'));
    updateGallery();
  }

  function updateGallery() {
    if(!galleryCards.length) return;
    const isMobile = window.innerWidth <= 720;
    const visibleCount = isMobile ? 1 : 3;
    galleryCards.forEach(c => c.style.display = 'none');
    for (let i = 0; i < visibleCount; i++) {
      galleryCards[(currentMemory + i) % galleryCards.length].style.display = 'block';
    }
  }

  $('btnPrevMemory')?.addEventListener('click', () => {
    currentMemory = (currentMemory - 1 + galleryCards.length) % galleryCards.length;
    updateGallery();
  });
  $('btnNextMemory')?.addEventListener('click', () => {
    currentMemory = (currentMemory + 1) % galleryCards.length;
    updateGallery();
  });
  
  $('btnSubmitMemory')?.addEventListener('click', () => {
    showToast('回憶已送出，兔兔收到你的小星星了 ✨');
    memoryMessage.innerText = '兔兔感覺得到你的溫柔，牠抬頭看著你微笑。';
    for (let i = 0; i < 15; i++) {
      const star = document.createElement('div');
      star.className = 'star';
      star.style.left = `${Math.random() * 100}%`;
      star.style.top = `${Math.random() * 100}%`;
      star.style.animationDuration = `${0.8 + Math.random()}s`;
      starOverlay.appendChild(star);
      setTimeout(() => star.remove(), 1500);
    }
  });

  function showToast(text) {
    if(!memoryToast) return;
    memoryToast.innerText = text;
    memoryToast.classList.add('show');
    setTimeout(() => memoryToast.classList.remove('show'), 2000);
  }

  window.addEventListener('resize', updateGallery);
  renderGallery();

  // ===== 4. 每日信封 =====
  const letterCard = $('letterCard');
  const letterBackText = $('letterBackText');
  const letterMessages = [
    '今天有沒有下雨？出門記得帶傘喔！',
    '我在大草原吃得超飽，太陽剛剛好，你也要乖乖吃飯喔！',
    '不管發生什麼事，兔兔都希望你能記得你真的很重要。',
    '如果覺得壓力大，深呼吸三次，想像我在草地上輕輕跳。',
    '即使世界變化很快，兔兔的思念一直留在你身邊。'
  ];

  $('btnOpenLetter')?.addEventListener('click', () => {
    const today = new Date().toISOString().slice(0, 10);
    let msg = localStorage.getItem('tutu_letter_txt');
    if (localStorage.getItem('tutu_letter_date') !== today || !msg) {
      msg = letterMessages[Math.floor(Math.random() * letterMessages.length)];
      localStorage.setItem('tutu_letter_date', today);
      localStorage.setItem('tutu_letter_txt', msg);
    }
    letterBackText.innerText = msg;
    letterCard.classList.toggle('is-open');
  });

})();
