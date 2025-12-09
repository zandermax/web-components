import { KNOB } from '../constants';
import { getVariables } from './variables';
import { getBaseStyles } from './base';
import { getLayoutStyles } from './layout';
import { getKnobStyles } from './knob';
import { getLabelStyles } from './labels';
import { getLineStyles } from './lines';
import { getModeStyles } from './modes';
import { getMediaStyles } from './media';

/**
 * Returns the CSS styles for the dial-selector component's shadow DOM.
 * Combines all style modules into a single stylesheet.
 */
export function getStyles(): string {
  const knobWrapSize = KNOB.WRAP_SIZE;
  const knobCenter = knobWrapSize / 2;

  return `
    <style>
      :host {
        ${getVariables(knobWrapSize, knobCenter)}
      }

      ${getBaseStyles()}
      ${getLayoutStyles()}
      ${getKnobStyles()}
      ${getLabelStyles()}
      ${getLineStyles()}
      ${getModeStyles()}
      ${getMediaStyles()}
    </style>
  `;
}

