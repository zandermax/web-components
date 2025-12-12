/**
 * Keyboard navigation helper functions.
 * Handles keyboard event processing and navigation mode management.
 */

/** Result from handleKeyboardEvent */
type KeyboardEventResult = {
  action: 'next' | 'previous' | 'first' | 'last' | 'confirm' | 'none';
  shouldPreventDefault: boolean;
};

/**
 * Processes a keyboard event and returns the appropriate action.
 * @param event - The keyboard event
 * @returns The action to take
 */
function handleKeyboardEvent(event: KeyboardEvent): KeyboardEventResult {
  switch (event.key) {
    case 'ArrowRight':
    case 'ArrowUp':
      return { action: 'next', shouldPreventDefault: true };
    case 'ArrowLeft':
    case 'ArrowDown':
      return { action: 'previous', shouldPreventDefault: true };
    case 'Home':
      return { action: 'first', shouldPreventDefault: true };
    case 'End':
      return { action: 'last', shouldPreventDefault: true };
    case 'Enter':
    case ' ':
      return { action: 'confirm', shouldPreventDefault: true };
    default:
      return { action: 'none', shouldPreventDefault: false };
  }
}

/**
 * Enables keyboard navigation mode (shows focus ring).
 * @param element - The element to modify
 */
function enableKeyboardNav(element: HTMLElement): void {
  element.classList.add('keyboard-nav');
}

/**
 * Disables keyboard navigation mode (hides focus ring on mouse use).
 * @param element - The element to modify
 */
function disableKeyboardNav(element: HTMLElement): void {
  element.classList.remove('keyboard-nav');
}

/**
 * Sets up ARIA attributes for keyboard navigation.
 * @param element - The element to configure
 * @param defaultLabel - Default aria-label if not already set
 */
function setupARIAAttributes(element: HTMLElement, defaultLabel: string = 'Dial selector'): void {
  // Make component focusable if not already
  if (!element.hasAttribute('tabindex')) {
    element.setAttribute('tabindex', '0');
  }

  // Set up ARIA attributes for accessibility
  element.setAttribute('role', 'listbox');
  if (!element.hasAttribute('aria-label')) {
    element.setAttribute('aria-label', defaultLabel);
  }
}

export { handleKeyboardEvent, enableKeyboardNav, disableKeyboardNav, setupARIAAttributes };
export type { KeyboardEventResult };

