/**
 * Configuration parsing functions for the dial-selector component.
 */

import type { DialOption, OneSidedConfig, SideCountsResult, OptionSideResult } from '../types';

/** Arc configuration for angle generation */
type ArcsConfig = {
  LEFT_START: number;
  LEFT_END: number;
  RIGHT_START: number;
  RIGHT_END: number;
};

/** Parameters for calculateSideCounts */
type CalculateSideCountsParams = {
  optionCount: number;
  oneSided: OneSidedConfig;
  arcs: ArcsConfig;
  generateAngles: (count: number, start: number, end: number) => number[];
};

/** Parameters for resolveOptionSide */
type ResolveOptionSideParams = {
  index: number;
  oneSided: OneSidedConfig;
  leftCount: number;
  rightCount: number;
};

const SIDE_MAP: Record<string, OneSidedConfig> = {
  left: 'left',
  right: 'right',
  'inline-start': 'left',
  'inline-end': 'right',
} as const;

/**
 * Parses the one-sided attribute value.
 * @param value - The attribute value
 * @returns The normalized side, or null for both sides
 */
function parseOneSidedValue(value: string | null): OneSidedConfig {
  if (!value) return null;
  return SIDE_MAP[value.toLowerCase().trim()] ?? null;
}

/**
 * Parses dial-option child elements into an options array.
 * @param childOptions - Array of dial-option elements
 * @param defaultOptions - Default options if no children
 * @returns Array of parsed option objects
 */
function parseChildOptions(childOptions: Element[], defaultOptions: readonly string[]): DialOption[] {
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
 * @param params - Parameters for calculation
 * @returns Object with leftCount, rightCount, and spokeAngles
 */
function calculateSideCounts({
  optionCount,
  oneSided,
  arcs,
  generateAngles,
}: CalculateSideCountsParams): SideCountsResult {
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
 * @param params - Parameters for resolution
 * @returns Object with isLeft boolean and angleIndex
 */
function resolveOptionSide({ index, oneSided, leftCount, rightCount }: ResolveOptionSideParams): OptionSideResult {
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

export { parseOneSidedValue, parseChildOptions, calculateSideCounts, resolveOptionSide };
