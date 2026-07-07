import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { WHEP_URL } from "../constants/stream";

import { StreamService } from "./streamService";

// Mock the SRS SDK import
vi.mock("../lib/srs.sdk.js", () => ({}));

describe("StreamService", () => {
  let mockSdk: any;

  beforeEach(() => {
    mockSdk = {
      stream: new MediaStream(),
      play: vi.fn().mockResolvedValue(undefined),
      close: vi.fn()
    };
    // Use a real class so `new` works
    window.SrsRtcWhipWhepAsync = class {
      stream = mockSdk.stream;
      play = mockSdk.play;
      close = mockSdk.close;
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete (window as any).SrsRtcWhipWhepAsync;
  });

  describe("startPlay", () => {
    it("creates SDK instance and plays with default stream name", async () => {
      const video = document.createElement("video");
      const service = new StreamService(video);

      await service.startPlay();

      expect(video.srcObject).toBe(mockSdk.stream);
      expect(mockSdk.play).toHaveBeenCalledWith(expect.stringContaining("stream=livestream"));
    });

    it("appends sessionId to stream name when not '0'", async () => {
      const video = document.createElement("video");
      const service = new StreamService(video);

      await service.startPlay("5");

      expect(mockSdk.play).toHaveBeenCalledWith(expect.stringContaining("stream=livestream5"));
    });

    it("uses the documented WHEP endpoint", async () => {
      const video = document.createElement("video");
      const service = new StreamService(video);

      await service.startPlay("5");

      expect(mockSdk.play).toHaveBeenCalledWith(`${WHEP_URL}?app=live&stream=livestream5`);
    });

    it("uses default stream name when sessionId is '0'", async () => {
      const video = document.createElement("video");
      const service = new StreamService(video);

      await service.startPlay("0");

      expect(mockSdk.play).toHaveBeenCalledWith(expect.stringContaining("stream=livestream"));
      // Should NOT contain "livestream0"
      const url = mockSdk.play.mock.calls[0][0];
      expect(url).not.toContain("livestream0");
    });

    it("closes existing SDK before creating new one", async () => {
      const video = document.createElement("video");
      const service = new StreamService(video);

      await service.startPlay();

      // The first SDK's close should be called when we start a new play
      const firstClose = mockSdk.close;

      // Replace the class for the second call
      const newPlay = vi.fn().mockResolvedValue(undefined);
      window.SrsRtcWhipWhepAsync = class {
        stream = new MediaStream();
        play = newPlay;
        close = vi.fn();
      };

      await service.startPlay();

      expect(firstClose).toHaveBeenCalledOnce();
    });

    it("shows video element", async () => {
      const video = document.createElement("video");
      video.style.display = "none";
      const service = new StreamService(video);

      await service.startPlay();

      expect(video.style.display).toBe("");
    });
  });

  describe("close", () => {
    it("closes SDK when it exists", async () => {
      const video = document.createElement("video");
      const service = new StreamService(video);

      await service.startPlay();
      service.close();

      expect(mockSdk.close).toHaveBeenCalled();
    });

    it("stops stream tracks and clears video srcObject", async () => {
      const video = document.createElement("video");
      const stopTrack = vi.fn();
      Object.defineProperty(mockSdk.stream, "getTracks", {
        configurable: true,
        value: vi.fn(() => [{ stop: stopTrack }])
      });
      const service = new StreamService(video);

      await service.startPlay();
      service.close();

      expect(stopTrack).toHaveBeenCalledOnce();
      expect(video.srcObject).toBeNull();
    });

    it("does nothing when SDK is null", () => {
      const video = document.createElement("video");
      const service = new StreamService(video);

      // Should not throw
      expect(() => service.close()).not.toThrow();
    });
  });
});
