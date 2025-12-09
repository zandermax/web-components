/**
 * Styles for one-sided and spokes mode variants.
 */
export function getModeStyles(): string {
  return `
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
  `;
}

