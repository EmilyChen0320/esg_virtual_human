interface SrsRtcWhipWhepAsync {
  stream: MediaStream;
  play: (url: string) => Promise<void>;
  close: () => void;
}

interface Window {
  SrsRtcWhipWhepAsync: new () => SrsRtcWhipWhepAsync;
}
