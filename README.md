# tutu

## 留言後台（對兔兔說話）快速接線

這個專案已經內建前端留言送出功能，現在只差接上後台網址。

### 1) 建立 Google 試算表後台

1. 到 Google Drive 新增一份 Google 試算表。
2. 在試算表中點選「擴充功能 > Apps Script」。
3. 將 [backend/google-apps-script.gs](backend/google-apps-script.gs) 的內容完整貼上，取代預設程式（包含 `doGet(e)` 的 `action=submit` 寫入邏輯）。
4. 儲存後，點「部署 > 新增部署」。
5. 類型選「網頁應用程式」。
6. 執行身分選「我」，存取權選「任何人」。
7. 部署後會拿到一個 Web App URL，複製它。

### 2) 把後台網址接到網站

打開 [index.html](index.html)，找到 `BUNNY_MESSAGE_API`，把預設值改成你的 Web App URL：

```js
const BUNNY_MESSAGE_API = localStorage.getItem('tutu_message_api_url') || 'https://script.google.com/macros/s/你的部署ID/exec';
```

### 3) 驗證是否成功

1. 打開網站「對兔兔說說話」卡片。
2. 輸入名字與留言後送出。
3. 回到試算表的 `messages` 工作表，應會出現新資料列。

如果你已經先部署過，記得在 Apps Script 重新「部署新版本」，讓最新 `doGet(e)` 程式生效。

### 4) 沒接好時的備援機制

如果 API 還沒設定成功，前端會把留言暫存在瀏覽器 `localStorage`，鍵名為：

- `tutu_local_messages_backup`

接好後台後可再手動補送。