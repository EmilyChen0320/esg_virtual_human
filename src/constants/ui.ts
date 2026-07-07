/** Design canvas dimensions */
export const CANVAS_WIDTH = 1440;
export const CANVAS_HEIGHT = 2560;

export type ActionButtonPosition = "top" | "bottom";
export const DEFAULT_ACTION_BUTTON_POSITION: ActionButtonPosition = "top";
export const ACTION_BUTTON_POSITION_STORAGE_KEY = "button_position";

/** Brand / theme color constants */
export const COLOR_PRIMARY = "#5593B5";
export const COLOR_SECONDARY = "#5A6E78";
export const COLOR_BACKDROP = "rgba(255, 255, 255, 0.5)";

/**
 * Shared bottom-bar layout constants used across all three modes
 * (standby / ready / conversation) when `buttonPosition === 'bottom'`.
 * All values are px on the 1440×2560 design canvas.
 */
export const BOTTOM_BTN_HEIGHT = 100;
export const BOTTOM_BTN_RADIUS = 12;
export const BOTTOM_BTN_LEFT = 48;
export const BOTTOM_PRIMARY_BAR_WIDTH = 1344;
export const BOTTOM_CONTAINER_HEIGHT = 291;
export const BOTTOM_CONTAINER_TOP = CANVAS_HEIGHT - BOTTOM_CONTAINER_HEIGHT;
export const BOTTOM_STACKED_CONTROLS_GAP = 24;
export const BOTTOM_STACKED_CONTROLS_HEIGHT = BOTTOM_BTN_HEIGHT * 2 + BOTTOM_STACKED_CONTROLS_GAP;
export const BOTTOM_STACKED_CONTROLS_TOP =
  BOTTOM_CONTAINER_TOP + Math.round((BOTTOM_CONTAINER_HEIGHT - BOTTOM_STACKED_CONTROLS_HEIGHT) / 2);
export const BOTTOM_SINGLE_BAR_TOP =
  BOTTOM_CONTAINER_TOP + Math.round((BOTTOM_CONTAINER_HEIGHT - BOTTOM_BTN_HEIGHT) / 2);
export const BOTTOM_PRIMARY_BAR_TOP = BOTTOM_STACKED_CONTROLS_TOP;
export const BOTTOM_ROW_TOP =
  BOTTOM_PRIMARY_BAR_TOP + BOTTOM_BTN_HEIGHT + BOTTOM_STACKED_CONTROLS_GAP;
export const BOTTOM_QR_WIDTH = 160;

/**
 * Vertical gap (px) between the dialog bubble's bottom edge and the
 * top of the bottom translucent container, in the wheelchair (bottom)
 * layout. Shared by ready and conversation modes so the bubble does
 * not visually shift when transitioning between the two.
 */
export const BOTTOM_DIALOG_BUBBLE_GAP = 24;
export const BOTTOM_DIALOG_BUBBLE_BOTTOM_Y = BOTTOM_CONTAINER_TOP - BOTTOM_DIALOG_BUBBLE_GAP;

/** Shared icon size (px) for FAQ and restart button icons */
export const ACTION_ICON_SIZE = 50;

/** Shared icon size (px) for mic/cancel/restart/faq icons in all bottom primary bar and row buttons */
export const BOTTOM_ICON_SIZE = 40;

/** Shared font size (px) for FAQ panel category/topic/question buttons */
export const FAQ_BUTTON_FONT_SIZE = 36;

/** Shared font size (px) for dialog/ready message text */
export const DIALOG_FONT_SIZE = 32;

/**
 * Grace window (ms) after a confirm dialog opens during which a backdrop
 * click is ignored. Guards against ghost/synthesized clicks on kiosk touch
 * dismissing a just-opened dialog.
 */
export const DIALOG_DISMISS_GUARD_MS = 300;

/** Shared font size (px) for circle/bar button labels (start, restart, FAQ) */
export const BUTTON_FONT_SIZE = 20;

/** Shared font size (px) for QR section titles, connection warning text, bottom disclaimer */
export const SUBTITLE_FONT_SIZE = 24;

/** Shared font size (px) for bottom primary bar button labels (start-chat, interrupt) */
export const BOTTOM_PRIMARY_BAR_FONT_SIZE = DIALOG_FONT_SIZE;

/**
 * Max visual character widths for chat dialog bubbles (in em, CJK full-width = 1em).
 * Bubbles auto-fit to content up to these caps, then wrap.
 */
export const AI_DIALOG_MAX_CHARS = 26;
export const USER_DIALOG_MAX_CHARS = 20;

/**
 * Shared bubble styling constants for all AI/ready message bubbles.
 * Consumed via v-bind in ChatBubble.vue and ChatReadyOverlay.vue.
 */
export const DIALOG_BUBBLE_RADIUS = 20;
export const DIALOG_BUBBLE_AI_PADDING_Y = 35;
export const DIALOG_BUBBLE_AI_PADDING_X = 20;
export const DIALOG_BUBBLE_USER_PADDING = 24;
export const DIALOG_LINE_HEIGHT = 40;

/**
 * Shared absolute positioning for the opening message bubble in ready mode
 * (top layout only — bottom layout reuses READY_BOTTOM_MESSAGE).
 */
export const READY_TOP_MESSAGE = {
  left: 34,
  top: 1035
} as const;

/** Shared top/default footer QR block used by ready and conversation modes. */
export const TOP_FOOTER_QR = {
  left: 40,
  top: 2272,
  width: 160,
  imageSize: 143
} as const;

/** Shared top/default footer disclaimer block used beside the QR code. */
export const TOP_FOOTER_DISCLAIMER = {
  left: 292,
  top: 2348,
  width: 1040,
  fontSize: DIALOG_FONT_SIZE,
  lineHeight: 40
} as const;

/**
 * Shared button layout constants for the three action buttons
 * (main / FAQ / restart) used in both ChatReadyOverlay and ChatActionControls.
 *
 * All values are in px and based on the 1440×2560 design canvas.
 * `top` = production circle layout (right-side). `bottom` is identical to `top`
 * for ready/conversation modes. Standby uses a dedicated bottom bar
 * (`STANDBY_BOTTOM_BAR`) when `bottom` is selected. Default is `top`.
 */
export const ACTION_BUTTON_LAYOUTS = {
  top: {
    main: { left: 1081, top: 551, size: 200 },
    faq: { left: 1265, top: 440, size: 120 },
    restart: { left: 1270, top: 740, size: 120 }
  },
  bottom: {
    main: { left: 1081, top: 551, size: 200 },
    faq: { left: 1265, top: 440, size: 120 },
    restart: { left: 1270, top: 740, size: 120 }
  }
} as const satisfies Record<
  ActionButtonPosition,
  {
    main: { left: number; top: number; size: number };
    faq: { left: number; top: number; size: number };
    restart: { left: number; top: number; size: number };
  }
>;

export const ACTION_BUTTONS = ACTION_BUTTON_LAYOUTS.top;

/**
 * Wheelchair bottom-bar layout for standby mode.
 * Rendered only when `buttonPosition === 'bottom'` in `ChatActionControls`.
 * All values are px on the 1440×2560 design canvas.
 */
export const STANDBY_BOTTOM_BAR = {
  left: BOTTOM_BTN_LEFT,
  top: BOTTOM_SINGLE_BAR_TOP,
  width: BOTTOM_PRIMARY_BAR_WIDTH,
  height: BOTTOM_BTN_HEIGHT,
  radius: BOTTOM_BTN_RADIUS,
  bg: COLOR_PRIMARY,
  iconSize: BOTTOM_ICON_SIZE,
  fontSize: BOTTOM_PRIMARY_BAR_FONT_SIZE
} as const;

/**
 * Translucent white backdrop container that wraps the wheelchair start-chat button.
 * Spans the full canvas width (Figma frame 1080×1920 has the container full-width at left=0)
 * and extends down to the canvas bottom. px on the 1440×2560 design canvas.
 */
export const STANDBY_BOTTOM_CONTAINER = {
  left: 0,
  top: BOTTOM_CONTAINER_TOP,
  width: CANVAS_WIDTH,
  height: BOTTOM_CONTAINER_HEIGHT,
  bg: COLOR_BACKDROP
} as const;

/**
 * Wheelchair QR block (title + image) position in standby bottom mode.
 * Placed above the translucent container, ~28 px from the right edge (matching the
 * Figma frame offset). px on the 1440×2560 design canvas.
 */
export const STANDBY_BOTTOM_QR = {
  left: 1252,
  top: 1984,
  width: BOTTOM_QR_WIDTH
} as const;

/**
 * Wheelchair ready-mode bottom layout constants.
 * Figma frame 1080×1920 → canvas 1440×2560 (1.333× vertical scale, widths 1:1, re-centered on 1440).
 * Only used when `buttonPosition === 'bottom'` in ChatReadyOverlay.vue.
 */

/**
 * Translucent white banner behind the three stacked action buttons in ready bottom mode.
 * Full canvas width, positioned below the message bubble.
 */
export const READY_BOTTOM_CONTAINER = {
  left: 0,
  top: BOTTOM_CONTAINER_TOP,
  width: CANVAS_WIDTH,
  height: BOTTOM_CONTAINER_HEIGHT,
  bg: COLOR_BACKDROP
} as const;

/**
 * Primary start-chat button bar in ready bottom mode.
 * Full-width rectangle with mic icon + "語音對話" label.
 */
export const READY_BOTTOM_START_BAR = {
  left: BOTTOM_BTN_LEFT,
  top: BOTTOM_PRIMARY_BAR_TOP,
  width: BOTTOM_PRIMARY_BAR_WIDTH,
  height: BOTTOM_BTN_HEIGHT,
  radius: BOTTOM_BTN_RADIUS,
  bg: COLOR_PRIMARY,
  iconSize: BOTTOM_ICON_SIZE,
  fontSize: BOTTOM_PRIMARY_BAR_FONT_SIZE
} as const;

/**
 * Shared restart + FAQ row layout constants for wheelchair (bottom) layout.
 * Used identically in both ready and conversation modes — these buttons
 * must NEVER change dimensions or position on state transitions.
 * All values are px on the 1440×2560 design canvas.
 *
 * The container's `left`/`width` are anchored symbolically to the primary bar
 * above so right-edge and center-line alignment are structurally guaranteed.
 * Per-button records carry visual fields only — equal-width split is enforced
 * by `flex:1` inside `BottomActionRow.vue`.
 */
export const BOTTOM_ACTION_ROW_CONTAINER = {
  left: BOTTOM_BTN_LEFT,
  top: BOTTOM_ROW_TOP,
  width: BOTTOM_PRIMARY_BAR_WIDTH,
  height: BOTTOM_BTN_HEIGHT
} as const;

export const BOTTOM_ACTION_ROW_RESTART_BTN = {
  radius: BOTTOM_BTN_RADIUS,
  bg: COLOR_SECONDARY,
  fontSize: DIALOG_FONT_SIZE
} as const;

export const BOTTOM_ACTION_ROW_FAQ_BTN = {
  radius: BOTTOM_BTN_RADIUS,
  bg: COLOR_PRIMARY,
  borderColor: COLOR_PRIMARY,
  fontSize: DIALOG_FONT_SIZE
} as const;

/**
 * Gap (px) between the restart and FAQ buttons in the shared action row.
 */
export const BOTTOM_ACTION_ROW_GAP = 40;

/**
 * Opening message bubble position in ready bottom mode.
 * Anchored from the canvas bottom so its bottom edge sits
 * `BOTTOM_DIALOG_BUBBLE_GAP` above the bottom container — matching
 * the conversation-mode dialog viewport so the bubble does not
 * jump when ready transitions to conversation.
 */
export const READY_BOTTOM_MESSAGE = {
  left: 34,
  bottom: CANVAS_HEIGHT - BOTTOM_DIALOG_BUBBLE_BOTTOM_Y,
  radius: DIALOG_BUBBLE_RADIUS,
  paddingY: DIALOG_BUBBLE_AI_PADDING_Y,
  paddingX: DIALOG_BUBBLE_AI_PADDING_X,
  lineHeight: DIALOG_LINE_HEIGHT
} as const;

/**
 * Disclaimer block position (top-left) in ready bottom mode.
 * Four lines of white text.
 */
export const READY_BOTTOM_DISCLAIMER = {
  left: 36,
  top: 601,
  width: 267,
  fontSize: SUBTITLE_FONT_SIZE,
  lineHeight: 36
} as const;

/**
 * QR block (top-right) shared by ready AND conversation bottom modes.
 * Right edge (left + width = 1392) aligns with the language selector's right edge.
 * Must remain pixel-identical across both modes so the block does not shift on
 * ready ↔ conversation transitions.
 */
export const READY_BOTTOM_QR = {
  left: 1192,
  top: 200,
  width: 200,
  imageSize: 180,
  titleImageGap: 8
} as const;

/**
 * Vertical gap (px) between the LanguageSelector pill bottom and the QR
 * title in ready bottom mode. Used by the flex column wrapper in
 * ChatReadyOverlay so LanguageSelector + QR auto-center horizontally
 * (no manual canvas-px alignment required).
 */
export const READY_BOTTOM_HEADER_QR_GAP = 87;

/**
 * Wheelchair conversation-mode bottom layout constants.
 * Figma frame 1080×1920 → canvas 1440×2560 (1.333× vertical scale, widths 1:1, re-centered on 1440).
 * Only used when `buttonPosition === 'bottom'` in ChatActionControls.vue conversation mode.
 */

/**
 * Translucent white backdrop container behind the conversation bottom bar + row.
 * Full canvas width, positioned at the bottom of the canvas.
 */
export const CONVERSATION_BOTTOM_CONTAINER = {
  left: 0,
  top: BOTTOM_CONTAINER_TOP,
  width: CANVAS_WIDTH,
  height: BOTTOM_CONTAINER_HEIGHT,
  bg: COLOR_BACKDROP
} as const;

/**
 * Primary mic/recording/interrupt bar in conversation bottom mode.
 * Full-width rectangle with waveform icon + localized label.
 */
export const CONVERSATION_BOTTOM_BAR = {
  left: BOTTOM_BTN_LEFT,
  top: BOTTOM_PRIMARY_BAR_TOP,
  width: BOTTOM_PRIMARY_BAR_WIDTH,
  height: BOTTOM_BTN_HEIGHT,
  radius: BOTTOM_BTN_RADIUS,
  bg: COLOR_PRIMARY,
  iconSize: BOTTOM_ICON_SIZE,
  fontSize: BOTTOM_PRIMARY_BAR_FONT_SIZE
} as const;

/**
 * @deprecated Use READY_BOTTOM_QR.top. Kept as an alias to enforce the
 * ready ↔ conversation QR parity contract from a single source.
 */
export const CONVERSATION_BOTTOM_QR_TOP = READY_BOTTOM_QR.top;

/**
 * Dialog overlay viewport area in conversation bottom mode.
 * Starts at the virtual person's shoulder line and extends
 * down to the bottom container. A CSS gradient mask fades
 * bubbles near the top edge.
 */
export const CONVERSATION_BOTTOM_DIALOG_VIEWPORT = {
  left: 34,
  right: 34,
  top: 1050,
  height: BOTTOM_DIALOG_BUBBLE_BOTTOM_Y - 1050
} as const;

/**
 * Dialog overlay position for conversation top layout.
 * Left/right match bottom layout; top aligned to READY_TOP_MESSAGE,
 * bottom aligned to the same shared dialog anchor as bottom layout.
 */
export const CONVERSATION_TOP_DIALOG_VIEWPORT = {
  left: 34,
  right: 34,
  top: READY_TOP_MESSAGE.top,
  height: BOTTOM_DIALOG_BUBBLE_BOTTOM_Y - READY_TOP_MESSAGE.top
} as const;
