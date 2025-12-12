/**
 * Form-associated custom element helper functions.
 * Handles form integration logic for dial-selector.
 */

import type { DialOption } from '../types';

/** Parameters for handleFormReset */
type HandleFormResetParams = {
  initialValue: string | null;
  options: DialOption[];
  findOptionByValue: (options: DialOption[], value: string) => number;
};

/** Result from handleFormReset */
type FormResetResult = {
  newIndex: number;
  newValue: string;
};

/**
 * Handles form reset logic, returning the index and value to reset to.
 * @param params - Parameters for form reset
 * @returns The new index and value to reset to
 */
function handleFormReset(params: HandleFormResetParams): FormResetResult {
  const { initialValue, options, findOptionByValue } = params;

  // Reset to the stored initial value if available
  if (initialValue) {
    const index = findOptionByValue(options, initialValue);
    if (index !== -1) {
      return {
        newIndex: index,
        newValue: initialValue,
      };
    }
  }

  // Default to first option if no initial value was set
  const firstOption = options[0];
  return {
    newIndex: 0,
    newValue: firstOption?.value ?? '',
  };
}

/**
 * Handles form state restoration, returning the index to restore to.
 * @param state - The state to restore (string value)
 * @param options - Available options
 * @param findOptionByValue - Function to find option index by value
 * @returns The index to restore to, or -1 if not found
 */
function handleFormStateRestore(
  state: string | FormData | File | null,
  options: DialOption[],
  findOptionByValue: (options: DialOption[], value: string) => number
): number {
  if (typeof state === 'string' && state) {
    return findOptionByValue(options, state);
  }
  return -1;
}

/**
 * Updates the form value via ElementInternals.
 * @param internals - The ElementInternals instance
 * @param value - The value to set
 */
function updateFormValue(internals: ElementInternals | null, value: string): void {
  if (internals) {
    internals.setFormValue(value, value);
  }
}

export { handleFormReset, handleFormStateRestore, updateFormValue };
export type { FormResetResult };
