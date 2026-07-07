import { describe, it, expect, vi, beforeEach } from "vitest";

import { useLocalVideo } from "./useLocalVideo";

function flushMicrotasks(): Promise<void> {
  return new Promise((resolve) => {
    const ch = new MessageChannel();
    ch.port1.onmessage = () => resolve();
    ch.port2.postMessage(undefined);
  });
}

function createMockVideo(): HTMLVideoElement {
  const listeners: Record<string, Array<EventListener>> = {};
  const video = {
    src: "",
    muted: false,
    loop: false,
    currentTime: 0,
    paused: false,
    ended: false,
    readyState: 2,
    play: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn(),
    load: vi.fn(),
    removeAttribute: vi.fn((name: string) => {
      if (name === "src") {
        video.src = "";
      }
    }),
    addEventListener: vi.fn((event: string, handler: EventListener) => {
      if (!listeners[event]) {
        listeners[event] = [];
      }
      listeners[event].push(handler);
    }),
    removeEventListener: vi.fn((event: string, handler: EventListener) => {
      if (listeners[event]) {
        listeners[event] = listeners[event].filter((h) => h !== handler);
      }
    })
  } as unknown as HTMLVideoElement & {
    _listeners: Record<string, Array<EventListener>>;
  };
  (video as HTMLVideoElement & { _listeners: typeof listeners })._listeners = listeners;
  return video;
}

describe("useLocalVideo", () => {
  const IDLE_SRC = "/video/idle.mp4";
  const THINKING_SRC = "/video/thinking.mp4";
  const WAITING_SRC = "/video/waiting-command.mp4";
  const BYE_SRC = "/video/bye.mp4";

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("getCurrentVideoRef returns active buffer ref", () => {
    const lv = useLocalVideo(IDLE_SRC, THINKING_SRC);
    const mockVideo = createMockVideo();
    lv.videoRefA.value = mockVideo;
    expect(lv.getCurrentVideoRef()).toBe(mockVideo);
  });

  describe("initializeVideos", () => {
    it("sets idle src with loop=true and plays", async () => {
      const lv = useLocalVideo(IDLE_SRC, THINKING_SRC);
      const mockVideo = createMockVideo();
      lv.videoRefA.value = mockVideo;

      lv.initializeVideos();
      await flushMicrotasks();

      expect(mockVideo.src).toBe(IDLE_SRC);
      expect(mockVideo.loop).toBe(true);
      expect(mockVideo.play).toHaveBeenCalled();
    });

    it("does nothing when video ref is null", () => {
      const lv = useLocalVideo(IDLE_SRC, THINKING_SRC);
      lv.initializeVideos();
    });
  });

  describe("setBaseVideoSource", () => {
    it("updates baseVideoSrc", () => {
      const lv = useLocalVideo(IDLE_SRC, THINKING_SRC);
      lv.setBaseVideoSource(WAITING_SRC);
      lv.setBaseVideoSource(IDLE_SRC);
    });
  });

  describe("startThinkingVideo", () => {
    it("sets thinking src with loop=true and muted, then plays", async () => {
      const lv = useLocalVideo(IDLE_SRC, THINKING_SRC);
      const mockVideo = createMockVideo();
      lv.videoRefB.value = mockVideo;

      lv.startThinkingVideo();
      await flushMicrotasks();

      expect(mockVideo.src).toBe(THINKING_SRC);
      expect(mockVideo.muted).toBe(true);
      expect(mockVideo.loop).toBe(true);
      expect(mockVideo.play).toHaveBeenCalled();
    });

    it("does nothing when no video ref", () => {
      const lv = useLocalVideo(IDLE_SRC, THINKING_SRC);
      lv.startThinkingVideo();
    });

    it("handles play rejection gracefully", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const lv = useLocalVideo(IDLE_SRC, THINKING_SRC);
      const mockVideo = createMockVideo();
      (mockVideo.play as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("play failed"));
      lv.videoRefB.value = mockVideo;

      lv.startThinkingVideo();
      await flushMicrotasks();
      await flushMicrotasks();

      expect(consoleSpy).toHaveBeenCalledWith(
        "[useLocalVideo] startThinkingVideo play failed:",
        expect.any(Error)
      );
    });
  });

  describe("pauseThinkingVideo", () => {
    it("sets loop=false and pauses", () => {
      const lv = useLocalVideo(IDLE_SRC, THINKING_SRC);
      const mockVideo = createMockVideo();
      mockVideo.loop = true;
      lv.videoRefA.value = mockVideo;

      lv.pauseThinkingVideo();

      expect(mockVideo.loop).toBe(false);
      expect(mockVideo.pause).toHaveBeenCalled();
    });

    it("does nothing when no video ref", () => {
      const lv = useLocalVideo(IDLE_SRC, THINKING_SRC);
      lv.pauseThinkingVideo();
    });
  });

  describe("stopThinkingVideo", () => {
    it("restores idle src with loop=true, unmutes, and plays", async () => {
      const lv = useLocalVideo(IDLE_SRC, THINKING_SRC);
      const mockVideo = createMockVideo();
      mockVideo.src = THINKING_SRC;
      mockVideo.muted = true;
      mockVideo.loop = true;
      lv.videoRefB.value = mockVideo;

      lv.stopThinkingVideo();
      await flushMicrotasks();

      expect(mockVideo.loop).toBe(true);
      expect(mockVideo.currentTime).toBe(0);
      expect(mockVideo.src).toBe(IDLE_SRC);
      expect(mockVideo.muted).toBe(false);
      expect(mockVideo.play).toHaveBeenCalled();
    });

    it("does nothing when no video ref", () => {
      const lv = useLocalVideo(IDLE_SRC, THINKING_SRC);
      lv.stopThinkingVideo();
    });

    it("handles play rejection gracefully", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const lv = useLocalVideo(IDLE_SRC, THINKING_SRC);
      const mockVideo = createMockVideo();
      (mockVideo.play as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("play failed"));
      lv.videoRefB.value = mockVideo;

      lv.stopThinkingVideo();
      await flushMicrotasks();
      await flushMicrotasks();

      expect(consoleSpy).toHaveBeenCalledWith(
        "[useLocalVideo] stopThinkingVideo play failed:",
        expect.any(Error)
      );
    });
  });

  describe("pauseCurrentVideo", () => {
    it("pauses and resets currentTime", () => {
      const lv = useLocalVideo(IDLE_SRC, THINKING_SRC);
      const mockVideo = createMockVideo();
      mockVideo.currentTime = 5;
      lv.videoRefA.value = mockVideo;

      lv.pauseCurrentVideo();

      expect(mockVideo.pause).toHaveBeenCalled();
      expect(mockVideo.currentTime).toBe(0);
    });

    it("does nothing when no video ref", () => {
      const lv = useLocalVideo(IDLE_SRC, THINKING_SRC);
      lv.pauseCurrentVideo();
    });
  });

  describe("playIdleVideo", () => {
    it("sets idle src with loop=true and plays", async () => {
      const lv = useLocalVideo(IDLE_SRC, THINKING_SRC);
      const mockVideo = createMockVideo();
      lv.videoRefB.value = mockVideo;

      lv.playIdleVideo();
      await flushMicrotasks();

      expect(mockVideo.loop).toBe(true);
      expect(mockVideo.src).toBe(IDLE_SRC);
      expect(mockVideo.play).toHaveBeenCalled();
    });

    it("does nothing when no video ref", () => {
      const lv = useLocalVideo(IDLE_SRC, THINKING_SRC);
      lv.playIdleVideo();
    });

    it("uses the updated base video source", async () => {
      const lv = useLocalVideo(IDLE_SRC, THINKING_SRC);
      const mockVideo = createMockVideo();
      lv.videoRefB.value = mockVideo;

      lv.setBaseVideoSource(WAITING_SRC);
      lv.playIdleVideo();
      await flushMicrotasks();

      expect(mockVideo.src).toBe(WAITING_SRC);
      expect(mockVideo.play).toHaveBeenCalled();
    });

    it("handles play rejection gracefully", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const lv = useLocalVideo(IDLE_SRC, THINKING_SRC);
      const mockVideo = createMockVideo();
      (mockVideo.play as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("play failed"));
      lv.videoRefB.value = mockVideo;

      lv.playIdleVideo();
      await flushMicrotasks();
      await flushMicrotasks();

      expect(consoleSpy).toHaveBeenCalledWith(
        "[useLocalVideo] playIdleVideo play failed:",
        expect.any(Error)
      );
    });
  });

  describe("playVideoOnce", () => {
    it("plays the provided src with loop=false and resolves on ended", async () => {
      const lv = useLocalVideo(IDLE_SRC, THINKING_SRC);
      const mockVideo = createMockVideo();
      lv.videoRefA.value = mockVideo;

      const listeners = (
        mockVideo as HTMLVideoElement & { _listeners: Record<string, Array<EventListener>> }
      )._listeners;

      const playPromise = lv.playVideoOnce(BYE_SRC);

      expect(mockVideo.src).toBe(BYE_SRC);
      expect(mockVideo.loop).toBe(false);
      expect(mockVideo.play).toHaveBeenCalled();

      // Simulate ended event
      listeners["ended"]?.forEach((handler) => handler(new Event("ended")));
      await playPromise;
    });

    it("handles play rejection gracefully", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const lv = useLocalVideo(IDLE_SRC, THINKING_SRC);
      const mockVideo = createMockVideo();
      (mockVideo.play as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("play failed"));
      lv.videoRefA.value = mockVideo;

      await lv.playVideoOnce(BYE_SRC);

      expect(consoleSpy).toHaveBeenCalledWith(
        "[useLocalVideo] playVideoOnce play rejected:",
        expect.any(Error)
      );
    });

    it("handles error event gracefully", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const lv = useLocalVideo(IDLE_SRC, THINKING_SRC);
      const mockVideo = createMockVideo();
      const listeners = (
        mockVideo as HTMLVideoElement & { _listeners: Record<string, Array<EventListener>> }
      )._listeners;
      lv.videoRefA.value = mockVideo;

      const playPromise = lv.playVideoOnce(BYE_SRC);
      listeners["error"]?.forEach((handler) => handler(new Event("error")));
      await playPromise;

      expect(consoleSpy).toHaveBeenCalledWith(
        "[useLocalVideo] playVideoOnce error:",
        expect.any(Event)
      );
    });
  });

  describe("transitionToBaseVideo", () => {
    it("sets new src with loop=true and plays", async () => {
      const lv = useLocalVideo(IDLE_SRC, THINKING_SRC);
      const mockVideo = createMockVideo();
      lv.videoRefB.value = mockVideo;

      await lv.transitionToBaseVideo(WAITING_SRC);

      expect(mockVideo.src).toBe(WAITING_SRC);
      expect(mockVideo.loop).toBe(true);
      expect(mockVideo.play).toHaveBeenCalled();
    });

    it("updates baseVideoSrc", async () => {
      const lv = useLocalVideo(IDLE_SRC, THINKING_SRC);
      const mockVideoA = createMockVideo();
      const mockVideoB = createMockVideo();
      lv.videoRefA.value = mockVideoA;
      lv.videoRefB.value = mockVideoB;

      await lv.transitionToBaseVideo(WAITING_SRC);

      // After transition, B is now active; playIdleVideo loads into A (inactive)
      lv.playIdleVideo();
      expect(mockVideoA.src).toBe(WAITING_SRC);
    });

    it("is a no-op when no video ref", async () => {
      const lv = useLocalVideo(IDLE_SRC, THINKING_SRC);
      await lv.transitionToBaseVideo(WAITING_SRC);
    });

    it("handles play rejection gracefully", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const lv = useLocalVideo(IDLE_SRC, THINKING_SRC);
      const mockVideo = createMockVideo();
      (mockVideo.play as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("play failed"));
      lv.videoRefB.value = mockVideo;

      await lv.transitionToBaseVideo(WAITING_SRC);

      expect(consoleSpy).toHaveBeenCalledWith(
        "[useLocalVideo] transitionToBaseVideo play failed:",
        expect.any(Error)
      );
    });
  });

  describe("enterOfflineLoop", () => {
    it("sets loop=true with base src and plays", async () => {
      const lv = useLocalVideo(IDLE_SRC, THINKING_SRC);
      const mockVideo = createMockVideo();
      mockVideo.src = THINKING_SRC;
      mockVideo.loop = false;
      lv.videoRefB.value = mockVideo;

      lv.enterOfflineLoop();
      await flushMicrotasks();

      expect(mockVideo.loop).toBe(true);
      expect(mockVideo.src).toBe(IDLE_SRC);
      expect(mockVideo.play).toHaveBeenCalled();
    });

    it("does nothing when no video ref", () => {
      const lv = useLocalVideo(IDLE_SRC, THINKING_SRC);
      lv.enterOfflineLoop();
    });

    it("logs when play rejects", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const lv = useLocalVideo(IDLE_SRC, THINKING_SRC);
      const mockVideo = createMockVideo();
      (mockVideo.play as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("offline"));
      lv.videoRefB.value = mockVideo;

      lv.enterOfflineLoop();
      await flushMicrotasks();
      await flushMicrotasks();

      expect(consoleSpy).toHaveBeenCalledWith(
        "[useLocalVideo] enterOfflineLoop failed:",
        expect.any(Error)
      );
    });
  });

  describe("preloadBytes", () => {
    it("creates a throwaway video element and loads bytes", () => {
      const lv = useLocalVideo(IDLE_SRC, THINKING_SRC);
      const createSpy = vi.spyOn(document, "createElement");

      lv.preloadBytes(WAITING_SRC);

      const videoCalls = createSpy.mock.calls.filter(([tag]) => tag === "video");
      expect(videoCalls.length).toBe(1);
      const created = createSpy.mock.results.find((r) => r.value?.tagName === "VIDEO")
        ?.value as HTMLVideoElement;
      expect(created.src).toContain(WAITING_SRC);
      expect(created.preload).toBe("auto");
    });

    it("creates a new video element on each call", () => {
      const lv = useLocalVideo(IDLE_SRC, THINKING_SRC);
      const createSpy = vi.spyOn(document, "createElement");

      lv.preloadBytes(WAITING_SRC);
      lv.preloadBytes(WAITING_SRC);

      const videoCalls = createSpy.mock.calls.filter(([tag]) => tag === "video");
      expect(videoCalls.length).toBe(2);
    });
  });

  describe("cleanup", () => {
    it("releases both local video buffers", () => {
      const lv = useLocalVideo(IDLE_SRC, THINKING_SRC);
      const mockVideoA = createMockVideo();
      const mockVideoB = createMockVideo();
      mockVideoA.src = IDLE_SRC;
      mockVideoB.src = THINKING_SRC;
      lv.videoRefA.value = mockVideoA;
      lv.videoRefB.value = mockVideoB;

      lv.cleanup();

      expect(mockVideoA.pause).toHaveBeenCalledOnce();
      expect(mockVideoA.removeAttribute).toHaveBeenCalledWith("src");
      expect(mockVideoA.load).toHaveBeenCalledOnce();
      expect(mockVideoB.pause).toHaveBeenCalledOnce();
      expect(mockVideoB.removeAttribute).toHaveBeenCalledWith("src");
      expect(mockVideoB.load).toHaveBeenCalledOnce();
    });

    it("releases preloaded clips", () => {
      const lv = useLocalVideo(IDLE_SRC, THINKING_SRC);
      const createdVideos: HTMLVideoElement[] = [];
      const originalCreateElement = document.createElement.bind(document);
      vi.spyOn(document, "createElement").mockImplementation((tagName: string) => {
        if (tagName !== "video") {
          return originalCreateElement(tagName);
        }
        const video = createMockVideo();
        createdVideos.push(video);
        return video;
      });

      lv.preloadAll([IDLE_SRC, THINKING_SRC]);
      lv.cleanup();

      expect(createdVideos).toHaveLength(2);
      for (const video of createdVideos) {
        expect(video.pause).toHaveBeenCalledOnce();
        expect(video.removeAttribute).toHaveBeenCalledWith("src");
        expect(video.load).toHaveBeenCalled();
      }
    });
  });
});
