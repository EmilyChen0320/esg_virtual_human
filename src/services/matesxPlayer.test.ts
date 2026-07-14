import { describe, expect, it } from "vitest";

import { getCharacterVideoSources } from "./matesxPlayer";

describe("getCharacterVideoSources", () => {
  it("prefers webm assets before falling back to mp4 playback", () => {
    expect(getCharacterVideoSources("/matesx/assets/aikka")).toEqual([
      "/matesx/assets/aikka/01_opaque.webm",
      "/matesx/assets/aikka/01.webm",
      "/matesx/assets/aikka/01_opaque.mp4",
      "/matesx/assets/aikka/01.mp4"
    ]);
  });
});
