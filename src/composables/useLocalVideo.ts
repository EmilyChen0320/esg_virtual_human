import { shallowRef } from "vue";

export function useLocalVideo(idleVideoSrc: string, thinkingVideoSrc: string) {
  const videoRefA = shallowRef<HTMLVideoElement | null>(null);
  const videoRefB = shallowRef<HTMLVideoElement | null>(null);
  const baseVideoSrc = shallowRef(idleVideoSrc);
  const activeBuffer = shallowRef<"A" | "B">("A");

  let transitionAbortController: AbortController | null = null;
  let switchGeneration = 0;

  function getActiveRef() {
    return activeBuffer.value === "A" ? videoRefA.value : videoRefB.value;
  }

  function getInactiveRef() {
    return activeBuffer.value === "A" ? videoRefB.value : videoRefA.value;
  }

  function swapActive() {
    activeBuffer.value = activeBuffer.value === "A" ? "B" : "A";
  }

  function abortAllHandlers() {
    if (transitionAbortController) {
      transitionAbortController.abort();
      transitionAbortController = null;
    }
  }

  function nextGeneration(): number {
    return ++switchGeneration;
  }

  function waitForReady(video: HTMLVideoElement, generation: number): Promise<boolean> {
    if (video.readyState >= 2) {
      return Promise.resolve(generation === switchGeneration);
    }
    return new Promise((resolve) => {
      const onReady = () => {
        video.removeEventListener("loadeddata", onReady);
        video.removeEventListener("error", onError);
        resolve(generation === switchGeneration);
      };
      const onError = () => {
        video.removeEventListener("loadeddata", onReady);
        video.removeEventListener("error", onError);
        resolve(false);
      };
      video.addEventListener("loadeddata", onReady, { once: true });
      video.addEventListener("error", onError, { once: true });
    });
  }

  function initializeVideos() {
    const active = getActiveRef();
    if (!active) {
      return;
    }
    const gen = nextGeneration();
    active.src = baseVideoSrc.value;
    active.loop = true;
    waitForReady(active, gen).then((ok) => {
      if (ok && gen === switchGeneration) {
        active.play().catch((error) => {
          console.error("[useLocalVideo] initializeVideos play failed:", error);
        });
      }
    });
  }

  function setBaseVideoSource(src: string) {
    baseVideoSrc.value = src;
  }

  function playIdleVideo() {
    const inactive = getInactiveRef();
    if (!inactive) {
      return;
    }
    abortAllHandlers();
    const gen = nextGeneration();
    inactive.loop = true;
    inactive.currentTime = 0;
    inactive.src = baseVideoSrc.value;
    inactive.muted = false;
    waitForReady(inactive, gen).then((ok) => {
      if (ok && gen === switchGeneration) {
        inactive
          .play()
          .then(() => swapActive())
          .catch((error) => {
            console.error("[useLocalVideo] playIdleVideo play failed:", error);
          });
      }
    });
  }

  function startThinkingVideo() {
    const inactive = getInactiveRef();
    if (!inactive) {
      return;
    }
    abortAllHandlers();
    const gen = nextGeneration();
    inactive.src = thinkingVideoSrc;
    inactive.muted = true;
    inactive.loop = true;
    waitForReady(inactive, gen).then((ok) => {
      if (ok && gen === switchGeneration) {
        inactive
          .play()
          .then(() => swapActive())
          .catch((error) => {
            console.error("[useLocalVideo] startThinkingVideo play failed:", error);
          });
      }
    });
  }

  function pauseThinkingVideo() {
    const active = getActiveRef();
    if (!active) {
      return;
    }
    abortAllHandlers();
    active.loop = false;
    active.pause();
  }

  function stopThinkingVideo() {
    const inactive = getInactiveRef();
    if (!inactive) {
      return;
    }
    abortAllHandlers();
    const gen = nextGeneration();
    inactive.loop = true;
    inactive.currentTime = 0;
    inactive.src = baseVideoSrc.value;
    inactive.muted = false;
    waitForReady(inactive, gen).then((ok) => {
      if (ok && gen === switchGeneration) {
        inactive
          .play()
          .then(() => swapActive())
          .catch((error) => {
            console.error("[useLocalVideo] stopThinkingVideo play failed:", error);
          });
      }
    });
  }

  function pauseCurrentVideo() {
    const active = getActiveRef();
    if (!active) {
      return;
    }
    abortAllHandlers();
    active.pause();
    active.currentTime = 0;
  }

  async function playVideoOnce(src: string) {
    const active = getActiveRef();
    if (!active) {
      return;
    }

    abortAllHandlers();
    const controller = new AbortController();
    transitionAbortController = controller;

    active.loop = false;
    active.currentTime = 0;
    active.src = src;

    await new Promise<void>((resolve) => {
      const cleanup = () => {
        if (transitionAbortController === controller) {
          transitionAbortController = null;
        }
      };

      const onEnded = () => {
        cleanup();
        resolve();
      };

      const onError = (e: Event) => {
        cleanup();
        console.error("[useLocalVideo] playVideoOnce error:", e);
        resolve();
      };

      active.addEventListener("ended", onEnded, {
        signal: controller.signal
      });
      active.addEventListener("error", onError, {
        signal: controller.signal
      });

      active.play().catch((error) => {
        cleanup();
        console.error("[useLocalVideo] playVideoOnce play rejected:", error);
        resolve();
      });
    });
  }

  async function transitionToBaseVideo(src: string) {
    const inactive = getInactiveRef();
    if (!inactive) {
      return;
    }

    abortAllHandlers();
    const gen = nextGeneration();
    inactive.loop = true;
    inactive.currentTime = 0;
    inactive.src = src;
    baseVideoSrc.value = src;
    inactive.muted = false;
    const ok = await waitForReady(inactive, gen);
    if (ok && gen === switchGeneration) {
      try {
        await inactive.play();
        swapActive();
      } catch (error) {
        console.error("[useLocalVideo] transitionToBaseVideo play failed:", error);
      }
    }
  }

  function preloadBytes(src: string) {
    const v = document.createElement("video");
    v.src = src;
    v.preload = "auto";
    v.muted = true;
    v.load();
  }

  function releaseVideo(video: HTMLVideoElement | null) {
    if (!video) {
      return;
    }
    video.pause();
    video.removeAttribute("src");
    video.load();
  }

  const preloadedClips = new Map<string, HTMLVideoElement>();

  function preloadAll(sources: string[]) {
    for (const src of sources) {
      if (preloadedClips.has(src)) {
        continue;
      }
      const v = document.createElement("video");
      v.preload = "auto";
      v.muted = true;
      v.src = src;
      v.load();
      preloadedClips.set(src, v);
    }
  }

  function cleanup() {
    abortAllHandlers();
    releaseVideo(videoRefA.value);
    releaseVideo(videoRefB.value);
    for (const video of preloadedClips.values()) {
      releaseVideo(video);
    }
    preloadedClips.clear();
  }

  function enterOfflineLoop() {
    abortAllHandlers();
    const inactive = getInactiveRef();
    if (!inactive) {
      return;
    }
    const gen = nextGeneration();
    inactive.loop = true;
    inactive.src = baseVideoSrc.value;
    waitForReady(inactive, gen).then((ok) => {
      if (ok && gen === switchGeneration) {
        inactive
          .play()
          .then(() => swapActive())
          .catch((error) => {
            console.error("[useLocalVideo] enterOfflineLoop failed:", error);
          });
      }
    });
  }

  return {
    videoRefA,
    videoRefB,
    activeBuffer,
    getCurrentVideoRef: getActiveRef,
    setBaseVideoSource,
    startThinkingVideo,
    pauseThinkingVideo,
    stopThinkingVideo,
    pauseCurrentVideo,
    playIdleVideo,
    playVideoOnce,
    transitionToBaseVideo,
    preloadBytes,
    preloadAll,
    cleanup,
    initializeVideos,
    enterOfflineLoop
  };
}

export interface LocalVideoHandle {
  videoRefA: ReturnType<typeof shallowRef<HTMLVideoElement | null>>;
  videoRefB: ReturnType<typeof shallowRef<HTMLVideoElement | null>>;
  activeBuffer: ReturnType<typeof shallowRef<"A" | "B">>;
  getCurrentVideoRef: () => HTMLVideoElement | null;
  setBaseVideoSource: (src: string) => void;
  playIdleVideo: () => void;
  startThinkingVideo: () => void;
  playVideoOnce: (src: string) => Promise<void>;
  transitionToBaseVideo: (src: string) => Promise<void>;
  preloadBytes: (src: string) => void;
  preloadAll: (sources: string[]) => void;
  cleanup: () => void;
}
