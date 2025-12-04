/**
 * Dimension parsing and calculation functions for the dial-selector component.
 */

/**
 * Parses a CSS property value as a float with a fallback.
 * @param {CSSStyleDeclaration} computedStyle - The computed style object
 * @param {string} propertyName - CSS custom property name
 * @param {number} fallback - Fallback value if parsing fails
 * @param {function} roundFn - Rounding function
 * @returns {number} The parsed value
 */
function parseCSSValue(computedStyle, propertyName, fallback, roundFn) {
  const value = computedStyle.getPropertyValue(propertyName).trim();
  return roundFn(parseFloat(value) || fallback);
}

/**
 * Parses all dimension CSS custom properties.
 * @param {Object} params - Parameters
 * @param {CSSStyleDeclaration} params.computedStyle - The computed style object
 * @param {Object} params.defaults - Default values { LABEL, LINE, HIT_AREA, INDICATOR }
 * @param {function} params.roundFn - Rounding function
 * @returns {Object} Parsed dimensions
 */
function parseDimensionsFromCSS({ computedStyle, defaults, roundFn }) {
  return {
    labelColumnHeight: parseCSSValue(computedStyle, '--label-column-height', defaults.LABEL.COLUMN_HEIGHT, roundFn),
    labelVerticalOffsetScale: parseCSSValue(
      computedStyle,
      '--label-vertical-offset-scale',
      defaults.LABEL.VERTICAL_OFFSET_SCALE,
      roundFn
    ),
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
    indicatorWidth: parseCSSValue(computedStyle, '--indicator-width', defaults.INDICATOR.WIDTH, roundFn),
  };
}

/**
 * Parses knob radii from CSS custom properties.
 * @param {Object} params - Parameters
 * @param {CSSStyleDeclaration} params.computedStyle - The computed style object
 * @param {Object} params.defaults - Default values { RADIUS_OUTER, RADIUS_INNER }
 * @param {function} params.roundFn - Rounding function
 * @returns {{ scaledRadiusOuter: number, scaledRadiusInner: number }}
 */
function parseKnobRadii({ computedStyle, defaults, roundFn }) {
  return {
    scaledRadiusOuter: parseCSSValue(computedStyle, '--radius-outer', defaults.RADIUS_OUTER, roundFn),
    scaledRadiusInner: parseCSSValue(computedStyle, '--radius-inner', defaults.RADIUS_INNER, roundFn),
  };
}

/**
 * Calculates knob wrap size and center from element dimensions.
 * @param {Object} params - Parameters
 * @param {number} params.actualSize - The actual rendered size
 * @param {number} params.baseSize - The base reference size
 * @param {function} params.roundFn - Rounding function
 * @returns {{ knobWrapSize: number, knobCenter: number, scale: number }}
 */
function calculateKnobScale({ actualSize, baseSize, roundFn }) {
  const knobWrapSize = roundFn(actualSize);
  const knobCenter = roundFn(knobWrapSize / 2);
  const scale = roundFn(knobWrapSize / baseSize);
  return { knobWrapSize, knobCenter, scale };
}

/**
 * Computes selection delay CSS properties.
 * @param {string|null} delayAttr - The time-selection-delay attribute value
 * @param {function} roundFn - Rounding function
 * @returns {{ delay: string|null, disableTransitions: boolean }|null} null if no delay attr
 */
function computeSelectionDelay(delayAttr, roundFn) {
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
