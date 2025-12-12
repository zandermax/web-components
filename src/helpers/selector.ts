/**
 * Selector update helper functions.
 * Handles angle calculations and state management for the dial selector.
 */

/** Parameters for calculateSelectorAngle */
type CalculateSelectorAngleParams = {
  targetAngle: number;
  currentAngle: number;
  isInitialized: boolean;
  fullCircleDegrees: number;
  calculateShortestRotation: (current: number, target: number, fullCircle: number) => number;
  roundFn: (value: number) => number;
};

/** Result from calculateSelectorAngle */
type SelectorAngleResult = {
  newAngle: number;
  shouldInitialize: boolean;
};

/**
 * Calculates the new selector angle based on the target.
 * On first call (not initialized), sets the angle directly.
 * On subsequent calls, calculates the shortest rotation path.
 * @param params - Parameters for calculation
 * @returns The new angle and whether this is initialization
 */
function calculateSelectorAngle(params: CalculateSelectorAngleParams): SelectorAngleResult {
  const { targetAngle, currentAngle, isInitialized, fullCircleDegrees, calculateShortestRotation, roundFn } = params;

  if (!isInitialized) {
    return {
      newAngle: roundFn(targetAngle),
      shouldInitialize: true,
    };
  }

  // Calculate the shortest angular path to the target
  const delta = calculateShortestRotation(currentAngle, targetAngle, fullCircleDegrees);
  return {
    newAngle: roundFn(currentAngle + delta),
    shouldInitialize: false,
  };
}

/**
 * Updates the CSS custom property for the indicator angle.
 * @param element - The element to update
 * @param angle - The angle in degrees
 * @param roundFn - Function to round the angle
 */
function updateIndicatorAngle(element: HTMLElement, angle: number, roundFn: (value: number) => number): void {
  element.style.setProperty('--indicator-angle', `${roundFn(angle)}deg`);
}

/**
 * Updates ARIA active descendant attribute.
 * @param element - The host element
 * @param activeLabel - The active label element
 */
function updateActiveDescendant(element: HTMLElement, activeLabel: HTMLElement | null): void {
  if (activeLabel) {
    element.setAttribute('aria-activedescendant', activeLabel.id);
  }
}

/**
 * Announces the current selection to screen readers.
 * @param liveRegion - The live region element
 * @param label - The label text to announce
 */
function announceSelection(liveRegion: HTMLElement | null, label: string): void {
  if (liveRegion) {
    liveRegion.textContent = `Selected: ${label}`;
  }
}

export { calculateSelectorAngle, updateIndicatorAngle, updateActiveDescendant, announceSelection };
export type { SelectorAngleResult };
