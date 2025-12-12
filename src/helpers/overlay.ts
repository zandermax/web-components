/**
 * Dial layout overlay helper functions for demo/debugging purposes.
 * Handles the visual overlay that shows the geometric structure of the dial.
 */

import type { DialOption, OneSidedConfig, SideCountsResult } from '../types';
import { resolveOptionSide } from './config';

/** Parameters for createHorizontalLineSVG */
type HorizontalLineSVGParams = {
  color?: string;
  strokeWidth?: string;
};

/** Parameters for createSpokeElement */
type CreateSpokeElementParams = {
  index: number;
  color?: string;
  strokeWidth?: string;
};

/** Parameters for createOptionElement */
type CreateOptionElementParams = {
  option: DialOption;
  positionClass: string;
  optionIndex: number;
  isLeft: boolean;
  oneSided: OneSidedConfig;
};

/** Parameters for rebuildDialLayoutOverlay */
type RebuildDialLayoutOverlayParams = {
  shadowRoot: ShadowRoot;
  options: DialOption[];
  geometry: SideCountsResult;
  oneSided: OneSidedConfig;
};

/**
 * Creates an SVG element for a horizontal line.
 * @param params - Optional parameters for customization
 * @returns SVG element
 */
function createHorizontalLineSVG(params: HorizontalLineSVGParams = {}): SVGSVGElement {
  const { color = 'pink', strokeWidth = '2' } = params;

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '2px');
  svg.style.position = 'absolute';
  svg.style.top = '50%';
  svg.style.left = '0';
  svg.style.transform = 'translateY(-50%)';
  svg.style.pointerEvents = 'none';

  const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  line.setAttribute('x1', '0');
  line.setAttribute('y1', '1');
  line.setAttribute('x2', '100%');
  line.setAttribute('y2', '1');
  line.setAttribute('stroke', color);
  line.setAttribute('stroke-width', strokeWidth);

  svg.appendChild(line);
  return svg;
}

/**
 * Creates a spoke element with SVG line for the overlay.
 * @param params - Parameters for creation
 * @returns Spoke element
 */
function createSpokeElement(params: CreateSpokeElementParams): HTMLElement {
  const { index, color = 'pink', strokeWidth = '2' } = params;

  const spoke = document.createElement('div');
  spoke.className = 'spoke';
  spoke.style.setProperty('--index', String(index));

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  svg.style.position = 'absolute';
  svg.style.inset = '0';
  svg.style.pointerEvents = 'none';

  const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  line.setAttribute('x1', '0');
  line.setAttribute('y1', '0');
  line.setAttribute('x2', '100%');
  line.setAttribute('y2', '100%');
  line.setAttribute('stroke', color);
  line.setAttribute('stroke-width', strokeWidth);

  svg.appendChild(line);
  spoke.appendChild(svg);

  return spoke;
}

/**
 * Adds a horizontal center line to a top spoke container for odd-numbered sides.
 * @param topSpokes - The top spokes container element
 */
function addCenterLineToTop(topSpokes: HTMLElement): void {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '2px');
  svg.style.position = 'absolute';
  svg.style.bottom = '0';
  svg.style.left = '0';
  svg.style.transform = 'translateY(50%)';
  svg.style.pointerEvents = 'none';

  const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  line.setAttribute('x1', '0');
  line.setAttribute('y1', '1');
  line.setAttribute('x2', '100%');
  line.setAttribute('y2', '1');
  line.setAttribute('stroke', 'pink');
  line.setAttribute('stroke-width', '2');

  svg.appendChild(line);
  topSpokes.appendChild(svg);
}

/**
 * Determines the vertical position class for an option based on its
 * visual position within its column.
 * @param visualPosition - The visual position (0 = top) within the column
 * @param totalInColumn - Total number of options in this column
 * @returns The position class: 'block-start', 'center', or 'block-end'
 */
function getVerticalPositionClass(visualPosition: number, totalInColumn: number): string {
  if (totalInColumn === 1) {
    return 'center';
  }

  const middleIndex = Math.floor(totalInColumn / 2);
  const hasCenter = totalInColumn % 2 === 1;

  if (hasCenter && visualPosition === middleIndex) {
    return 'center';
  } else if (visualPosition < middleIndex) {
    return 'block-start';
  } else {
    return 'block-end';
  }
}

/**
 * Creates an option element for the overlay with proper structure.
 * @param params - Parameters for creation
 * @returns Option element
 */
function createOptionElement(params: CreateOptionElementParams): HTMLElement {
  const { option, positionClass, optionIndex, isLeft, oneSided } = params;

  const optionEl = document.createElement('div');
  optionEl.className = `option ${positionClass}`;

  const textEl = document.createElement('div');
  textEl.className = 'option-text';
  textEl.textContent = option.label;

  const imageElTop = document.createElement('div');
  imageElTop.className = 'option-image top';
  imageElTop.style.position = 'relative';
  // Don't show line in top image when one-sided on the left
  if (oneSided !== 'left') {
    imageElTop.appendChild(createHorizontalLineSVG());
  }

  const imageElBottom = document.createElement('div');
  imageElBottom.className = 'option-image bottom';
  imageElBottom.style.position = 'relative';
  // Don't show line in bottom image when one-sided on the right
  if (oneSided !== 'right') {
    imageElBottom.appendChild(createHorizontalLineSVG());
  }

  optionEl.appendChild(imageElTop);
  optionEl.appendChild(textEl);
  optionEl.appendChild(imageElBottom);

  return optionEl;
}

/**
 * Populates spoke containers with spoke elements based on quadrant counts.
 * @param overlay - The overlay element
 * @param quadrantCounts - Object with counts for each quadrant
 */
function populateSpokeLines(
  overlay: Element,
  quadrantCounts: { leftTop: number; leftBottom: number; rightTop: number; rightBottom: number }
): void {
  const leftTopSpokes = overlay.querySelector<HTMLElement>('.spoke-lines-container.left .spoke-lines.top');
  const leftBottomSpokes = overlay.querySelector<HTMLElement>('.spoke-lines-container.left .spoke-lines.bottom');
  const rightTopSpokes = overlay.querySelector<HTMLElement>('.spoke-lines-container.right .spoke-lines.top');
  const rightBottomSpokes = overlay.querySelector<HTMLElement>('.spoke-lines-container.right .spoke-lines.bottom');

  if (leftBottomSpokes) {
    let index = 0;
    leftBottomSpokes.innerHTML = '';
    for (let i = 0; i < quadrantCounts.leftBottom; i++) {
      leftBottomSpokes.appendChild(createSpokeElement({ index: ++index }));
    }
  }

  if (leftTopSpokes) {
    let index = 0;
    leftTopSpokes.innerHTML = '';
    for (let i = 0; i < quadrantCounts.leftTop; i++) {
      leftTopSpokes.appendChild(createSpokeElement({ index: ++index }));
    }
  }

  if (rightTopSpokes) {
    let index = 0;
    rightTopSpokes.innerHTML = '';
    for (let i = 0; i < quadrantCounts.rightTop; i++) {
      rightTopSpokes.appendChild(createSpokeElement({ index: ++index }));
    }
  }

  if (rightBottomSpokes) {
    let index = 0;
    rightBottomSpokes.innerHTML = '';
    for (let i = 0; i < quadrantCounts.rightBottom; i++) {
      rightBottomSpokes.appendChild(createSpokeElement({ index: ++index }));
    }
  }
}

/**
 * Rebuilds the dial-layout-overlay demo panel so that:
 *  - All options are rendered in the overlay.
 *  - Options are grouped into left/right columns using the same side logic
 *    as labels (configHelper.resolveOptionSide).
 *  - The left column starts with the lowest option at the bottom, while the
 *    right column starts with the lowest option at the top.
 *  - `.option-image` elements are preserved for spacing; `.option-text`
 *    contains the human‑readable label text.
 * @param params - Parameters for rebuilding
 */
function rebuildDialLayoutOverlay(params: RebuildDialLayoutOverlayParams): void {
  const { shadowRoot, options, geometry, oneSided } = params;

  const overlay = shadowRoot.querySelector('.dial-layout-overlay');
  if (!overlay) return;

  const leftContainer = overlay.querySelector<HTMLElement>('.options-container.left');
  const rightContainer = overlay.querySelector<HTMLElement>('.options-container.right');
  if (!leftContainer || !rightContainer) return;

  // Add --total-options CSS custom property to dial-container
  const dialContainer = overlay.querySelector<HTMLElement>('.dial-container');
  if (dialContainer) {
    dialContainer.style.setProperty('--total-options', String(options.length));
  }

  // Clear any existing demo content.
  leftContainer.innerHTML = '';
  rightContainer.innerHTML = '';

  const leftIndices: number[] = [];
  const rightIndices: number[] = [];

  // Determine which side each option belongs to using the same logic as labels.
  const { leftCount, rightCount } = geometry;
  options.forEach((_, index) => {
    const { isLeft } = resolveOptionSide({
      index,
      oneSided,
      leftCount,
      rightCount,
    });

    if (isLeft) {
      leftIndices.push(index);
    } else {
      rightIndices.push(index);
    }
  });

  // Add --num-options CSS custom property to each options-container
  leftContainer.style.setProperty('--num-options', String(leftIndices.length));
  rightContainer.style.setProperty('--num-options', String(rightIndices.length));

  // Calculate options per quadrant using simple formula (excluding center)
  // Each side splits evenly top/bottom (with center if odd)
  const quadrantCounts = {
    leftTop: Math.floor(leftIndices.length / 2),
    leftBottom: Math.floor(leftIndices.length / 2),
    rightTop: Math.floor(rightIndices.length / 2),
    rightBottom: Math.floor(rightIndices.length / 2),
  };

  // Set --num-options-this-side for each spoke-lines-container
  const leftSpokeContainer = overlay.querySelector<HTMLElement>('.spoke-lines-container.left');
  const rightSpokeContainer = overlay.querySelector<HTMLElement>('.spoke-lines-container.right');

  if (leftSpokeContainer) {
    leftSpokeContainer.style.setProperty('--num-options-this-side', String(leftIndices.length));
  }
  if (rightSpokeContainer) {
    rightSpokeContainer.style.setProperty('--num-options-this-side', String(rightIndices.length));
  }

  // Populate spoke-lines with .spoke divs based on quadrant counts
  populateSpokeLines(overlay, quadrantCounts);

  // Add horizontal center line for odd-numbered sides
  const leftTopSpokes = overlay.querySelector<HTMLElement>('.spoke-lines-container.left .spoke-lines.top');
  const rightTopSpokes = overlay.querySelector<HTMLElement>('.spoke-lines-container.right .spoke-lines.top');

  if (leftIndices.length % 2 === 1 && leftTopSpokes) {
    addCenterLineToTop(leftTopSpokes);
  }

  if (rightIndices.length % 2 === 1 && rightTopSpokes) {
    addCenterLineToTop(rightTopSpokes);
  }

  // Right column: top -> bottom uses natural index order for that side.
  rightIndices.forEach((optionIndex, visualPosition) => {
    const option = options[optionIndex];
    const positionClass = getVerticalPositionClass(visualPosition, rightIndices.length);
    rightContainer.appendChild(
      createOptionElement({
        option,
        positionClass,
        optionIndex,
        isLeft: false,
        oneSided,
      })
    );
  });

  // Left column: "starts at bottom" – the first logical option on the left
  // should appear at the bottom of the column. To achieve this with flex
  // column layout, we append in reverse order so the last one ends up at
  // the bottom.
  // The visual position is determined by the order after reversal.
  for (let i = leftIndices.length - 1; i >= 0; i -= 1) {
    const optionIndex = leftIndices[i];
    const option = options[optionIndex];
    // Visual position: first appended (i = length-1) is at top (visualPosition 0)
    const visualPosition = leftIndices.length - 1 - i;
    const positionClass = getVerticalPositionClass(visualPosition, leftIndices.length);
    leftContainer.appendChild(
      createOptionElement({
        option,
        positionClass,
        optionIndex,
        isLeft: true,
        oneSided,
      })
    );
  }
}

export { rebuildDialLayoutOverlay };
