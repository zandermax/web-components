import { COMPONENT, HIT_AREA, INDICATOR, KNOB, LINE, LAYOUT, OPACITY } from './constants';

/**
 * Returns the CSS styles for the dial-selector component's shadow DOM.
 * Separated into its own file for maintainability.
 */
export function getStyles(): string {
  const knobWrapSize = KNOB.WRAP_SIZE;
  const knobCenter = knobWrapSize / 2;

  return `
    <style>
      :host {
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
        display: block;
        font-family: var(--font-family);
        min-width: var(--component-min-width);
        max-width: var(--component-width);
        width: var(--component-width);
        height: var(--component-height);
        overflow: visible;
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }

      :host * {
        box-sizing: border-box;
      }

      /* Focus styles for keyboard navigation */
      :host(:focus) {
        outline: none;
      }

      :host(:focus-visible) .knob,
      :host(.keyboard-nav:focus) .knob {
        outline: 5px solid -webkit-focus-ring-color;
        outline-offset: 4px;
      }

      @supports (outline-color: Highlight) {
        :host(:focus-visible) .knob,
        :host(.keyboard-nav:focus) .knob {
          outline: 5px solid Highlight;
        }
      }

      /* Disabled state styles */
      :host([disabled]) {
        opacity: 0.5;
        pointer-events: none;
      }

      :host([disabled]) .dial-label,
      :host([disabled]) .advance,
      :host([disabled]) .spoke-line-hit-area {
        cursor: not-allowed;
        pointer-events: none;
      }

      /* Visually hidden but accessible to screen readers */
      .visually-hidden {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
      }

      .selector {
        position: relative;
        display: grid;
        grid-template-columns: 1fr auto 1fr;
        gap: clamp(12px, 4vw, 40px);
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
        margin: 0;
        padding: 0;
        overflow: visible;
      }

      .dial-layout-overlay {
        position: absolute;
        width: max(700px, 100%);
        height: 100%;

        /* So you can manually test shrinking by dragging the right edge */
        resize: horizontal;
        overflow: auto;
        z-index: 1000;

        .dial-container {
          display: flex;
          height: 100%;
        }


        .options-container {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          border: 2px dashed #e63946;

          /* Grow to take space, but be willing to shrink first */
          flex: 1 1 220px;

          /* They can shrink only until their content needs more room */
          min-width: min-content;
          white-space: nowrap;

          .option {
            display: grid;

            .option-text {
              border: 2px dotted #457b9d;
              width: max-content;
              min-width: 100%;
              text-align: center;
            }

            .option-image {
              border: 2px dotted #00ff00;
            }
          }

          &.left .option {
            grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));

            .option-text {
              margin-inline-end: 2em;
            }
          }

          &.right .option {
            grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));

            .option-text {
              margin-inline-start: 2em;
            }
          }
        }
      }

      .knob-container {
        border: 2px dotted #457b9d;
        margin-inline: 28px;

        /* Start at a natural/content width and shrink after options hit their minimums */
        flex: 0 1 180px;
        min-width: 48px;
        white-space: nowrap;
        text-align: center;
      }

      .label-column {
        position: relative;
        display: flex;
        flex-direction: column;
        justify-content: center;
        height: var(--label-column-height, 320px);
        margin: 0;
        padding: 0;
        overflow: visible;
      }

      .label-column.left {
        align-items: flex-end;
      }

      .label-column.right {
        align-items: flex-start;
      }

      /* Position labels within their columns */
      .label-column.left .dial-label {
        right: 0;
        left: auto;
        text-align: right;
      }

      .label-column.right .dial-label {
        left: 0;
        right: auto;
        text-align: left;
      }

      .knob-wrap {
        position: relative;
        width: var(--knob-wrap-size, 320px);
        aspect-ratio: 1;
        display: grid;
        place-items: center;
        flex-shrink: 0;
        overflow: visible;
      }

      .knob {
        position: relative;
        width: calc(var(--radius-outer) * 2);
        height: calc(var(--radius-outer) * 2);
        border: var(--width-outer-circle) solid var(--color-outer-circle);
        border-radius: 50%;
        background: #11161c;
        box-shadow: var(--shadow);
        z-index: 2;
        transform: rotate(calc(90deg + var(--indicator-angle)));
        transform-origin: center center;
        transition: var(
          --indicator-transition,
          transform var(--time-selection-animation, 0.25s) ease-in var(--time-selection-delay, 0s)
        );
      }

      .indicator {
        position: absolute;
        width: var(--indicator-width, 10px);
        height: var(--indicator-length, 60px);
        background: var(--indicator-gradient, var(--indicator-color));
        border-radius: calc(var(--indicator-width, 10px) / 2);
        /* Fixed position: top center, pointing up */
        top: calc(50% - var(--indicator-length, 60px) - var(--center-indicator, 0px));
        left: calc(50% - var(--indicator-width, 10px) / 2);
        /* No transform needed - knob rotates instead */
      }

      :host(.no-transitions) .knob {
        transition: none;
      }

      .knob::before {
        content: '';
        position: absolute;
        inset: calc(var(--radius-outer) - var(--radius-inner));
        border: var(--width-inner-circle) solid var(--color-inner-circle);
        border-radius: 50%;
        opacity: 0.6;
      }

      .dial-label {
        text-decoration: none;
        word-wrap: normal;
        color: inherit;
        font-size: var(--font-size);
        font-family: var(--font-family);
        letter-spacing: clamp(0.5px, 0.1vw, 1px);
        display: block;
        cursor: pointer;
        user-select: none;
        padding: clamp(4px, 1vw, 8px) clamp(6px, 1.5vw, 12px);
        position: absolute;
        white-space: normal;
        word-break: normal;
        width: max-content;
        line-height: 1.25;
        /* CSS trigonometry for vertical positioning in column mode */
        --label-angle-rad: calc(var(--label-angle, 0) * 1deg);
        --column-center: calc(var(--label-column-height, 320px) / 2);
        --vertical-offset: calc(sin(var(--label-angle-rad)) * var(--label-vertical-offset-scale, 140px));
        top: calc(var(--column-center) + var(--vertical-offset));
        transform: translateY(-50%);
      }

      .dial-label.active {
        color: var(--color-selection);
      }

      .dial-label.below-line {
        white-space: nowrap;
        padding-left: 0;
        padding-right: 0;
      }

      /* Media sizing inside labels */
      .dial-label img,
      .dial-label svg {
        max-height: 1.5em;
        max-width: 3em;
        vertical-align: middle;
        object-fit: contain;
        /* Allow animation control via CSS custom properties on ::part(label) / ::part(label-active) */
        animation: var(--label-icon-animation, none);
        opacity: var(--label-icon-opacity, 1);
        transform: var(--label-icon-transform, none);
        transition: var(--label-icon-transition, opacity 0.3s, transform 0.3s);
        /* Ensure transforms/rotations are centered on the icon itself */
        transform-box: fill-box;
        transform-origin: center center;
      }

      /* Built-in keyframes for icon animations */
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.3); }
      }
      @keyframes wiggle {
        0%, 100% { transform: rotate(0deg); }
        25% { transform: rotate(-15deg); }
        75% { transform: rotate(15deg); }
      }
      @keyframes bounce {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-25%); }
      }
      @keyframes blink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.2; }
      }

      #lineContainer {
        position: absolute;
        inset: 0;
        pointer-events: none;
        overflow: visible;
      }

      .spoke-line {
        transition: var(--line-transition, opacity 0.3s ease, stroke 0.3s ease);
      }

      :host(.no-transitions) .spoke-line {
        transition: none;
      }

      .advance {
        position: absolute;
        inset: 0;
        cursor: pointer;
        pointer-events: auto;
        background: transparent;
      }

      /* Slotted content styles for custom knob content */
      ::slotted([slot="knob-content"]) {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        pointer-events: none;
      }

      ::slotted(img[slot="knob-content"]) {
        width: 100%;
        height: 100%;
        object-fit: contain;
        border-radius: 50%;
      }

      @media (max-width: 768px) {
        .selector {
          gap: clamp(8px, 2vw, 16px);
        }

        :host {
          --font-size: clamp(12px, 2vw, 16px);
        }

        .dial-label {
          padding: clamp(6px, 1.5vw, 10px) clamp(8px, 2vw, 14px);
          min-height: 44px;
          display: flex;
          align-items: center;
          word-break: normal;
        }
      }

      @media (max-width: 480px) {
        .selector {
          gap: clamp(6px, 1.5vw, 12px);
        }

        :host {
          --font-size: clamp(13px, 2.5vw, 18px);
        }

        .knob-wrap {
          min-width: 200px;
        }
      }

      /* One-sided mode: left only */
      :host([data-one-sided="left"]) .selector {
        grid-template-columns: 1fr auto;
      }

      :host([data-one-sided="left"]) .label-column.right {
        display: none;
      }

      /* One-sided mode: right only */
      :host([data-one-sided="right"]) .selector {
        grid-template-columns: auto 1fr;
      }

      :host([data-one-sided="right"]) .label-column.left {
        display: none;
      }

      /* Spokes mode styles */
      :host([mode="spokes"]) .selector {
        grid-template-columns: auto;
        justify-items: center;
      }

      :host([mode="spokes"]) .label-column {
        display: none;
      }

      :host([mode="spokes"]) .knob-wrap {
        /* Ensure adequate size for radial labels */
        overflow: visible;
      }

      :host([mode="spokes"]) .dial-label.spokes {
        position: absolute;
        white-space: nowrap;
        padding: clamp(2px, 0.5vw, 4px) clamp(4px, 1vw, 8px);
        /* CSS trigonometry for radial positioning in spokes mode */
        --spokes-angle-rad: calc(var(--label-angle, 0) * 1deg);
        --spokes-radius: calc(var(--radius-outer, 90px) + var(--max-spoke-length, 80px));
        --spokes-center: var(--knob-center, 160px);
        --spokes-x: calc(var(--spokes-center) + cos(var(--spokes-angle-rad)) * var(--spokes-radius));
        --spokes-y: calc(var(--spokes-center) + sin(var(--spokes-angle-rad)) * var(--spokes-radius));
        left: var(--spokes-x);
        top: var(--spokes-y);
        /* Reset column-mode positioning */
        --vertical-offset: 0px;
      }

      :host([mode="spokes"]) .dial-label.spokes[data-is-left="true"] {
        transform: translate(-100%, -50%);
        text-align: right;
      }

      :host([mode="spokes"]) .dial-label.spokes[data-is-left="false"] {
        transform: translate(0%, -50%);
        text-align: left;
      }
    </style>
  `;
}

/**
 * Returns the HTML template for the dial-selector component's shadow DOM.
 */
export function getTemplate(): string {
  return `
    <div class="selector" part="panel" role="listbox" aria-label="Dial selector">
  <div class="label-column left" id="leftColumn" part="labels label-row">
    <!-- Left labels will be generated by JavaScript -->
  </div>

  <div class="knob-wrap" part="dial">
    <svg id="lineContainer" width="100%" height="100%" style="position: absolute; overflow: visible;" aria-hidden="true">
      <!-- Lines will be generated by JavaScript -->
    </svg>
    <div class="knob" part="knob">
      <slot name="knob-content">
        <!-- Default indicator when no custom content provided -->
        <div class="indicator" part="indicator"></div>
      </slot>
      <div class="advance" id="advanceButton" role="button" aria-label="Switch to next option"></div>
    </div>
  </div>

  <div class="label-column right" id="rightColumn" part="labels label-row">
    <!-- Right labels will be generated by JavaScript -->
  </div>

  <div class="dial-layout-overlay" aria-hidden="true">
    <div class="dial-container">
      <div class="options-container left">
        <div class="option">
          <div class="option-text">
            Content 1
          </div>
          <div class="option-image">
            <img src="https://via.placeholder.com/150" alt="Option 1 line">
          </div>
        </div>
        <div class="option">
          <div class="option-text">
            Content 2
          </div>
          <div class="option-image">
            <img src="https://via.placeholder.com/150" alt="Option 2 line">
          </div>
        </div>
        <div class="option">
          <div class="option-text">
            Content 3
          </div>
          <div class="option-image">
            <img src="https://via.placeholder.com/150" alt="Option 3 line">
          </div>
        </div>
      </div>
      <div class="knob-container">
        Knob
      </div>
      <div class="options-container right">
        <div class="option">
          <div class="option-image">
            <img src="https://via.placeholder.com/150" alt="Option 4 line">
          </div>
          <div class="option-text">
            Content 4
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
<!-- Live region for announcing selection changes to screen readers -->
<div id="liveRegion" aria-live="polite" aria-atomic="true" class="visually-hidden"></div>
  `;
}
