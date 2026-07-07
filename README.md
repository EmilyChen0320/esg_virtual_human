# ESG Virtual Human

三立 ESG 展區用的 AI 虛擬人互動頁。此專案以 Vue 3、TypeScript、Vite 建置，主要提供直式 kiosk 畫面、快速問題清單、ESG API 問答、TTS 語音播放，以及中英文切換。

目前版本只播放 TTS 音訊，尚未支援 lip-sync、WebRTC 虛擬人串流或嘴型同步。

## 功能範圍

- 9:16 kiosk 直式互動畫面
- 三立集團與 SET FUTURE 品牌視覺
- 中英文語系切換
- ESG 快速問題清單
- ESG chat session 建立與問答
- 顯示使用者題目泡泡與 AI 回答泡泡
- 回答後呼叫 TTS stream 並播放 WAV 音訊
- 回答或 TTS 播放中可中斷
- 重啟確認彈窗
- 本機 API fallback 預覽提示

## 使用流程

```text
載入頁面
→ 取得 ESG topics
→ 建立 ESG chat session
→ 使用者點選快速問題
→ 顯示題目泡泡
→ 呼叫 ESG chat/message
→ 顯示 message 回答泡泡
→ 若 tts_text 有值，呼叫 TTS stream 播放語音
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

TTS API 負責把文字合成 WAV 音訊。

```text
POST http://talk-dev.aitago.tw:8001/tts_stream
```

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

## 環境變數

請從 `.env.example` 複製一份 `.env`：

```bash
cp .env.example .env
```

| 變數                         | 說明                                                       |
| ---------------------------- | ---------------------------------------------------------- |
| `VITE_ESG_API_BASE_URL`      | ESG API base URL                                           |
| `VITE_ESG_API_TOKEN`         | ESG API token，前端以 `Authorization: Bearer <token>` 送出 |
| `VITE_TTS_STREAM_URL`        | TTS stream endpoint                                        |
| `VITE_TTS_CHARACTER`         | TTS 角色名稱                                               |
| `VITE_TTS_REPLACEMENT`       | TTS replacement 規則集                                     |
| `VITE_TTS_SEED`              | TTS 推理 seed                                              |
| `VITE_ENABLE_MOBILE_CONSOLE` | 是否啟用 Eruda mobile console                              |

`.env` 已被 `.gitignore` 忽略，請不要提交真實 token。

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
pnpm test:watch
pnpm test:coverage
pnpm format
```

## 專案結構

```text
src/
├── api/
│   ├── esgApi.ts        # ESG topics/start/message API adapter
│   └── ttsApi.ts        # TTS stream API adapter
├── data/
│   └── esgFallbackTopics.ts
├── router/
│   └── index.ts         # ESG virtual human route
├── types/
│   └── esg.ts
├── views/
│   └── EsgVirtualHuman.vue
└── style.css            # LINE Seed JP 字體與全域樣式

public/
└── images/
    ├── esg-hero-bg.png
    ├── setlogo.png
    ├── setfuturelogo.png
    └── icon_*.png
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

- 尚未支援 lip-sync / 嘴型同步
- 尚未支援虛擬人 WebRTC 影片串流
- 目前只有 TTS 音訊播放
- ESG API token 由本機 `.env` 設定，正式部署需確認 token 暴露策略
- 舊 HC 專案的錄音、STT、WebRTC、影片待機素材已不屬於目前 ESG 虛擬人需求

## 驗證

修改後請至少執行：

```bash
pnpm lint
pnpm build
```

目前 build 可能出現既有的 Eruda direct `eval` warning，不影響建置完成。
