/**
 * Base styles for the dial-selector component host element.
 */
export function getBaseStyles(): string {
  return `
    :host {
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
  `;
}

