export function initKioskZoomLock(targetWindow: Window = window): () => void {
  const targetDocument = targetWindow.document;
  const preventDefault = (event: Event) => event.preventDefault();
  const preventMultiTouch = (event: TouchEvent) => {
    if (event.touches.length > 1) {
      event.preventDefault();
    }
  };
  const preventZoomWheel = (event: WheelEvent) => {
    if (event.ctrlKey || event.metaKey) {
      event.preventDefault();
    }
  };

  targetDocument.addEventListener("touchstart", preventMultiTouch, { passive: false });
  targetDocument.addEventListener("touchmove", preventMultiTouch, { passive: false });
  targetDocument.addEventListener("gesturestart", preventDefault, { passive: false });
  targetDocument.addEventListener("gesturechange", preventDefault, { passive: false });
  targetDocument.addEventListener("gestureend", preventDefault, { passive: false });
  targetWindow.addEventListener("wheel", preventZoomWheel, { passive: false });

  return () => {
    targetDocument.removeEventListener("touchstart", preventMultiTouch);
    targetDocument.removeEventListener("touchmove", preventMultiTouch);
    targetDocument.removeEventListener("gesturestart", preventDefault);
    targetDocument.removeEventListener("gesturechange", preventDefault);
    targetDocument.removeEventListener("gestureend", preventDefault);
    targetWindow.removeEventListener("wheel", preventZoomWheel);
  };
}
