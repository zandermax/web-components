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
 * Uses standard CustomEvent dispatch - listeners should use addEventListener('change', ...).
 * The onchange property (set via JS) is also supported via standard event dispatch.
 * Note: The onchange HTML attribute is NOT supported for security reasons (would require eval).
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

  // Dispatch the event - addEventListener listeners will receive it
  element.dispatchEvent(event);

  // Call onchange property handler if set via JavaScript (e.g., element.onchange = fn)
  const onchangeHandler = (element as HTMLElement & { onchange?: ((event: Event) => void) | null }).onchange;
  if (typeof onchangeHandler === 'function') {
    onchangeHandler.call(element, event);
  }
}

export default {
  dispatchDialChangeEvent,
};
