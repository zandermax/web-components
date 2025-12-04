/**
 * Label positioning calculation functions for the dial-selector component.
 * Note: Basic label positioning (column mode and spokes mode) is now handled
 * by CSS using sin() and cos() functions. See styles.ts.
 * These functions handle overflow detection and inline positioning for lines.
 */

import type { LabelPosition } from '../types';

/** Vertical offset for repositioning overflowed labels */
const OVERFLOW_LABEL_OFFSET = 4;

/** Parameters for calculateInlineLabelPosition */
type InlineLabelPositionParams = {
  isLeft: boolean;
  horizontalEndX: number;
  horizontalEndY: number;
  labelGap: number;
};

/** Parameters for detectLabelOverflow */
type DetectLabelOverflowParams = {
  isLeft: boolean;
  labelRect: DOMRect;
  hostRect: DOMRect;
};

/** Parameters for calculateOverflowLabelPosition */
type OverflowLabelPositionParams = {
  horizontalEndX: number;
  horizontalEndY: number;
  centerY: number;
};

/**
 * Calculates the inline (non-overflow) position for a label.
 * @param params - Parameters for calculation
 * @returns Position data with left, top, transform, textAlign
 */
function calculateInlineLabelPosition({
  isLeft,
  horizontalEndX,
  horizontalEndY,
  labelGap,
}: InlineLabelPositionParams): LabelPosition {
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
 * @param params - Parameters for detection
 * @returns True if label overflows
 */
function detectLabelOverflow({ isLeft, labelRect, hostRect }: DetectLabelOverflowParams): boolean {
  const overflowsRight = labelRect.right > hostRect.right;
  const overflowsLeft = labelRect.left < hostRect.left;
  return (isLeft && overflowsLeft) || (!isLeft && overflowsRight);
}

/**
 * Calculates the overflow (repositioned) position for a label.
 * @param params - Parameters for calculation
 * @returns Position data with left, top, transform, textAlign, belowLine flag
 */
function calculateOverflowLabelPosition({
  horizontalEndX,
  horizontalEndY,
  centerY,
}: OverflowLabelPositionParams): LabelPosition {
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
 * @param label - The label element
 * @param position - Position data from calculate functions
 */
function applyLabelPosition(label: HTMLElement, position: LabelPosition): void {
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
// See styles.ts :host([mode="spokes"]) .dial-label.spokes

export default {
  calculateInlineLabelPosition,
  detectLabelOverflow,
  calculateOverflowLabelPosition,
  applyLabelPosition,
};
