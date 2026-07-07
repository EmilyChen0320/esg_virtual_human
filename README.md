# AI 對話系統 - 即時對嘴虛擬人

基於 Vue 3 + TypeScript + Vite + Tailwind CSS 構建的即時 AI 對話系統，具備完整的對嘴 (lip-sync) 虛擬人功能，並整合 6 位數密碼登入門檻與多語切換。

登入密碼暫定：`111111` (auth.ts)

## 系統概覽

用戶透過語音或文字與 AI 虛擬人對話，系統即時生成唇形同步的視訊串流回應。

```
用戶語音 → 瀏覽器錄音 → 後端語音轉文字 (STT) → TTS + 唇形生成 → WebRTC 串流 → 同步播放
```

### 核心功能

- 瀏覽器端錄音（MediaRecorder）後送至後端 STT（`/transcribe5[_en]`），由後端完成語音轉文字與回應文字產生；前端錄音使用音量分析做 speech-aware auto-stop：偵測到說話後靜音 `1200ms` 即停止，完全未偵測到說話則以 `8000ms` no-speech timeout 停止，縮短短句說完後到送出辨認的等待時間
- AI 智能對話回應，搭配唇形同步虛擬人
- 低延遲 WebRTC 串流播放
- 虛擬人第一幀底圖常駐於媒體層底部，避免本地影片與串流切換時露出黑底
- 用戶可中斷 AI 說話
- 中斷 AI 播放時保留既有對話歷史，不清空 chat bubbles
- 閒置自動重載機制
- 錄音停止時立即進入 processing 並播放 `thinking.mp4`，不等待本機 WAV 轉檔完成才給使用者回饋；錄音仍保留最長 30 秒 auto-stop 保護
- 響應式設計，1440x2560 為驗收規格
- 後端連線健康監測：透過 `useConnectionMonitor` 每 15 秒以 heartbeat 輪詢 `/is_speaking`，連續 2 次失敗即進入斷線狀態；斷線時於所有 chat 模式的 header 語言選擇器旁顯示紅色 `ConnectionWarning` 警告；恢復連線後自動清除
- 頁面左上角醫院 Logo 現可直接點擊重載頁面
- FAQ 面板選題屬於明確使用者操作，前端會略過一般訊息 cooldown，避免點題後被靜默丟棄
- 對話氣泡（`ChatBubble`）隨字數自適應寬度：AI 氣泡最多 26 個全形字寬、使用者氣泡最多 20 個全形字寬，超過上限時寬度固定並自動換行（以 `em` 為單位的視覺寬度，常數定義於 `src/constants/ui.ts`）
- 按鈕位置可切換為上方或下方顯示（輪椅版需求），透過 `ButtonPositionDialog` 讓使用者選擇 `上方顯示` / `下方顯示`，選項資料結構定義於 `src/constants/ui.ts` 的 `ACTION_BUTTON_LAYOUTS`（`top`/`bottom` 兩組佈局）。預設為 `top`（正式版右側圓形按鈕佈局），選擇後會以 `button_position` 寫入 `localStorage`，重新掛載 `/chat` 時會沿用有效值。`ButtonPositionDialog` 開啟時自動禁用目前已選選項並預選另一選項。切換至 `bottom` 時三種模式的 UI 皆有變化：
  - **standby**：底部全寬橫條按鈕（`STANDBY_BOTTOM_BAR`，使用共用常數 `BOTTOM_PRIMARY_BAR_WIDTH`×`BOTTOM_BTN_HEIGHT`, `COLOR_PRIMARY`）＋左上角免責聲明＋右下角 QR
  - **ready**：底部三列按鈕列（開始對話 + 重啟/FAQ 雙欄，FAQ 面板開啟時仍可見）＋上方歡迎訊息泡泡（使用 `ChatBubble` 元件）＋左上角免責聲明＋右上角 QR（佈局常數 `READY_BOTTOM_*`）
  - **conversation**：底部全寬操作列（錄音/中斷/閒置）＋重啟/FAQ 雙欄（輪椅版按鈕在 FAQ 面板開啟時仍可見）＋左上角免責聲明＋右上角 QR（佈局常數 `CONVERSATION_BOTTOM_*`）；對話歷史起點在虛擬人肩膀線（Y=1050），上方以 CSS 漸層遮罩淡出，最新訊息在最下方（同預設版），錄音按鈕使用 Lottie 聲波動畫（`SoundwaveLottie.vue`）
- 輪椅版重啟/FAQ 雙欄已抽取為共用元件 `BottomActionRow.vue`，ready 與 conversation 模式共用同一組佈局參數，確保切換時不會跑版
- 對話氣泡樣式（圓角、padding、行高）已抽取為 `DIALOG_BUBBLE_*` 共用常數；top/bottom 兩種 conversation 佈局的對話框 viewport 分別由 `CONVERSATION_TOP_DIALOG_VIEWPORT` 與 `CONVERSATION_BOTTOM_DIALOG_VIEWPORT` 定義，兩者底部都對齊同一個 `BOTTOM_DIALOG_BUBBLE_BOTTOM_Y` anchor（目前 canvas Y=2148），確保一般版（上方顯示）不會比輪椅版（下方顯示）少可用對話高度

## 快速開始

### 前置需求

- Node.js（LTS latest）
- pnpm（latest）

### 安裝與啟動

```bash
# 安裝依賴
pnpm install

# 啟動開發伺服器（預設 port 3008）
pnpm dev

# 瀏覽器開啟
open http://localhost:3008

# 瀏覽器指定 session 開啟對話頁（現場僅會使用 session 0 與 1）
open http://localhost:3008/chat?session=1
```

### 其他指令

```bash
pnpm build          # TypeScript 編譯 + Vite 生產建置
pnpm preview        # 預覽生產版本
pnpm lint           # 執行 oxlint 自動修正
pnpm format         # 執行 oxfmt 格式化
pnpm test           # 執行測試（單次）
pnpm test:watch     # 測試監聽模式
pnpm test:coverage  # 測試覆蓋率報告
```

### 環境變數

API / WHEP base URLs are configured via environment variables. Copy `.env.example` to `.env` at the repo root:

```bash
cp .env.example .env
```

| 變數                         | 用途                                     | 預設值                                   |
| ---------------------------- | ---------------------------------------- | ---------------------------------------- |
| `VITE_API_BASE_URL`          | 主要 API (8020)                          | `https://youngforehospital.5gao.ai:8020` |
| `VITE_API_SESSION_URL`       | Session API (9880)                       | `https://youngforehospital.5gao.ai:9880` |
| `VITE_API_TRANSCRIBE_URL`    | 語音轉文字 API；未設定時等同 Session API | `https://youngforehospital.5gao.ai:9880` |
| `VITE_API_NOTIFY_URL`        | Notify 事件 API (8020)                   | `https://youngforehospital.5gao.ai:8020` |
| `VITE_WHEP_URL`              | WebRTC WHEP base URL (1986)              | `https://youngforehospital.5gao.ai:1986` |
| `VITE_ENABLE_MOBILE_CONSOLE` | 手機頁面內 Eruda console debug 開關      | `false`                                  |

Dev works without `.env` — production defaults are built in as fallbacks.

### 手機頁面 Console Debug（Eruda）

為了排查 Android Chrome 上的錄音與麥克風權限問題，專案暫時導入 `eruda`。它會在手機網頁內顯示一個可點開的 debug 面板，能直接看到 `console.log`、`console.warn`、`console.error`，也能輔助檢查 network 與 runtime 狀態。正常使用者預設不會看到它，只有手動開啟時才會載入。

目前選用 `eruda`，不是 `vConsole` 或 `chii`：

- `eruda`：頁面內 console，適合手機直接看 log；目前 npm 安裝版本為 `3.4.3`。
- `vConsole`：仍常見，但 npm 套件已久未更新，不作為這次首選。
- `chii`：比較像遠端 DevTools，需要另外啟 server / client script，對這次「手機頁面直接看到 log」需求過重。

#### 開啟方式 1：URL query（建議）

在手機 Chrome 開啟網址時加上 `mobileDebug=1`：

```text
http://localhost:3008/?mobileDebug=1
http://localhost:3008/chat?lang=zh&mobileDebug=1
```

若是透過同網段 IP 或 ngrok 測試，保留原本 host，只加 query：

```text
http://192.168.x.x:3008/?mobileDebug=1
https://your-ngrok-domain.ngrok-free.app/?mobileDebug=1
```

第一次用 `?mobileDebug=1` 開啟後，前端會把開關寫入 `localStorage` 的 `hciot_mobile_console_enabled`。之後即使頁面跳轉到 `/chat?lang=zh`，Eruda 仍會自動出現，不需要每個連結都加 `mobileDebug=1`。

#### 畫面確認方式

啟用成功後，手機畫面右下角會出現灰色 Eruda 浮動按鈕。點開後切到 `Console` 分頁，就能直接在頁面內看到 `console.log`、`console.warn`、`console.error`。如果用 `?mobileDebug=1` 開啟後被登入狀態自動導到 `/chat`，網址上的 query 可能消失，這是正常現象；只要 `localStorage` 仍有 `hciot_mobile_console_enabled=1`，Eruda 仍會載入。

本次以 Chrome DevTools MCP 在 Android Chrome mobile viewport 驗證：`?mobileDebug=1` 會載入 `eruda.js`、顯示右下角浮動按鈕，點開 `Console` 後可看到頁面送出的 `console.log`；`?mobileDebug=0` 會清掉上述 `localStorage` 開關，重新整理後不再載入 Eruda。

#### 開啟方式 2：環境變數

如果要讓同一次 dev build 永遠開啟 Eruda，可在 `.env` 設定：

```bash
VITE_ENABLE_MOBILE_CONSOLE=true
```

再重新啟動 dev server：

```bash
pnpm dev
```

這個方式會讓所有開啟該 build 的人都看到 Eruda。只建議短時間 debug 使用，不要帶到正式展示版本。

#### 關閉方式

手機上用以下網址開一次：

```text
http://localhost:3008/?mobileDebug=0
```

`mobileDebug=0` 會移除 `localStorage` 裡的 `hciot_mobile_console_enabled`，重新整理後 Eruda 就不會再出現。

若是用 `.env` 開啟，改回：

```bash
VITE_ENABLE_MOBILE_CONSOLE=false
```

然後重新啟動 dev server。

#### Android 錄音 / 權限 Debug 建議

手機打開 Eruda 後，先切到 Console / Network 面板，再操作錄音按鈕。現在的語音流程不依賴
Web Speech API；前端只負責收音與轉成 WAV，上傳至後端 STT。

- Console：若看到 `[useRecordingFlow] handleRecordingClick failed:`，表示錄音流程外層失敗，通常要搭配同時間的 `getUserMedia` 權限錯誤或 `/transcribe5` network response 追查。
- Network：錄音停止後應送出 `POST /transcribe5`（英文 `?lang=en` 時為 `POST /transcribe5_en`），body 為 multipart `FormData`，包含 `audio`、`sessionid`，有 `userId` 時也會帶上。
- Network：後端 STT 成功後，前端會把回應中的 `tts_text` 送到 `/human` 讓虛擬人播放；若沒有音訊 blob，會走空語音 fallback，直接送出 i18n 的「沒聽清楚」文字到 `/human`。
- 錄音 auto-stop：`useAudioRecording` 會先等到音量超過 `VOLUME_THRESHOLD` 才視為已偵測到說話；已偵測到說話後，若連續低於門檻 `SPEECH_END_SILENCE_DURATION`（目前 `1200ms`）就觸發停止。若從頭到尾沒有偵測到說話，則等 `NO_SPEECH_TIMEOUT`（目前 `8000ms`）後停止，避免一開錄音就因環境安靜直接送空音訊。
- 若 `/transcribe5` 沒送出，先查瀏覽器是否成功取得麥克風權限，以及 `MediaRecorder` 是否可用。
- 若 `/transcribe5` 有送出但沒有回應，先查 `VITE_API_TRANSCRIBE_URL` 是否指到可用的後端 STT host。

另外，Android Chrome 的麥克風權限有幾個硬條件：

- `getUserMedia` 需要 HTTPS，或瀏覽器認定的安全來源。手機用 `http://192.168.x.x:3008` 時，麥克風權限可能直接失敗；ngrok HTTPS 通常比較適合實機測試。
- Chrome 網站設定需允許 Microphone。可在網址列左側設定或 Android App 權限裡確認。
- 若曾拒絕權限，清掉該網站權限後重開頁面再測。
- Eruda 只能幫你看前端 log，不能繞過瀏覽器權限限制。

#### 移除方式

這個工具是臨時 debug 用。問題查完後移除：

```bash
pnpm remove eruda
```

並刪除：

- `src/utils/mobileConsole.ts`
- `src/main.ts` 內的 `initMobileConsole` import 與呼叫
- `.env.example` / `README.md` 內本段 debug 說明

## 技術架構

### 技術棧

| 類別      | 工具                                                    |
| --------- | ------------------------------------------------------- |
| 框架      | Vue 3 (Composition API + `<script setup>`)              |
| 語言      | TypeScript (strict mode)                                |
| 建置      | Vite                                                    |
| 樣式      | Tailwind CSS v4                                         |
| 路由      | Vue Router                                              |
| 國際化    | Vue i18n（中/英，透過 `?lang=en` 切換）                 |
| 串流      | WebRTC via SRS SDK (WHEP 協議)                          |
| 動畫      | lottie-web（輪椅版錄音聲波動畫）                        |
| HTTP      | Fetch API                                               |
| 測試      | Vitest + Vue Test Utils + happy-dom                     |
| Lint      | oxlint + oxfmt                                          |
| Git Hooks | husky + lint-staged + commitlint (Conventional Commits) |

### 路由

| 路徑    | 頁面     | 說明                                                                                                                 |
| ------- | -------- | -------------------------------------------------------------------------------------------------------------------- |
| `/`     | Home.vue | 6 位數密碼登入頁，提供語言切換確認，驗證後進入對話                                                                   |
| `/chat` | Chat.vue | 主要對話介面（需有效登入 session），整合虛擬人串流與對話，支援 `session` 參數（範例：`/chat?session=1`，預設為 `0`） |

補充行為（雙向 session 繼承生命週期）：

- 首頁與對話頁之間支援雙向 `session` 參數與 `lang` 參數繼承：
  - 首頁 `/` 自動導向或登入至 `/chat` 時，會保留並繼承當前的 `session` 與 `lang` query 參數。
  - 對話頁 `/chat` 執行重啟對話、切換語言回首頁、或因登入逾期/未授權被 route guard 導回首頁時，皆會繼承並帶回當前的 `session` 與 `lang` query 參數。
  - 路由繼承時會保留原始的 raw query 參數值（例如 `?session=001`），而對話頁 runtime 會透過 `getSessionIdFromSearch` 函數將 session ID 進行標準化解析（例如 `001` 正常解析為 `"1"`，無效、空值或未指定時 fallback 至 `"0"`），以對齊後端 API 與 WebRTC stream name；切換現場 session 請改網址 query，不要修改原始碼常數。

### 專案結構

```
src/
├── api/                # API 層（REST 呼叫）
│   ├── chatApi.ts      # 所有後端 API 端點
│   └── chatApi.test.ts # API 測試
├── components/         # UI 元件
│   ├── chat/           # Chat 頁面專用子元件
│   │   ├── BottomActionRow.vue         # 輪椅版重啟/FAQ 共用按鈕列（ready + conversation 共用）
│   │   ├── BottomActionRow.test.ts     # BottomActionRow 測試
│   │   ├── ChatActionControls.vue   # Logo（點擊=重載）、斷線警告、QR code、操作按鈕、語言選擇、重啟
│   │   ├── ChatBubble.vue           # 共用對話氣泡（自適應寬度，字數超過上限自動換行）
│   │   ├── ChatBubble.test.ts       # ChatBubble 測試
│   │   ├── ChatDialogOverlay.vue    # 對話歷史氣泡容器（使用 ChatBubble，使用者藍色、AI 白色）
│   │   ├── ChatFooterOverlay.vue    # 結束對話 modal
│   │   ├── ChatMediaLayer.vue       # 視訊串流 + 本地影片 + 虛擬人第一幀底圖
│   │   ├── ChatReadyOverlay.vue     # 準備對話模式：歡迎訊息、FAQ/開始/重啟按鈕、斷線警告
│   │   ├── ChatSections.test.ts     # 整合測試
│   │   ├── shared-action-buttons.css # 共用圓形按鈕、QR 圖片、波紋動畫樣式
│   │   ├── FaqPanel.vue             # 常見問題面板（分類→問題兩層結構，含自訂捲軸）
│   │   ├── FaqPanel.test.ts         # FaqPanel 測試
│   │   └── SoundwaveLottie.vue      # Lottie 聲波動畫（輪椅版錄音按鈕用，取代靜態 SVG）
│   ├── icons/              # 共用 inline SVG 圖示元件
│   │   ├── MicIcon.vue         # 麥克風圖示（ConsultButton + ChatReadyOverlay 共用）
│   │   ├── RestartIcon.vue     # 重啟/電源圖示（ChatActionControls + ChatReadyOverlay 共用）
│   │   ├── FaqIcon.vue         # FAQ 問號圖示（ChatReadyOverlay 使用）
│   │   └── CancelIcon.vue      # 取消圓形圖示（ConsultButton 中斷狀態）
│   ├── ConnectionWarning.vue   # 斷線警告橫幅（紅色圖示 + i18n 文字）
│   ├── ButtonPositionDialog.vue # 按鈕位置選擇對話框（輪椅版 / 上方顯示 / 下方顯示）
│   ├── ButtonPositionDialog.test.ts # ButtonPositionDialog 測試
│   ├── ConnectionWarning.test.ts # ConnectionWarning 測試
│   ├── ConsultButton.vue      # 多狀態按鈕（諮詢/錄音/中斷），使用 MicIcon + CancelIcon
│   ├── ConsultButton.test.ts  # ConsultButton 測試
│   ├── VideoStream.vue        # WebRTC 串流播放（expose `error` ShallowRef 供父層監聽）
│   ├── VideoStream.test.ts    # VideoStream 測試
│   ├── EndDialog.vue          # 結束對話 UI
│   ├── LanguageSelector.vue   # 藥丸形語言切換（180×72px）
│   └── RestartDialog.vue      # 共用確認對話框（重啟對話 / 語言切換）
├── composables/        # 組合式邏輯（核心業務邏輯）
│   ├── useChatPage.ts         # 主協調器：整合所有 composable（session lifecycle、斷線處理），restart/語言切換委派 useRestartFlow
│   ├── useChatPage.test.ts    # useChatPage 測試
│   ├── useRestartFlow.ts      # 重啟對話 / 語言切換 dialog 狀態機與 teardown 流程
│   ├── useRestartFlow.test.ts # useRestartFlow 測試
│   ├── useChat.ts             # 對話歷史（shallowRef 不可變更新）、AI 說話狀態輪詢；文字走 /ai_chat_hciot → /human，語音走 /transcribe5 → /human
│   ├── useChat.test.ts        # useChat 測試
│   ├── useChatMessageFlow.ts  # 訊息發送流程、AI 回應處理（斷線時短路）
│   ├── useChatMessageFlow.test.ts # useChatMessageFlow 測試
│   ├── useChatNotify.ts       # 通知事件處理（開始/結束）、串流影片控制
│   ├── useChatNotify.test.ts  # useChatNotify 測試
│   ├── useRecordingFlow.ts    # 錄音流程（開始錄音→停止時立即進入 thinking→後端 STT→回應播放，斷線時短路、30 秒 auto-stop timer cleanup）
│   ├── useRecordingFlow.test.ts # useRecordingFlow 測試
│   ├── useAudioRecording.ts   # MediaRecorder 收音、WAV 轉檔、音量視覺化、speech-aware 靜音自動停止
│   ├── useInterrupt.ts        # 中斷 AI 說話
│   ├── useInterrupt.test.ts   # useInterrupt 測試
│   ├── useLocalVideo.ts       # 本地影片基底來源切換與思考/轉場播放控制（listener 改用 AbortController 管理）
│   ├── useLocalVideo.test.ts  # useLocalVideo 測試
│   ├── useNotifyEvents.ts     # AI 回應事件輪詢 (100ms)，斷線時短路
│   ├── useNotifyEvents.test.ts # useNotifyEvents 測試
│   ├── useAutoReload.ts       # 閒置自動重載 (120s)
│   ├── useAutoReload.test.ts  # useAutoReload 測試
│   ├── useCanvasScale.ts      # 響應式縮放（1440×2560 基準）
│   ├── useCanvasScale.test.ts # useCanvasScale 測試
│   ├── useConnectionMonitor.ts # 後端連線健康監測（heartbeat 合併啟停、isHeartbeatPending 防 concurrent）
│   ├── useConnectionMonitor.test.ts # useConnectionMonitor 測試
│   ├── useFaq.ts              # 常見問題面板邏輯（開啟/關閉、分類導航、問題選取；依語言抓取新版 topics）
│   ├── useFaq.test.ts         # useFaq 測試
│   ├── usePageLanguage.ts     # URL 語言參數同步
│   └── usePageLanguage.test.ts # usePageLanguage 測試
├── constants/          # 常數
│   ├── api.ts          # API base URLs、端點路徑、payload 常數、session query 解析
│   ├── audio.ts        # 音量分析常數（FFT、動畫選擇器）、speech-aware 靜音偵測（`SPEECH_END_SILENCE_DURATION` / `NO_SPEECH_TIMEOUT` / threshold）
│   ├── auth.ts         # 登入密碼、session 儲存、24 小時有效期驗證
│   ├── media.ts        # 圖片資源路徑
│   ├── stream.ts       # WebRTC 串流設定
│   ├── timing.ts       # 輪詢間隔、超時、冷卻、延遲、heartbeat 連線監測設定
│   └── ui.ts           # 設計畫布尺寸 (1440×2560)、品牌/主題顏色（`COLOR_PRIMARY`/`COLOR_SECONDARY`/`COLOR_BACKDROP`）、共用底部欄幾何常數（`BOTTOM_BTN_*`/`BOTTOM_PRIMARY_BAR_*` 等）、共用字體大小（`DIALOG_FONT_SIZE`/`BUTTON_FONT_SIZE`/`SUBTITLE_FONT_SIZE`/`FAQ_BUTTON_FONT_SIZE`/`BOTTOM_PRIMARY_BAR_FONT_SIZE`）、共用圖示大小（`ACTION_ICON_SIZE`/`BOTTOM_ICON_SIZE`）、共用氣泡樣式（`DIALOG_BUBBLE_*`）、按鈕位置佈局（`ActionButtonPosition` / `ACTION_BUTTON_LAYOUTS`）、AI/使用者氣泡最大字數、輪椅版共用重啟/FAQ 列常數（`BOTTOM_ACTION_ROW_*`）、conversation 對話 viewport 共用底部 anchor（`BOTTOM_DIALOG_BUBBLE_BOTTOM_Y`）、各模式佈局常數（`STANDBY_BOTTOM_*` / `READY_BOTTOM_*` / `CONVERSATION_BOTTOM_*` / `CONVERSATION_TOP_DIALOG_VIEWPORT`）
├── i18n/               # 國際化設定
│   ├── index.ts        # Vue i18n 初始化設定
│   └── locales/        # 各語系翻譯檔
│       ├── zh.ts       # 中文翻譯
│       └── en.ts       # 英文翻譯
├── lib/                # 外部函式庫（勿修改）
│   └── srs.sdk.js      # SRS WebRTC SDK
├── router/             # Vue Router 路由設定
│   └── index.ts
├── services/           # 服務層
│   ├── streamService.ts       # WebRTC 串流封裝
│   └── streamService.test.ts  # streamService 測試
├── types/              # TypeScript 型別定義
│   ├── chat.ts         # API 回應、對話、Avatar、Voice 型別
│   ├── global.d.ts     # 全域型別宣告
│   └── mediaRefs.ts    # 共用 `VideoStreamHandle`（useChatPage / useChatNotify 共用）
├── utils/              # 工具函式
│   ├── srs.ts          # SRS SDK 動態載入
│   └── srs.test.ts     # SRS utils 測試
└── views/              # 頁面元件
    ├── Chat.vue        # 對話頁（使用 useChatPage 協調）
    ├── Chat.test.ts    # Chat 頁面測試
    ├── Home.vue        # 登入首頁 / 語言切換確認入口
    └── Home.test.ts    # Home 頁面測試

public/
└── images/             # ESG 靜態圖片與按鈕圖示
```

### 狀態管理

不使用 Vuex/Pinia。狀態透過 composable 的 `shallowRef` 管理，以 callback 模式在各 composable 間協調：

```
useChatPage（主協調器，~449 行）
├── useChat              ← 對話歷史 (shallowRef + immutable update)、AI 說話狀態
├── useChatMessageFlow   ← 訊息發送流程、AI 回應處理（斷線時短路）
├── useChatNotify        ← 通知事件回調、串流影片控制
├── useRecordingFlow     ← 錄音流程（停止時立即進入 thinking、斷線時短路、30 秒 auto-stop timer cleanup）
├── useInterrupt         ← 中斷機制
├── useRestartFlow       ← 重啟/語言切換對話框 + teardown 狀態機
├── useLocalVideo        ← 本地影片基底來源與轉場控制（AbortController 管理 listener）
├── useNotifyEvents      ← 事件輪詢（斷線時短路）
├── useAutoReload        ← 閒置重載
├── useConnectionMonitor ← 後端連線健康監測（heartbeat 合併啟停、concurrent guard）
├── useCanvasScale       ← 畫面縮放
├── useFaq               ← 常見問題面板邏輯（依目前語言抓取 topics）
└── usePageLanguage      ← 語言同步

```

### 錯誤處理與斷線短路（最近品質提升重點）

- `src/api/chatApi.ts` 匯出 `ApiError` class + `ApiErrorKind` (`"timeout" | "network" | "http" | "aborted"`)，所有 fetch 錯誤分類為上述之一，訊息格式 `[kind] endpoint`
- `useConnectionMonitor.heartbeat` 依 `ApiError.kind` 決定是否累計 `consecutiveFailures`（僅 `timeout` / `network` / `aborted` 計入，5xx HTTP 不計）
- 使用者操作（`handleConsultClick` / 訊息發送 / 錄音 / notify 輪詢）於斷線時一律短路 return，不會觸發 API 也不會卡在 processing
- Console log 統一 `[moduleName] message` 格式便於 grep
- `VideoStream` 透過 `expose` 提供 `error: ShallowRef<string | null>`，父層可在串流失敗時 fallback

### 錄音與辨認延遲控制

- `useAudioRecording` 的 VAD 不再用固定最短錄音時間。現在以 `hasDetectedSpeech` 記錄是否曾超過 `VOLUME_THRESHOLD`，避免短句說完後仍硬等數秒。
- 已偵測到說話後，音量低於門檻並維持 `SPEECH_END_SILENCE_DURATION`（目前 `1200ms`）會觸發 `autoStopCallback`，讓前端更快停止錄音並開始送 STT。
- 從頭到尾未偵測到說話時，前端改用 `NO_SPEECH_TIMEOUT`（目前 `8000ms`）作為 no-speech guard，避免環境安靜時立刻停止。
- `requestAutoStop()` 以 `autoStopRequested` 防止同一次錄音重複觸發停止；`cleanup()` 會重置 `hasDetectedSpeech`、`autoStopRequested`、timer、AudioContext、MediaStream track。
- `useRecordingFlow` 在停止錄音時先設 `isProcessing=true` 並立即啟動 `thinking.mp4`，再等待 `stopRecording()` 的 WAV 轉檔與 `/transcribe5[_en]`。這不改變後端 STT contract，但減少本機轉檔期間的無回饋空窗。

## API 端點

### 基本設定

Base URLs are injected via Vite environment variables (`VITE_*`). Without a `.env` file, the app uses the production fallbacks listed below.

| 服務        | 環境變數                  | 預設值（無 `.env` 時）                   |
| ----------- | ------------------------- | ---------------------------------------- |
| 主要 API    | `VITE_API_BASE_URL`       | `https://youngforehospital.5gao.ai:8020` |
| Session API | `VITE_API_SESSION_URL`    | `https://youngforehospital.5gao.ai:9880` |
| STT API     | `VITE_API_TRANSCRIBE_URL` | `https://youngforehospital.5gao.ai:9880` |
| WebRTC WHEP | `VITE_WHEP_URL`           | `https://youngforehospital.5gao.ai:1986` |

> **開發提示**：複製 `.env.example` 為 `.env` 並修改值，dev server 自動重載。

### 主要端點

| 端點                   | 方法 | Host           | 說明                                                                                                                                                                                                                                                |
| ---------------------- | ---- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/hciot_chat_start`    | POST | SESSION_URL    | 開始 HCIOT 對話 session                                                                                                                                                                                                                             |
| `/is_speaking`         | POST | BASE_URL       | 檢查 AI 是否正在說話（200ms 輪詢）                                                                                                                                                                                                                  |
| `/human`               | POST | BASE_URL       | 發送用戶訊息（也用於中斷，帶 `interrupt: true`）                                                                                                                                                                                                    |
| `/transcribe5[_en]`    | POST | TRANSCRIBE_URL | 上傳錄音 WAV（multipart `audio` + `sessionid` + optional `userId`）至後端 STT；英文使用 `_en` 後綴                                                                                                                                                  |
| `/get_notify_events`   | POST | NOTIFY_URL     | 輪詢 AI 回應事件（100ms）                                                                                                                                                                                                                           |
| `/get_current_config`  | POST | BASE_URL       | 取得當前 session 設定                                                                                                                                                                                                                               |
| `/get_avatars`         | GET  | BASE_URL       | 取得可用虛擬形象列表                                                                                                                                                                                                                                |
| `/get_voices`          | GET  | BASE_URL       | 取得可用語音列表                                                                                                                                                                                                                                    |
| `/ai_chat_hciot`       | POST | SESSION_URL    | 發送文字訊息至 AI；請求 body 使用 `{ text, userId }`，回應包含 `message`（UI 顯示文字）、`tts_text`（虛擬人說話）。前端使用 `message` 顯示於對話泡泡，`tts_text` 傳送至 `/human` 做 TTS 朗讀。Fallback 順序：顯示用 `message` ；說話用 `tts_text`。 |
| `/hciot_topics/{lang}` | GET  | SESSION_URL    | 取得單一語言的常見問題分類與主題列表；`lang` 為 `zh` / `en`，切換語言時需重新抓取對應資料                                                                                                                                                           |

### 串流 URL 格式

```
https://youngforehospital.5gao.ai:1986/rtc/v1/whep/?app=live&stream={streamName}
```

說明：

- 當 `session` 為 `0` 或未指定（預設）時，串流名稱 `streamName` 為 `livestream`。
- 當 `session` 為 `1` 時，串流名稱 `streamName` 為 `livestream1`。
- 若為其他非 `0` 的 `session` 值，串流名稱 `streamName` 為 `livestream{sessionId}`。
- 現場實際僅會使用 session `0` 與 `1`。

## 首頁與互動入口

- `Home.vue` 為 6 位數密碼登入頁，輸入正確密碼後建立 24 小時有效的登入 session 並進入 `/chat`。只要 session 有效，就會自動跳轉 `/chat`；切換語言前會先顯示 `RestartDialog` 確認視窗。
- `/chat` 路由受 route guard 保護，無效或過期 session 會自動導回首頁。
- 對話頁左上角顯示醫院 Logo（點擊可重載頁面），右上角提供語言切換與斷線警告。
- 待機畫面右側以單一直欄呈現操作區，QR code（手機版客服）位於上方，開始對話按鈕位於其下方。
- 按鈕位置可透過 `ButtonPositionDialog` 選擇 `上方顯示` 或 `下方顯示`（輪椅版需求）；`ACTION_BUTTON_LAYOUTS` 定義 top/bottom 兩組佈局，預設為 `top`（正式版右側圓形按鈕佈局），選擇結果會持久化到 `localStorage` 的 `button_position`。切換至 `bottom` 時，standby 改為底部全寬橫條按鈕；ready 改為底部三列按鈕列（開始對話 + 重啟/FAQ 雙欄）；conversation 改為底部全寬操作列 + 重啟/FAQ 雙欄，對話歷史從肩膀線起算並以漸層遮罩淡出上方。top/bottom conversation 的對話 viewport 底部共用 `BOTTOM_DIALOG_BUBBLE_BOTTOM_Y`，因此上方顯示與下方顯示都保留相同的最低可顯示位置。重啟/FAQ 雙欄為共用元件 `BottomActionRow.vue`，ready 與 conversation 共用，佈局參數統一。輪椅版錄音按鈕使用 Lottie 聲波動畫（`SoundwaveLottie.vue`）。
- 本地虛擬人影片規格為：待機時播放 `idle.mp4`；一旦進入 ready overlay（畫面上顯示「開始對話」按鈕）就切換為 `waiting-command.mp4`；AI 處理中的循環影片為 `thinking.mp4`。
- 待機與對話模式皆可開啟常見問題面板（FaqPanel），採兩層導航：分類 → 主題 → 問題，選取問題後自動發送並進入對話模式。
- 對話中右側顯示錄音/中斷按鈕與重啟對話按鈕。
- 按下 `重啟對話` 或 `切換語言` 跳出 `RestartDialog` 警告時，會先播放 `bye.mp4`；若使用者確認重啟，畫面狀態重置後回到 `idle.mp4`。
- 頁面 Logo 可直接點擊重載頁面。
- `重啟對話` 會重置 chat 內部狀態，並返回首頁（`/`）以重新開始對話流程，同時會繼承當前的 `session` 參數，但不會清除 24 小時登入 session。
- `切換語言` 在任何入口都會先顯示 `RestartDialog` 確認視窗並播放 `bye.mp4`；確認後會進行 teardown，並在登入仍有效時以 `router.replace` 留在 `/chat`（保留並繼承當前 `session` 參數與新的 `lang` 參數），若登入已過期或在首頁切換則會導向首頁 `/`（同樣保留並繼承當前 `session` 參數與新的 `lang` 參數）。

## 開發備註

- `vite.config.ts` 固定 dev / preview port 為 `3008`，並忽略 `ai-docs/` 變動以避免文件更新觸發 HMR。
- Git commit 訊息遵循 Conventional Commits 規範，透過 `commitlint.config.js` + `.husky/commit-msg` hook 自動檢查。
- Docker build 使用 `node:24-slim` + corepack 啟用 `pnpm@latest`，dependency install layer 會先複製 `package.json`、`pnpm-lock.yaml`、`pnpm-workspace.yaml`，確保 pnpm workspace policy（例如 `minimumReleaseAgeExclude`）在 `pnpm install --frozen-lockfile` 前已存在。`src/dockerfile.test.ts` 會測這個順序，避免 Docker build 漏掉 pnpm policy。

## 測試

### 自動測試

使用 Vitest + Vue Test Utils，測試檔與原始碼同層（`*.test.ts`）。

```bash
pnpm test              # 單次執行
pnpm test:watch        # 監聽模式
pnpm test:coverage     # 覆蓋率報告
```

覆蓋率排除項目：外部 SDK (`src/lib/`)、型別定義、音頻錄製實作（硬體相依）、i18n、路由、公用常數。`useAudioRecording.test.ts` 仍以 mocked `MediaRecorder` / `AudioContext` / analyser frame 覆蓋錄音流程邏輯、WAV 轉檔與 VAD timeout 行為；`src/dockerfile.test.ts` 以 raw Dockerfile 內容檢查 Docker dependency layer 順序。

### 上機測試

由於機台解析度規格與開發電腦不同，單元測試只能確保功能沒有壞，不能檢查跑版。請務必空出時間做上機測試。

若需指定現場 session，請使用網址 query（例如 `/chat?session=1`）。Session ID 由網址決定，不需在 git pull 後手動修改 `src/constants/api.ts`。

```bash
ssh ec2-user@set.fanpokka.ai
cd /srv/hciot_frontend/frontend
git pull --ff-only origin feat/john/hc
git log --oneline -3
docker compose build
docker compose down && docker compose up -d
```

## 目標裝置

- Farbar 機台
- Android 系統，但非完整功能 Chrome App
- 設計基準：1440 × 2560，自動縮放
- 僅支援直式顯示
- 暫時外接鏡頭上的麥克風收音，語音辨識率很差，需在之後麥克風正式設定後補測
