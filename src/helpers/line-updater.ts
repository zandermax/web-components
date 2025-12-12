/**
 * Line updater helper functions.
 * Orchestrates line and label positioning updates.
 */

import * as linesHelper from './lines';
import * as labelsHelper from './labels';
import type { DialOption, LabelData, SideCountsResult } from '../types';

/** Parameters for updateStandardLines */
type UpdateStandardLinesParams = {
  labels: HTMLLabelElement[];
  lines: SVGPolylineElement[];
  hitAreas: SVGPolylineElement[];
  options: DialOption[];
  geometry: SideCountsResult;
  knobWrap: HTMLElement;
  parentElement: HTMLElement | null;
  centerX: number;
  centerY: number;
  knobRadius: number;
  maxSpokeLength: number;
  horizontalLineLength: number;
  horizontalLineEndOffset: number;
};

/** Parameters for updateSpokesLines */
type UpdateSpokesLinesParams = {
  labels: HTMLLabelElement[];
  lines: SVGPolylineElement[];
  hitAreas: SVGPolylineElement[];
  centerX: number;
  centerY: number;
  knobRadius: number;
  maxSpokeLength: number;
  horizontalLineEndOffset: number;
};

/** Parameters for updateLines */
type UpdateLinesParams = {
  isSpokes: boolean;
  knobWrapSize: number;
  computedStyle: CSSStyleDeclaration;
  roundFn: (value: number) => number;
} & Omit<UpdateStandardLinesParams, 'centerX' | 'centerY' | 'knobRadius'>;

/**
 * Updates lines and label positions for standard (horizontal) mode.
 * @param params - Parameters for update
 */
function updateStandardLines(params: UpdateStandardLinesParams): void {
  const {
    labels,
    lines,
    hitAreas,
    options,
    geometry,
    knobWrap,
    parentElement,
    centerX,
    centerY,
    knobRadius,
    maxSpokeLength,
    horizontalLineLength,
    horizontalLineEndOffset,
  } = params;

  const knobRect = knobWrap.getBoundingClientRect();

  // Use the widest logical container for overflow detection so that labels
  // on both sides only "overflow" once they actually hit the visible
  // panel edge, not the narrower dial box itself.
  const overflowContainer = parentElement ?? knobWrap;
  const hostRect = overflowContainer.getBoundingClientRect();

  const { leftCount, rightCount } = geometry;
  const leftCenterIndex = leftCount % 2 === 1 ? Math.floor(leftCount / 2) : -1;
  const rightCenterIndex = rightCount % 2 === 1 ? Math.floor(rightCount / 2) : -1;

  // Calculate geometry data for all labels
  const labelData: LabelData[] = labels.map((label, index) => {
    const optionIndex = parseInt(label.dataset.index!, 10);
    const option = options[optionIndex];

    const geom = linesHelper.calculateLabelGeometry({
      angle: parseFloat(label.dataset.angle!),
      isLeft: label.dataset.isLeft === 'true',
      optionIndex,
      customLineLength: option?.lineLength ?? null,
      leftCount,
      leftCenterIndex,
      rightCenterIndex,
      centerX,
      centerY,
      knobRadius,
      maxSpokeLength,
    });

    return { label, index, ...geom };
  });

  // Calculate column positions
  const { leftColumnX, rightColumnX } = linesHelper.calculateColumnPositions(labelData, horizontalLineLength);

  // Draw lines and position labels
  labelData.forEach((data) => {
    const { label, index, isLeft, isCenterOption, spokeStartX, spokeStartY, spokeEndX, spokeEndY, horizontalStartY } =
      data;

    const horizontalLength = linesHelper.calculateHorizontalLength({
      useRadial: data.useRadial,
      customLineLength: data.customLineLength,
      isLeft,
      spokeEndX,
      leftColumnX,
      rightColumnX,
    });

    const { horizontalEndX, horizontalEndY } = linesHelper.calculateHorizontalEnd({
      isLeft,
      spokeEndX,
      horizontalLength,
      horizontalStartY,
    });

    // Build and apply line points
    const points = linesHelper.buildLinePoints({
      horizontalLength,
      isCenterOption,
      spokeStartX,
      spokeStartY,
      spokeEndX,
      spokeEndY,
      horizontalStartY,
      horizontalEndX,
      horizontalEndY,
    });

    lines[index].setAttribute('points', points);
    if (hitAreas[index]) {
      hitAreas[index].setAttribute('points', points);
    }

    // Ensure label is in knobWrap
    if (label.parentElement !== knobWrap) {
      knobWrap.appendChild(label);
    }

    // 1) Inline placement under/along the line
    const inlinePosition = labelsHelper.calculateInlineLabelPosition({
      isLeft,
      horizontalEndX,
      horizontalEndY,
      labelGap: horizontalLineEndOffset,
    });
    labelsHelper.applyLabelPosition(label, inlinePosition);

    // 2) Measure overflow relative to the host
    const labelRect = label.getBoundingClientRect();
    const labelOverflows = labelsHelper.detectLabelOverflow({
      isLeft,
      labelRect,
      hostRect,
    });

    // 3) If the label overflows outward, move it above/below and
    //    pin it to the host edge, then slide inward until clamped
    if (labelOverflows && horizontalLength > 0) {
      const overflowPosition = labelsHelper.calculateResponsiveOverflowPosition({
        isLeft,
        horizontalEndX,
        horizontalEndY,
        centerY,
        hostRect,
        knobRect,
        labelRect,
        gap: horizontalLineEndOffset,
      });

      // Compute a better maxWidth: distance from the label center to
      // the *opposite* host edge, doubled, but never less than 80px.
      const centerXLocal = parseFloat(overflowPosition.left);
      const hostEdgeLocal = isLeft
        ? hostRect.right - knobRect.left // far edge for wrapping
        : hostRect.left - knobRect.left;
      const availableHalfWidth = Math.abs(hostEdgeLocal - centerXLocal);
      const clampedMax = Math.max(80, availableHalfWidth * 2);
      overflowPosition.maxWidth = `${clampedMax}px`;

      labelsHelper.applyLabelPosition(label, overflowPosition);
    }
  });
}

/**
 * Updates lines for spokes mode (radial lines only, no positioning).
 * @param params - Parameters for update
 */
function updateSpokesLines(params: UpdateSpokesLinesParams): void {
  const { labels, lines, hitAreas, centerX, centerY, knobRadius, maxSpokeLength, horizontalLineEndOffset } = params;

  labels.forEach((label, index) => {
    const { points } = linesHelper.calculateSpokeEndpoints({
      angle: parseFloat(label.dataset.angle!),
      centerX,
      centerY,
      knobRadius,
      spokeLength: maxSpokeLength,
      labelGap: horizontalLineEndOffset,
    });

    lines[index].setAttribute('points', points);
    if (hitAreas[index]) {
      hitAreas[index].setAttribute('points', points);
    }
  });
}

/**
 * Updates all lines based on mode (standard or spokes).
 * @param params - Parameters for update
 */
function updateLines(params: UpdateLinesParams): void {
  const { isSpokes, knobWrapSize, computedStyle, roundFn } = params;

  const knobCenter = knobWrapSize / 2;
  const centerX = knobCenter;
  const centerY = knobCenter;

  // Get the actual knob radius from CSS variable, with fallback to default
  const radiusOuter = computedStyle.getPropertyValue('--radius-outer').trim() || '90px';
  const knobRadius = roundFn(parseFloat(radiusOuter));

  if (isSpokes) {
    updateSpokesLines({
      labels: params.labels,
      lines: params.lines,
      hitAreas: params.hitAreas,
      centerX,
      centerY,
      knobRadius,
      maxSpokeLength: params.maxSpokeLength,
      horizontalLineEndOffset: params.horizontalLineEndOffset,
    });
  } else {
    updateStandardLines({
      labels: params.labels,
      lines: params.lines,
      hitAreas: params.hitAreas,
      options: params.options,
      geometry: params.geometry,
      knobWrap: params.knobWrap,
      parentElement: params.parentElement,
      centerX,
      centerY,
      knobRadius,
      maxSpokeLength: params.maxSpokeLength,
      horizontalLineLength: params.horizontalLineLength,
      horizontalLineEndOffset: params.horizontalLineEndOffset,
    });
  }
}

export { updateLines, updateStandardLines, updateSpokesLines };

