import { describe, expect, it } from "vitest";

const mainSource = import.meta.glob("./main.ts", {
  eager: true,
  import: "default",
  query: "?raw"
})["./main.ts"] as string;

describe("application bootstrap", () => {
  it("does not bootstrap the mobile debug console", () => {
    expect(mainSource).not.toContain("mobileConsole");
    expect(mainSource).not.toContain("eruda");
  });
});
