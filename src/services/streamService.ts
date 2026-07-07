import "../lib/srs.sdk.js";

import { WHEP_URL, DEFAULT_STREAM_NAME } from "../constants/stream";

export class StreamService {
  private sdk: SrsRtcWhipWhepAsync | null = null;
  private videoElement: HTMLVideoElement;

  constructor(videoElement: HTMLVideoElement) {
    this.videoElement = videoElement;
  }

  public startPlay(sessionId = "0"): Promise<void> {
    this.videoElement.style.display = "";
    if (this.sdk) {
      this.close();
    }

    this.sdk = new window.SrsRtcWhipWhepAsync();
    this.videoElement.srcObject = this.sdk.stream;

    const streamName =
      sessionId === "0" ? DEFAULT_STREAM_NAME : `${DEFAULT_STREAM_NAME}${sessionId}`;
    const url = `${WHEP_URL}?app=live&stream=${streamName}`;

    return this.sdk.play(url);
  }

  public close(): void {
    if (this.sdk) {
      this.sdk.close();
      this.sdk = null;
    }
    const stream = this.videoElement.srcObject;
    if (stream instanceof MediaStream && typeof stream.getTracks === "function") {
      for (const track of stream.getTracks()) {
        track.stop();
      }
    }
    this.videoElement.srcObject = null;
  }
}
