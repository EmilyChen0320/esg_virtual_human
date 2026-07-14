import { describe, expect, it } from "vitest";

import { getCharacterVideoSources } from "./matesxPlayer";

describe("getCharacterVideoSources", () => {
  it("prefers mp4 assets before falling back to legacy webm playback", () => {
    expect(getCharacterVideoSources("/matesx/assets/aikka")).toEqual([
      "/matesx/assets/aikka/01_opaque.mp4",
      "/matesx/assets/aikka/01.mp4",
      "/matesx/assets/aikka/01_opaque.webm",
      "/matesx/assets/aikka/01.webm"
    ]);
  });
});
