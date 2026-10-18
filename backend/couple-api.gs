/**
 * 秘密基地後台（兩人專用）
 * ------------------------------------------------------------
 * 這個檔案跟 google-apps-script.gs 放在「同一個」Apps Script 專案裡
 * （在 Apps Script 編輯器左側按「＋」→「指令碼」新增一個檔案，貼上這份內容）。
 *
 * 所有 action 都以 couple_ 開頭，由 google-apps-script.gs 的 doGet 轉進來。
 * 舊的兔兔信箱功能完全不受影響。
 */

// ===== 1) 兩個人的密碼（第一次部署前請改掉！）=====
// a = 你，b = 女朋友。密碼建議 4~6 位數字。
// 部署後也可以到「專案設定 → 指令碼屬性」新增 pin_a / pin_b 來覆蓋這裡的值。
const COUPLE_DEFAULT_PINS = {
  a: '0000',
  b: '1111'
};

const COUPLE_TZ = 'Asia/Taipei';

const SECRET_ANSWERS_SHEET = 'secret_answers';
const SECRET_ANSWERS_HEADER = ['date', 'user', 'answer', 'answeredAt'];

const GACHA_LIKES_SHEET = 'gacha_likes';
const GACHA_LIKES_HEADER = ['ideaId', 'user', 'likedAt'];

const GACHA_MATCHES_SHEET = 'gacha_matches';
const GACHA_MATCHES_HEADER = ['ideaId', 'matchedAt', 'status', 'target'];

const COUPLE_LISTS = {
  places: {
    sheet: 'places',
    header: ['id', 'name', 'url', 'note', 'addedBy', 'createdAt', 'done', 'review', 'rating', 'doneAt'],
    editable: ['name', 'url', 'note', 'done', 'review', 'rating', 'doneAt']
  },
  countries: {
    sheet: 'countries',
    header: ['id', 'name', 'flag', 'status', 'note', 'visitedDate', 'addedBy', 'createdAt'],
    editable: ['name', 'flag', 'status', 'note', 'visitedDate']
  }
};

// ===== 2) 交換秘密題庫 =====
// 每天依日期輪流出一題，兩個人看到的一定是同一題。
// 想加題目直接往下加就好（加在最後面，才不會打亂以前的題目）。
const SECRET_QUESTIONS = [
  "你第一次覺得「完了，我喜歡上對方了」是什麼時候？",
  "我們第一次約會，你印象最深的是什麼？",
  "有沒有哪一天，你回家後一直偷笑想著我？是哪一天？",
  "你記得我們第一次牽手的情況嗎？描述一下。",
  "認識我之前，你想像中的另一半是什麼樣子？",
  "在一起之後，你最常偷偷回想的一個畫面是什麼？",
  "我們吵過最好笑的一次架是什麼？",
  "你第一次見到我的時候，第一印象是什麼？（要誠實）",
  "我們一起去過的地方，你最想再去一次的是哪裡？",
  "你最喜歡我們的哪一張合照？為什麼？",
  "我做過最讓你感動的一件小事是什麼？",
  "有沒有一句我說過的話，你到現在都還記得？",
  "你覺得我們最有默契的一次是什麼時候？",
  "和兔兔有關的回憶裡，你最常想起的是哪一個畫面？",
  "兔兔做過最好笑的蠢事是什麼？",
  "最近有什麼小事讓你覺得很幸福？",
  "如果明天可以請一天假只陪對方，你想怎麼過？",
  "你最喜歡我穿哪一件衣服？",
  "我身上有什麼小習慣，是你偷偷覺得很可愛的？",
  "最近有沒有什麼事想跟我說，但一直沒說出口？",
  "你覺得我最近最辛苦的是什麼事？",
  "你最喜歡我們一起吃的哪一道料理？",
  "如果今天晚餐由你決定，你會選什麼？",
  "你心情不好的時候，最希望我怎麼做？",
  "你最喜歡我叫你的哪一個稱呼？",
  "我做什麼事的時候，你覺得我最帥／最美？",
  "最近一次因為我而笑出來是什麼事？",
  "你覺得我們兩個最像的地方是什麼？",
  "你覺得我們兩個最不一樣的地方是什麼？",
  "有沒有什麼事，你很想跟我一起學？",
  "五年後的今天，你希望我們在做什麼？",
  "如果可以和我一起住在任何一個國家，你會選哪裡？",
  "你夢想中我們的家，一定要有什麼？",
  "如果我們存到一筆錢，你第一個想拿去做什麼？",
  "有沒有一個地方，你想等「某個特別的日子」再跟我一起去？",
  "你覺得我們老了以後會是什麼樣子？",
  "未來如果再養一隻小動物，你想取什麼名字？",
  "今年結束前，你最想跟我一起完成的一件事？",
  "如果可以和我一起挑戰一件瘋狂的事，你會選什麼？",
  "你希望我們每年都一定要做的一件事是什麼？",
  "你最喜歡我身上的哪個部位？",
  "你覺得我什麼時候最讓你心動？",
  "有沒有什麼時候你超想抱我，但沒有說？",
  "說一個你從來沒跟我說過的小秘密。",
  "如果用三個詞形容我，你會選哪三個？",
  "你偷偷吃過我的醋嗎？是什麼時候？",
  "你覺得我們之間最浪漫的一刻是什麼？",
  "如果現在可以傳一句話給一年前的我，你會說什麼？",
  "你最想再聽我說一次的一句話是什麼？",
  "說一件你覺得「只有我們兩個知道」的事。",
  "如果我變成一種動物，你覺得我會是什麼？",
  "如果我們兩個一起開一間店，你想開什麼店？",
  "如果我們的愛情是一部電影，片名叫什麼？",
  "你覺得我在殭屍末日裡能活多久？",
  "如果只能帶一樣東西跟我去無人島，你帶什麼？",
  "如果交換身體一天，你最想用我的身體做什麼？",
  "我們兩個誰比較會撒嬌？舉個例子。",
  "如果幫我們的秘密基地取一個新名字，你會取什麼？",
  "你覺得兔兔在彩虹星球上，現在每天都在幹嘛？",
  "用一個 emoji 形容今天的你，為什麼？",
  "如果現在可以立刻親我一下，你想親哪裡？",
  "我說過的哪一句讚美，讓你暗爽了最久？",
  "你最喜歡我對你撒嬌的方式是什麼？",
  "如果我們兩個走在路上突然下暴雨，你第一反應會做什麼？",
  "我們在一起後，你哪一次最捨不得跟我說再見？",
  "如果用一首歌代表我們現在的感情，你會選哪一首？",
  "你覺得我最性感或最有魅力的瞬間是什麼時候？",
  "如果可以在我身上貼一個「使用說明標籤」，你會寫什麼？",
  "你最喜歡我們在被窩裡聊天的什麼話題？",
  "有沒有哪一次看著我，心裡突然浮現「這輩子就是你了」的念念頭？",
  "你覺得我們兩個抱在一起的時候，感覺像什麼？",
  "我做過哪一個無意間的小動作，讓你心跳漏了一拍？",
  "如果給我一個超能力，你希望我擁有什麼？",
  "你最喜歡我握著你的手，還是勾著你的手臂？",
  "有沒有哪一天醒來看到身邊是我，覺得特別踏實？",
  "如果我們現在只有 10 秒鐘可以待在一起，你會想跟我做什麼？",
  "你覺得我身上最特別的氣味是什麼？",
  "你最喜歡我注視你的眼神，還是偷看被你抓包的瞬間？",
  "如果有一天我突然向你撒嬌要抱抱，你會怎麼反應？",
  "我們之間最讓你臉紅心跳的一次接觸是什麼時候？",
  "你最希望我常常對你說哪一句話？",
  "如果把我們的情侶日常畫成漫畫，第一頁會是什麼畫面？",
  "你最喜歡我笑起來的樣子，還是認真專注的樣子？",
  "你手機相簿裡，哪一張我的照片你覺得最可愛但從沒給我看過？",
  "有沒有哪一次你其實超級想我，但嘴硬沒有說？",
  "如果回到我們剛認識的第一天，你會對那時的自己說什麼？",
  "你最喜歡我牽你手的哪種牽法（十指緊扣、輕輕拉著、放口袋裡）？",
  "如果我們兩個只能挑一個情侶配件，你會挑戒指、項鍊、手鍊還是衣服？",
  "你覺得我們在一起之後，你最大的改變是什麼？",
  "有沒有哪一刻，你覺得「還好當初我有鼓起勇氣」？",
  "你覺得我對你做過最霸氣或最貼心的一件事是什麼？",
  "如果今天晚上可以在星空下約會，你想跟我說些什麼？",
  "你最喜歡我叫你寶貝，還是叫你的全名？",
  "如果用一種甜點形容我，你覺得是什麼？",
  "哪一次跟我道別回家後，你馬上就發訊息說想我了？",
  "你覺得我們兩個是互補型還是相似型？哪裡最互補？",
  "如果可以偷聽我心裡的一個想法，你現在最想聽什麼？",
  "你覺得我最依賴你的是哪一方面？",
  "如果我們要一起拍情侶寫真，你想拍什麼風格（復古、韓系、搞怪、睡衣）？",
  "你有沒有夢過我？夢裡我們在幹嘛？",
  "你覺得我們兩個一起去超市時，最像老夫老妻的瞬間是什麼？",
  "如果早餐只能為對方做一道料理，你會做什麼給我吃？",
  "我生氣或悶悶不樂的時候，用什麼招數逗我最有效？",
  "你覺得我們兩個誰比較愛賴床？有什麼搞笑的叫起床經驗嗎？",
  "如果週末我們整天不出門，最理想的一天長怎樣？",
  "我身上哪一個怪癖或口頭禪，不知不覺也被你傳染了？",
  "你覺得我們兩個誰在外面比較有偶包？",
  "挑一部你最想拉著我一起二刷的電影或影集。",
  "如果今天冰箱只剩三樣食材，你敢吃我煮的黑暗料理嗎？",
  "我們一起吃過最驚豔的一頓路邊攤或平價美食是什麼？",
  "你覺得我穿居家服好看，還是盛裝打扮好看？",
  "我們兩個一起出門，誰通常花比較久時間準備？",
  "如果我們現在一起去夾娃娃機店，你覺得我們會抓到什麼？",
  "你覺得我什麼時候看起來最像個小孩子？",
  "如果有一整天可以由你安排我的所有穿搭，你會想把我打扮成怎樣？",
  "我們兩個誰的方向感比較差？有走錯路的搞笑回憶嗎？",
  "你最喜歡我們一起去散步的地點是哪裡？",
  "如果看電影遇到恐怖片，你覺得是誰會先抓緊對方？",
  "你覺得我們兩個在生活習慣上，磨合得最好的一點是什麼？",
  "我說話的哪一個語氣或表情，你覺得最有我的特色？",
  "如果要在我們家訂一條搞笑的「家規」，你會訂什麼？",
  "你覺得我們兩個吵架後，通常是誰先打破沉默？",
  "如果今天可以隨意指使我做一件事，你想叫我做什麼？",
  "你覺得我吃東西的時候，最常流露出的表情是什麼？",
  "有沒有哪一首歌，只要旋律一響起你就會聯想到我？",
  "如果我們兩個要一起組裝 IKEA 家具，你覺得我們會吵架還是默契十足？",
  "你最喜歡我在車上（或散步時）跟你聊什麼樣的八卦或瑣事？",
  "你覺得我工作或忙碌一整天回家後，最需要的是什麼？",
  "如果我們家要養一盆植物，你想養仙人掌、多肉還是小花？",
  "你覺得我最擅長照顧你的一件小細節是什麼？",
  "我們在一起後，哪一個節日讓你覺得過得最溫馨？",
  "如果兩個人可以一起學一項新技能，你想學滑板、陶藝、烘焙還是打拳？",
  "你覺得我最常忘記帶出門的東西是什麼？",
  "我們一起經歷過最累但最充實的一天是哪一天？",
  "如果今天只有一碗泡麵，我們兩個要怎麼分才公平？",
  "你最喜歡我哪一種笑聲（偷笑、大笑、傻笑還是咯咯笑）？",
  "你覺得我們兩個誰比較容易受別人影響？誰比較固執？",
  "如果有一天我突然剪了一個超奇怪的髮型，你會怎麼安慰我？",
  "我們兩個一起去逛街時，你最享受的瞬間是什麼？",
  "你覺得我們之間有沒有什麼專屬於兩人的秘密暗號？",
  "在我們這段關係裡，什麼時候讓你覺得「很有安全感」？",
  "如果可以讓我幫你分擔生活中的一件壓力，你最想丟給我什麼？",
  "你覺得在感情中，你最看重的三個特質是什麼？",
  "我們吵過架之後，你心裡最在乎的是什麼（是態度、道歉還是講道理）？",
  "認識我之後，你的愛情觀有發生什麼改變嗎？",
  "如果有一天我們意見嚴重不合，你希望我們用什麼方式溝通？",
  "你覺得我身上哪一個優點，是你很想學習或很欣賞的？",
  "當你心情跌到谷底時，你最希望得到的是安靜陪伴還是言語安慰？",
  "你有沒有什麼脆弱或自卑的一面，只敢在我面前展現？",
  "你覺得兩個人在一起，最理想的個人空間與黏在一起的比例是多少？",
  "我們經歷過的哪一次考驗，讓你覺得我們的感情更加堅定了？",
  "如果有一天你發現我不開心但沒說，你會怎麼開導我？",
  "你覺得「被愛著」的感覺，在我們生活中的哪一刻最明顯？",
  "有沒有什麼事情，是你很希望我能多理解、多包容你的？",
  "你覺得我們兩個人在一起時，你能夠做最真實的自己嗎？",
  "如果可以對我說一句藏在心底深處的感謝，你會說什麼？",
  "你覺得我們這段關係裡，目前做得最棒的一點是什麼？",
  "當你感到迷惘或焦慮時，我曾經說過或做過什麼讓你安心的事嗎？",
  "你覺得我們要一起走得長久，最需要共同努力維護的是什麼？",
  "如果可以消除我們過去交往中的某一次誤會，你想選哪一次？",
  "你覺得我是一個好的傾聽者嗎？有哪一次聊完讓你覺得被理解了？",
  "在你看來，真正的「陪伴」是什麼樣子的？",
  "如果可以讓我改掉一個小毛病（保證不生氣），你最希望我改什麼？",
  "你覺得金錢觀、生活習慣、家庭背景，哪一個對情侶最重要的考驗？",
  "有沒有什麼時候，你看著我會突然覺得「好幸運是這個人陪在我身邊」？",
  "如果我們面臨遠距離或短暫分開，你會如何讓彼此保持安心？",
  "你覺得我們之間最珍貴的信任感是怎麼建立起來的？",
  "當你做了一個重大決定時，我給過你什麼有力量的支持嗎？",
  "你覺得我們兩個人在面對壓力時，反應最大的不同是什麼？",
  "如果用一句話形容我帶給你的心靈感受，你會怎麼說？",
  "如果我們兩個穿越到古代，你覺得我們會是什麼身份？",
  "如果被困在一座無人島，我們兩個誰會負責打獵、誰負責生火？",
  "如果外星人要抓走我們其中一個，你覺得外星人會先看上誰？",
  "如果明天起床發現我們性別互換了，第一件想做的事情是什麼？",
  "如果中了一張 1000 萬的發票，你會怎麼跟對方一起花這筆錢？",
  "如果我們兩個要去參加闖關綜藝節目，你覺得我們會第一輪淘汰還是拿冠軍？",
  "如果只能選一種食物跟對方吃一輩子，你會挑火鍋、燒肉還是披薩？",
  "如果世界上有一扇任意門，推開門你想立刻牽著我站在哪裡？",
  "如果我們可以擁有一隻奇幻生物當寵物，你會選獨角獸、飛龍還是皮卡丘？",
  "如果我們兩個組一個樂團，你想當主唱、吉他手還是鼓手？團名叫什麼？",
  "如果可以凍結時間一小時，你想跟我去哪裡做什麼？",
  "如果有一天殭屍大爆發，你覺得誰會是第一個為了保護對方而犧牲的？",
  "如果時光機可以回到我們各自的小時候，你想看到幾歲的我？想對我做什麼？",
  "如果我們兩個被迫只能靠眼神交流溝通一整天，你覺得我們會崩潰還是默契爆棚？",
  "如果今天晚上世界末日要來了，最後的三個小時你想跟我怎麼度過？",
  "如果我們能搬去任何一部動漫或童話世界裡生活，你選哪一個？",
  "如果可以把對方變成一件身邊的物品隨身攜帶，你希望我變成什麼？",
  "如果我們一起經營一個 YouTube 頻道，你覺得拍什麼主題會百萬訂閱？",
  "如果超能力只能在我們牽手時才生效，你希望那是瞬移、隱形還是讀心術？",
  "如果今天去遊樂園，只能玩同一個設施連續玩 5 次，你選旋轉木馬還是大怒神？",
  "如果外賣突然送錯送了一隻超大烤火雞，我們兩個要怎麼解決它？",
  "如果我們要在荒島自立為國，國名跟國花要叫什麼名字？",
  "如果今天你的貓/狗（或兔兔）突然會說話一分鐘，你覺得牠會爆我們什麼料？",
  "如果可以給對方一個「一天皇帝特權券」，你覺得我會用在什麼奇怪的地方？",
  "如果我們兩個一起去鬼屋探險，誰會尖叫得比較大聲？",
  "如果有一顆測謊丸，你最想拿來問我哪一個問題（保證不會被揍）？",
  "如果我們要一起去擺地攤創業，賣什麼東西會賺大錢？",
  "如果可以用我的聲音設定成你的鬧鐘，你希望我說什麼叫醒你？",
  "如果可以把我們的回憶拍成一部 Netflix 影集，第一季的標題會叫什麼？",
  "如果我們可以在夜市免費吃到飽一整晚，你最想挑戰吃幾種小吃？",
  "你想像中我們未來住的家，客廳一定要有什麼傢俱或擺設？",
  "如果我們今年可以一起規劃一趟長途旅行，你心裡的第一首選是哪裡？",
  "未來如果我們要佈置一個專屬的零食櫃或書房，你會怎麼設計它？",
  "如果可以跟我一起看一場夢幻的極光，你最希望在冰島、挪威還是加拿大？",
  "你覺得十年後的我們，星期天早晨會是在做什麼？",
  "有沒有一間你收藏很久的口袋名單餐廳，一直很想跟我一起去踩點？",
  "如果未來的家可以有一個陽台或小花園，你想在那裡做什麼？",
  "你希望我們幾歲的時候，可以實現環遊世界的夢想？",
  "如果我們要一起拍一組非傳統的婚紗照（例如運動風、街頭風），你選哪種？",
  "你覺得我們老了之後，會是一對怎麼樣的老夫老妻？誰會比較囉唆？",
  "如果可以跟我一起在海邊買一間小房子度假，你最想給房子取什麼名字？",
  "未來如果我們一起養寵物，你覺得誰會是白臉、誰會是黑臉？",
  "有沒有一個國家或城市，是你發誓這輩子一定要牽著我的手去一次的？",
  "你夢想中未來的廚房，最好有一個大烤箱、中島吧台還是洗碗機？",
  "如果我們可以一起辦一個小型私密的派對，你想慶祝什麼？",
  "你希望我們在交往十週年紀念日的那一天，怎麼度過？",
  "如果我們要一起完成一張「人生 100 件事」清單，你第一個想寫上去的是什麼？",
  "未來如果我們兩個人都退休了，你最想跟我窩在哪個城市生活？",
  "你有沒有想過我們以後如果一起去露營看星星，要帶什麼好吃的？",
  "如果可以跟我一起去朝聖一場演唱會或音樂祭，你想看誰的現場？",
  "你希望我們以後的家，牆上掛滿合照還是掛藝術畫作？",
  "如果可以跟我一起學滑雪或潛水，你比較想挑戰哪一個？",
  "你覺得未來的我們，誰會是掌管家庭財務的大管家？",
  "有沒有哪一次約會的行程，是你私心覺得「這真的是我安排過最棒的一天」？",
  "如果我們要在身上刺一個只有我們看得懂的微刺青，你想刺什麼圖案？",
  "未來的每一個跨年倒數，你都想在身邊牽著誰的手？（請作答）",
  "你希望我們每年的紀念日，都維持哪一個不變的小儀式？",
  "如果可以跟我一起在國外的聖誕市集喝熱紅酒，你想去哪一個國家？",
  "你覺得我們一起走進人生的下一個階段時，最重要的是什麼？",
  "想像一下我們七十歲牽著手在公園散步的畫面，你覺得我們會聊什麼？",
  "如果兔兔現在正趴在我們中間看著我們，你覺得牠會露出什麼眼神？",
  "每次看到兔兔的照片，你心裡第一個浮現的感覺是什麼？",
  "如果兔兔可以託夢給我們一句話，你覺得牠最想告訴我們什麼？",
  "在我們相處的時光裡，你覺得兔兔教會了我們什麼樣的愛？",
  "如果兔兔現在就在彩虹星球的大草地上奔跑，你猜牠今天吃了多少草？",
  "每次想起和兔兔有關的回憶，最讓你嘴角忍不住上揚的是哪一幕？",
  "如果可以在彩虹星球為兔兔蓋一座遊樂園，你一定要幫牠蓋什麼設施？",
  "你覺得兔兔現在在天上，是不是也在偷偷保佑我們兩個每天開開心心？",
  "如果可以再摸一次兔兔的小腦袋，你想溫柔地對牠說什麼？",
  "看著現在的我們越來越好，你覺得兔兔一定也為我們感到驕傲對不對？",
  "我們在一起以來，哪一個瞬間讓你覺得最被愛、被珍惜？",
  "你記得我們第一次看電影是看哪一部嗎？那時心裡在想什麼？",
  "有沒有哪一次我們兩個人笑到肚子痛停不下來？是為了什麼事？",
  "你最難忘的一頓飯，是哪一次我們在哪裡吃的？",
  "我們曾經去過的哪一個夜景或海邊，是你至今閉上眼還會想念的？",
  "你覺得我們剛認識的時候，誰比較害羞內向？",
  "有沒有哪一次我送你的禮物或小卡片，你一直小心翼翼珍藏著？",
  "在我們牽手走過的街道裡，哪一條路對你來說最有特別的意義？",
  "你還記得我們第一次說出「我喜歡你」或「我愛你」的場景嗎？",
  "如果把我們在一起的點點滴滴剪成一部微電影，片尾曲你想放哪首歌？",
  "哪一次我生病或不舒服的時候，你的心裡有多著急？",
  "我們一起經歷過最驚險或手忙腳亂的一件事是什麼？",
  "哪一次見面時，你看見我的第一眼，心裡忍不住讚嘆「今天也太好看了」？",
  "你還記得我們第一次一起搭火車或高鐵去外地玩的心情嗎？",
  "在所有我們拍過的自拍合照裡，你最喜歡的一張是在哪裡拍的？",
  "有沒有哪一句我無意間說出的話，剛好解開了你當時心中的煩惱？",
  "你覺得我們兩個人之間，哪一次的擁抱最溫暖、最深刻？",
  "哪一次離別轉身後，你在月台或車窗邊看著我的背影想著什麼？",
  "我們一起度過的第一個生日，你印象最深的一個細節是什麼？",
  "回頭看這段感情的開始，你覺得最奇妙的緣分是什麼？",
  "你覺得我做的哪件事，總能瞬間融化你的脾氣或疲憊？",
  "在你看來，我最值得被好好呵護與照顧的一面是什麼？",
  "如果用三種顏色代表我給你的感覺，你會選哪三種顏色？為什麼？",
  "有沒有哪一刻，你覺得我比你自己還要更懂你？",
  "你最喜歡看我專注於自己喜歡的事情時的模樣嗎？那是什麼時候？",
  "在我們相處的過程中，我說過的哪一句鼓勵給了你最大的信心？",
  "你覺得我們感情最好的時候，通常是因為我們一起做了什麼事？",
  "如果有平行宇宙，你覺得另一個時空的我們是不是也一定會相遇相愛？",
  "你最希望我在生活中什麼時候能多依賴你一點、多向你撒嬌？",
  "如果今天可以用一枚特製的勳章送給我，你會給它取什麼名稱？",
  "你覺得兩個人相愛最美好的狀態是什麼？我們現在接近了嗎？",
  "在我們生活的點滴裡，什麼時候讓你覺得時間過得特別快？",
  "如果可以把我的某個優點裝進罐子裡送給未來的自己，你選哪一個？",
  "你有沒有哪一次偷偷幫我拍照，但我完全沒發現？",
  "你最喜歡看我開懷大笑時眼角瞇起來的樣子嗎？",
  "當我們兩個人並肩走在一起時，你的心裡通常在想些什麼？",
  "你覺得我們給彼此最好的禮物是什麼？",
  "有沒有哪一天晚上，你躺在床上看著天花板，心裡滿滿都是我們的回憶？",
  "如果可以用一句話向世界炫耀你的另一半，你會怎麼炫耀？",
  "謝謝你出現在我的生命裡。最後，今天此時此刻，你想對我說一句什麼話？",
  "睡前閉上眼睛前，你腦袋裡閃過的最後一個畫面通常是什麼？",
  "如果今天晚上我們失眠了，你想聽我講故事還是唱歌給你聽？",
  "你覺得我們兩個人在被窩裡聊天，最放鬆、最有安全感的話題是什麼？",
  "如果半夜你突然肚子餓，你覺得我會爬起來幫你煮泡麵還是叫外送？",
  "有沒有哪一天晚上，你躺在我身邊聽著我的呼吸聲覺得特別安心？",
  "你最喜歡的抱睡姿勢是什麼（樹懶抱、背後抱、枕著手臂）？",
  "如果可以把今天一整天的疲憊都清空，你最希望我為你做什麼？",
  "睡覺的時候，如果我踢被子，你通常會默默幫我蓋好還是假裝沒看見？",
  "你覺得我們兩個人誰比較容易說夢話或打呼？有什麼搞笑事蹟嗎？",
  "如果我們今天晚上只能留一盞微弱的小夜燈，你想跟我聊什麼深情的話題？",
  "每當你感到孤單或做噩夢時，第一時間想抓緊的是誰的手？",
  "你喜歡在睡前親我一下道晚安，還是傳訊息說「夢裡見」？",
  "如果今天晚上可以夢見未來五年後的我們，你希望夢裡的場景是在哪裡？",
  "你覺得我們兩個人誰睡覺時的睡相比較奇葩？",
  "當夜深人靜的時候，你最想對我說的一句感謝是什麼？",
  "如果我們在房間裡點一顆香氛蠟燭聊天，你希望那是木質調、柑橘調還是花香調？",
  "你有沒有哪一次看著我熟睡的臉，心裡覺得「這個人真的好可愛」？",
  "如果明天早上不用設定鬧鐘，你最想自然醒之後跟我一起做什麼？",
  "春天櫻花盛開的時候，你最想牽著我的手去哪一條步道散步？",
  "夏天最炎熱的午後，你最想跟我一起躲在冷氣房裡吃西瓜還是芒果冰？",
  "秋天落葉鋪滿街道時，你最想跟我穿哪一種風格的情侶大衣？",
  "冬天寒流來襲的時候，你最喜歡把我冰冰的手塞進你的口袋還是捧在掌心？",
  "如果跨年夜不用人擠人，你最想跟我窩在什麼地方倒數迎接新年？",
  "情人節那一天，比起昂貴的大餐，你更想要什麼樣真誠浪漫的驚喜？",
  "聖誕節如果要交換一個「手工製作」的禮物，你會想親手做什麼給我？",
  "如果在海邊遇上一陣夏日午後雷陣雨，你願意跟我一起淋雨奔跑嗎？",
  "你最喜歡一年之中的哪一個節日？因為有什麼回憶？",
  "如果我們要一起為家裡佈置一棵聖誕樹，樹頂上的星星由誰來放？",
  "中秋節賞月的時候，如果嫦娥答應幫我們實現一個願望，你想許什麼？",
  "元宵節如果要一起放天燈或猜燈謎，你會在天燈上寫下什麼祝福？",
  "如果在秋天去深山露營烤肉，你最想跟我圍在營火旁邊聊什麼？",
  "生日那天，如果只能向我索取一個「絕對服從兌換券」，你想用在哪裡？",
  "每到換季的時候，你最先注意到的我身上的改變是什麼？",
  "如果我們可以一起逃離冬天去一個熱帶島嶼避寒，你想去哪裡度過？",
  "你覺得哪一個節日是專屬於我們兩人的紀念，就算世界遺忘我們也會慶祝？",
  "在一年四季裡，你覺得哪一個季節的我們最浪漫、最黏人？",
  "如果我們只能挑一家餐廳吃一輩子，你會挑火鍋、燒肉還是義大利麵？",
  "你最受不了我吃東西時搶走你盤子裡的哪一樣「靈魂配菜」？",
  "如果我們要一起去逛傳統市場或夜市，你最想跟我挑戰哪一種奇怪的小吃？",
  "我做的哪一道食物（哪怕是切水果或烤土司），讓你覺得特別好吃？",
  "如果我們兩個人一起經營一輛手作甜點快餐車，你覺得賣什麼會爆紅？",
  "吃火鍋的時候，你最喜歡的沾醬組合是什麼？會幫我調一份嗎？",
  "如果今天晚上我們決定放縱吃罪惡宵夜，你第一個想點的是什麼？",
  "你覺得我們兩個人在吃東西的口味上，最相似和最衝突的地方在哪裡？",
  "有沒有哪一家店，只要我們一去吃就會立刻勾起我們剛交往時的回憶？",
  "如果可以親手為我做一頓燭光晚餐，前菜、主餐和甜點你打算準備什麼？",
  "你吃雞排或鹹酥雞時，是胡椒派、辣味派還是梅粉派？",
  "如果有一整天可以無限制甜點吃到飽，你覺得我們能消滅幾塊蛋糕？",
  "我們兩個誰更經不起美食的誘惑？看到美食時通常是什麼表情？",
  "如果我們出國旅行，你敢跟我一起挑戰街頭最奇葩的黑暗料理嗎？",
  "你最想拉著我的手去吃遍哪一個城市的所有大街小巷？",
  "當我說「我不餓，你點就好」的時候，你通常會怎麼聰明應對？",
  "如果我們能擁有一間專屬的私房咖啡館，你想給這家店取什麼名字？",
  "如果現在給我們兩張免簽證、隨時出發的機票，你想立刻降落在哪個國家？",
  "兩個人一起開車長途自駕旅行，你希望我是專心開車的司機還是餵食播歌的副駕？",
  "如果我們去海島度假，你最想跟我一起浮潛看海龜還是躺在沙灘上發呆？",
  "在旅行中遇到突發狀況（如迷路、誤點），你覺得我們兩個誰最能冷靜安撫對方？",
  "如果可以牽著我的手走過全世界的一座橋，你選哪一座？",
  "你最希望我們一起去看一場壯麗的日落，地點是在沙漠、海島還是高山？",
  "如果可以在歐洲的小鎮租一間公寓住一個月，你最想體驗哪種日常生活？",
  "在我們過去的所有旅行中，哪一個行李箱裡裝的紀念品最讓你愛不釋手？",
  "如果可以跟我搭乘一列橫跨雪原的高山景觀火車，你想在車窗前跟我說什麼？",
  "你覺得我們兩個人在旅行時，是「精實排滿行程派」還是「隨性睡到自然醒派」？",
  "如果去主題樂園（像迪士尼或環球影城），你一定要拉著我戴什麼造型髮箍？",
  "有沒有哪一個自然奇景（大峽谷、極光、藍眼淚），是你最想跟我親眼見證的？",
  "在異國陌生的街道上牽著手散步，你心裡最大的感受是什麼？",
  "如果我們能在一個無人的小島上獨處三天，不用手機網絡，你覺得我們會聊些什麼？",
  "每一次旅行收拾行李的時候，你最怕忘記帶的必需品是什麼？",
  "當一趟美好的旅行結束回到家，推開門的那一瞬間你通常會說什麼？",
  "在我們相處的這段歲月裡，你覺得自己最大的成長是什麼？",
  "當你遇到低潮或自我懷疑時，我做過哪件事曾給了你重新站起來的力量？",
  "你覺得我們兩個人之間最難能可貴、任何人都無法取代的連結是什麼？",
  "如果時光可以倒流，你最想重新陪我經歷一次我人生中的哪一個重要時刻？",
  "在你看來，愛一個人最深刻的表現是什麼？我在你身上看見了嗎？",
  "當我們頭髮花白、步履蹣跚的時候，你希望我們依然維持什麼樣的習慣？",
  "如果未來的某一天我們面臨了重大的挑戰，你相信我們會怎麼攜手度過？",
  "你覺得我身上最讓你心疼、想好好守護的一點是什麼？",
  "如果可以替我消除人生中經歷過的某一次痛苦，你最想替我拿走哪一段？",
  "當你向朋友或家人提起我的時候，你最常驕傲地誇獎我什麼？",
  "謝謝你一直以來對我的包容與體貼，你覺得我們給彼此最好的承諾是什麼？",
  "如果給這段感情寫一本傳記，你會給這本書定什麼書名？",
  "當我們互相注視彼此的眼睛超過三十秒，你心底最深層的情緒是什麼？",
  "在這紛擾忙碌的世界裡，只要想到有你在，你會覺得哪裡變得更溫柔了？",
  "如果可以用我們兩人的名字命名夜空中的一顆星星，你想叫它什麼？",
  "無論未來世界如何變化，此時此刻，你想對我許下一個什麼樣的心願？"
];

// ============================================================
// 入口：由 google-apps-script.gs 的 doGet 呼叫
// ============================================================
function handleCoupleAction(action, params) {
  if (action === 'couple_ping') {
    return jsonResponse({ ok: true, service: 'secret-base', version: 1 });
  }

  const user = sanitizeText(params.user || '', 2);
  const pin = sanitizeText(params.pin || '', 20);
  if (!isCoupleAuthValid(user, pin)) {
    return jsonResponse({ ok: false, error: 'unauthorized' }, 403);
  }

  switch (action) {
    case 'couple_login':
      return jsonResponse({ ok: true, user: user, today: coupleToday() });
    case 'couple_secret_today':
      return jsonResponse(Object.assign({ ok: true }, getSecretForDate(coupleToday(), user)));
    case 'couple_secret_get':
      return coupleSecretGet(params, user);
    case 'couple_secret_answer':
      return coupleSecretAnswer(params, user);
    case 'couple_secret_history':
      return coupleSecretHistory(params, user);
    case 'couple_list_get':
      return coupleListGet(params);
    case 'couple_list_add':
      return coupleListAdd(params, user);
    case 'couple_list_update':
      return coupleListUpdate(params);
    case 'couple_list_delete':
      return coupleListDelete(params);
    case 'couple_gacha_state':
      return coupleGachaState(user);
    case 'couple_gacha_like':
      return coupleGachaLike(params, user);
    case 'couple_gacha_update_match':
      return coupleGachaUpdateMatch(params);
    default:
      return jsonResponse({ ok: false, error: 'unknown-action' }, 400);
  }
}

// ===== 驗證 =====
function getCouplePin(user) {
  const saved = PropertiesService.getScriptProperties().getProperty('pin_' + user);
  return saved || COUPLE_DEFAULT_PINS[user] || '';
}

function isCoupleAuthValid(user, pin) {
  if (user !== 'a' && user !== 'b') return false;
  const expected = getCouplePin(user);
  return !!expected && pin === expected;
}

function partnerOf(user) {
  return user === 'a' ? 'b' : 'a';
}

// ===== 日期與題目 =====
function coupleToday() {
  return Utilities.formatDate(new Date(), COUPLE_TZ, 'yyyy-MM-dd');
}

function isValidDateKey(dateKey) {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateKey);
}

function questionForDate(dateKey) {
  const parts = dateKey.split('-').map(Number);
  const dayNumber = Math.floor(Date.UTC(parts[0], parts[1] - 1, parts[2]) / 86400000);
  const index = ((dayNumber - 20700) % SECRET_QUESTIONS.length + SECRET_QUESTIONS.length) % SECRET_QUESTIONS.length;
  return SECRET_QUESTIONS[index];
}

// ===== 交換秘密 =====
const CACHE_KEY_ANSWERS = 'couple_answers_cache';

function readAllAnswers() {
  try {
    const cache = CacheService.getScriptCache();
    const cached = cache.get(CACHE_KEY_ANSWERS);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (_) {}

  const sheet = getOrCreateSheet(SECRET_ANSWERS_SHEET, SECRET_ANSWERS_HEADER);
  const rows = sheet.getDataRange().getValues().slice(1);
  const answers = rows.map(function (row) {
    return {
      date: normalizeDateCell(row[0]),
      user: String(row[1] || ''),
      answer: String(row[2] || ''),
      answeredAt: String(row[3] || '')
    };
  });

  try {
    CacheService.getScriptCache().put(CACHE_KEY_ANSWERS, JSON.stringify(answers), 21600);
  } catch (_) {}

  return answers;
}

function normalizeDateCell(value) {
  if (value instanceof Date) {
    return Utilities.formatDate(value, COUPLE_TZ, 'yyyy-MM-dd');
  }
  let str = String(value || '');
  if (str.charAt(0) === "'") str = str.substring(1);
  return str;
}

/**
 * 核心規則：自己回答過，才拿得到對方的答案。
 * 對方的答案只有在這裡、條件成立時才會被放進回傳資料。
 */
function buildSecretView(dateKey, user, answers) {
  const mine = answers.filter(function (a) { return a.date === dateKey && a.user === user; })[0];
  const theirs = answers.filter(function (a) { return a.date === dateKey && a.user === partnerOf(user); })[0];

  const view = {
    date: dateKey,
    question: questionForDate(dateKey),
    myAnswer: mine ? mine.answer : null,
    myAnsweredAt: mine ? mine.answeredAt : null,
    partnerAnswered: !!theirs,
    partnerAnswer: null,
    partnerAnsweredAt: null
  };

  if (mine && theirs) {
    view.partnerAnswer = theirs.answer;
    view.partnerAnsweredAt = theirs.answeredAt;
  }
  return view;
}

function getSecretForDate(dateKey, user) {
  return buildSecretView(dateKey, user, readAllAnswers());
}

function coupleSecretGet(params, user) {
  const dateKey = sanitizeText(params.date || '', 10);
  if (!isValidDateKey(dateKey) || dateKey > coupleToday()) {
    return jsonResponse({ ok: false, error: 'invalid-date' }, 400);
  }
  return jsonResponse(Object.assign({ ok: true }, getSecretForDate(dateKey, user)));
}

function coupleSecretAnswer(params, user) {
  const today = coupleToday();
  const dateKey = sanitizeText(params.date || today, 10);
  const answer = sanitizeText(params.answer || '', 1000);

  // 只能回答當日秘密，不允許補寫過往題目
  if (dateKey !== today) {
    return jsonResponse({ ok: false, error: 'can-only-answer-today' }, 400);
  }
  if (!answer) {
    return jsonResponse({ ok: false, error: 'answer-required' }, 400);
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const answers = readAllAnswers();
    const already = answers.some(function (a) { return a.date === dateKey && a.user === user; });
    if (already) {
      // 交出去就不能改，避免看完對方答案再修改
      return jsonResponse({ ok: false, error: 'already-answered' }, 409);
    }
    const sheet = getOrCreateSheet(SECRET_ANSWERS_SHEET, SECRET_ANSWERS_HEADER);
    const now = new Date().toISOString();
    // 日期前面加 ' 讓試算表當成文字，不會被自動轉成日期格式
    sheet.appendRow(["'" + dateKey, user, answer, now]);
    answers.push({ date: dateKey, user: user, answer: answer, answeredAt: now });
    try {
      CacheService.getScriptCache().put(CACHE_KEY_ANSWERS, JSON.stringify(answers), 21600);
    } catch (_) {}
    return jsonResponse(Object.assign({ ok: true }, buildSecretView(dateKey, user, answers)));
  } finally {
    lock.releaseLock();
  }
}

function coupleSecretHistory(params, user) {
  const limitValue = parseInt(sanitizeText(params.limit || '60', 4), 10);
  const limit = Number.isNaN(limitValue) ? 60 : Math.max(1, Math.min(limitValue, 365));
  const answers = readAllAnswers();
  const today = coupleToday();

  const dateSet = {};
  answers.forEach(function (a) {
    if (isValidDateKey(a.date) && a.date <= today) dateSet[a.date] = true;
  });

  const items = Object.keys(dateSet)
    .sort()
    .reverse()
    .slice(0, limit)
    .map(function (dateKey) { return buildSecretView(dateKey, user, answers); });

  return jsonResponse({ ok: true, today: today, items: items });
}

// ===== 清單（美食、國家）=====
function getListConfig(params) {
  const type = sanitizeText(params.type || '', 20);
  return COUPLE_LISTS[type] ? { type: type, conf: COUPLE_LISTS[type] } : null;
}

function rowToItem(header, row) {
  const item = {};
  header.forEach(function (key, i) {
    const value = row[i];
    if (key === 'done') {
      item[key] = value === true || value === 'TRUE' || value === 'true';
    } else if (key === 'rating') {
      item[key] = Number(value) || 0;
    } else if (value instanceof Date) {
      item[key] = Utilities.formatDate(value, COUPLE_TZ, 'yyyy-MM-dd');
    } else {
      item[key] = String(value === undefined || value === null ? '' : value);
    }
  });
  return item;
}

function parseFields(params) {
  try {
    const parsed = JSON.parse(params.fields || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (_) {
    return {};
  }
}

function cleanFieldValue(key, value) {
  if (key === 'done') return value === true || value === 'true';
  if (key === 'rating') return Math.max(0, Math.min(5, parseInt(value, 10) || 0));
  if (key === 'url') {
    const url = sanitizeText(value, 1000);
    return /^https?:\/\//i.test(url) ? url : '';
  }
  return sanitizeText(value, key === 'note' || key === 'review' ? 1000 : 200);
}

function coupleListGet(params) {
  const list = getListConfig(params);
  if (!list) return jsonResponse({ ok: false, error: 'invalid-type' }, 400);
  const sheet = getOrCreateSheet(list.conf.sheet, list.conf.header);
  const items = sheet.getDataRange().getValues().slice(1)
    .filter(function (row) { return row[0]; })
    .map(function (row) { return rowToItem(list.conf.header, row); });
  items.reverse();
  return jsonResponse({ ok: true, type: list.type, items: items });
}

function coupleListAdd(params, user) {
  const list = getListConfig(params);
  if (!list) return jsonResponse({ ok: false, error: 'invalid-type' }, 400);
  const fields = parseFields(params);
  const name = cleanFieldValue('name', fields.name || '');
  if (!name) return jsonResponse({ ok: false, error: 'name-required' }, 400);

  const item = {};
  list.conf.header.forEach(function (key) { item[key] = ''; });
  list.conf.editable.forEach(function (key) {
    if (fields[key] !== undefined) item[key] = cleanFieldValue(key, fields[key]);
  });
  item.id = (list.type === 'places' ? 'P_' : 'C_') + new Date().getTime();
  item.name = name;
  item.addedBy = user;
  item.createdAt = new Date().toISOString();
  if (list.type === 'places') {
    item.done = item.done === true;
    item.rating = item.rating || 0;
  }
  if (list.type === 'countries' && !item.status) item.status = 'dream';

  const sheet = getOrCreateSheet(list.conf.sheet, list.conf.header);
  sheet.appendRow(list.conf.header.map(function (key) { return item[key]; }));
  return jsonResponse({ ok: true, item: item });
}

function findRowIndexById(sheet, id) {
  const ids = sheet.getRange(1, 1, Math.max(sheet.getLastRow(), 1), 1).getValues();
  for (let i = 1; i < ids.length; i++) {
    if (String(ids[i][0]) === id) return i + 1; // 1-based row number
  }
  return -1;
}

function coupleListUpdate(params) {
  const list = getListConfig(params);
  if (!list) return jsonResponse({ ok: false, error: 'invalid-type' }, 400);
  const id = sanitizeText(params.id || '', 40);
  const fields = parseFields(params);

  const sheet = getOrCreateSheet(list.conf.sheet, list.conf.header);
  const rowIndex = findRowIndexById(sheet, id);
  if (rowIndex < 0) return jsonResponse({ ok: false, error: 'not-found' }, 404);

  const range = sheet.getRange(rowIndex, 1, 1, list.conf.header.length);
  const row = range.getValues()[0];
  list.conf.editable.forEach(function (key) {
    if (fields[key] !== undefined) {
      row[list.conf.header.indexOf(key)] = cleanFieldValue(key, fields[key]);
    }
  });
  range.setValues([row]);
  return jsonResponse({ ok: true, item: rowToItem(list.conf.header, row) });
}

function coupleListDelete(params) {
  const list = getListConfig(params);
  if (!list) return jsonResponse({ ok: false, error: 'invalid-type' }, 400);
  const id = sanitizeText(params.id || '', 40);
  const sheet = getOrCreateSheet(list.conf.sheet, list.conf.header);
  const rowIndex = findRowIndexById(sheet, id);
  if (rowIndex < 0) return jsonResponse({ ok: false, error: 'not-found' }, 404);
  sheet.deleteRow(rowIndex);
  return jsonResponse({ ok: true, id: id });
}

// ===== 心動抽卡與約會清單 (Gacha & Matches) =====
const CACHE_KEY_GACHA_LIKES = 'couple_gacha_likes_cache';
const CACHE_KEY_GACHA_MATCHES = 'couple_gacha_matches_cache';

function readGachaLikes() {
  try {
    const cached = CacheService.getScriptCache().get(CACHE_KEY_GACHA_LIKES);
    if (cached) return JSON.parse(cached);
  } catch (_) {}

  const sheet = getOrCreateSheet(GACHA_LIKES_SHEET, GACHA_LIKES_HEADER);
  const rows = sheet.getDataRange().getValues().slice(1);
  const likes = rows.filter(function(r) { return r[0]; }).map(function(r) {
    return {
      ideaId: String(r[0] || ''),
      user: String(r[1] || ''),
      likedAt: String(r[2] || '')
    };
  });

  try {
    CacheService.getScriptCache().put(CACHE_KEY_GACHA_LIKES, JSON.stringify(likes), 21600);
  } catch (_) {}
  return likes;
}

function readGachaMatches() {
  try {
    const cached = CacheService.getScriptCache().get(CACHE_KEY_GACHA_MATCHES);
    if (cached) return JSON.parse(cached);
  } catch (_) {}

  const sheet = getOrCreateSheet(GACHA_MATCHES_SHEET, GACHA_MATCHES_HEADER);
  const rows = sheet.getDataRange().getValues().slice(1);
  const matches = rows.filter(function(r) { return r[0]; }).map(function(r) {
    return {
      ideaId: String(r[0] || ''),
      matchedAt: String(r[1] || ''),
      status: String(r[2] || 'pending'),
      target: String(r[3] || '')
    };
  });

  try {
    CacheService.getScriptCache().put(CACHE_KEY_GACHA_MATCHES, JSON.stringify(matches), 21600);
  } catch (_) {}
  return matches;
}

function coupleGachaState(user) {
  const partner = partnerOf(user);
  const likes = readGachaLikes();
  const matches = readGachaMatches();

  const myLikes = likes.filter(function(l) { return l.user === user; }).map(function(l) { return l.ideaId; });
  const partnerLikes = likes.filter(function(l) { return l.user === partner; }).map(function(l) { return l.ideaId; });

  return jsonResponse({
    ok: true,
    user: user,
    myLikes: myLikes,
    partnerLikes: partnerLikes,
    matches: matches
  });
}

function coupleGachaLike(params, user) {
  const ideaId = sanitizeText(params.ideaId || '', 20);
  if (!ideaId) return jsonResponse({ ok: false, error: 'missing-ideaId' }, 400);

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const likes = readGachaLikes();
    const partner = partnerOf(user);
    const now = new Date().toISOString();

    const alreadyLiked = likes.some(function(l) { return l.ideaId === ideaId && l.user === user; });
    if (!alreadyLiked) {
      const sheet = getOrCreateSheet(GACHA_LIKES_SHEET, GACHA_LIKES_HEADER);
      sheet.appendRow([ideaId, user, now]);
      likes.push({ ideaId: ideaId, user: user, likedAt: now });
      try {
        CacheService.getScriptCache().put(CACHE_KEY_GACHA_LIKES, JSON.stringify(likes), 21600);
      } catch (_) {}
    }

    const partnerLiked = likes.some(function(l) { return l.ideaId === ideaId && l.user === partner; });
    let matchedItem = null;

    if (partnerLiked) {
      const matches = readGachaMatches();
      const existingMatch = matches.filter(function(m) { return m.ideaId === ideaId; })[0];
      if (!existingMatch) {
        const matchSheet = getOrCreateSheet(GACHA_MATCHES_SHEET, GACHA_MATCHES_HEADER);
        matchSheet.appendRow([ideaId, now, 'pending', '']);
        matchedItem = { ideaId: ideaId, matchedAt: now, status: 'pending', target: '' };
        matches.push(matchedItem);
        try {
          CacheService.getScriptCache().put(CACHE_KEY_GACHA_MATCHES, JSON.stringify(matches), 21600);
        } catch (_) {}
      } else {
        matchedItem = existingMatch;
      }
    }

    return jsonResponse({
      ok: true,
      ideaId: ideaId,
      matched: !!partnerLiked,
      match: matchedItem
    });
  } finally {
    lock.releaseLock();
  }
}

function coupleGachaUpdateMatch(params) {
  const ideaId = sanitizeText(params.ideaId || '', 20);
  const fields = parseFields(params);
  if (!ideaId) return jsonResponse({ ok: false, error: 'missing-ideaId' }, 400);

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = getOrCreateSheet(GACHA_MATCHES_SHEET, GACHA_MATCHES_HEADER);
    const data = sheet.getDataRange().getValues();
    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]) === ideaId) {
        rowIndex = i + 1;
        break;
      }
    }
    if (rowIndex === -1) {
      return jsonResponse({ ok: false, error: 'match-not-found' }, 404);
    }

    if (fields.target !== undefined) {
      sheet.getRange(rowIndex, 4).setValue(sanitizeText(fields.target, 20));
    }
    if (fields.status !== undefined) {
      sheet.getRange(rowIndex, 3).setValue(sanitizeText(fields.status, 20));
    }

    try {
      CacheService.getScriptCache().remove(CACHE_KEY_GACHA_MATCHES);
    } catch (_) {}

    return jsonResponse({ ok: true });
  } finally {
    lock.releaseLock();
  }
}
