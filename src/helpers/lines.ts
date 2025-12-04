/**
 * Line geometry calculation functions for the dial-selector component.
 */

import math from './math';

/**
 * Calculates geometry data for a single label's line.
 * @param {Object} params - Parameters for calculation
 * @param {number} params.angle - Angle in degrees
 * @param {boolean} params.isLeft - Whether this is on the left side
 * @param {number} params.optionIndex - Index of this option
 * @param {number|null} params.customLineLength - Custom line length or null
 * @param {number} params.leftCount - Total count on left side
 * @param {number} params.leftCenterIndex - Center index for left side (-1 if none)
 * @param {number} params.rightCenterIndex - Center index for right side (-1 if none)
 * @param {number} params.centerX - X coordinate of dial center
 * @param {number} params.centerY - Y coordinate of dial center
 * @param {number} params.knobRadius - Radius of the knob
 * @param {number} params.maxSpokeLength - Maximum spoke length
 * @returns {Object} Geometry data for this label
 */
function calculateLabelGeometry({
  angle,
  isLeft,
  optionIndex,
  customLineLength,
  leftCount,
  leftCenterIndex,
  rightCenterIndex,
  centerX,
  centerY,
  knobRadius,
  maxSpokeLength,
}) {
  const angleRad = math.degreesToRadians(angle);
  const useRadial = customLineLength !== null;

  const indexWithinSide = isLeft ? optionIndex : optionIndex - leftCount;
  const isCenterOption = isLeft ? indexWithinSide === leftCenterIndex : indexWithinSide === rightCenterIndex;

  const spokeStartX = math.roundToThousandths(centerX + Math.cos(angleRad) * knobRadius);
  const spokeStartY = math.roundToThousandths(centerY + Math.sin(angleRad) * knobRadius);

  let spokeEndX, spokeEndY, horizontalStartY;

  if (isCenterOption) {
    spokeEndX = spokeStartX;
    spokeEndY = spokeStartY;
    horizontalStartY = centerY;
  } else {
    spokeEndX = math.roundToThousandths(centerX + Math.cos(angleRad) * (knobRadius + maxSpokeLength));
    spokeEndY = math.roundToThousandths(centerY + Math.sin(angleRad) * (knobRadius + maxSpokeLength));
    horizontalStartY = spokeEndY;
  }

  return {
    angle,
    angleRad,
    isLeft,
    optionIndex,
    customLineLength,
    useRadial,
    isCenterOption,
    spokeStartX,
    spokeStartY,
    spokeEndX,
    spokeEndY,
    horizontalStartY,
  };
}

/**
 * Calculates column X positions for label alignment.
 * @param {Array} labelDataArray - Array of label geometry data
 * @param {number} horizontalLineLength - Default horizontal line length
 * @returns {{ leftColumnX: number, rightColumnX: number }}
 */
function calculateColumnPositions(labelDataArray, horizontalLineLength) {
  return labelDataArray
    .filter((data) => !data.useRadial)
    .reduce(
      (acc, data) => {
        const defaultEndX = data.isLeft ? data.spokeEndX - horizontalLineLength : data.spokeEndX + horizontalLineLength;

        return {
          leftColumnX: data.isLeft ? Math.min(acc.leftColumnX, defaultEndX) : acc.leftColumnX,
          rightColumnX: data.isLeft ? acc.rightColumnX : Math.max(acc.rightColumnX, defaultEndX),
        };
      },
      { leftColumnX: Infinity, rightColumnX: -Infinity }
    );
}

/**
 * Calculates the horizontal line length for a label.
 * @param {Object} params - Parameters
 * @param {boolean} params.useRadial - Whether to use radial (custom) alignment
 * @param {number|null} params.customLineLength - Custom line length
 * @param {boolean} params.isLeft - Whether on left side
 * @param {number} params.spokeEndX - X position of spoke end
 * @param {number} params.leftColumnX - X position of left column
 * @param {number} params.rightColumnX - X position of right column
 * @returns {number} Horizontal line length
 */
function calculateHorizontalLength({ useRadial, customLineLength, isLeft, spokeEndX, leftColumnX, rightColumnX }) {
  if (useRadial) {
    return customLineLength;
  }
  return isLeft ? Math.abs(spokeEndX - leftColumnX) : Math.abs(rightColumnX - spokeEndX);
}

/**
 * Calculates the end position of a horizontal line segment.
 * @param {Object} params - Parameters
 * @param {boolean} params.isLeft - Whether on left side
 * @param {number} params.spokeEndX - X position of spoke end
 * @param {number} params.horizontalLength - Length of horizontal segment
 * @param {number} params.horizontalStartY - Y position of horizontal line
 * @returns {{ horizontalEndX: number, horizontalEndY: number }}
 */
function calculateHorizontalEnd({ isLeft, spokeEndX, horizontalLength, horizontalStartY }) {
  const horizontalEndX = isLeft
    ? math.roundToThousandths(spokeEndX - horizontalLength)
    : math.roundToThousandths(spokeEndX + horizontalLength);

  return { horizontalEndX, horizontalEndY: horizontalStartY };
}

/**
 * Builds the SVG polyline points string for a line.
 * @param {Object} params - Parameters
 * @param {number} params.horizontalLength - Length of horizontal segment
 * @param {boolean} params.isCenterOption - Whether this is a center option
 * @param {number} params.spokeStartX - X of spoke start
 * @param {number} params.spokeStartY - Y of spoke start
 * @param {number} params.spokeEndX - X of spoke end
 * @param {number} params.spokeEndY - Y of spoke end
 * @param {number} params.horizontalStartY - Y of horizontal start
 * @param {number} params.horizontalEndX - X of horizontal end
 * @param {number} params.horizontalEndY - Y of horizontal end
 * @returns {string} SVG polyline points string
 */
function buildLinePoints({
  horizontalLength,
  isCenterOption,
  spokeStartX,
  spokeStartY,
  spokeEndX,
  spokeEndY,
  horizontalStartY,
  horizontalEndX,
  horizontalEndY,
}) {
  if (horizontalLength === 0 && isCenterOption) {
    return '';
  }
  if (horizontalLength === 0) {
    return `${spokeStartX},${spokeStartY} ${spokeEndX},${spokeEndY}`;
  }
  if (isCenterOption) {
    return `${spokeStartX},${horizontalStartY} ${horizontalEndX},${horizontalEndY}`;
  }
  return `${spokeStartX},${spokeStartY} ${spokeEndX},${spokeEndY} ${horizontalEndX},${horizontalEndY}`;
}

/**
 * Calculates spoke line endpoints for spokes mode.
 * @param {Object} params - Parameters
 * @param {number} params.angle - Angle in degrees
 * @param {number} params.centerX - X of dial center
 * @param {number} params.centerY - Y of dial center
 * @param {number} params.knobRadius - Knob radius
 * @param {number} params.spokeLength - Length of spoke
 * @param {number} params.labelGap - Gap before label
 * @returns {{ spokeStartX: number, spokeStartY: number, spokeEndX: number, spokeEndY: number, points: string }}
 */
function calculateSpokeEndpoints({ angle, centerX, centerY, knobRadius, spokeLength, labelGap }) {
  const angleRad = math.degreesToRadians(angle);

  const spokeStartX = math.roundToThousandths(centerX + Math.cos(angleRad) * knobRadius);
  const spokeStartY = math.roundToThousandths(centerY + Math.sin(angleRad) * knobRadius);

  const spokeEndX = math.roundToThousandths(centerX + Math.cos(angleRad) * (knobRadius + spokeLength - labelGap));
  const spokeEndY = math.roundToThousandths(centerY + Math.sin(angleRad) * (knobRadius + spokeLength - labelGap));

  const points = `${spokeStartX},${spokeStartY} ${spokeEndX},${spokeEndY}`;

  return { spokeStartX, spokeStartY, spokeEndX, spokeEndY, points };
}

export default {
  calculateLabelGeometry,
  calculateColumnPositions,
  calculateHorizontalLength,
  calculateHorizontalEnd,
  buildLinePoints,
  calculateSpokeEndpoints,
};
