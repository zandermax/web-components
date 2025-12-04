/**
 * Dimension parsing and calculation functions for the dial-selector component.
 */

import type { KnobScaleResult, KnobRadii, ParsedDimensions, SelectionDelayResult } from '../types';

/** Default values for LINE constants */
type LineDefaults = {
  HORIZONTAL_LENGTH: number;
  MAX_SPOKE_LENGTH: number;
  HORIZONTAL_END_OFFSET: number;
};

/** Default values for HIT_AREA constants */
type HitAreaDefaults = {
  STROKE_WIDTH: number;
};

/** Default values for KNOB constants */
type KnobDefaults = {
  RADIUS_OUTER: number;
  RADIUS_INNER: number;
};

/** Parameters for parseDimensionsFromCSS */
type ParseDimensionsParams = {
  computedStyle: CSSStyleDeclaration;
  defaults: { LINE: LineDefaults; HIT_AREA: HitAreaDefaults };
  roundFn: (value: number) => number;
};

/** Parameters for parseKnobRadii */
type ParseKnobRadiiParams = {
  computedStyle: CSSStyleDeclaration;
  defaults: KnobDefaults;
  roundFn: (value: number) => number;
};

/** Parameters for calculateKnobScale */
type CalculateKnobScaleParams = {
  actualSize: number;
  baseSize: number;
  roundFn: (value: number) => number;
};

/**
 * Parses a CSS property value as a float with a fallback.
 * @param computedStyle - The computed style object
 * @param propertyName - CSS custom property name
 * @param fallback - Fallback value if parsing fails
 * @param roundFn - Rounding function
 * @returns The parsed value
 */
function parseCSSValue(
  computedStyle: CSSStyleDeclaration,
  propertyName: string,
  fallback: number,
  roundFn: (value: number) => number
): number {
  const rawValue = computedStyle.getPropertyValue(propertyName).trim();
  const parsed = parseFloat(rawValue);
  return roundFn(Number.isNaN(parsed) ? fallback : parsed);
}

/**
 * Parses all dimension CSS custom properties.
 * @param params - Parameters for parsing
 * @returns Parsed dimensions object
 */
function parseDimensionsFromCSS({ computedStyle, defaults, roundFn }: ParseDimensionsParams): ParsedDimensions {
  return {
    horizontalLineLength: parseCSSValue(
      computedStyle,
      '--horizontal-line-length',
      defaults.LINE.HORIZONTAL_LENGTH,
      roundFn
    ),
    maxSpokeLength: parseCSSValue(computedStyle, '--max-spoke-length', defaults.LINE.MAX_SPOKE_LENGTH, roundFn),
    hitAreaStrokeWidth: parseCSSValue(
      computedStyle,
      '--hit-area-stroke-width',
      defaults.HIT_AREA.STROKE_WIDTH,
      roundFn
    ),
    horizontalLineEndOffset: parseCSSValue(
      computedStyle,
      '--horizontal-line-end-offset',
      defaults.LINE.HORIZONTAL_END_OFFSET,
      roundFn
    ),
  };
}

/**
 * Parses knob radii from CSS custom properties.
 * @param params - Parameters for parsing
 * @returns Object with scaledRadiusOuter and scaledRadiusInner
 */
function parseKnobRadii({ computedStyle, defaults, roundFn }: ParseKnobRadiiParams): KnobRadii {
  return {
    scaledRadiusOuter: parseCSSValue(computedStyle, '--radius-outer', defaults.RADIUS_OUTER, roundFn),
    scaledRadiusInner: parseCSSValue(computedStyle, '--radius-inner', defaults.RADIUS_INNER, roundFn),
  };
}

/**
 * Calculates knob wrap size and center from element dimensions.
 * @param params - Parameters for calculation
 * @returns Object with knobWrapSize, knobCenter, and scale
 */
function calculateKnobScale({ actualSize, baseSize, roundFn }: CalculateKnobScaleParams): KnobScaleResult {
  const knobWrapSize = roundFn(actualSize);
  const knobCenter = roundFn(knobWrapSize / 2);
  const scale = roundFn(knobWrapSize / baseSize);
  return { knobWrapSize, knobCenter, scale };
}

/**
 * Computes selection delay CSS properties.
 * @param delayAttr - The time-selection-delay attribute value
 * @param roundFn - Rounding function
 * @returns Selection delay result or null if no delay attr
 */
function computeSelectionDelay(
  delayAttr: string | null,
  roundFn: (value: number) => number
): SelectionDelayResult | null {
  if (!delayAttr) return null;

  const delayMs = parseFloat(delayAttr);
  const delaySeconds = roundFn(Math.max(0, delayMs) / 1000);

  return {
    delay: `${delaySeconds}s`,
    disableTransitions: delayMs === 0,
  };
}

export default {
  parseCSSValue,
  parseDimensionsFromCSS,
  parseKnobRadii,
  calculateKnobScale,
  computeSelectionDelay,
};
