import { describe, expect, it, vi } from "vitest";

import { initKioskZoomLock } from "./kioskZoomLock";

interface RegisteredListener {
  listener: EventListenerOrEventListenerObject;
  options?: AddEventListenerOptions | boolean;
}

describe("initKioskZoomLock", () => {
  it("prevents multi-touch gestures on the document", () => {
    const registeredListeners = new Map<string, RegisteredListener>();
    const documentTarget = {
      addEventListener: vi.fn(
        (
          type: string,
          listener: EventListenerOrEventListenerObject,
          options?: AddEventListenerOptions | boolean
        ) => {
          registeredListeners.set(type, { listener, options });
        }
      ),
      removeEventListener: vi.fn()
    } as unknown as Document;
    const windowTarget = {
      document: documentTarget,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    } as unknown as Window;

    initKioskZoomLock(windowTarget);

    const touchStart = registeredListeners.get("touchstart");
    const touchMove = registeredListeners.get("touchmove");
    const preventDefault = vi.fn();
    const multiTouchEvent = { preventDefault, touches: [{}, {}] } as unknown as TouchEvent;

    expect(touchStart?.options).toEqual({ passive: false });
    expect(touchMove?.options).toEqual({ passive: false });

    expect(touchMove).toBeDefined();
    (touchMove!.listener as EventListener)(multiTouchEvent);

    expect(preventDefault).toHaveBeenCalledTimes(1);
  });

  it("prevents Safari gesture events and ctrl-wheel zoom", () => {
    const documentListeners = new Map<string, RegisteredListener>();
    const windowListeners = new Map<string, RegisteredListener>();
    const documentTarget = {
      addEventListener: vi.fn(
        (
          type: string,
          listener: EventListenerOrEventListenerObject,
          options?: AddEventListenerOptions | boolean
        ) => {
          documentListeners.set(type, { listener, options });
        }
      ),
      removeEventListener: vi.fn()
    } as unknown as Document;
    const windowTarget = {
      document: documentTarget,
      addEventListener: vi.fn(
        (
          type: string,
          listener: EventListenerOrEventListenerObject,
          options?: AddEventListenerOptions | boolean
        ) => {
          windowListeners.set(type, { listener, options });
        }
      ),
      removeEventListener: vi.fn()
    } as unknown as Window;

    const dispose = initKioskZoomLock(windowTarget);

    const gestureEvent = { preventDefault: vi.fn() } as unknown as Event;
    const wheelEvent = {
      ctrlKey: true,
      metaKey: false,
      preventDefault: vi.fn()
    } as unknown as WheelEvent;

    const gestureStart = documentListeners.get("gesturestart");
    const wheel = windowListeners.get("wheel");

    expect(gestureStart).toBeDefined();
    expect(wheel).toBeDefined();

    (gestureStart!.listener as EventListener)(gestureEvent);
    (wheel!.listener as EventListener)(wheelEvent);
    dispose();

    expect(gestureEvent.preventDefault).toHaveBeenCalledTimes(1);
    expect(wheelEvent.preventDefault).toHaveBeenCalledTimes(1);
    expect(documentTarget.removeEventListener).toHaveBeenCalledWith(
      "gesturestart",
      expect.any(Function)
    );
    expect(windowTarget.removeEventListener).toHaveBeenCalledWith("wheel", expect.any(Function));
  });
});
