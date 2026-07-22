import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MatesxPlayer, isIdleBypassEnabled } from "./matesxPlayer";

const CANVAS_WIDTH = 1080;
const CANVAS_HEIGHT = 1920;
const RECT = { x: 452, y: 486, size: 232 };

interface FakeContext {
  globalAlpha: number;
  clearRect(x: number, y: number, width: number, height: number): void;
  drawImage(...args: unknown[]): void;
}

function createFakeCanvas() {
  const calls: string[] = [];
  const context: FakeContext = {
    globalAlpha: 1,
    clearRect(_x, _y, width, height) {
      calls.push(`clearRect ${width}x${height}`);
    },
    drawImage(...args) {
      calls.push(`drawImage ${args.length} alpha=${context.globalAlpha}`);
    }
  };
  const canvas = {
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    getContext: () => context
  };
  return { canvas, context, calls };
}

/** 重現 vendor 每幀在 canvas_video 上的呼叫順序。 */
function renderVendorFrame(context: FakeContext) {
  context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  context.drawImage({}, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  context.clearRect(RECT.x, RECT.y, RECT.size, RECT.size);
  context.drawImage({}, 0, 0, 180, 180, RECT.x, RECT.y, RECT.size, RECT.size);
}

/** 這幾個方法在 MatesxPlayer 上是 private，測試需要直接驅動它們。 */
interface PlayerInternals {
  installIdleBypass(): void;
  beginSpeaking(): void;
  endSpeaking(): void;
}

function createPlayer(canvas: unknown): PlayerInternals {
  vi.spyOn(document, "getElementById").mockReturnValue(canvas as HTMLElement);
  const player = new MatesxPlayer({
    assetBase: "/matesx",
    character: "aikka",
    canvas: {} as HTMLCanvasElement
  });
  return player as unknown as PlayerInternals;
}

describe("isIdleBypassEnabled", () => {
  it("defaults to enabled and only opts out on explicit falsy flags", () => {
    expect(isIdleBypassEnabled(undefined)).toBe(true);
    expect(isIdleBypassEnabled("true")).toBe(true);
    expect(isIdleBypassEnabled("False")).toBe(false);
    expect(isIdleBypassEnabled(" off ")).toBe(false);
    expect(isIdleBypassEnabled("0")).toBe(false);
  });
});

describe("matesx idle bypass", () => {
  let nowSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    nowSpy = vi.spyOn(performance, "now").mockReturnValue(0);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("keeps the native video frame and drops the patch while idle", () => {
    const { canvas, context, calls } = createFakeCanvas();
    createPlayer(canvas).installIdleBypass();

    renderVendorFrame(context);

    expect(calls).toEqual([`clearRect ${CANVAS_WIDTH}x${CANVAS_HEIGHT}`, "drawImage 5 alpha=1"]);
  });

  it("restores the untouched vendor pipeline once fade-in completes", () => {
    const { canvas, context, calls } = createFakeCanvas();
    const player = createPlayer(canvas);
    player.installIdleBypass();

    player.beginSpeaking();
    nowSpy.mockReturnValue(5_000);
    renderVendorFrame(context);

    expect(calls).toEqual([
      `clearRect ${CANVAS_WIDTH}x${CANVAS_HEIGHT}`,
      "drawImage 5 alpha=1",
      `clearRect ${RECT.size}x${RECT.size}`,
      "drawImage 9 alpha=1"
    ]);
  });

  it("cross-fades the patch over the sharp frame without clearing it", () => {
    const { canvas, context, calls } = createFakeCanvas();
    const player = createPlayer(canvas);
    player.installIdleBypass();

    player.beginSpeaking();
    nowSpy.mockReturnValue(100); // 淡入進行到一半
    renderVendorFrame(context);

    // rect 的 clearRect 被跳過，底下銳利的影片才留得住讓 patch 疊上去
    expect(calls).toEqual([
      `clearRect ${CANVAS_WIDTH}x${CANVAS_HEIGHT}`,
      "drawImage 5 alpha=1",
      "drawImage 9 alpha=0.5"
    ]);
    expect(context.globalAlpha).toBe(1);
  });

  it("returns to the native frame after the tail and fade-out elapse", () => {
    const { canvas, context, calls } = createFakeCanvas();
    const player = createPlayer(canvas);
    player.installIdleBypass();

    player.beginSpeaking();
    nowSpy.mockReturnValue(1_000);
    player.endSpeaking();

    nowSpy.mockReturnValue(1_000 + 300 + 250); // tail + fade-out
    calls.length = 0;
    renderVendorFrame(context);

    expect(calls).toEqual([`clearRect ${CANVAS_WIDTH}x${CANVAS_HEIGHT}`, "drawImage 5 alpha=1"]);
  });
});
