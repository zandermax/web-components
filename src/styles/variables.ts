import { COMPONENT, HIT_AREA, INDICATOR, KNOB, LINE, LAYOUT, OPACITY } from '../constants';

/**
 * Returns CSS custom properties (variables) for the dial-selector component.
 */
export function getVariables(knobWrapSize: number, knobCenter: number): string {
  return `
    --color-ink: #f4f4f4;
    --color-selection: #f13b3b;
    --color-line: #c7c2b5;
    --indicator-color: #f13b3b;
    --shadow: 0;
    --label-radius: 150px;
    --line-stroke-width: ${LINE.STROKE_WIDTH};
    --line-opacity-inactive: ${OPACITY.LINE_INACTIVE};
    --line-opacity-active: ${OPACITY.LINE_ACTIVE};
    --line-transition: opacity 0.3s ease, stroke 0.3s ease;
    --indicator-length: ${INDICATOR.LENGTH}px;
    --center-indicator: 0px;
    --time-selection-delay: 0s;
    --time-selection-animation: 0.25s;
    --radius-outer: ${KNOB.RADIUS_OUTER}px;
    --width-outer-circle: 4px;
    --color-outer-circle: var(--color-ink);
    --radius-inner: 72px;
    --width-inner-circle: ${LINE.STROKE_WIDTH}px;
    --color-inner-circle: var(--color-ink);
    --font-size: clamp(10px, 1.5vw, 14px);
    --font-family: 'IBM Plex Mono', 'Courier New', monospace;
    --knob-wrap-size: ${knobWrapSize}px;
    --knob-center: ${knobCenter}px;
    --label-column-height: ${LAYOUT.LABEL_COLUMN_HEIGHT}px;
    --label-vertical-offset-scale: ${LAYOUT.LABEL_VERTICAL_OFFSET_SCALE}px;
    --horizontal-line-length: ${LINE.HORIZONTAL_LENGTH}px;
    --max-spoke-length: ${LINE.MAX_SPOKE_LENGTH}px;
    --horizontal-line-end-offset: ${LINE.HORIZONTAL_END_OFFSET}px;
    --hit-area-stroke-width: ${HIT_AREA.STROKE_WIDTH}px;
    --indicator-width: ${INDICATOR.WIDTH}px;
    --component-width: 100%;
    --component-height: auto;
    --component-min-width: ${COMPONENT.MIN_WIDTH}px;
    --component-min-height: ${COMPONENT.MIN_HEIGHT}px;
    --indicator-angle: 0deg;
  `;
}

