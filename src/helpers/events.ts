/**
 * Event handling helpers for the dial-selector component.
 */

import type { DialOption, DialChangeEventDetail } from '../types';

/** Parameters for dispatchDialChangeEvent */
type DispatchDialChangeEventParams = {
  element: HTMLElement;
  currentOption: DialOption | undefined;
  previousOption: DialOption | undefined;
  currentIndex: number;
  previousIndex: number;
};

/**
 * Creates and dispatches a change event for the dial selector.
 * Handles both CustomEvent dispatch and onchange attribute execution.
 * @param params - Parameters for event dispatch
 */
function dispatchDialChangeEvent({
  element,
  currentOption,
  previousOption,
  currentIndex,
  previousIndex,
}: DispatchDialChangeEventParams): void {
  const detail: DialChangeEventDetail = {
    value: currentOption?.value || '',
    label: currentOption?.label || '',
    index: currentIndex,
    previousValue: previousOption?.value || '',
    previousLabel: previousOption?.label || '',
    previousIndex: previousIndex,
  };

  const event = new CustomEvent<DialChangeEventDetail>('change', {
    bubbles: true,
    cancelable: true,
    detail,
  });

  // Store original onchange to restore later
  const onchangeAttr = element.getAttribute('onchange');
  const originalOnchange = (element as HTMLElement & { onchange?: ((event: Event) => void) | null }).onchange;

  // Temporarily remove onchange to prevent browser from auto-executing it
  if (onchangeAttr) {
    element.removeAttribute('onchange');
    (element as HTMLElement & { onchange: ((event: Event) => void) | null }).onchange = null;
  }

  // Dispatch the event
  element.dispatchEvent(event);

  // Manually execute the handler
  if (onchangeAttr) {
    try {
      const handler = new Function('event', onchangeAttr) as (event: CustomEvent<DialChangeEventDetail>) => void;
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
