/**
 * Styles for dial labels and icon animations.
 */
export function getLabelStyles(): string {
  return `
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
  `;
}
