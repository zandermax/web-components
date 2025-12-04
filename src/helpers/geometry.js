/**
 * Geometry calculation functions for the dial-selector component.
 */

import { roundToThousandths } from './math.js';
import { THRESHOLDS } from '../constants.js';

/**
 * Calculates the shortest rotation path between two angles.
 * Returns the angle delta to add to currentAngle to reach targetAngle via shortest path.
 * @param {number} currentAngle - Current angle in degrees
 * @param {number} targetAngle - Target angle in degrees
 * @param {number} fullCircle - Full circle in degrees (default 360)
 * @returns {number} The delta to add to currentAngle
 */
export function calculateShortestRotation(currentAngle, targetAngle, fullCircle = 360) {
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
export function calculateSpokeIntersection({
  angleRad,
  spokeStartX,
  spokeStartY,
  labelY,
  isLeft,
  maxSpokeLength,
}) {
  let intersectX, intersectY;

  if (Math.abs(Math.sin(angleRad)) < THRESHOLDS.NEARLY_HORIZONTAL) {
    // Nearly horizontal spoke - limit the extension
    const maxExtension = isLeft ? -maxSpokeLength : maxSpokeLength;
    intersectX = roundToThousandths(spokeStartX + maxExtension);
    intersectY = roundToThousandths(labelY);
  } else {
    // Parametric form: x = spokeStartX + t*cos(angle), y = spokeStartY + t*sin(angle)
    // We want y = labelY, so: t = (labelY - spokeStartY) / sin(angle)
    const t = (labelY - spokeStartY) / Math.sin(angleRad);

    // Limit the spoke length if it would extend too far
    const spokeLength = Math.abs(t);
    if (spokeLength > maxSpokeLength) {
      // Cap the spoke at max length
      const limitedT = t > 0 ? maxSpokeLength : -maxSpokeLength;
      intersectX = roundToThousandths(spokeStartX + limitedT * Math.cos(angleRad));
      intersectY = roundToThousandths(labelY);
    } else {
      intersectX = roundToThousandths(spokeStartX + t * Math.cos(angleRad));
      intersectY = roundToThousandths(labelY);
    }
  }

  return { intersectX, intersectY };
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
export function calculateHorizontalLineEnd({
  intersectX,
  isLeft,
  horizontalLength,
  endOffset,
}) {
  const horizontalEndX = isLeft
    ? intersectX - horizontalLength
    : intersectX + horizontalLength;
  return roundToThousandths(horizontalEndX);
}

