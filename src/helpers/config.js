/**
 * Configuration parsing functions for the dial-selector component.
 */

/**
 * Parses the one-sided attribute value.
 * @param {string | null} value - The attribute value
 * @returns {'left' | 'right' | null} The normalized side, or null for both sides
 */
function parseOneSidedValue(value) {
  if (!value) return null;
  const normalized = value.toLowerCase().trim();
  if (normalized === 'left' || normalized === 'inline-start') {
    return 'left';
  }
  if (normalized === 'right' || normalized === 'inline-end') {
    return 'right';
  }
  return null;
}

/**
 * Parses dial-option child elements into an options array.
 * @param {Element[]} childOptions - Array of dial-option elements
 * @param {string[]} defaultOptions - Default options if no children
 * @returns {Array<{value: string, label: string, htmlContent: string|null, lineLength: number|null}>}
 */
function parseChildOptions(childOptions, defaultOptions) {
  if (childOptions.length === 0) {
    return defaultOptions.map((opt) => ({
      value: opt,
      label: opt,
      htmlContent: null,
      lineLength: null,
    }));
  }

  return childOptions.map((option, index) => {
    const labelText = (option.textContent ?? '').trim();
    const value = option.getAttribute('value') ?? (labelText || String(index));
    const label = labelText || value;
    const htmlContent = option.innerHTML.trim() || null;
    const lineLengthAttr = option.getAttribute('line-length');
    const lineLength = lineLengthAttr !== null ? parseFloat(lineLengthAttr) : null;
    return { value, label, htmlContent, lineLength };
  });
}

/**
 * Calculates left/right counts and spoke angles based on options and layout config.
 * @param {Object} params - Parameters
 * @param {number} params.optionCount - Total number of options
 * @param {'left'|'right'|null} params.oneSided - One-sided config
 * @param {Object} params.arcs - Arc configuration { LEFT_START, LEFT_END, RIGHT_START, RIGHT_END }
 * @param {function} params.generateAngles - Function to generate arc angles
 * @returns {{ leftCount: number, rightCount: number, spokeAngles: number[] }}
 */
function calculateSideCounts({ optionCount, oneSided, arcs, generateAngles }) {
  if (oneSided === 'left') {
    return {
      leftCount: optionCount,
      rightCount: 0,
      spokeAngles: generateAngles(optionCount, arcs.LEFT_START, arcs.LEFT_END),
    };
  }
  if (oneSided === 'right') {
    return {
      leftCount: 0,
      rightCount: optionCount,
      spokeAngles: generateAngles(optionCount, arcs.RIGHT_START, arcs.RIGHT_END),
    };
  }
  const leftCount = Math.ceil(optionCount / 2);
  const rightCount = optionCount - leftCount;
  return {
    leftCount,
    rightCount,
    spokeAngles: [
      ...generateAngles(rightCount, arcs.RIGHT_START, arcs.RIGHT_END),
      ...generateAngles(leftCount, arcs.LEFT_START, arcs.LEFT_END),
    ],
  };
}

/**
 * Resolves the placement (side, angle index) for an option.
 * @param {Object} params - Parameters
 * @param {number} params.index - Option index
 * @param {'left'|'right'|null} params.oneSided - One-sided config
 * @param {number} params.leftCount - Count of left options
 * @param {number} params.rightCount - Count of right options
 * @returns {{ isLeft: boolean, angleIndex: number }}
 */
function resolveOptionSide({ index, oneSided, leftCount, rightCount }) {
  if (oneSided === 'left') {
    return { isLeft: true, angleIndex: index };
  }
  if (oneSided === 'right') {
    return { isLeft: false, angleIndex: index };
  }
  const isLeft = index < leftCount;
  const angleIndex = isLeft ? rightCount + index : index - leftCount;
  return { isLeft, angleIndex };
}

export default {
  parseOneSidedValue,
  parseChildOptions,
  calculateSideCounts,
  resolveOptionSide,
};
