/**
 * Math utility functions for the dial-selector component.
 */

/**
 * Rounds a number to 3 decimal places (thousandths).
 * @param value - The number to round
 * @returns The rounded number
 */
function roundToThousandths(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/**
 * Converts degrees to radians.
 * @param degrees - Angle in degrees
 * @returns Angle in radians (rounded to thousandths)
 */
function degreesToRadians(degrees: number): number {
  return roundToThousandths((degrees * Math.PI) / 180);
}

/**
 * Generates evenly spaced angles along an arc.
 * @param count - Number of angles to generate
 * @param start - Start angle in degrees
 * @param end - End angle in degrees
 * @returns Array of angles in degrees
 */
function generateArcAngles(count: number, start: number, end: number): number[] {
  if (count === 1) {
    return [roundToThousandths((start + end) / 2)];
  }
  return Array.from({ length: count }, (_, i) => roundToThousandths(start + ((end - start) * i) / (count - 1)));
}

export { roundToThousandths, degreesToRadians, generateArcAngles };
