/**
 * Geometry calculation functions for the dial-selector component.
 */

import math from './math';
import { THRESHOLDS } from '../constants';
import type { SpokeIntersection } from '../types';

/** Parameters for calculateSpokeIntersection */
type CalculateSpokeIntersectionParams = {
  angleRad: number;
  spokeStartX: number;
  spokeStartY: number;
  labelY: number;
  isLeft: boolean;
  maxSpokeLength: number;
};

/** Parameters for calculateHorizontalLineEnd */
type CalculateHorizontalLineEndParams = {
  intersectX: number;
  isLeft: boolean;
  horizontalLength: number;
  endOffset: number;
};

/**
 * Calculates the shortest rotation path between two angles.
 * Returns the angle delta to add to currentAngle to reach targetAngle via shortest path.
 * @param currentAngle - Current angle in degrees
 * @param targetAngle - Target angle in degrees
 * @param fullCircle - Full circle in degrees (default 360)
 * @returns The delta to add to currentAngle
 */
function calculateShortestRotation(currentAngle: number, targetAngle: number, fullCircle: number = 360): number {
  const normalizedCurrent = ((currentAngle % fullCircle) + fullCircle) % fullCircle;
  const normalizedTarget = ((targetAngle % fullCircle) + fullCircle) % fullCircle;

  let forwardDist = normalizedTarget - normalizedCurrent;
  if (forwardDist < 0) forwardDist += fullCircle;

  let backwardDist = normalizedCurrent - normalizedTarget;
  if (backwardDist < 0) backwardDist += fullCircle;

  if (backwardDist < forwardDist) {
    return -backwardDist;
  } else {
    return forwardDist;
  }
}

/**
 * Calculates where a spoke line intersects with a horizontal line.
 * @param params - Parameters for the calculation
 * @returns Intersection coordinates
 */
function calculateSpokeIntersection({
  angleRad,
  spokeStartX,
  spokeStartY,
  labelY,
  isLeft,
  maxSpokeLength,
}: CalculateSpokeIntersectionParams): SpokeIntersection {
  const intersectY = math.roundToThousandths(labelY);

  // Nearly horizontal spoke - limit the extension
  if (Math.abs(Math.sin(angleRad)) < THRESHOLDS.NEARLY_HORIZONTAL) {
    const maxExtension = isLeft ? -maxSpokeLength : maxSpokeLength;
    return {
      intersectX: math.roundToThousandths(spokeStartX + maxExtension),
      intersectY,
    };
  }

  // Parametric form: x = spokeStartX + t*cos(angle), y = spokeStartY + t*sin(angle)
  // We want y = labelY, so: t = (labelY - spokeStartY) / sin(angle)
  const t = (labelY - spokeStartY) / Math.sin(angleRad);

  // Cap the spoke at max length if needed
  const clampedT = Math.abs(t) > maxSpokeLength ? Math.sign(t) * maxSpokeLength : t;

  return {
    intersectX: math.roundToThousandths(spokeStartX + clampedT * Math.cos(angleRad)),
    intersectY,
  };
}

/**
 * Calculates the end X position of a horizontal line segment.
 * @param params - Parameters for the calculation
 * @returns The X coordinate of the horizontal line end
 */
function calculateHorizontalLineEnd({
  intersectX,
  isLeft,
  horizontalLength,
  endOffset,
}: CalculateHorizontalLineEndParams): number {
  const horizontalEndX = isLeft ? intersectX - horizontalLength : intersectX + horizontalLength;
  return math.roundToThousandths(horizontalEndX);
}

export default {
  calculateShortestRotation,
  calculateSpokeIntersection,
  calculateHorizontalLineEnd,
};
