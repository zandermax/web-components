/**
 * Selection logic helper functions.
 * Handles option selection logic and navigation.
 */

import type { DialOption } from '../types';

/** Parameters for selectByValue */
type SelectByValueParams = {
  value: string;
  options: DialOption[];
  findOptionByValue: (options: DialOption[], value: string) => number;
};

/** Parameters for calculateNextIndex */
type CalculateNextIndexParams = {
  currentIndex: number;
  optionCount: number;
};

/** Parameters for calculatePreviousIndex */
type CalculatePreviousIndexParams = {
  currentIndex: number;
  optionCount: number;
};

/** Parameters for setInitialSelection */
type SetInitialSelectionParams = {
  valueAttr: string | null;
  options: DialOption[];
  findOptionByValue: (options: DialOption[], value: string) => number;
};

/** Result from setInitialSelection */
type InitialSelectionResult = {
  index: number;
  value: string;
};

/**
 * Finds the index of an option by value.
 * @param params - Parameters for selection
 * @returns The index of the option, or -1 if not found
 */
function selectByValue(params: SelectByValueParams): number {
  const { value, options, findOptionByValue } = params;
  return findOptionByValue(options, value);
}

/**
 * Calculates the next index (wraps around).
 * @param params - Parameters for calculation
 * @returns The next index
 */
function calculateNextIndex(params: CalculateNextIndexParams): number {
  const { currentIndex, optionCount } = params;
  if (optionCount === 0) return 0;
  return (currentIndex + 1) % optionCount;
}

/**
 * Calculates the previous index (wraps around).
 * @param params - Parameters for calculation
 * @returns The previous index
 */
function calculatePreviousIndex(params: CalculatePreviousIndexParams): number {
  const { currentIndex, optionCount } = params;
  if (optionCount === 0) return 0;
  return (currentIndex - 1 + optionCount) % optionCount;
}

/**
 * Determines the initial selection based on value attribute.
 * @param params - Parameters for initialization
 * @returns The initial index and value
 */
function setInitialSelection(params: SetInitialSelectionParams): InitialSelectionResult {
  const { valueAttr, options, findOptionByValue } = params;

  if (valueAttr) {
    const index = findOptionByValue(options, valueAttr);
    if (index !== -1) {
      return { index, value: valueAttr };
    }
  }

  // Default to first option
  const firstOption = options[0];
  return {
    index: 0,
    value: firstOption?.value ?? '',
  };
}

/**
 * Checks if an index is valid for the given options.
 * @param index - The index to check
 * @param optionCount - The total number of options
 * @returns True if index is valid
 */
function isValidIndex(index: number, optionCount: number): boolean {
  return index >= 0 && index < optionCount;
}

export { selectByValue, calculateNextIndex, calculatePreviousIndex, setInitialSelection, isValidIndex };
export type { InitialSelectionResult };
