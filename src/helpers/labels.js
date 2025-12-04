/**
 * Label positioning calculation functions for the dial-selector component.
 * Note: Basic label positioning (column mode and spokes mode) is now handled
 * by CSS using sin() and cos() functions. See styles.js.
 * These functions handle overflow detection and inline positioning for lines.
 */

/** Vertical offset for repositioning overflowed labels */
const OVERFLOW_LABEL_OFFSET = 4;

/**
 * Calculates the inline (non-overflow) position for a label.
 * @param {Object} params - Parameters
 * @param {boolean} params.isLeft - Whether label is on left side
 * @param {number} params.horizontalEndX - X position of horizontal line end
 * @param {number} params.horizontalEndY - Y position of horizontal line end
 * @param {number} params.labelGap - Gap between line end and label
 * @returns {Object} Position data with left, top, transform, textAlign
 */
function calculateInlineLabelPosition({ isLeft, horizontalEndX, horizontalEndY, labelGap }) {
  if (isLeft) {
    return {
      left: `${horizontalEndX - labelGap}px`,
      right: 'auto',
      top: `${horizontalEndY}px`,
      transform: 'translateX(-100%) translateY(-50%)',
      textAlign: 'right',
    };
  }
  return {
    left: `${horizontalEndX + labelGap}px`,
    right: 'auto',
    top: `${horizontalEndY}px`,
    transform: 'translateY(-50%)',
    textAlign: 'left',
  };
}

/**
 * Detects if a label overflows its container bounds.
 * @param {Object} params - Parameters
 * @param {boolean} params.isLeft - Whether label is on left side
 * @param {DOMRect} params.labelRect - Bounding rect of label
 * @param {DOMRect} params.hostRect - Bounding rect of host container
 * @returns {boolean} True if label overflows
 */
function detectLabelOverflow({ isLeft, labelRect, hostRect }) {
  const overflowsRight = labelRect.right > hostRect.right;
  const overflowsLeft = labelRect.left < hostRect.left;
  return (isLeft && overflowsLeft) || (!isLeft && overflowsRight);
}

/**
 * Calculates the overflow (repositioned) position for a label.
 * @param {Object} params - Parameters
 * @param {number} params.horizontalEndX - X position of horizontal line end
 * @param {number} params.horizontalEndY - Y position of horizontal line end
 * @param {number} params.centerY - Y position of dial center
 * @returns {Object} Position data with left, top, transform, textAlign, belowLine flag
 */
function calculateOverflowLabelPosition({ horizontalEndX, horizontalEndY, centerY }) {
  const isAboveCenter = horizontalEndY < centerY;
  const breakLineY = isAboveCenter ? horizontalEndY - OVERFLOW_LABEL_OFFSET : horizontalEndY + OVERFLOW_LABEL_OFFSET;
  const yTransform = isAboveCenter ? 'translateY(-100%)' : 'translateY(0)';

  return {
    left: `${horizontalEndX}px`,
    right: 'auto',
    top: `${breakLineY}px`,
    transform: `translateX(-100%) ${yTransform}`,
    textAlign: 'right',
    belowLine: true,
  };
}

/**
 * Applies position styles to a label element.
 * @param {HTMLElement} label - The label element
 * @param {Object} position - Position data from calculate functions
 */
function applyLabelPosition(label, position) {
  label.style.left = position.left;
  label.style.right = position.right;
  label.style.top = position.top;
  label.style.transform = position.transform;
  label.style.textAlign = position.textAlign;

  if (position.belowLine) {
    label.classList.add('below-line');
  } else {
    label.classList.remove('below-line');
  }
}

// Note: calculateSpokesLabelPosition has been replaced by CSS using sin()/cos()
// See styles.js :host([mode="spokes"]) .dial-label.spokes

export default {
  calculateInlineLabelPosition,
  detectLabelOverflow,
  calculateOverflowLabelPosition,
  applyLabelPosition,
};
