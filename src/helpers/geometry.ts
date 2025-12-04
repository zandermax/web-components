/**
 * Geometry calculation functions for the dial-selector component.
 */

import math from './math';
import { THRESHOLDS } from '../constants';

/**
 * Calculates the shortest rotation path between two angles.
 * Returns the angle delta to add to currentAngle to reach targetAngle via shortest path.
 * @param {number} currentAngle - Current angle in degrees
 * @param {number} targetAngle - Target angle in degrees
 * @param {number} fullCircle - Full circle in degrees (default 360)
 * @returns {number} The delta to add to currentAngle
 */
function calculateShortestRotation(currentAngle, targetAngle, fullCircle = 360) {
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
 * @param {Object} params - Parameters for the calculation
 * @param {number} params.angleRad - Spoke angle in radians
 * @param {number} params.spokeStartX - X coordinate of spoke start
 * @param {number} params.spokeStartY - Y coordinate of spoke start
 * @param {number} params.labelY - Y coordinate of the horizontal line
 * @param {boolean} params.isLeft - Whether this is a left-side spoke
 * @param {number} params.maxSpokeLength - Maximum spoke extension length
 * @returns {{ intersectX: number, intersectY: number }} Intersection coordinates
 */
function calculateSpokeIntersection({ angleRad, spokeStartX, spokeStartY, labelY, isLeft, maxSpokeLength }) {
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
 * @param {Object} params - Parameters for the calculation
 * @param {number} params.intersectX - X coordinate of the spoke/horizontal intersection
 * @param {boolean} params.isLeft - Whether this is a left-side line
 * @param {number} params.horizontalLength - Length of the horizontal segment
 * @param {number} params.endOffset - Offset from the intersection point
 * @returns {number} The X coordinate of the horizontal line end
 */
function calculateHorizontalLineEnd({ intersectX, isLeft, horizontalLength, endOffset }) {
  const horizontalEndX = isLeft ? intersectX - horizontalLength : intersectX + horizontalLength;
  return math.roundToThousandths(horizontalEndX);
}

export default {
  calculateShortestRotation,
  calculateSpokeIntersection,
  calculateHorizontalLineEnd,
};
