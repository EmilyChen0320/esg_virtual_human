import { vi } from "vitest";

const lottieStub = {
  default: {
    loadAnimation: vi.fn(() => ({ destroy: vi.fn(), play: vi.fn(), stop: vi.fn() }))
  }
};

vi.mock("lottie-web", () => lottieStub);
vi.mock("lottie-web/build/player/lottie_light", () => lottieStub);
