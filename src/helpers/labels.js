/**
 * Label positioning calculation functions for the dial-selector component.
 */

/**
 * Calculates the vertical position of a label based on its angle.
 * @param {Object} params - Parameters
 * @param {number} params.angleRad - Angle in radians
 * @param {number} params.columnHeight - Height of the label column
 * @param {number} params.verticalOffsetScale - Scale factor for vertical offset
 * @param {function} params.roundFn - Rounding function
 * @returns {number} Top position in pixels
 */
function calculateLabelTopPosition({ angleRad, columnHeight, verticalOffsetScale, roundFn }) {
  const columnCenter = columnHeight / 2;
  const verticalOffset = Math.sin(angleRad) * verticalOffsetScale;
  return roundFn(columnCenter + verticalOffset);
}

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

  let breakLineY;
  let yTransform;

  if (isAboveCenter) {
    breakLineY = horizontalEndY - 4;
    yTransform = 'translateY(-100%)';
  } else {
    breakLineY = horizontalEndY + 4;
    yTransform = 'translateY(0)';
  }

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

/**
 * Calculates position for a spokes-mode label.
 * @param {Object} params - Parameters
 * @param {number} params.angleRad - Angle in radians
 * @param {boolean} params.isLeft - Whether on left side
 * @param {number} params.centerX - X of dial center
 * @param {number} params.centerY - Y of dial center
 * @param {number} params.radiusOuter - Outer radius of knob
 * @param {number} params.spokeLength - Length of spoke
 * @param {function} params.roundFn - Rounding function
 * @returns {Object} Position data with left, right, top, transform, textAlign
 */
function calculateSpokesLabelPosition({ angleRad, isLeft, centerX, centerY, radiusOuter, spokeLength, roundFn }) {
  // Calculate position at end of spoke (outside knob radius)
  const labelAnchorX = roundFn(centerX + Math.cos(angleRad) * (radiusOuter + spokeLength));
  const labelAnchorY = roundFn(centerY + Math.sin(angleRad) * (radiusOuter + spokeLength));

  if (isLeft) {
    return {
      left: `${labelAnchorX}px`,
      right: 'auto',
      top: `${labelAnchorY}px`,
      transform: 'translate(-100%, -50%)',
      textAlign: 'right',
    };
  }

  return {
    left: `${labelAnchorX}px`,
    right: 'auto',
    top: `${labelAnchorY}px`,
    transform: 'translate(0%, -50%)',
    textAlign: 'left',
  };
}

export default {
  calculateLabelTopPosition,
  calculateInlineLabelPosition,
  detectLabelOverflow,
  calculateOverflowLabelPosition,
  applyLabelPosition,
  calculateSpokesLabelPosition,
};
