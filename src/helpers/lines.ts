/**
 * Line geometry calculation functions for the dial-selector component.
 */

import * as math from './math';
import type { LabelGeometry, ColumnPositions, HorizontalEndPosition, SpokeEndpoints } from '../types';

/** Parameters for calculateLabelGeometry */
type CalculateLabelGeometryParams = {
  angle: number;
  isLeft: boolean;
  optionIndex: number;
  customLineLength: number | null;
  leftCount: number;
  leftCenterIndex: number;
  rightCenterIndex: number;
  centerX: number;
  centerY: number;
  knobRadius: number;
  maxSpokeLength: number;
};

/** Parameters for calculateHorizontalLength */
type CalculateHorizontalLengthParams = {
  useRadial: boolean;
  customLineLength: number | null;
  isLeft: boolean;
  spokeEndX: number;
  leftColumnX: number;
  rightColumnX: number;
};

/** Parameters for calculateHorizontalEnd */
type CalculateHorizontalEndParams = {
  isLeft: boolean;
  spokeEndX: number;
  horizontalLength: number;
  horizontalStartY: number;
};

/** Parameters for buildLinePoints */
type BuildLinePointsParams = {
  horizontalLength: number;
  isCenterOption: boolean;
  spokeStartX: number;
  spokeStartY: number;
  spokeEndX: number;
  spokeEndY: number;
  horizontalStartY: number;
  horizontalEndX: number;
  horizontalEndY: number;
};

/** Parameters for calculateSpokeEndpoints */
type CalculateSpokeEndpointsParams = {
  angle: number;
  centerX: number;
  centerY: number;
  knobRadius: number;
  spokeLength: number;
  labelGap: number;
};

/**
 * Calculates geometry data for a single label's line.
 * @param params - Parameters for calculation
 * @returns Geometry data for this label
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
}: CalculateLabelGeometryParams): LabelGeometry {
  const angleRad = math.degreesToRadians(angle);
  const useRadial = customLineLength !== null;

  const indexWithinSide = isLeft ? optionIndex : optionIndex - leftCount;
  const isCenterOption = isLeft ? indexWithinSide === leftCenterIndex : indexWithinSide === rightCenterIndex;

  const spokeStartX = math.roundToThousandths(centerX + Math.cos(angleRad) * knobRadius);
  const spokeStartY = math.roundToThousandths(centerY + Math.sin(angleRad) * knobRadius);

  let spokeEndX: number;
  let spokeEndY: number;
  let horizontalStartY: number;

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
 * @param labelDataArray - Array of label geometry data
 * @param horizontalLineLength - Default horizontal line length
 * @returns Object with leftColumnX and rightColumnX
 */
function calculateColumnPositions(labelDataArray: LabelGeometry[], horizontalLineLength: number): ColumnPositions {
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
 * @param params - Parameters for calculation
 * @returns Horizontal line length
 */
function calculateHorizontalLength({
  useRadial,
  customLineLength,
  isLeft,
  spokeEndX,
  leftColumnX,
  rightColumnX,
}: CalculateHorizontalLengthParams): number {
  if (useRadial) {
    return customLineLength!;
  }
  return isLeft ? Math.abs(spokeEndX - leftColumnX) : Math.abs(rightColumnX - spokeEndX);
}

/**
 * Calculates the end position of a horizontal line segment.
 * @param params - Parameters for calculation
 * @returns Object with horizontalEndX and horizontalEndY
 */
function calculateHorizontalEnd({
  isLeft,
  spokeEndX,
  horizontalLength,
  horizontalStartY,
}: CalculateHorizontalEndParams): HorizontalEndPosition {
  const horizontalEndX = isLeft
    ? math.roundToThousandths(spokeEndX - horizontalLength)
    : math.roundToThousandths(spokeEndX + horizontalLength);

  return { horizontalEndX, horizontalEndY: horizontalStartY };
}

/**
 * Builds the SVG polyline points string for a line.
 * @param params - Parameters for building
 * @returns SVG polyline points string
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
}: BuildLinePointsParams): string {
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
 * @param params - Parameters for calculation
 * @returns Spoke endpoints including points string
 */
function calculateSpokeEndpoints({
  angle,
  centerX,
  centerY,
  knobRadius,
  spokeLength,
  labelGap,
}: CalculateSpokeEndpointsParams): SpokeEndpoints {
  const angleRad = math.degreesToRadians(angle);

  const spokeStartX = math.roundToThousandths(centerX + Math.cos(angleRad) * knobRadius);
  const spokeStartY = math.roundToThousandths(centerY + Math.sin(angleRad) * knobRadius);

  const spokeEndX = math.roundToThousandths(centerX + Math.cos(angleRad) * (knobRadius + spokeLength - labelGap));
  const spokeEndY = math.roundToThousandths(centerY + Math.sin(angleRad) * (knobRadius + spokeLength - labelGap));

  const points = `${spokeStartX},${spokeStartY} ${spokeEndX},${spokeEndY}`;

  return { spokeStartX, spokeStartY, spokeEndX, spokeEndY, points };
}

export {
  calculateLabelGeometry,
  calculateColumnPositions,
  calculateHorizontalLength,
  calculateHorizontalEnd,
  buildLinePoints,
  calculateSpokeEndpoints,
};
