/**
 * DOM element creation helpers for the dial-selector component.
 */

/**
 * Creates a label element for a dial option.
 * @param {Object} params - Parameters
 * @param {Object} params.option - The option object { value, label, htmlContent }
 * @param {number} params.index - Option index
 * @param {number} params.angle - Angle in degrees
 * @param {boolean} params.isLeft - Whether on left side
 * @param {boolean} params.isSpokes - Whether in spokes mode
 * @param {function} params.onClick - Click handler
 * @returns {HTMLLabelElement} The created label element
 */
function createLabelElement({ option, index, angle, isLeft, isSpokes, onClick }) {
  const label = document.createElement('label');
  label.className = 'dial-label';
  if (isSpokes) {
    label.classList.add('spokes');
  }
  label.setAttribute('part', 'label');

  // Use HTML content if available, otherwise fall back to text
  if (option.htmlContent) {
    label.innerHTML = option.htmlContent;
  } else {
    label.textContent = option.label;
  }

  label.dataset.index = index;
  label.dataset.angle = angle;
  label.dataset.value = option.value;
  label.dataset.isLeft = isLeft ? 'true' : 'false';

  // Set CSS custom property for trigonometric positioning
  label.style.setProperty('--label-angle', angle);
  label.addEventListener('click', onClick);

  return label;
}

/**
 * Creates an SVG polyline element for a spoke line.
 * @param {Object} params - Parameters
 * @param {number} params.index - Option index
 * @param {number} params.strokeWidth - Line stroke width
 * @param {number} params.opacity - Line opacity
 * @returns {SVGPolylineElement} The created polyline element
 */
function createLineElement({ index, strokeWidth, opacity }) {
  const line = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
  line.setAttribute('class', 'spoke-line');
  line.setAttribute('fill', 'none');
  line.setAttribute('stroke', 'var(--color-ink)');
  line.setAttribute('stroke-width', `var(--line-stroke-width, ${strokeWidth})`);
  line.setAttribute('opacity', `var(--line-opacity-inactive, ${opacity})`);
  line.setAttribute('stroke-linejoin', 'miter');
  line.setAttribute('pointer-events', 'none');
  line.dataset.index = index;
  return line;
}

/**
 * Creates an invisible SVG polyline for hit area (easier clicking).
 * @param {Object} params - Parameters
 * @param {number} params.index - Option index
 * @param {number} params.hitAreaStrokeWidth - Hit area stroke width
 * @param {function} params.onClick - Click handler
 * @returns {SVGPolylineElement} The created hit area element
 */
function createHitAreaElement({ index, hitAreaStrokeWidth, onClick }) {
  const hitArea = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
  hitArea.setAttribute('class', 'spoke-line-hit-area');
  hitArea.setAttribute('fill', 'none');
  hitArea.setAttribute('stroke', 'transparent');
  hitArea.setAttribute('stroke-width', hitAreaStrokeWidth.toString());
  hitArea.setAttribute('stroke-linejoin', 'miter');
  hitArea.setAttribute('pointer-events', 'auto');
  hitArea.style.cursor = 'pointer';
  hitArea.dataset.index = index;
  hitArea.setAttribute('points', '');
  hitArea.addEventListener('click', onClick);
  return hitArea;
}

/**
 * Updates visual state of labels and lines based on active selection.
 * @param {Object} params - Parameters
 * @param {HTMLElement[]} params.labels - Array of label elements
 * @param {SVGElement[]} params.lines - Array of line elements
 * @param {number} params.activeIndex - Currently active index
 * @param {number} params.activeOpacity - Opacity for active line
 * @param {number} params.inactiveOpacity - Opacity for inactive lines
 */
function updateActiveStates({ labels, lines, activeIndex, activeOpacity, inactiveOpacity }) {
  labels.forEach((label, index) => {
    const line = lines[index];
    if (index === activeIndex) {
      label.classList.add('active');
      label.setAttribute('part', 'label label-active');
      line.classList.add('active');
      line.setAttribute('opacity', `var(--line-opacity-active, ${activeOpacity})`);
      line.setAttribute('stroke', 'var(--color-selection)');
    } else {
      label.classList.remove('active');
      label.setAttribute('part', 'label');
      line.classList.remove('active');
      line.setAttribute('opacity', `var(--line-opacity-inactive, ${inactiveOpacity})`);
      line.setAttribute('stroke', 'var(--color-ink)');
    }
  });
}

/**
 * Clears existing labels and lines from containers.
 * @param {Object} params - Parameters
 * @param {HTMLElement|null} params.leftColumn - Left column container
 * @param {HTMLElement|null} params.rightColumn - Right column container
 * @param {SVGElement|null} params.lineContainer - SVG container for lines
 * @param {HTMLElement|null} params.knobWrap - Knob wrapper element
 */
function clearContainers({ leftColumn, rightColumn, lineContainer, knobWrap }) {
  leftColumn && (leftColumn.innerHTML = '');
  rightColumn && (rightColumn.innerHTML = '');
  lineContainer && (lineContainer.innerHTML = '');
  knobWrap?.querySelectorAll('.dial-label').forEach((el) => el.remove());
}

/**
 * Checks if a node is a dial-option element.
 * @param {Node} node - DOM node to check
 * @returns {boolean} True if node is a dial-option element
 */
const isDialOptionElement = (node) => node.nodeType === Node.ELEMENT_NODE && node.tagName === 'DIAL-OPTION';

/**
 * Checks if mutations should trigger a component rebuild.
 * @param {MutationRecord[]} mutations - Array of mutation records
 * @returns {boolean} True if rebuild is needed
 */
function shouldRebuildFromMutations(mutations) {
  return mutations.some((mutation) => {
    if (mutation.type === 'childList') {
      const hasAddedOption = [...mutation.addedNodes].some(isDialOptionElement);
      const hasRemovedOption = [...mutation.removedNodes].some(isDialOptionElement);
      if (hasAddedOption || hasRemovedOption) return true;
    }
    return mutation.type === 'attributes' && mutation.target.tagName === 'DIAL-OPTION';
  });
}

/**
 * Finds an option index by value.
 * @param {Array<{value: string}>} options - Options array
 * @param {string} value - Value to find
 * @returns {number} Index of option, or -1 if not found
 */
function findOptionIndexByValue(options, value) {
  return options.findIndex((opt) => opt.value === value);
}

export default {
  createLabelElement,
  createLineElement,
  createHitAreaElement,
  updateActiveStates,
  clearContainers,
  shouldRebuildFromMutations,
  findOptionIndexByValue,
};
