import { onBeforeUnmount } from "vue";

const IGNORE_SYNTHETIC_CLICK_MS = 350;

interface PressReleaseOptions {
  disabled?: () => boolean;
}

function isInsideTarget(event: PointerEvent, target: HTMLElement) {
  const rect = target.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) {
    return true;
  }

  return (
    event.clientX >= rect.left &&
    event.clientX <= rect.right &&
    event.clientY >= rect.top &&
    event.clientY <= rect.bottom
  );
}

export function usePressReleaseActions(options: PressReleaseOptions = {}) {
  let activePointerId: number | null = null;
  let activeTarget: HTMLElement | null = null;
  let ignoreNextClick = false;
  let ignoreClickTimer: number | null = null;

  function isDisabled() {
    return options.disabled?.() ?? false;
  }

  function clearPress() {
    activePointerId = null;
    activeTarget = null;
  }

  function ignoreSyntheticClick() {
    ignoreNextClick = true;
    if (ignoreClickTimer !== null) {
      window.clearTimeout(ignoreClickTimer);
    }
    ignoreClickTimer = window.setTimeout(() => {
      ignoreNextClick = false;
      ignoreClickTimer = null;
    }, IGNORE_SYNTHETIC_CLICK_MS);
  }

  function onPointerdown(event: PointerEvent) {
    if (isDisabled()) {
      return;
    }

    activePointerId = event.pointerId;
    activeTarget = event.currentTarget as HTMLElement;
    activeTarget.setPointerCapture?.(event.pointerId);
  }

  function onPointerup(event: PointerEvent, action: () => void) {
    const target = activeTarget;
    const isActivePointer = activePointerId === event.pointerId;
    clearPress();

    if (!target || !isActivePointer || isDisabled() || !isInsideTarget(event, target)) {
      return;
    }

    ignoreSyntheticClick();
    action();
  }

  function onPointercancel() {
    clearPress();
  }

  function onClick(event: MouseEvent, action: () => void) {
    if (ignoreNextClick) {
      event.preventDefault();
      return;
    }

    if (isDisabled()) {
      return;
    }

    action();
  }

  onBeforeUnmount(() => {
    if (ignoreClickTimer !== null) {
      window.clearTimeout(ignoreClickTimer);
    }
  });

  return {
    onPointerdown,
    onPointerup,
    onPointercancel,
    onPointerleave: onPointercancel,
    onClick
  };
}

export function usePressReleaseAction(action: () => void, options: PressReleaseOptions = {}) {
  const actions = usePressReleaseActions(options);

  return {
    onPointerdown: actions.onPointerdown,
    onPointerup: (event: PointerEvent) => actions.onPointerup(event, action),
    onPointercancel: actions.onPointercancel,
    onPointerleave: actions.onPointerleave,
    onClick: (event: MouseEvent) => actions.onClick(event, action)
  };
}
