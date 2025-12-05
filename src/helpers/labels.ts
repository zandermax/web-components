/**
 * Label positioning calculation functions for the dial-selector component.
 * Note: Basic label positioning (column mode and spokes mode) is now handled
 * by CSS using sin() and cos() functions. See styles.ts.
 * These functions handle overflow detection and inline positioning for lines.
 */

import type { LabelPosition } from '../types';

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

/** Parameters for calculateResponsiveOverflowPosition */
type ResponsiveOverflowParams = {
  isLeft: boolean;
  horizontalEndX: number;
  horizontalEndY: number;
  centerY: number;
  hostRect: DOMRect;
  knobRect: DOMRect;
  labelRect: DOMRect;
  gap?: number;
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
  const dir = isLeft ? -1 : 1;
  const left = horizontalEndX + dir * labelGap;
  const textAlign = isLeft ? 'right' : 'left';
  const tx = isLeft ? 'translateX(-100%) ' : '';

  return {
    left: `${left}px`,
    right: 'auto',
    top: `${horizontalEndY}px`,
    transform: `${tx}translateY(-50%)`,
    textAlign,
  };
}

/**
 * Detects if a label overflows its container bounds on the relevant edge.
 * @param params - Parameters for detection
 * @returns True if label overflows
 */
function detectLabelOverflow({ isLeft, labelRect, hostRect }: DetectLabelOverflowParams): boolean {
  const epsilon = 1; // small visual tolerance
  const overflowsRight = labelRect.right > hostRect.right + epsilon;
  const overflowsLeft = labelRect.left < hostRect.left - epsilon;
  return (isLeft && overflowsLeft) || (!isLeft && overflowsRight);
}

/**
 * Calculates a responsive overflow position for a label:
 *  - First pinned to the host edge (left/right).
 *  - Then slides inward as the host shrinks.
 *  - Stops moving once the label's center reaches the line end.
 * @param params - Parameters for calculation
 * @returns Position data with left, top, transform, textAlign, belowLine, maxWidth
 */
function calculateResponsiveOverflowPosition({
  isLeft,
  horizontalEndX,
  horizontalEndY,
  centerY,
  hostRect,
  knobRect,
  labelRect,
  gap = 4,
}: ResponsiveOverflowParams): LabelPosition {
  const isBelow = horizontalEndY >= centerY;

  // Host edge X in *knob-wrap* coordinate space
  const hostEdgeXLocal = (isLeft ? hostRect.left : hostRect.right) - knobRect.left;

  const labelWidth = labelRect.width;
  const halfW = labelWidth / 2;

  // +1 = left side, -1 = right side (relative to host edge)
  const dir = isLeft ? 1 : -1;
  const clamp = isLeft ? Math.min : Math.max;

  // Start with label flush to host edge, then clamp so the center
  // never crosses the line endpoint toward the dial.
  const centerXLocal = clamp(hostEdgeXLocal + dir * halfW, horizontalEndX);

  const top = isBelow ? horizontalEndY + gap : horizontalEndY - gap;
  const ty = isBelow ? '0%' : '-100%';

  return {
    left: `${centerXLocal}px`,
    right: 'auto',
    top: `${top}px`,
    transform: `translate(-50%, ${ty})`,
    textAlign: isLeft ? 'right' : 'left',
    belowLine: true,
    // At most the distance from label center to host edge,
    // but never smaller than 80px to avoid absurdly narrow columns.
    maxWidth: `${Math.max(80, Math.abs(centerXLocal - hostEdgeXLocal))}px`,
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

  if (position.maxWidth) {
    label.style.maxWidth = position.maxWidth;
  } else {
    label.style.removeProperty('max-width');
  }

  if (position.belowLine) {
    label.classList.add('below-line');
  } else {
    label.classList.remove('below-line');
  }
}

export default {
  calculateInlineLabelPosition,
  detectLabelOverflow,
  calculateResponsiveOverflowPosition,
  applyLabelPosition,
};
