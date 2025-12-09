/**
 * Styles for line container and spoke lines.
 */
export function getLineStyles(): string {
  return `
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
  `;
}

