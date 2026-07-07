import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";

const startPlayMock = vi.fn();
const closeMock = vi.fn();
const streamServiceInstances: Array<{
  video: HTMLVideoElement;
  startPlay: typeof startPlayMock;
  close: typeof closeMock;
}> = [];

vi.mock("../services/streamService", () => ({
  StreamService: class MockStreamService {
    video: HTMLVideoElement;
    startPlay = startPlayMock;
    close = closeMock;

    constructor(video: HTMLVideoElement) {
      this.video = video;
      streamServiceInstances.push(this);
    }
  }
}));

import VideoStream from "./VideoStream.vue";

describe("VideoStream", () => {
  beforeEach(() => {
    startPlayMock.mockReset();
    closeMock.mockReset();
    streamServiceInstances.length = 0;
    startPlayMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("creates the stream service on mount and starts playback with the session id", async () => {
    const wrapper = mount(VideoStream, {
      props: { sessionId: "42", active: true }
    });

    await flushPromises();

    expect(streamServiceInstances).toHaveLength(1);
    expect(streamServiceInstances[0].video).toBe(wrapper.find("video").element);
    expect(startPlayMock).toHaveBeenCalledWith("42");
  });

  it("exposes setMuted to update the underlying video element", async () => {
    const wrapper = mount(VideoStream, {
      props: { sessionId: "11", active: true }
    });

    const video = wrapper.find("video").element as HTMLVideoElement;

    expect(video.muted).toBe(true);

    (wrapper.vm as unknown as { setMuted: (muted: boolean) => void }).setMuted(false);

    expect(video.muted).toBe(false);
  });

  it("hides the video and emits an error when playback fails", async () => {
    startPlayMock.mockRejectedValueOnce("boom");

    const wrapper = mount(VideoStream, {
      props: { sessionId: "3", active: true }
    });

    await flushPromises();

    expect(wrapper.find("video").classes()).toContain("hidden");
    expect(wrapper.emitted("error")).toEqual([["boom"]]);
  });

  it("closes the stream service on unmount", async () => {
    const wrapper = mount(VideoStream, {
      props: { sessionId: "9", active: true }
    });

    await flushPromises();
    wrapper.unmount();

    expect(closeMock).toHaveBeenCalledOnce();
  });

  it("does not start playback while inactive", async () => {
    const wrapper = mount(VideoStream, {
      props: { sessionId: "9", active: false }
    });

    await flushPromises();

    expect(streamServiceInstances).toHaveLength(0);
    expect(startPlayMock).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it("starts when activated and closes after becoming inactive", async () => {
    vi.useFakeTimers();
    const wrapper = mount(VideoStream, {
      props: { sessionId: "9", active: false }
    });

    await wrapper.setProps({ active: true });
    await flushPromises();

    expect(streamServiceInstances).toHaveLength(1);
    expect(startPlayMock).toHaveBeenCalledWith("9");

    await wrapper.setProps({ active: false });
    expect(closeMock).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1000);

    expect(closeMock).toHaveBeenCalledOnce();
  });
});
