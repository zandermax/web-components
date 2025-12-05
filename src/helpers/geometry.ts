/**
 * Geometry calculation functions for the dial-selector component.
 */

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

export default {
  calculateShortestRotation,
};
