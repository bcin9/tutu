/**
 * 秘密基地設定檔
 * ------------------------------------------------------------
 * 你們的名字、紀念日都在這裡改，改完存檔就好，不用動其他程式。
 */
window.BASE_CONFIG = {
  // 基地名字（顯示在首頁上方）
  baseName: '我們的秘密基地',

  // 兩個人的資料：a = 你，b = 女朋友
  // （要跟後台 couple-api.gs 裡的 a / b 對應）
  people: {
    a: { name: 'BC', emoji: '👦🏻' },
    b: { name: 'JC', emoji: '👧🏻' }
  },

  // 在一起的紀念日（YYYY-MM-DD），用來算「在一起第幾天」
  anniversary: '2025-06-10',

  // 兔兔的名字
  bunnyName: '兔兔',

  // 你們共用的 Google Maps 清單分享連結（可留空）
  mapsListUrl: '',

  // 後台網址（沿用原本兔兔信箱的 Apps Script）
  api: 'https://script.google.com/macros/s/AKfycbz6EjuzhjP06-f30c2rkZpLY5JWGf0A4c7ma05EHcntdhvnJ5YaI0I5XTe-aGT2gkDB/exec',

  // 兔兔信差隨機說的話（點一下角落的兔兔會出現）
  bunnyLines: [
    '今天也要好好吃飯喔～',
    '我在彩虹星球看著你們，好開心！',
    '偷偷告訴你：對方今天也有想你。',
    '記得喝水，也記得抱抱對方。',
    '有秘密要交換嗎？我可以幫忙送信喔 💌',
    '今天的雲很軟，像我的毛一樣。',
    '你們一起笑的時候，星星都會變亮。',
    '要不要一起想想，下一餐吃什麼？'
  ]
};
