import { SRS_SDK_PATH } from "../constants/stream";

export function loadSrsSdk(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.SrsRtcWhipWhepAsync) {
      resolve();
      return;
    }
    if (!SRS_SDK_PATH) {
      reject(new Error("SRS SDK path is not configured"));
      return;
    }
    const script = document.createElement("script");
    script.src = SRS_SDK_PATH;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load srs.sdk.js"));
    document.head.appendChild(script);
  });
}
