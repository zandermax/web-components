/**
 * Responsive media query styles.
 */
export function getMediaStyles(): string {
  return `
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
  `;
}

