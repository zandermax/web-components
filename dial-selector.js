// Note: Styles are now included in the shadow DOM, so external CSS injection is not needed

/**
 * All attributes that can be set on the component.
 *
 * `mode`: Sets the layout mode for the dial selector. Values:
 *         - "spokes": Positions labels radially around the dial at the ends of spoke lines,
 *           eliminating horizontal line segments and side columns for a more space-efficient layout.
 *           Labels remain horizontal for readability.
 *
 * `onchange`: JavaScript function code executed when selection changes. Example: "console.log(event.detail.value)"
 *
 * `one-sided`: Show options only on one side. Values: "left", "inline-start", "right", "inline-end"
 *
 * `time-selection-delay`: The delay before selection animation in milliseconds. Example: "250"
 *
 * `value`: The initial selected value. Must match the value attribute of a child dial-option element.
 *
 */
const ATTRIBUTES = ['mode', 'onchange', 'one-sided', 'time-selection-delay', 'value'];

const FULL_CIRCLE_DEGREES = 360;

// Configuration constants
const DEFAULT_OPTIONS = ['AUX', 'CD', 'PHONO-1', 'PHONO-2', 'STREAM', 'TAPE', 'TUNER', 'TV'];

// Arc base values - left side is primary, right side is derived
// Note: the base axis is based on polar coordinates, so 0° is directly to the right, 180° is directly to the left.
const LEFT_START_DEGREES = 135;
const ARC_SPAN = 90;
const LEFT_END_DEGREES = LEFT_START_DEGREES + ARC_SPAN;
const HALF_CIRCLE = FULL_CIRCLE_DEGREES / 2; // 180 degrees

const ARCS = {
  // Left side (base values)
  LEFT_START: LEFT_START_DEGREES,
  LEFT_END: LEFT_END_DEGREES,
  // Right side (derived from left side - 180° offset)
  RIGHT_START: LEFT_START_DEGREES - HALF_CIRCLE,
  RIGHT_END: LEFT_END_DEGREES - HALF_CIRCLE,
};

const KNOB = {
  WRAP_SIZE: 320,
  RADIUS_OUTER: 90,
  RADIUS_INNER: 72,
};

const LABEL = {
  COLUMN_HEIGHT: 320,
  VERTICAL_OFFSET_SCALE: 140,
};

const LINE = {
  HORIZONTAL_LENGTH: 100,
  MAX_SPOKE_LENGTH: 80,
  STROKE_WIDTH: 2,
  HORIZONTAL_END_OFFSET: 10,
};

const INDICATOR = {
  WIDTH: 10, // Default indicator width
};

const HIT_AREA = {
  STROKE_WIDTH: 20,
};

const OPACITY = {
  LINE_INACTIVE: 0.4,
  LINE_ACTIVE: 0.8,
};

const ANIMATION = {
  INITIALIZATION_DELAY: 100,
};

const THRESHOLDS = {
  NEARLY_HORIZONTAL: 0.0001,
};

const COLORS = {
  RAINBOW: [
    '#ff0000', // Red
    '#ff7f00', // Orange
    '#ffff00', // Yellow
    '#00ff00', // Green
    '#0000ff', // Blue
    '#4b0082', // Indigo
    '#9400d3', // Violet
  ],
};

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
      this.OPTIONS = DEFAULT_OPTIONS.map((opt) => ({ value: opt, label: opt, htmlContent: null, lineLength: null }));
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

  // Utility methods
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
   * Rounds a number to 3 decimal places (thousandths).
   * @param {number} value - The number to round
   * @returns {number} The rounded number
   */
  roundToThousandths(value) {
    return Math.round(value * 1000) / 1000;
  }

  degreesToRadians(degrees) {
    return this.roundToThousandths((degrees * Math.PI) / 180);
  }

  /**
   * Calculates the vertical position of a label based on its angle.
   * @param {number} angleRad - Angle in radians
   * @returns {number} Top position in pixels
   */
  calculateLabelTopPosition(angleRad) {
    const columnCenter = this.labelColumnHeight / 2;
    const verticalOffset = Math.sin(angleRad) * this.labelVerticalOffsetScale;
    return this.roundToThousandths(columnCenter + verticalOffset);
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
      const delaySeconds = this.roundToThousandths(Math.max(0, delayMs) / 1000);
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
          // updateLines() is called after updateDimensions(), which also calls updateLabelPositions()
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

    this.knobWrapSize = this.roundToThousandths(actualSize);
    this.knobCenter = this.roundToThousandths(this.knobWrapSize / 2);

    // Calculate scale factor relative to base size
    return this.roundToThousandths(this.knobWrapSize / KNOB.WRAP_SIZE);
  }

  updateKnobRadii() {
    // Read the actual radius values from CSS computed styles
    const computedStyle = getComputedStyle(this);
    const radiusOuterCSS = computedStyle.getPropertyValue('--radius-outer').trim();
    const radiusInnerCSS = computedStyle.getPropertyValue('--radius-inner').trim();

    // Parse the CSS values (expecting px values)
    const scaledRadiusOuter = this.roundToThousandths(parseFloat(radiusOuterCSS) || KNOB.RADIUS_OUTER);
    const scaledRadiusInner = this.roundToThousandths(parseFloat(radiusInnerCSS) || KNOB.RADIUS_INNER);

    return { scaledRadiusOuter, scaledRadiusInner };
  }

  updateScaledDimensions() {
    // Read dimension values from CSS computed styles
    const computedStyle = getComputedStyle(this);

    // Parse CSS values with fallbacks to defaults
    this.labelColumnHeight = this.roundToThousandths(
      parseFloat(computedStyle.getPropertyValue('--label-column-height').trim()) || LABEL.COLUMN_HEIGHT
    );
    this.labelVerticalOffsetScale = this.roundToThousandths(
      parseFloat(computedStyle.getPropertyValue('--label-vertical-offset-scale').trim()) || LABEL.VERTICAL_OFFSET_SCALE
    );
    this.horizontalLineLength = this.roundToThousandths(
      parseFloat(computedStyle.getPropertyValue('--horizontal-line-length').trim()) || LINE.HORIZONTAL_LENGTH
    );
    this.maxSpokeLength = this.roundToThousandths(
      parseFloat(computedStyle.getPropertyValue('--max-spoke-length').trim()) || LINE.MAX_SPOKE_LENGTH
    );
    this.hitAreaStrokeWidth = this.roundToThousandths(
      parseFloat(computedStyle.getPropertyValue('--hit-area-stroke-width').trim()) || HIT_AREA.STROKE_WIDTH
    );
    this.horizontalLineEndOffset = this.roundToThousandths(
      parseFloat(computedStyle.getPropertyValue('--horizontal-line-end-offset').trim()) || LINE.HORIZONTAL_END_OFFSET
    );
    this.indicatorWidth = this.roundToThousandths(
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
    // Convert CSS to work in shadow DOM (replace dial-selector with :host)
    const css = `
			<style>
				:host {
					--color-ink: #f4f4f4;
					--color-selection: #f13b3b;
					--color-line: #c7c2b5;
					--indicator-color: #f13b3b;
					--shadow: 0;
					--label-radius: 150px;
					--line-stroke-width: 2;
					--line-opacity-inactive: 0.4;
					--line-opacity-active: 0.8;
					--line-transition: opacity 0.3s ease, stroke 0.3s ease;
					--indicator-length: 60px;
					--center-indicator: 0px;
					--time-selection-delay: 0s;
					--radius-outer: 90px;
					--width-outer-circle: 4px;
					--color-outer-circle: var(--color-ink);
					--radius-inner: 72px;
					--width-inner-circle: 2px;
					--color-inner-circle: var(--color-ink);
					--font-size: clamp(10px, 1.5vw, 14px);
					--font-family: 'IBM Plex Mono', 'Courier New', monospace;
					--knob-wrap-size: 320px;
					--knob-center: 160px;
					--label-column-height: 320px;
					--label-vertical-offset-scale: 140px;
					--horizontal-line-length: 100px;
					--max-spoke-length: 80px;
					--horizontal-line-end-offset: 10px;
					--hit-area-stroke-width: 20px;
					--indicator-width: 10px;
					--component-width: 100%;
					--component-height: auto;
					--component-min-width: 200px;
					--component-min-height: 200px;
					--indicator-angle: 0deg;
					display: block;
					font-family: var(--font-family);
					min-width: var(--component-min-width);
					max-width: var(--component-width);
					width: var(--component-width);
					height: var(--component-height);
					overflow: visible;
					box-sizing: border-box;
					margin: 0;
					padding: 0;
				}

				:host * {
					box-sizing: border-box;
				}

				.selector {
					display: grid;
					grid-template-columns: 1fr auto 1fr;
					gap: clamp(12px, 4vw, 40px);
					align-items: center;
					justify-content: center;
					width: 100%;
					height: 100%;
					margin: 0;
					padding: 0;
					overflow: visible;
				}

				.label-column {
					position: relative;
					display: flex;
					flex-direction: column;
					justify-content: center;
					height: var(--label-column-height, 320px);
					margin: 0;
					padding: 0;
					overflow: visible;
				}

				.label-column.left {
					align-items: flex-end;
				}

				.label-column.right {
					align-items: flex-start;
				}

				.knob-wrap {
					position: relative;
					width: var(--knob-wrap-size, 320px);
					aspect-ratio: 1;
					display: grid;
					place-items: center;
					flex-shrink: 0;
					overflow: visible;
				}

				.knob {
					position: relative;
					width: calc(var(--radius-outer) * 2);
					height: calc(var(--radius-outer) * 2);
					border: var(--width-outer-circle) solid var(--color-outer-circle);
					border-radius: 50%;
					background: #11161c;
					box-shadow: var(--shadow);
					z-index: 2;
					transform: rotate(calc(90deg + var(--indicator-angle)));
					transform-origin: center center;
					transition: var(
						--indicator-transition,
						transform 0.25s ease-in var(--time-selection-delay, 0s)
					);
				}

				.indicator {
					position: absolute;
					width: var(--indicator-width, 10px);
					height: var(--indicator-length, 60px);
					background: var(--indicator-gradient, var(--indicator-color));
					border-radius: calc(var(--indicator-width, 10px) / 2);
					/* Fixed position: top center, pointing up */
					top: calc(50% - var(--indicator-length, 60px) - var(--center-indicator, 0px));
					left: calc(50% - var(--indicator-width, 10px) / 2);
					/* No transform needed - knob rotates instead */
				}

				:host(.no-transitions) .knob {
					transition: none;
				}

				.knob::before {
					content: '';
					position: absolute;
					inset: calc(var(--radius-outer) - var(--radius-inner));
					border: var(--width-inner-circle) solid var(--color-inner-circle);
					border-radius: 50%;
					opacity: 0.6;
				}

				.dial-label {
					text-decoration: none;
					color: inherit;
					font-size: var(--font-size);
					font-family: var(--font-family);
					letter-spacing: clamp(0.5px, 0.1vw, 1px);
					display: inline-flex;
					align-items: center;
					gap: 0;
					cursor: pointer;
					user-select: none;
					padding: clamp(4px, 1vw, 8px) clamp(6px, 1.5vw, 12px);
					position: absolute;
					transform: translateY(-50%) translateX(var(--line-length-offset, 0px));
					white-space: nowrap;
				}

				.dial-label.active {
					color: var(--color-selection);
				}

				.dial-label.below-line {
					white-space: nowrap;
					padding-left: 0;
					padding-right: 0;
				}

				/* Media sizing inside labels */
				.dial-label img,
				.dial-label svg {
					max-height: 1.5em;
					max-width: 3em;
					vertical-align: middle;
					object-fit: contain;
					/* Allow animation control via CSS custom properties on ::part(label) / ::part(label-active) */
					animation: var(--label-icon-animation, none);
					opacity: var(--label-icon-opacity, 1);
					transform: var(--label-icon-transform, none);
					transition: var(--label-icon-transition, opacity 0.3s, transform 0.3s);
				}

				/* Built-in keyframes for icon animations */
				@keyframes spin {
					from { transform: rotate(0deg); }
					to { transform: rotate(360deg); }
				}
				@keyframes pulse {
					0%, 100% { transform: scale(1); }
					50% { transform: scale(1.3); }
				}
				@keyframes wiggle {
					0%, 100% { transform: rotate(0deg); }
					25% { transform: rotate(-15deg); }
					75% { transform: rotate(15deg); }
				}
				@keyframes bounce {
					0%, 100% { transform: translateY(0); }
					50% { transform: translateY(-25%); }
				}
				@keyframes blink {
					0%, 100% { opacity: 1; }
					50% { opacity: 0.2; }
				}

				#lineContainer {
					position: absolute;
					inset: 0;
					pointer-events: none;
					overflow: visible;
				}

				.spoke-line {
					transition: var(--line-transition, opacity 0.3s ease, stroke 0.3s ease);
				}

				:host(.no-transitions) .spoke-line {
					transition: none;
				}

				.advance {
					position: absolute;
					inset: 0;
					cursor: pointer;
					pointer-events: auto;
					background: transparent;
				}

				/* Slotted content styles for custom knob content */
				::slotted([slot="knob-content"]) {
					position: absolute;
					inset: 0;
					display: flex;
					align-items: center;
					justify-content: center;
					pointer-events: none;
				}

				::slotted(img[slot="knob-content"]) {
					width: 100%;
					height: 100%;
					object-fit: contain;
					border-radius: 50%;
				}

				@media (max-width: 768px) {
					.selector {
						gap: clamp(8px, 2vw, 16px);
					}

					:host {
						--font-size: clamp(12px, 2vw, 16px);
					}

					.dial-label {
						padding: clamp(6px, 1.5vw, 10px) clamp(8px, 2vw, 14px);
						min-height: 44px;
						display: flex;
						align-items: center;
					}
				}

				@media (max-width: 480px) {
					.selector {
						gap: clamp(6px, 1.5vw, 12px);
					}

					:host {
						--font-size: clamp(13px, 2.5vw, 18px);
					}

					.knob-wrap {
						min-width: 200px;
					}
				}

				/* One-sided mode: left only */
				:host([data-one-sided="left"]) .selector {
					grid-template-columns: 1fr auto;
				}

				:host([data-one-sided="left"]) .label-column.right {
					display: none;
				}

				/* One-sided mode: right only */
				:host([data-one-sided="right"]) .selector {
					grid-template-columns: auto 1fr;
				}

				:host([data-one-sided="right"]) .label-column.left {
					display: none;
				}

				/* Spokes mode styles */
				:host([mode="spokes"]) .selector {
					grid-template-columns: auto;
					justify-items: center;
				}

				:host([mode="spokes"]) .label-column {
					display: none;
				}

				:host([mode="spokes"]) .knob-wrap {
					/* Ensure adequate size for radial labels */
					overflow: visible;
				}

				:host([mode="spokes"]) .dial-label.spokes {
					position: absolute;
					white-space: nowrap;
					padding: clamp(2px, 0.5vw, 4px) clamp(4px, 1vw, 8px);
				}
			</style>
			<div class="selector" part="panel">
				<div class="label-column left" id="leftColumn" part="labels label-row">
					<!-- Left labels will be generated by JavaScript -->
				</div>

				<div class="knob-wrap" part="dial">
					<svg id="lineContainer" width="100%" height="100%" style="position: absolute; overflow: visible;">
						<!-- Lines will be generated by JavaScript -->
					</svg>
					<div class="knob" part="knob">
						<slot name="knob-content">
							<!-- Default indicator when no custom content provided -->
							<div class="indicator" part="indicator"></div>
						</slot>
						<div class="advance" id="advanceButton" aria-label="Switch to next option"></div>
					</div>
				</div>

				<div class="label-column right" id="rightColumn" part="labels label-row">
					<!-- Right labels will be generated by JavaScript -->
				</div>
			</div>
		`;
    this.shadowRoot.innerHTML = css;
  }

  generateArcAngles(count, start, end) {
    if (count === 1) {
      return [this.roundToThousandths((start + end) / 2)];
    }
    return Array.from({ length: count }, (_, i) => this.roundToThousandths(start + ((end - start) * i) / (count - 1)));
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
    const value = this.getAttribute('one-sided');
    if (!value) return null;
    const normalized = value.toLowerCase().trim();
    if (normalized === 'left' || normalized === 'inline-start') {
      return 'left';
    }
    if (normalized === 'right' || normalized === 'inline-end') {
      return 'right';
    }
    return null;
  }

  calculateAngles() {
    const oneSided = this.getOneSidedConfig();

    if (oneSided === 'left') {
      // All options on the left side
      this.leftCount = this.OPTIONS.length;
      this.rightCount = 0;
      this.spokeAngles = this.generateArcAngles(this.leftCount, ARCS.LEFT_START, ARCS.LEFT_END);
    } else if (oneSided === 'right') {
      // All options on the right side
      this.leftCount = 0;
      this.rightCount = this.OPTIONS.length;
      this.spokeAngles = this.generateArcAngles(this.rightCount, ARCS.RIGHT_START, ARCS.RIGHT_END);
    } else {
      // Default: split between both sides
      this.leftCount = Math.ceil(this.OPTIONS.length / 2);
      this.rightCount = this.OPTIONS.length - this.leftCount;

      // Generate angles for right and left sides
      this.spokeAngles = [
        ...this.generateArcAngles(this.rightCount, ARCS.RIGHT_START, ARCS.RIGHT_END),
        ...this.generateArcAngles(this.leftCount, ARCS.LEFT_START, ARCS.LEFT_END),
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
        // Left side gets first half (indices 0 to leftCount-1), right side gets second half (indices leftCount to length-1)
        isLeft = index < this.leftCount;
        container = isSpokes ? knobWrap : isLeft ? leftColumn : rightColumn;
        // Map option index to angle index:
        // - Left side: options 0..leftCount-1 map to angles rightCount..rightCount+leftCount-1 (left angles in spokeAngles array)
        // - Right side: options leftCount..length-1 map to angles 0..rightCount-1 (right angles in spokeAngles array)
        angleIndex = isLeft ? this.rightCount + index : index - this.leftCount;
      }

      const angle = this.spokeAngles[angleIndex];
      const angleRad = this.degreesToRadians(angle);

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

      if (isSpokes) {
        // Spokes mode: position will be set in updateSpokesLabelPositions()
        label.style.position = 'absolute';
      } else {
        // Standard mode: position will be set in updateStandardLines()
        // Initial position - will be overridden
        label.style.position = 'absolute';
      }

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
      // Initialize with empty points - will be set in updateLines()
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
      line.setAttribute('pointer-events', 'none'); // Let clicks pass through to hit area
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
        const angleRad = this.degreesToRadians(angle);
        const topPosition = this.calculateLabelTopPosition(angleRad);
        label.style.top = `${this.roundToThousandths(topPosition)}px`;
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
      const angleRad = this.degreesToRadians(angle);
      const isLeft = label.dataset.isLeft === 'true';

      // Calculate position at end of spoke (outside knob radius)
      const labelAnchorX = this.roundToThousandths(centerX + Math.cos(angleRad) * (radiusOuter + spokeLength));
      const labelAnchorY = this.roundToThousandths(centerY + Math.sin(angleRad) * (radiusOuter + spokeLength));

      // Position label - horizontal text, anchored appropriately based on side
      label.style.top = `${labelAnchorY}px`;

      if (isLeft) {
        // Left side: text aligns right, position to the left of anchor point
        label.style.right = 'auto';
        label.style.left = `${labelAnchorX}px`;
        label.style.transform = 'translate(-100%, -50%)';
        label.style.textAlign = 'right';
      } else {
        // Right side: text aligns left, position to the right of anchor point
        label.style.left = `${labelAnchorX}px`;
        label.style.right = 'auto';
        label.style.transform = 'translate(0%, -50%)';
        label.style.textAlign = 'left';
      }
    });
  }

  calculateSpokeIntersection(angleRad, spokeStartX, spokeStartY, labelY, isLeft) {
    // Calculate where the spoke (extending from knob edge at angle) meets the horizontal line
    // The spoke extends from spokeStart outward at the given angle
    // We need to find where it intersects with the horizontal line at labelY
    // But limit the spoke length so horizontal spokes don't extend too far
    const maxSpokeLength = this.maxSpokeLength;

    let intersectX, intersectY;

    if (Math.abs(Math.sin(angleRad)) < THRESHOLDS.NEARLY_HORIZONTAL) {
      // Nearly horizontal spoke - limit the extension
      const maxExtension = isLeft ? -maxSpokeLength : maxSpokeLength;
      intersectX = this.roundToThousandths(spokeStartX + maxExtension);
      intersectY = this.roundToThousandths(labelY);
    } else {
      // Parametric form: x = spokeStartX + t*cos(angle), y = spokeStartY + t*sin(angle)
      // We want y = labelY, so: t = (labelY - spokeStartY) / sin(angle)
      const t = (labelY - spokeStartY) / Math.sin(angleRad);

      // Limit the spoke length if it would extend too far
      const spokeLength = Math.abs(t);
      if (spokeLength > maxSpokeLength) {
        // Cap the spoke at max length
        const limitedT = t > 0 ? maxSpokeLength : -maxSpokeLength;
        intersectX = this.roundToThousandths(spokeStartX + limitedT * Math.cos(angleRad));
        // Keep intersection on the horizontal line at labelY
        intersectY = this.roundToThousandths(labelY);
      } else {
        intersectX = this.roundToThousandths(spokeStartX + t * Math.cos(angleRad));
        intersectY = this.roundToThousandths(labelY);
      }
    }

    return { intersectX, intersectY };
  }

  calculateHorizontalLineEnd(labelX, intersectX, isLeft, customLineLength = null) {
    const horizontalLength = customLineLength !== null ? customLineLength : this.horizontalLineLength;
    // Horizontal line should extend from label to intersection
    // But we want it to stop a bit before the intersection for visual clarity
    const horizontalEndX = isLeft
      ? Math.min(intersectX - this.horizontalLineEndOffset, labelX + horizontalLength)
      : Math.max(intersectX + this.horizontalLineEndOffset, labelX - horizontalLength);
    return this.roundToThousandths(horizontalEndX);
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
    const knobRadius = this.roundToThousandths(parseFloat(radiusOuter));

    if (isSpokes) {
      this.updateSpokesLines(centerX, centerY, knobRadius);
    } else {
      this.updateStandardLines(knobWrap, centerX, centerY, knobRadius);
    }
  }

  updateStandardLines(knobWrap, centerX, centerY, knobRadius) {
    // Line geometry:
    // 1. Spoke line: radiates from knob edge outward at the option's angle (except for center option if odd count)
    // 2. Horizontal line: extends from spoke end (or knob edge if no spoke), left for left options, right for right options
    // 3. Label: positioned at horizontal line end

    // Determine which options are "center" (no spoke) based on position
    // If a side has an odd number of options, the middle one is the center option
    const leftCenterIndex = this.leftCount % 2 === 1 ? Math.floor(this.leftCount / 2) : -1;
    const rightCenterIndex = this.rightCount % 2 === 1 ? Math.floor(this.rightCount / 2) : -1;

    // Pre-calculate spoke end positions for all labels
    const labelData = this.labels.map((label, index) => {
      const angle = parseFloat(label.dataset.angle);
      const angleRad = this.degreesToRadians(angle);
      const isLeft = label.dataset.isLeft === 'true';
      const optionIndex = parseInt(label.dataset.index, 10);
      const option = this.OPTIONS[optionIndex];
      const customLineLength = option?.lineLength;
      // Options with line-length attribute use radial alignment, others use column alignment
      const useRadial = customLineLength !== null;

      // Determine if this is the center option for its side (no spoke)
      const indexWithinSide = isLeft ? optionIndex : optionIndex - this.leftCount;
      const isCenterOption = isLeft ? indexWithinSide === leftCenterIndex : indexWithinSide === rightCenterIndex;

      // Spoke starts at knob edge
      const spokeStartX = this.roundToThousandths(centerX + Math.cos(angleRad) * knobRadius);
      const spokeStartY = this.roundToThousandths(centerY + Math.sin(angleRad) * knobRadius);

      let spokeEndX, spokeEndY, horizontalStartY;

      if (isCenterOption) {
        spokeEndX = spokeStartX;
        spokeEndY = spokeStartY;
        horizontalStartY = centerY;
      } else {
        spokeEndX = this.roundToThousandths(centerX + Math.cos(angleRad) * (knobRadius + this.maxSpokeLength));
        spokeEndY = this.roundToThousandths(centerY + Math.sin(angleRad) * (knobRadius + this.maxSpokeLength));
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

    // Calculate column positions for options using column alignment (those without line-length)
    let leftColumnX = Infinity;
    let rightColumnX = -Infinity;

    // First pass: find the furthest horizontal end positions using default line length
    // Only consider options that don't have custom line-length (column-aligned options)
    labelData.forEach((data) => {
      if (data.useRadial) return; // Skip radially-aligned options

      const defaultEndX = data.isLeft
        ? data.spokeEndX - this.horizontalLineLength
        : data.spokeEndX + this.horizontalLineLength;

      if (data.isLeft) {
        leftColumnX = Math.min(leftColumnX, defaultEndX);
      } else {
        rightColumnX = Math.max(rightColumnX, defaultEndX);
      }
    });

    // Second pass: draw lines and position labels
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

      // Determine horizontal line length
      let horizontalLength;
      if (useRadial) {
        // Use custom line length for radially-aligned options
        horizontalLength = customLineLength;
      } else {
        // Calculate length needed to reach column position for column-aligned options
        horizontalLength = isLeft ? Math.abs(spokeEndX - leftColumnX) : Math.abs(rightColumnX - spokeEndX);
      }

      // Calculate horizontal end position
      const horizontalEndX = isLeft
        ? this.roundToThousandths(spokeEndX - horizontalLength)
        : this.roundToThousandths(spokeEndX + horizontalLength);
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

      // First, position label normally (inline with the line)
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
      // Use the host element bounds (the dial-selector itself) for overflow detection
      const hostRect = this.getBoundingClientRect();
      const labelRect = label.getBoundingClientRect();

      // Only consider it overflow if the label actually extends beyond the host bounds
      const overflowsRight = labelRect.right > hostRect.right;
      const overflowsLeft = labelRect.left < hostRect.left;
      const labelOverflows = (isLeft && overflowsLeft) || (!isLeft && overflowsRight);

      if (labelOverflows && horizontalLength > 0) {
        // Move label above or below the line based on position
        // Options in upper half show label above, lower half show below
        const isAboveCenter = horizontalEndY < centerY;

        label.classList.add('below-line');

        let breakLineY;
        let yTransform;
        if (isAboveCenter) {
          // Position above the line
          breakLineY = horizontalEndY - 4;
          yTransform = 'translateY(-100%)';
        } else {
          // Position below the line
          breakLineY = horizontalEndY + 4;
          yTransform = 'translateY(0)';
        }

        // Align END of text (right edge) with the outer END of the horizontal line
        // Text extends outward (away from the knob) from the line's outer edge
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
    // In spokes mode, draw straight 2-point spokes from knob edge to near the label
    const spokeLength = this.maxSpokeLength;
    const labelGap = this.horizontalLineEndOffset; // Small gap between spoke end and label

    this.labels.forEach((label, index) => {
      const angle = parseFloat(label.dataset.angle);
      const angleRad = this.degreesToRadians(angle);

      // Spoke start point at knob edge
      const spokeStartX = this.roundToThousandths(centerX + Math.cos(angleRad) * knobRadius);
      const spokeStartY = this.roundToThousandths(centerY + Math.sin(angleRad) * knobRadius);

      // Spoke end point (near label, with small gap)
      const spokeEndX = this.roundToThousandths(centerX + Math.cos(angleRad) * (knobRadius + spokeLength - labelGap));
      const spokeEndY = this.roundToThousandths(centerY + Math.sin(angleRad) * (knobRadius + spokeLength - labelGap));

      // Create 2-point line: spoke start -> spoke end
      const points = `${spokeStartX},${spokeStartY} ${spokeEndX},${spokeEndY}`;
      this.lines[index].setAttribute('points', points);

      // Update hit area with same points
      if (this.hitAreas[index]) {
        this.hitAreas[index].setAttribute('points', points);
      }
    });
  }

  /**
   * Updates the selector indicator position and active states.
   * Calculates shortest angular path and updates visual state.
   */
  updateSelector() {
    if (this.labels.length === 0) return;

    const targetAngle = parseFloat(this.labels[this.currentIndex].dataset.angle);

    if (!this.isInitialized) {
      this.currentAngle = this.roundToThousandths(targetAngle);
      this.isInitialized = true;
      this.previousIndex = this.currentIndex;
    } else {
      // Calculate the shortest angular path to the target
      let normalizedCurrent = ((this.currentAngle % FULL_CIRCLE_DEGREES) + FULL_CIRCLE_DEGREES) % FULL_CIRCLE_DEGREES;
      let normalizedTarget = ((targetAngle % FULL_CIRCLE_DEGREES) + FULL_CIRCLE_DEGREES) % FULL_CIRCLE_DEGREES;

      let forwardDist = normalizedTarget - normalizedCurrent;
      if (forwardDist < 0) forwardDist += FULL_CIRCLE_DEGREES;

      let backwardDist = normalizedCurrent - normalizedTarget;
      if (backwardDist < 0) backwardDist += FULL_CIRCLE_DEGREES;

      if (backwardDist < forwardDist) {
        this.currentAngle = this.roundToThousandths(this.currentAngle - backwardDist);
      } else {
        this.currentAngle = this.roundToThousandths(this.currentAngle + forwardDist);
      }
    }

    this.style.setProperty('--indicator-angle', `${this.roundToThousandths(this.currentAngle)}deg`);

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

    // Dispatch the event (browser won't auto-execute onchange since we removed it)
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
