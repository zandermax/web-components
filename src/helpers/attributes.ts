/**
 * Attribute update helper functions.
 * Handles CSS custom property updates based on attribute values.
 */

/** Parameters for updateSelectionAnimation */
type UpdateSelectionAnimationParams = {
  element: HTMLElement;
  attrValue: string | null;
  roundFn: (value: number) => number;
};

/** Parameters for updateSelectionDelay */
type UpdateSelectionDelayParams = {
  element: HTMLElement;
  attrValue: string | null;
  roundFn: (value: number) => number;
};

/** Result from computeSelectionDelay */
type SelectionDelayResult = {
  delay: string;
  disableTransitions: boolean;
} | null;

/** Parameters for updateHeight */
type UpdateHeightParams = {
  element: HTMLElement;
  heightValue: string | null;
};

/**
 * Computes selection delay values from attribute.
 * @param attrValue - The attribute value
 * @param roundFn - Function to round values
 * @returns Delay result or null
 */
function computeSelectionDelay(
  attrValue: string | null,
  roundFn: (value: number) => number
): SelectionDelayResult {
  if (attrValue === null) return null;

  const ms = parseFloat(attrValue);
  if (isNaN(ms)) return null;

  if (ms === 0) {
    return {
      delay: '0s',
      disableTransitions: true,
    };
  }

  if (ms > 0) {
    const seconds = roundFn(ms / 1000);
    return {
      delay: `${seconds}s`,
      disableTransitions: false,
    };
  }

  return null;
}

/**
 * Updates the selection animation CSS custom property.
 * @param params - Parameters for update
 */
function updateSelectionAnimation(params: UpdateSelectionAnimationParams): void {
  const { element, attrValue, roundFn } = params;

  if (attrValue !== null) {
    const ms = parseFloat(attrValue);
    if (!isNaN(ms) && ms >= 0) {
      const seconds = roundFn(ms / 1000);
      element.style.setProperty('--time-selection-animation', `${seconds}s`);
    } else {
      element.style.removeProperty('--time-selection-animation');
    }
  } else {
    element.style.removeProperty('--time-selection-animation');
  }
}

/**
 * Updates the selection delay CSS custom property.
 * @param params - Parameters for update
 */
function updateSelectionDelay(params: UpdateSelectionDelayParams): void {
  const { element, attrValue, roundFn } = params;

  const result = computeSelectionDelay(attrValue, roundFn);

  if (result) {
    element.style.setProperty('--time-selection-delay', result.delay);
    if (result.disableTransitions) {
      element.style.setProperty('--indicator-transition', 'none');
      element.style.setProperty('--line-transition', 'none');
    } else {
      element.style.removeProperty('--indicator-transition');
      element.style.removeProperty('--line-transition');
    }
  } else {
    element.style.removeProperty('--time-selection-delay');
    element.style.removeProperty('--indicator-transition');
    element.style.removeProperty('--line-transition');
  }
}

/**
 * Updates the height CSS custom property.
 * @param params - Parameters for update
 */
function updateHeight(params: UpdateHeightParams): void {
  const { element, heightValue } = params;

  if (heightValue !== null) {
    element.style.setProperty('--component-height', heightValue);
    element.style.setProperty('height', heightValue);
  } else {
    element.style.removeProperty('--component-height');
    element.style.removeProperty('height');
  }
}

/**
 * Executes a callback with transitions temporarily disabled.
 * @param element - The element to modify
 * @param callback - The function to execute without transitions
 */
function withoutTransitions(element: HTMLElement, callback: () => void): void {
  element.classList.add('no-transitions');
  callback();
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      element.classList.remove('no-transitions');
    });
  });
}

export { updateSelectionAnimation, updateSelectionDelay, updateHeight, withoutTransitions, computeSelectionDelay };
export type { SelectionDelayResult };

