/**
 * Math utility functions for the dial-selector component.
 */

/**
 * Rounds a number to 3 decimal places (thousandths).
 * @param {number} value - The number to round
 * @returns {number} The rounded number
 */
export function roundToThousandths(value) {
  return Math.round(value * 1000) / 1000;
}

/**
 * Converts degrees to radians.
 * @param {number} degrees - Angle in degrees
 * @returns {number} Angle in radians (rounded to thousandths)
 */
export function degreesToRadians(degrees) {
  return roundToThousandths((degrees * Math.PI) / 180);
}

/**
 * Generates evenly spaced angles along an arc.
 * @param {number} count - Number of angles to generate
 * @param {number} start - Start angle in degrees
 * @param {number} end - End angle in degrees
 * @returns {number[]} Array of angles in degrees
 */
export function generateArcAngles(count, start, end) {
  if (count === 1) {
    return [roundToThousandths((start + end) / 2)];
  }
  return Array.from({ length: count }, (_, i) =>
    roundToThousandths(start + ((end - start) * i) / (count - 1))
  );
}

