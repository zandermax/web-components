/**
 * DOM element creation helpers for the dial-selector component.
 */

import type { DialOption } from '../types';

/** Allowed HTML tags for label content (whitelist for security) */
const ALLOWED_TAGS = new Set([
  'span', 'strong', 'em', 'b', 'i', 'u', 's', 'sub', 'sup',
  'img', 'svg', 'path', 'circle', 'rect', 'line', 'polyline', 'polygon',
  'g', 'use', 'defs', 'symbol', 'text', 'tspan',
  'br', 'wbr',
]);

/** Allowed attributes for sanitized elements */
const ALLOWED_ATTRIBUTES = new Set([
  'class', 'id', 'style', 'title', 'alt', 'aria-label', 'aria-hidden', 'role',
  'src', 'width', 'height', 'viewBox', 'fill', 'stroke', 'stroke-width',
  'd', 'cx', 'cy', 'r', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'points',
  'transform', 'href', 'xlink:href', 'xmlns', 'xmlns:xlink',
]);

/** Dangerous URL protocols to block */
const DANGEROUS_PROTOCOLS = /^(javascript|data|vbscript):/i;

/**
 * Sanitizes HTML content to prevent XSS attacks.
 * Uses a whitelist approach for allowed tags and attributes.
 * @param html - The HTML string to sanitize
 * @returns Sanitized HTML string
 */
function sanitizeHTML(html: string): string {
  const template = document.createElement('template');
  template.innerHTML = html;
  
  const sanitizeNode = (node: Node): void => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element;
      const tagName = element.tagName.toLowerCase();
      
      // Remove disallowed elements entirely
      if (!ALLOWED_TAGS.has(tagName)) {
        // Keep text content but remove the element
        const textContent = element.textContent || '';
        element.replaceWith(document.createTextNode(textContent));
        return;
      }
      
      // Remove disallowed attributes
      const attributesToRemove: string[] = [];
      for (const attr of element.attributes) {
        const attrName = attr.name.toLowerCase();
        
        // Check if attribute is allowed
        if (!ALLOWED_ATTRIBUTES.has(attrName)) {
          attributesToRemove.push(attr.name);
          continue;
        }
        
        // Block dangerous URLs in src and href attributes
        if ((attrName === 'src' || attrName === 'href' || attrName === 'xlink:href') && 
            DANGEROUS_PROTOCOLS.test(attr.value.trim())) {
          attributesToRemove.push(attr.name);
        }
        
        // Block event handlers (onclick, onerror, etc.)
        if (attrName.startsWith('on')) {
          attributesToRemove.push(attr.name);
        }
      }
      
      attributesToRemove.forEach(attr => element.removeAttribute(attr));
      
      // Recursively sanitize children
      Array.from(element.childNodes).forEach(sanitizeNode);
    }
  };
  
  Array.from(template.content.childNodes).forEach(sanitizeNode);
  return template.innerHTML;
}

/** Parameters for createLabelElement */
type CreateLabelElementParams = {
  option: DialOption;
  index: number;
  angle: number;
  isLeft: boolean;
  isSpokes: boolean;
  onClick: () => void;
};

/** Parameters for createLineElement */
type CreateLineElementParams = {
  index: number;
  strokeWidth: number;
  opacity: number;
};

/** Parameters for createHitAreaElement */
type CreateHitAreaElementParams = {
  index: number;
  hitAreaStrokeWidth: number;
  onClick: () => void;
};

/** Parameters for updateActiveStates */
type UpdateActiveStatesParams = {
  labels: HTMLElement[];
  lines: SVGElement[];
  activeIndex: number;
  activeOpacity: number;
  inactiveOpacity: number;
};

/** Parameters for clearContainers */
type ClearContainersParams = {
  leftColumn: HTMLElement | null;
  rightColumn: HTMLElement | null;
  lineContainer: SVGElement | null;
  knobWrap: HTMLElement | null;
};

/**
 * Creates a label element for a dial option.
 * @param params - Parameters for creation
 * @returns The created label element
 */
function createLabelElement({ option, index, angle, isLeft, isSpokes, onClick }: CreateLabelElementParams): HTMLLabelElement {
  const label = document.createElement('label');
  label.className = 'dial-label';
  if (isSpokes) {
    label.classList.add('spokes');
  }
  label.setAttribute('part', 'label');

  // Use HTML content if available, otherwise fall back to text
  // HTML content is sanitized to prevent XSS attacks
  if (option.htmlContent) {
    label.innerHTML = sanitizeHTML(option.htmlContent);
  } else {
    label.textContent = option.label;
  }

  label.dataset.index = String(index);
  label.dataset.angle = String(angle);
  label.dataset.value = option.value;
  label.dataset.isLeft = isLeft ? 'true' : 'false';

  // Set CSS custom property for trigonometric positioning
  label.style.setProperty('--label-angle', String(angle));
  label.addEventListener('click', onClick);

  return label;
}

/**
 * Creates an SVG polyline element for a spoke line.
 * @param params - Parameters for creation
 * @returns The created polyline element
 */
function createLineElement({ index, strokeWidth, opacity }: CreateLineElementParams): SVGPolylineElement {
  const line = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
  line.setAttribute('class', 'spoke-line');
  line.setAttribute('fill', 'none');
  line.setAttribute('stroke', 'var(--color-ink)');
  line.setAttribute('stroke-width', `var(--line-stroke-width, ${strokeWidth})`);
  line.setAttribute('opacity', `var(--line-opacity-inactive, ${opacity})`);
  line.setAttribute('stroke-linejoin', 'miter');
  line.setAttribute('pointer-events', 'none');
  line.dataset.index = String(index);
  return line;
}

/**
 * Creates an invisible SVG polyline for hit area (easier clicking).
 * @param params - Parameters for creation
 * @returns The created hit area element
 */
function createHitAreaElement({ index, hitAreaStrokeWidth, onClick }: CreateHitAreaElementParams): SVGPolylineElement {
  const hitArea = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
  hitArea.setAttribute('class', 'spoke-line-hit-area');
  hitArea.setAttribute('fill', 'none');
  hitArea.setAttribute('stroke', 'transparent');
  hitArea.setAttribute('stroke-width', hitAreaStrokeWidth.toString());
  hitArea.setAttribute('stroke-linejoin', 'miter');
  hitArea.setAttribute('pointer-events', 'auto');
  hitArea.style.cursor = 'pointer';
  hitArea.dataset.index = String(index);
  hitArea.setAttribute('points', '');
  hitArea.addEventListener('click', onClick);
  return hitArea;
}

/**
 * Updates visual state of labels and lines based on active selection.
 * @param params - Parameters for update
 */
function updateActiveStates({ labels, lines, activeIndex, activeOpacity, inactiveOpacity }: UpdateActiveStatesParams): void {
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
 * @param params - Parameters for clearing
 */
function clearContainers({ leftColumn, rightColumn, lineContainer, knobWrap }: ClearContainersParams): void {
  if (leftColumn) leftColumn.innerHTML = '';
  if (rightColumn) rightColumn.innerHTML = '';
  if (lineContainer) lineContainer.innerHTML = '';
  knobWrap?.querySelectorAll('.dial-label').forEach((el) => el.remove());
}

/**
 * Checks if a node is a dial-option element.
 * @param node - DOM node to check
 * @returns True if node is a dial-option element
 */
const isDialOptionElement = (node: Node): node is Element =>
  node.nodeType === Node.ELEMENT_NODE && (node as Element).tagName === 'DIAL-OPTION';

/**
 * Checks if mutations should trigger a component rebuild.
 * @param mutations - Array of mutation records
 * @returns True if rebuild is needed
 */
function shouldRebuildFromMutations(mutations: MutationRecord[]): boolean {
  return mutations.some((mutation) => {
    if (mutation.type === 'childList') {
      const hasAddedOption = [...mutation.addedNodes].some(isDialOptionElement);
      const hasRemovedOption = [...mutation.removedNodes].some(isDialOptionElement);
      if (hasAddedOption || hasRemovedOption) return true;
    }
    return mutation.type === 'attributes' && (mutation.target as Element).tagName === 'DIAL-OPTION';
  });
}

/**
 * Finds an option index by value.
 * @param options - Options array
 * @param value - Value to find
 * @returns Index of option, or -1 if not found
 */
function findOptionIndexByValue(options: DialOption[], value: string): number {
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
