// Note: Styles are now included in the shadow DOM, so external CSS injection is not needed

import {
  ATTRIBUTES,
  FULL_CIRCLE_DEGREES,
  DEFAULT_OPTIONS,
  ARCS,
  KNOB,
  LABEL,
  LINE,
  INDICATOR,
  HIT_AREA,
  OPACITY,
  ANIMATION,
} from './constants.js';

import { getStyles, getTemplate } from './styles.js';
import { roundToThousandths, degreesToRadians, generateArcAngles } from './helpers/math.js';
import { calculateShortestRotation } from './helpers/geometry.js';
import { parseOneSidedValue } from './helpers/config.js';

/**
 * A custom web component that renders a dial selector interface with labels,
 * lines, and an interactive knob. Supports responsive sizing, custom styling,
 * and various configuration options via HTML attributes.
 */
class DialSelector extends HTMLElement {
  constructor() {
    super();
    // Create shadow DOM in constructor
    this.attachShadow({ mode: 'open' });
    this.currentIndex = 0;
    this.previousIndex = -1;
    this.currentAngle = 0;
    this.isInitialized = false;
    this.labels = [];
    this.lines = [];
    this.hitAreas = [];
    this.spokeAngles = [];
    this.rightCount = 0;
    this.leftCount = 0;
    this.resizeObserver = null;
    this.childObserver = null;
    this.OPTIONS = []; // Array of { value: string, label: string }
    this._childOptions = null; // Cache for child options read before shadow DOM
    // Dynamic dimensions (read from CSS computed styles)
    this.knobWrapSize = KNOB.WRAP_SIZE;
    this.knobCenter = KNOB.WRAP_SIZE / 2;
    this.labelColumnHeight = LABEL.COLUMN_HEIGHT;
    this.labelVerticalOffsetScale = LABEL.VERTICAL_OFFSET_SCALE;
    this.horizontalLineLength = LINE.HORIZONTAL_LENGTH;
    this.maxSpokeLength = LINE.MAX_SPOKE_LENGTH;
    this.hitAreaStrokeWidth = HIT_AREA.STROKE_WIDTH;
    this.horizontalLineEndOffset = LINE.HORIZONTAL_END_OFFSET;
    this.indicatorWidth = INDICATOR.WIDTH;
  }

  static observedAttributes = ATTRIBUTES;

  initializeOptions() {
    // Always read the live light-DOM children
    const childOptions = Array.from(this.querySelectorAll('dial-option'));

    if (childOptions.length > 0) {
      this.OPTIONS = childOptions.map((option, index) => {
        const labelText = (option.textContent || '').trim();
        const value = option.getAttribute('value') || labelText || String(index);
        const label = labelText || value;
        const htmlContent = option.innerHTML.trim() || null;
        const lineLengthAttr = option.getAttribute('line-length');
        const lineLength = lineLengthAttr !== null ? parseFloat(lineLengthAttr) : null;
        return { value, label, htmlContent, lineLength };
      });
    } else {
      // Fallback to defaults if no <dial-option> children
      this.OPTIONS = DEFAULT_OPTIONS.map((opt) => ({
        value: opt,
        label: opt,
        htmlContent: null,
        lineLength: null,
      }));
    }
  }

  initializeAttributes() {
    this.updateSelectionDelay();
    this.updateDimensions();
  }

  setupGeometry() {
    // buildDOM is now called in connectedCallback if needed
    this.calculateAngles();
    this.updateDimensions();
    this.createLabelsAndLines();
  }

  finalizeInitialization() {
    setTimeout(() => {
      this.updateLines();
      this.updateSelector();
      // Re-enable transitions after initial setup
      this.classList.remove('no-transitions');
    }, ANIMATION.INITIALIZATION_DELAY);
  }

  connectedCallback() {
    // Avoid re-running init if the element is moved in the DOM
    if (this._hasConnected) return;
    this._hasConnected = true;

    // Build DOM if shadow root is empty (no content yet)
    if (!this.shadowRoot || this.shadowRoot.innerHTML === '') {
      this.buildDOM();
    }

    // Do everything that depends on children in the *next task*,
    // so the parser has had time to create <dial-option> children.
    const init = () => {
      this.initializeOptions(); // <-- now sees real <dial-option> children
      this.initializeAttributes();
      this.setupGeometry();
      this.setupResizeObserver();
      this.setupChildObserver();

      // Disable transitions during initial setup
      this.classList.add('no-transitions');

      // One-time window resize handler
      if (!this._resizeHandler) {
        this._resizeHandler = () => {
          this.withoutTransitions(() => {
            this.updateDimensions();
            this.updateLines();
          });
        };
        window.addEventListener('resize', this._resizeHandler);
      }

      this.setInitialSelection();
      this.finalizeInitialization();
    };

    // If the document is still loading, wait until after parsing + one tick.
    if (document.readyState === 'loading') {
      window.addEventListener('DOMContentLoaded', () => setTimeout(init, 0), { once: true });
    } else {
      // For dynamically-created elements, children already exist by now
      setTimeout(init, 0);
    }
  }

  disconnectedCallback() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    if (this.childObserver) {
      this.childObserver.disconnect();
      this.childObserver = null;
    }
    if (this._resizeHandler) {
      window.removeEventListener('resize', this._resizeHandler);
      this._resizeHandler = null;
    }
  }

  attributeChangedCallback(name, oldValue, newValue) {
    this.handleAttributeChange({ name, oldValue, newValue });
  }

  /**
   * Executes a callback with transitions temporarily disabled.
   * @param {Function} callback - The function to execute without transitions
   */
  withoutTransitions(callback) {
    this.classList.add('no-transitions');
    callback();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.classList.remove('no-transitions');
      });
    });
  }

  /**
   * Calculates the vertical position of a label based on its angle.
   * @param {number} angleRad - Angle in radians
   * @returns {number} Top position in pixels
   */
  calculateLabelTopPosition(angleRad) {
    const columnCenter = this.labelColumnHeight / 2;
    const verticalOffset = Math.sin(angleRad) * this.labelVerticalOffsetScale;
    return roundToThousandths(columnCenter + verticalOffset);
  }

  /**
   * Selects an option by index and updates the selector.
   * @param {number} index - The index of the option to select
   */
  selectIndex(index) {
    if (index >= 0 && index < this.OPTIONS.length) {
      this.currentIndex = index;
      this.updateSelector();
      // Update value attribute (only if it's different to avoid triggering change handler)
      const currentOption = this.OPTIONS[this.currentIndex];
      if (currentOption) {
        const currentValue = this.getAttribute('value');
        if (currentValue !== currentOption.value) {
          this.setAttribute('value', currentOption.value);
        }
      }
    }
  }

  handleAttributeChange({ name, oldValue, newValue }) {
    const ATTRIBUTE_HANDLERS = {
      mode: () => this.handleModeChange(),
      'time-selection-delay': () => this.updateSelectionDelay(),
      'one-sided': () => this.handleOneSidedChange(),
      value: () => this.handleValueChange(newValue),
      onchange: () => {
        // onchange attribute changes are handled automatically
        // No action needed here
      },
    };

    const handler = ATTRIBUTE_HANDLERS[name];
    if (handler) {
      handler();
    }
    // Unknown attributes are ignored
  }

  handleOneSidedChange() {
    if (this.isInitialized) {
      // Rebuild component when one-sided mode changes
      this.rebuildComponent();
    }
  }

  handleModeChange() {
    if (this.isInitialized) {
      // Rebuild component when mode changes
      this.rebuildComponent();
    }
  }

  handleValueChange(newValue) {
    if (newValue && this.isInitialized) {
      const index = this.OPTIONS.findIndex((opt) => opt.value === newValue);
      if (index !== -1 && index !== this.currentIndex) {
        // Directly set currentIndex and update selector without triggering attribute change
        this.currentIndex = index;
        this.updateSelector();
      }
    }
  }

  setInitialSelection() {
    const valueAttr = this.getAttribute('value');
    if (valueAttr) {
      const index = this.OPTIONS.findIndex((opt) => opt.value === valueAttr);
      if (index !== -1) {
        this.currentIndex = index;
        this.previousIndex = index;
      }
    }
    // Always set the value attribute to keep it in sync, even if not initially provided
    if (this.OPTIONS.length > 0 && this.currentIndex >= 0) {
      const currentOption = this.OPTIONS[this.currentIndex];
      if (currentOption) {
        this.setAttribute('value', currentOption.value);
      }
    }
  }

  rebuildComponent() {
    this.labels = [];
    this.lines = [];
    this.spokeAngles = [];
    this.currentIndex = 0;
    this.previousIndex = -1;
    this.isInitialized = false;
    this.updateDimensions();
    this.calculateAngles();
    this.createLabelsAndLines();
    this.setInitialSelection();
    setTimeout(() => {
      this.updateLines();
      this.updateSelector();
      // Re-enable transitions after rebuild
      this.classList.remove('no-transitions');
    }, ANIMATION.INITIALIZATION_DELAY);
  }

  setupChildObserver() {
    this.childObserver = new MutationObserver((mutations) => {
      let shouldRebuild = false;

      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'DIAL-OPTION') {
              shouldRebuild = true;
            }
          });
          mutation.removedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'DIAL-OPTION') {
              shouldRebuild = true;
            }
          });
        }
        if (mutation.type === 'attributes' && mutation.target.tagName === 'DIAL-OPTION') {
          shouldRebuild = true;
        }
      });

      if (shouldRebuild && this.isInitialized) {
        this.initializeOptions(); // <-- re-read <dial-option> children
        this.rebuildComponent();
      }
    });

    this.childObserver.observe(this, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['value', 'line-length'],
      characterData: true,
    });
  }

  updateSelectionDelay() {
    const timeSelectionDelay = this.getAttribute('time-selection-delay');
    if (timeSelectionDelay) {
      // Convert milliseconds to seconds, clamp to minimum of 0
      const delayMs = parseFloat(timeSelectionDelay);
      const delaySeconds = roundToThousandths(Math.max(0, delayMs) / 1000);
      this.style.setProperty('--time-selection-delay', `${delaySeconds}s`);

      // When delay is 0, disable all animations by setting transitions to none
      if (delayMs === 0) {
        this.style.setProperty('--indicator-transition', 'none');
        this.style.setProperty('--line-transition', 'none');
      } else {
        // Restore default transitions when delay is non-zero
        this.style.removeProperty('--indicator-transition');
        this.style.removeProperty('--line-transition');
      }
    } else {
      // Reset to default if attribute is removed
      this.style.removeProperty('--time-selection-delay');
      this.style.removeProperty('--indicator-transition');
      this.style.removeProperty('--line-transition');
    }
  }

  setupResizeObserver() {
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        this.withoutTransitions(() => {
          this.updateDimensions();
          this.updateLines();
        });
      });
      this.resizeObserver.observe(this);
    }
  }

  validateContainer() {
    const containerWidth = this.getBoundingClientRect().width;
    if (containerWidth === 0) {
      return false;
    }
    const knobWrap = this.shadowRoot.querySelector('.knob-wrap');
    const selector = this.shadowRoot.querySelector('.selector');
    return !!(knobWrap && selector);
  }

  calculateScale() {
    const knobWrap = this.shadowRoot.querySelector('.knob-wrap');

    // Measure the actual rendered size from CSS
    const actualSize = knobWrap.getBoundingClientRect().width;

    this.knobWrapSize = roundToThousandths(actualSize);
    this.knobCenter = roundToThousandths(this.knobWrapSize / 2);

    // Calculate scale factor relative to base size
    return roundToThousandths(this.knobWrapSize / KNOB.WRAP_SIZE);
  }

  updateKnobRadii() {
    // Read the actual radius values from CSS computed styles
    const computedStyle = getComputedStyle(this);
    const radiusOuterCSS = computedStyle.getPropertyValue('--radius-outer').trim();
    const radiusInnerCSS = computedStyle.getPropertyValue('--radius-inner').trim();

    // Parse the CSS values (expecting px values)
    const scaledRadiusOuter = roundToThousandths(parseFloat(radiusOuterCSS) || KNOB.RADIUS_OUTER);
    const scaledRadiusInner = roundToThousandths(parseFloat(radiusInnerCSS) || KNOB.RADIUS_INNER);

    return { scaledRadiusOuter, scaledRadiusInner };
  }

  updateScaledDimensions() {
    // Read dimension values from CSS computed styles
    const computedStyle = getComputedStyle(this);

    // Parse CSS values with fallbacks to defaults
    this.labelColumnHeight = roundToThousandths(
      parseFloat(computedStyle.getPropertyValue('--label-column-height').trim()) || LABEL.COLUMN_HEIGHT
    );
    this.labelVerticalOffsetScale = roundToThousandths(
      parseFloat(computedStyle.getPropertyValue('--label-vertical-offset-scale').trim()) || LABEL.VERTICAL_OFFSET_SCALE
    );
    this.horizontalLineLength = roundToThousandths(
      parseFloat(computedStyle.getPropertyValue('--horizontal-line-length').trim()) || LINE.HORIZONTAL_LENGTH
    );
    this.maxSpokeLength = roundToThousandths(
      parseFloat(computedStyle.getPropertyValue('--max-spoke-length').trim()) || LINE.MAX_SPOKE_LENGTH
    );
    this.hitAreaStrokeWidth = roundToThousandths(
      parseFloat(computedStyle.getPropertyValue('--hit-area-stroke-width').trim()) || HIT_AREA.STROKE_WIDTH
    );
    this.horizontalLineEndOffset = roundToThousandths(
      parseFloat(computedStyle.getPropertyValue('--horizontal-line-end-offset').trim()) || LINE.HORIZONTAL_END_OFFSET
    );
    this.indicatorWidth = roundToThousandths(
      parseFloat(computedStyle.getPropertyValue('--indicator-width').trim()) || INDICATOR.WIDTH
    );
  }

  /**
   * Updates all component dimensions based on CSS values.
   * Reads CSS custom properties and updates internal dimension values for positioning.
   */
  updateDimensions() {
    if (!this.validateContainer()) {
      return;
    }

    this.calculateScale();
    this.updateKnobRadii();
    this.updateScaledDimensions();

    // Update label positions when dimensions change
    if (this.labels.length > 0) {
      this.updateLabelPositions();
    }
  }

  buildDOM() {
    // Use imported styles and template
    this.shadowRoot.innerHTML = getStyles() + getTemplate();
  }

  /**
   * Checks if spokes mode is enabled.
   * @returns {boolean} True if mode="spokes" attribute is set
   */
  isSpokesMode() {
    return this.getAttribute('mode') === 'spokes';
  }

  /**
   * Gets the one-sided configuration from the attribute.
   * @returns {'left' | 'right' | null} The side to show options on, or null for both sides
   */
  getOneSidedConfig() {
    return parseOneSidedValue(this.getAttribute('one-sided'));
  }

  calculateAngles() {
    const oneSided = this.getOneSidedConfig();

    if (oneSided === 'left') {
      // All options on the left side
      this.leftCount = this.OPTIONS.length;
      this.rightCount = 0;
      this.spokeAngles = generateArcAngles(this.leftCount, ARCS.LEFT_START, ARCS.LEFT_END);
    } else if (oneSided === 'right') {
      // All options on the right side
      this.leftCount = 0;
      this.rightCount = this.OPTIONS.length;
      this.spokeAngles = generateArcAngles(this.rightCount, ARCS.RIGHT_START, ARCS.RIGHT_END);
    } else {
      // Default: split between both sides
      this.leftCount = Math.ceil(this.OPTIONS.length / 2);
      this.rightCount = this.OPTIONS.length - this.leftCount;

      // Generate angles for right and left sides
      this.spokeAngles = [
        ...generateArcAngles(this.rightCount, ARCS.RIGHT_START, ARCS.RIGHT_END),
        ...generateArcAngles(this.leftCount, ARCS.LEFT_START, ARCS.LEFT_END),
      ];
    }
  }

  createLabelsAndLines() {
    // Ensure DOM is built
    if (!this.shadowRoot || !this.shadowRoot.querySelector('#lineContainer')) {
      this.buildDOM();
    }

    const leftColumn = this.shadowRoot.querySelector('#leftColumn');
    const rightColumn = this.shadowRoot.querySelector('#rightColumn');
    const lineContainer = this.shadowRoot.querySelector('#lineContainer');
    const knobWrap = this.shadowRoot.querySelector('.knob-wrap');
    const advanceButton = this.shadowRoot.querySelector('#advanceButton');
    const oneSided = this.getOneSidedConfig();
    const isSpokes = this.isSpokesMode();

    // Clear existing content
    if (leftColumn) leftColumn.innerHTML = '';
    if (rightColumn) rightColumn.innerHTML = '';
    if (lineContainer) lineContainer.innerHTML = '';
    // Clear spokes mode labels from knob-wrap if any
    if (knobWrap) {
      knobWrap.querySelectorAll('.dial-label').forEach((el) => el.remove());
    }
    this.hitAreas = [];

    // Update one-sided state on host element for CSS styling
    if (oneSided) {
      this.setAttribute('data-one-sided', oneSided);
    } else {
      this.removeAttribute('data-one-sided');
    }

    this.OPTIONS.forEach((option, index) => {
      let isLeft, angleIndex, container;

      if (oneSided === 'left') {
        // All options on the left side
        isLeft = true;
        container = isSpokes ? knobWrap : leftColumn;
        angleIndex = index;
      } else if (oneSided === 'right') {
        // All options on the right side
        isLeft = false;
        container = isSpokes ? knobWrap : rightColumn;
        angleIndex = index;
      } else {
        // Default: split between both sides
        isLeft = index < this.leftCount;
        container = isSpokes ? knobWrap : isLeft ? leftColumn : rightColumn;
        angleIndex = isLeft ? this.rightCount + index : index - this.leftCount;
      }

      const angle = this.spokeAngles[angleIndex];
      const angleRad = degreesToRadians(angle);

      // Create label
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

      // Position will be set later
      label.style.position = 'absolute';

      label.addEventListener('click', () => this.selectIndex(index));

      // Append to containers
      if (container) container.appendChild(label);
      this.labels.push(label);

      // Create invisible wider hit area overlay for easier clicking (Fitt's Law)
      const hitArea = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
      hitArea.setAttribute('class', 'spoke-line-hit-area');
      hitArea.setAttribute('fill', 'none');
      hitArea.setAttribute('stroke', 'transparent');
      hitArea.setAttribute('stroke-width', this.hitAreaStrokeWidth.toString());
      hitArea.setAttribute('stroke-linejoin', 'miter');
      hitArea.setAttribute('pointer-events', 'auto');
      hitArea.style.cursor = 'pointer';
      hitArea.dataset.index = index;
      hitArea.setAttribute('points', '');

      // Make hit area clickable
      hitArea.addEventListener('click', () => this.selectIndex(index));

      // Create visible line (spoke + horizontal)
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
      line.setAttribute('class', 'spoke-line');
      line.setAttribute('fill', 'none');
      line.setAttribute('stroke', 'var(--color-ink)');
      line.setAttribute('stroke-width', `var(--line-stroke-width, ${LINE.STROKE_WIDTH})`);
      line.setAttribute('opacity', `var(--line-opacity-inactive, ${OPACITY.LINE_INACTIVE})`);
      line.setAttribute('stroke-linejoin', 'miter');
      line.setAttribute('pointer-events', 'none');
      line.dataset.index = index;

      // Append hit area first (behind), then line (on top)
      lineContainer.appendChild(hitArea);
      lineContainer.appendChild(line);
      this.lines.push(line);
      this.hitAreas.push(hitArea);
    });

    if (advanceButton) {
      advanceButton.addEventListener('click', () => {
        this.selectIndex((this.currentIndex + 1) % this.OPTIONS.length);
      });
    }

    // Position spokes mode labels after they're added to DOM
    if (isSpokes) {
      this.updateSpokesLabelPositions();
    }
  }

  updateLabelPositions() {
    if (this.isSpokesMode()) {
      this.updateSpokesLabelPositions();
    } else {
      // Update label positions based on current dimensions (standard mode)
      this.labels.forEach((label) => {
        const angle = parseFloat(label.dataset.angle);
        const angleRad = degreesToRadians(angle);
        const topPosition = this.calculateLabelTopPosition(angleRad);
        label.style.top = `${roundToThousandths(topPosition)}px`;
      });
    }
  }

  updateSpokesLabelPositions() {
    // Get knob dimensions for positioning
    const computedStyle = getComputedStyle(this);
    const radiusOuter = parseFloat(computedStyle.getPropertyValue('--radius-outer').trim()) || KNOB.RADIUS_OUTER;
    const centerX = this.knobCenter;
    const centerY = this.knobCenter;

    // Spoke length for spokes mode (distance from knob edge to label anchor)
    const spokeLength = this.maxSpokeLength;

    this.labels.forEach((label) => {
      const angle = parseFloat(label.dataset.angle);
      const angleRad = degreesToRadians(angle);
      const isLeft = label.dataset.isLeft === 'true';

      // Calculate position at end of spoke (outside knob radius)
      const labelAnchorX = roundToThousandths(centerX + Math.cos(angleRad) * (radiusOuter + spokeLength));
      const labelAnchorY = roundToThousandths(centerY + Math.sin(angleRad) * (radiusOuter + spokeLength));

      // Position label - horizontal text, anchored appropriately based on side
      label.style.top = `${labelAnchorY}px`;

      if (isLeft) {
        label.style.right = 'auto';
        label.style.left = `${labelAnchorX}px`;
        label.style.transform = 'translate(-100%, -50%)';
        label.style.textAlign = 'right';
      } else {
        label.style.left = `${labelAnchorX}px`;
        label.style.right = 'auto';
        label.style.transform = 'translate(0%, -50%)';
        label.style.textAlign = 'left';
      }
    });
  }

  updateLines() {
    const knobWrap = this.shadowRoot.querySelector('.knob-wrap');
    if (!knobWrap) return;

    const isSpokes = this.isSpokesMode();
    const centerX = this.knobCenter;
    const centerY = this.knobCenter;
    // Get the actual knob radius from CSS variable, with fallback to default
    const computedStyle = getComputedStyle(this);
    const radiusOuter = computedStyle.getPropertyValue('--radius-outer').trim() || '90px';
    const knobRadius = roundToThousandths(parseFloat(radiusOuter));

    if (isSpokes) {
      this.updateSpokesLines(centerX, centerY, knobRadius);
    } else {
      this.updateStandardLines(knobWrap, centerX, centerY, knobRadius);
    }
  }

  updateStandardLines(knobWrap, centerX, centerY, knobRadius) {
    // Determine which options are "center" (no spoke) based on position
    const leftCenterIndex = this.leftCount % 2 === 1 ? Math.floor(this.leftCount / 2) : -1;
    const rightCenterIndex = this.rightCount % 2 === 1 ? Math.floor(this.rightCount / 2) : -1;

    // Pre-calculate spoke end positions for all labels
    const labelData = this.labels.map((label, index) => {
      const angle = parseFloat(label.dataset.angle);
      const angleRad = degreesToRadians(angle);
      const isLeft = label.dataset.isLeft === 'true';
      const optionIndex = parseInt(label.dataset.index, 10);
      const option = this.OPTIONS[optionIndex];
      const customLineLength = option?.lineLength;
      const useRadial = customLineLength !== null;

      const indexWithinSide = isLeft ? optionIndex : optionIndex - this.leftCount;
      const isCenterOption = isLeft ? indexWithinSide === leftCenterIndex : indexWithinSide === rightCenterIndex;

      const spokeStartX = roundToThousandths(centerX + Math.cos(angleRad) * knobRadius);
      const spokeStartY = roundToThousandths(centerY + Math.sin(angleRad) * knobRadius);

      let spokeEndX, spokeEndY, horizontalStartY;

      if (isCenterOption) {
        spokeEndX = spokeStartX;
        spokeEndY = spokeStartY;
        horizontalStartY = centerY;
      } else {
        spokeEndX = roundToThousandths(centerX + Math.cos(angleRad) * (knobRadius + this.maxSpokeLength));
        spokeEndY = roundToThousandths(centerY + Math.sin(angleRad) * (knobRadius + this.maxSpokeLength));
        horizontalStartY = spokeEndY;
      }

      return {
        label,
        index,
        angle,
        angleRad,
        isLeft,
        optionIndex,
        customLineLength,
        useRadial,
        isCenterOption,
        spokeStartX,
        spokeStartY,
        spokeEndX,
        spokeEndY,
        horizontalStartY,
      };
    });

    // Calculate column positions for column-aligned options
    let leftColumnX = Infinity;
    let rightColumnX = -Infinity;

    labelData.forEach((data) => {
      if (data.useRadial) return;

      const defaultEndX = data.isLeft
        ? data.spokeEndX - this.horizontalLineLength
        : data.spokeEndX + this.horizontalLineLength;

      if (data.isLeft) {
        leftColumnX = Math.min(leftColumnX, defaultEndX);
      } else {
        rightColumnX = Math.max(rightColumnX, defaultEndX);
      }
    });

    // Draw lines and position labels
    labelData.forEach((data) => {
      const {
        label,
        index,
        isLeft,
        customLineLength,
        useRadial,
        isCenterOption,
        spokeStartX,
        spokeStartY,
        spokeEndX,
        spokeEndY,
        horizontalStartY,
      } = data;

      let horizontalLength;
      if (useRadial) {
        horizontalLength = customLineLength;
      } else {
        horizontalLength = isLeft ? Math.abs(spokeEndX - leftColumnX) : Math.abs(rightColumnX - spokeEndX);
      }

      const horizontalEndX = isLeft
        ? roundToThousandths(spokeEndX - horizontalLength)
        : roundToThousandths(spokeEndX + horizontalLength);
      const horizontalEndY = horizontalStartY;

      // Build the line points
      let points;
      if (horizontalLength === 0 && isCenterOption) {
        points = '';
      } else if (horizontalLength === 0) {
        points = `${spokeStartX},${spokeStartY} ${spokeEndX},${spokeEndY}`;
      } else if (isCenterOption) {
        points = `${spokeStartX},${horizontalStartY} ${horizontalEndX},${horizontalEndY}`;
      } else {
        points = `${spokeStartX},${spokeStartY} ${spokeEndX},${spokeEndY} ${horizontalEndX},${horizontalEndY}`;
      }

      // Position label at the horizontal line end
      if (label.parentElement !== knobWrap) {
        knobWrap.appendChild(label);
      }

      const labelGap = this.horizontalLineEndOffset;

      label.classList.remove('below-line');
      if (isLeft) {
        label.style.left = `${horizontalEndX - labelGap}px`;
        label.style.right = 'auto';
        label.style.transform = 'translateX(-100%) translateY(-50%)';
        label.style.textAlign = 'right';
      } else {
        label.style.left = `${horizontalEndX + labelGap}px`;
        label.style.right = 'auto';
        label.style.transform = 'translateY(-50%)';
        label.style.textAlign = 'left';
      }
      label.style.top = `${horizontalEndY}px`;

      // Check for overflow and reposition if needed
      const hostRect = this.getBoundingClientRect();
      const labelRect = label.getBoundingClientRect();

      const overflowsRight = labelRect.right > hostRect.right;
      const overflowsLeft = labelRect.left < hostRect.left;
      const labelOverflows = (isLeft && overflowsLeft) || (!isLeft && overflowsRight);

      if (labelOverflows && horizontalLength > 0) {
        const isAboveCenter = horizontalEndY < centerY;

        label.classList.add('below-line');

        let breakLineY;
        let yTransform;
        if (isAboveCenter) {
          breakLineY = horizontalEndY - 4;
          yTransform = 'translateY(-100%)';
        } else {
          breakLineY = horizontalEndY + 4;
          yTransform = 'translateY(0)';
        }

        label.style.left = `${horizontalEndX}px`;
        label.style.transform = `translateX(-100%) ${yTransform}`;
        label.style.textAlign = 'right';
        label.style.top = `${breakLineY}px`;
      }

      this.lines[index].setAttribute('points', points);

      if (this.hitAreas[index]) {
        this.hitAreas[index].setAttribute('points', points);
      }
    });
  }

  updateSpokesLines(centerX, centerY, knobRadius) {
    const spokeLength = this.maxSpokeLength;
    const labelGap = this.horizontalLineEndOffset;

    this.labels.forEach((label, index) => {
      const angle = parseFloat(label.dataset.angle);
      const angleRad = degreesToRadians(angle);

      const spokeStartX = roundToThousandths(centerX + Math.cos(angleRad) * knobRadius);
      const spokeStartY = roundToThousandths(centerY + Math.sin(angleRad) * knobRadius);

      const spokeEndX = roundToThousandths(centerX + Math.cos(angleRad) * (knobRadius + spokeLength - labelGap));
      const spokeEndY = roundToThousandths(centerY + Math.sin(angleRad) * (knobRadius + spokeLength - labelGap));

      const points = `${spokeStartX},${spokeStartY} ${spokeEndX},${spokeEndY}`;
      this.lines[index].setAttribute('points', points);

      if (this.hitAreas[index]) {
        this.hitAreas[index].setAttribute('points', points);
      }
    });
  }

  /**
   * Updates the selector indicator position and active states.
   */
  updateSelector() {
    if (this.labels.length === 0) return;

    const targetAngle = parseFloat(this.labels[this.currentIndex].dataset.angle);

    if (!this.isInitialized) {
      this.currentAngle = roundToThousandths(targetAngle);
      this.isInitialized = true;
      this.previousIndex = this.currentIndex;
    } else {
      // Calculate the shortest angular path to the target
      const delta = calculateShortestRotation(this.currentAngle, targetAngle, FULL_CIRCLE_DEGREES);
      this.currentAngle = roundToThousandths(this.currentAngle + delta);
    }

    this.style.setProperty('--indicator-angle', `${roundToThousandths(this.currentAngle)}deg`);

    this.labels.forEach((label, index) => {
      const line = this.lines[index];
      if (index === this.currentIndex) {
        label.classList.add('active');
        label.setAttribute('part', 'label label-active');
        line.classList.add('active');
        line.setAttribute('opacity', `var(--line-opacity-active, ${OPACITY.LINE_ACTIVE})`);
        line.setAttribute('stroke', 'var(--color-selection)');
      } else {
        label.classList.remove('active');
        label.setAttribute('part', 'label');
        line.classList.remove('active');
        line.setAttribute('opacity', `var(--line-opacity-inactive, ${OPACITY.LINE_INACTIVE})`);
        line.setAttribute('stroke', 'var(--color-ink)');
      }
    });

    // Dispatch change event if the selection actually changed
    if (this.previousIndex !== this.currentIndex && this.isInitialized) {
      this.dispatchChangeEvent();
      this.previousIndex = this.currentIndex;
    }
  }

  dispatchChangeEvent() {
    const currentOption = this.OPTIONS[this.currentIndex];
    const previousOption = this.OPTIONS[this.previousIndex];
    const event = new CustomEvent('change', {
      bubbles: true,
      cancelable: true,
      detail: {
        value: currentOption?.value || currentOption,
        label: currentOption?.label || currentOption,
        index: this.currentIndex,
        previousValue: previousOption?.value || previousOption,
        previousLabel: previousOption?.label || previousOption,
        previousIndex: this.previousIndex,
      },
    });

    // Store original onchange to restore later
    const onchangeAttr = this.getAttribute('onchange');
    const originalOnchange = this.onchange;

    // Temporarily remove onchange to prevent browser from auto-executing it
    if (onchangeAttr) {
      this.removeAttribute('onchange');
      delete this.onchange;
    }

    // Dispatch the event
    this.dispatchEvent(event);

    // Manually execute the handler
    if (onchangeAttr) {
      try {
        const handler = new Function('event', onchangeAttr);
        handler.call(this, event);
      } catch (e) {
        console.warn('Error executing onchange handler:', e);
      }
      // Restore the attribute
      this.setAttribute('onchange', onchangeAttr);
    } else if (typeof originalOnchange === 'function') {
      originalOnchange.call(this, event);
    }
  }
}

customElements.define('dial-selector', DialSelector);
