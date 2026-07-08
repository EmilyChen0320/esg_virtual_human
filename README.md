# ESG Virtual Human

三立 ESG 展區用的 AI 虛擬人互動頁。此專案以 Vue 3、TypeScript、Vite 建置，提供 9:16 直式 kiosk 畫面、ESG 快速問題、AI 回答、TTS 語音播放、MatesX lip-sync 嘴型同步，以及中英文切換。

## 功能範圍

- 9:16 kiosk 直式互動畫面
- 三立集團與 SET FUTURE 品牌視覺
- 中英文語系切換
- ESG 快速問題清單
- ESG chat session 建立與問答
- 顯示使用者題目泡泡與 AI 回答泡泡
- 回答後呼叫 TTS stream 並播放 WAV 音訊
- 使用 MatesX 將 TTS PCM 音訊同步推入角色，進行嘴型同步
- 角色素材支援 `combined_data.json.gz` + `01.webm` 載入
- 回答或 TTS 播放中可中斷
- 重啟確認彈窗
- 本機 API fallback 預覽提示

## 使用流程

```text
載入頁面
→ 取得 ESG topics
→ 建立 ESG chat session
→ 初始化 MatesX runtime 與角色素材
→ 使用者點選快速問題
→ 顯示題目泡泡
→ 呼叫 ESG chat/message
→ 顯示 message 回答泡泡
→ 若 tts_text 有值，呼叫 TTS stream
→ 讀取 WAV stream，切出 PCM chunk
→ Web Audio 播放聲音 + MatesX 同步推送嘴型資料
```

## API 串接

### ESG API

ESG API 負責提供題庫、session 與回答內容。

| Endpoint                 | Method | 用途                       |
| ------------------------ | ------ | -------------------------- |
| `/api/esg/topics/{lang}` | GET    | 取得快速問題清單           |
| `/api/esg/chat/start`    | POST   | 建立 chat session 與開場白 |
| `/api/esg/chat/message`  | POST   | 送出使用者題目並取得回答   |

`/api/esg/chat/message` 回應欄位使用方式：

| 欄位          | 用途                                  |
| ------------- | ------------------------------------- |
| `message`     | 前端畫面顯示的回答文字                |
| `tts_text`    | 給 TTS 合成用的文字；有值時才呼叫 TTS |
| `turn_number` | 後續對話回合識別                      |

### TTS API

TTS API 負責把文字合成 WAV 音訊，前端會一邊播放、一邊把 PCM 資料推進 MatesX。

固定 body：

```json
{
  "text": "使用 ESG API 回傳的 tts_text",
  "character": "hayley",
  "replacement": "esg",
  "seed": 2
}
```

回應格式為 `audio/wav` blob。TTS 失敗不會阻塞文字回答顯示，只會在 console warning。

### MatesX Runtime

MatesX 負責角色影片與嘴型同步。前端會載入本地 runtime、WASM 與角色素材。

目前使用的資產：

- `public/matesx/js/DHLiveMini2.js`
- `public/matesx/js/pako.min.js`
- `public/matesx/wasm/DHLiveMini2.wasm`
- `public/matesx/assets/aikka/01.webm`
- `public/matesx/assets/aikka/combined_data.json.gz`

角色影片載入策略：

- 先嘗試 `01_opaque.webm`
- 若不存在或瀏覽器無法播放，自動 fallback 到 `01.webm`

目前專案已驗證 `01.webm` 可正常顯示並進行 lip-sync。

## 環境變數

請從 `.env.example` 複製一份 `.env`：

```bash
cp .env.example .env
```

| 變數                         | 說明                          |
| ---------------------------- | ----------------------------- |
| `VITE_ESG_API_BASE_URL`      | ESG API 位置設定              |
| `VITE_ESG_API_TOKEN`         | ESG API 驗證設定              |
| `VITE_TTS_STREAM_URL`        | TTS stream 位置設定           |
| `VITE_TTS_CHARACTER`         | TTS 角色名稱                  |
| `VITE_TTS_REPLACEMENT`       | TTS replacement 規則集        |
| `VITE_TTS_SEED`              | TTS 推理 seed                 |
| `VITE_MATESX_ASSET_BASE`     | MatesX 靜態資產根路徑         |
| `VITE_MATESX_CHARACTER`      | MatesX 角色資料夾名稱         |
| `VITE_ENABLE_MOBILE_CONSOLE` | 是否啟用 Eruda mobile console |

## 開發環境

### 需求

- Node.js `>=24`
- pnpm `11.6.0`

### 安裝

```bash
pnpm install
```

### 啟動

```bash
pnpm dev
```

Vite dev server 預設使用 `http://localhost:3008`。

### 常用指令

```bash
pnpm lint
pnpm build
pnpm test
pnpm test:coverage
pnpm test:watch
pnpm format
```

## 專案結構

```text
src/
├── api/
│   ├── esgApi.ts             # ESG topics/start/message API adapter
│   └── ttsApi.ts             # TTS stream API adapter
├── data/
│   └── esgFallbackTopics.ts  # topics fallback 資料
├── i18n/
│   └── locales/              # 中英文文案
├── router/
│   └── index.ts              # 單一路由進入 ESG 頁
├── services/
│   └── matesxPlayer.ts       # MatesX runtime + lip-sync 封裝
├── types/
│   └── esg.ts
├── views/
│   └── EsgVirtualHuman.vue   # 主畫面與互動流程
└── style.css                 # LINE Seed JP 字體與全域樣式

public/
├── images/
│   ├── esg-hero-bg.png
│   ├── setlogo.png
│   ├── setfuturelogo.png
│   └── icon_*.png
└── matesx/
    ├── assets/aikka/
    ├── js/
    └── wasm/
```

## 字體與素材

- 主要字體：`LINESeedJP-Bold.ttf`
- 背景圖：`public/images/esg-hero-bg.png`
- Logo：
  - `public/images/setlogo.png`
  - `public/images/setfuturelogo.png`
- 右側按鈕圖示：
  - `icon_lang_*`
  - `icon_questions_*`
  - `icon_interrupt_*`
  - `icon_restart_*`

## 目前限制

- 目前是本地 MatesX 影片 + TTS 音訊 + lip-sync，未使用 WebRTC 虛擬人串流
- `01_opaque.webm` 若未提供，會 fallback 使用 `01.webm`
- API 驗證與連線位置由本機 `.env` 設定，正式部署需再確認設定方式
- MatesX runtime 與角色素材目前直接放在 `public/matesx/`，後續若更換角色需同步更新素材與 `.env`

## 驗證

修改後請至少執行：

```bash
pnpm lint
pnpm build
```

目前 build 可能出現既有的 Eruda direct `eval` warning，不影響建置完成。
