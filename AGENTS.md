# AGENTS.md

Concise AI runbook for this repo. For full human context, architecture detail, UI geometry, debug notes, and deployment notes, read `README.md`. Do not duplicate README detail here.

## Project

Vue 3 + TypeScript + Vite + Tailwind CSS v4 SPA.

Flow: user voice -> browser recording -> backend STT -> AI/TTS/lip-sync -> WebRTC avatar stream.
Routes: `/` = password login, `/chat` = protected chat.

## Must Do

After every code change, run in order:

```bash
pnpm lint
pnpm build
```

Also:

- Add/update tests for changed behavior.
- Final response includes Conventional Commit message.
- Do not run `git commit` unless user explicitly asks.
- Do not modify `src/lib/srs.sdk.js`.
- If behavior/detail seems missing here, read `README.md` at first, never guessing.

## Commands

- `pnpm dev` - Vite dev server, default port `3008`, never execute command unless user need you do it
- `pnpm build` - `vue-tsc -b && vite build`
- `pnpm lint` - `oxlint . --fix`
- `pnpm format` - `oxfmt --write .`
- `pnpm test` - `vitest run`
- `pnpm test:watch` - watch mode
- `pnpm test:coverage` - coverage

Runtime: Node.js latest LTS. Docker build copies `package.json`, `pnpm-lock.yaml`, and `pnpm-workspace.yaml` before `pnpm install --frozen-lockfile`; keep `src/dockerfile.test.ts` aligned if dependency-layer files change.

## Key Files

- `src/views/Home.vue` - 6-digit login, language switch confirmation, session entry.
- `src/views/Chat.vue` - chat page shell; uses `useChatPage`.
- `src/composables/useChatPage.ts` - main orchestrator; start here for chat behavior.
- `src/composables/useChat.ts` - dialog history, avatar/voice lists, text/STT send flow.
- `src/composables/useRecordingFlow.ts` - recording flow, stop -> thinking -> STT -> `/human`.
- `src/composables/useAudioRecording.ts` - MediaRecorder, WAV conversion, VAD auto-stop.
- `src/composables/useChatMessageFlow.ts` - text/FAQ send flow and AI payload handling.
- `src/composables/useChatNotify.ts` - notify event callbacks, stream visibility.
- `src/composables/useRestartFlow.ts` - restart/language switch teardown.
- `src/composables/useConnectionMonitor.ts` - `/is_speaking` heartbeat and disconnected state.
- `src/composables/useFaq.ts` - FAQ topics, two-layer nav, language-specific fetch.
- `src/components/chat/ChatActionControls.vue` - top/bottom controls, QR, logo reload.
- `src/components/chat/ChatReadyOverlay.vue` - ready mode UI.
- `src/components/chat/ChatDialogOverlay.vue` - dialog viewport.
- `src/components/chat/BottomActionRow.vue` - shared wheelchair restart/FAQ row.
- `src/constants/ui.ts` - canvas/layout/bubble/button geometry. Keep pixel constants here.
- `src/constants/audio.ts` - VAD/WAV constants.
- `src/api/chatApi.ts` - REST client and `ApiError`.
- `src/types/mediaRefs.ts` - shared `VideoStreamHandle`.

## Behavior Notes

- Auth: `/chat` needs valid 24h session. Home preserves active `?lang=` when redirecting.
- Chat modes: `standby`, `ready`, `conversation` live in `useChatPage`.
- Local videos: standby `idle.mp4`; ready/waiting `waiting-command.mp4`; processing
  `thinking.mp4`; restart/language warning `bye.mp4`.
- Restart/language switch opens `RestartDialog`; chat restart stays on `/chat`.
- FAQ question send bypasses info-button cooldown.
- Recording VAD: after volume crosses `VOLUME_THRESHOLD`, silence for
  `SPEECH_END_SILENCE_DURATION` (`1200ms`) auto-stops. If no speech detected,
  `NO_SPEECH_TIMEOUT` (`8000ms`) stops empty/no-speech path. Do not restore old fixed minimum
  recording delay.
- `useRecordingFlow` starts `thinking.mp4` immediately when stopping recording, before WAV
  conversion/STT upload finishes.
- Bottom/wheelchair layout: `BottomActionRow.vue` dimensions/position must match ready and
  conversation transitions.
- Disconnected guard: user-initiated API paths return early when `isDisconnected.value`.
- Dialog history immutable: replace array, do not mutate in place.
- Console logs use `[moduleName] message`.

## API

Base URLs from `VITE_*`; production fallbacks in `src/constants/api.ts` and
`src/constants/stream.ts`.

Main endpoints:

- `/hciot_chat_start`
- `/ai_chat_hciot`
- `/human`
- `/transcribe5[_en]`
- `/get_notify_events`
- `/is_speaking`
- `/hciot_topics/{lang}`

Need exact payloads or host defaults? Read `README.md` or `src/api/chatApi.ts`.

## Style

- Vue SFC: `<script setup lang="ts">`, Composition API.
- Prefer `shallowRef` for non-deep state.
- Object shapes: prefer `interface`.
- Props/emits: type-based declarations.
- Import order: side-effect -> builtin -> external -> internal -> parent -> sibling -> index.
- Format: oxfmt, 100 cols, 2 spaces, double quotes, semicolons.

## Tests

Vitest + Vue Test Utils + happy-dom. Tests colocated as `*.test.ts`.

Coverage excludes external SDK, types, i18n, router, app shell, constants, and hardware-heavy
audio implementation. Mock hardware/browser APIs in focused tests.

## External

- SRS SDK: `src/lib/srs.sdk.js`; untyped, do not edit.
- Lottie: `lottie-web/build/player/lottie_light`.
- Public assets: `public/images/`.
