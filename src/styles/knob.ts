/**
 * Styles for the knob, indicator, advance button, and slotted content.
 */
export function getKnobStyles(): string {
  return `
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
  `;
}

