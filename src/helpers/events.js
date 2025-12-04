/**
 * Event handling helpers for the dial-selector component.
 */

/**
 * Creates and dispatches a change event for the dial selector.
 * Handles both CustomEvent dispatch and onchange attribute execution.
 * @param {Object} params - Parameters
 * @param {HTMLElement} params.element - The custom element to dispatch from
 * @param {Object} params.currentOption - Current selected option { value, label }
 * @param {Object} params.previousOption - Previously selected option { value, label }
 * @param {number} params.currentIndex - Current selection index
 * @param {number} params.previousIndex - Previous selection index
 */
function dispatchDialChangeEvent({ element, currentOption, previousOption, currentIndex, previousIndex }) {
  const event = new CustomEvent('change', {
    bubbles: true,
    cancelable: true,
    detail: {
      value: currentOption?.value || currentOption,
      label: currentOption?.label || currentOption,
      index: currentIndex,
      previousValue: previousOption?.value || previousOption,
      previousLabel: previousOption?.label || previousOption,
      previousIndex: previousIndex,
    },
  });

  // Store original onchange to restore later
  const onchangeAttr = element.getAttribute('onchange');
  const originalOnchange = element.onchange;

  // Temporarily remove onchange to prevent browser from auto-executing it
  if (onchangeAttr) {
    element.removeAttribute('onchange');
    delete element.onchange;
  }

  // Dispatch the event
  element.dispatchEvent(event);

  // Manually execute the handler
  if (onchangeAttr) {
    try {
      const handler = new Function('event', onchangeAttr);
      handler.call(element, event);
    } catch (e) {
      console.warn('Error executing onchange handler:', e);
    }
    // Restore the attribute
    element.setAttribute('onchange', onchangeAttr);
  } else if (typeof originalOnchange === 'function') {
    originalOnchange.call(element, event);
  }
}

export default {
  dispatchDialChangeEvent,
};
