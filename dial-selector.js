// Note: Styles are now included in the shadow DOM, so external CSS injection is not needed

/**
 * All attributes that can be set on the component.
 *
 * `center-indicator`: The center indicator offset as a percentage. Example: "50" or "50%"
 *
 * `length-indicator`: The length of the indicator as a percentage of radius-outer. Example: "100" or "100%"
 *
 * `onchange`: JavaScript function code executed when selection changes. Example: "console.log(event.detail.value)"
 *
 * `options`: Comma-separated list of option labels. Example: "Option1, Option2, Option3"
 *
 * `time-selection-delay`: The delay before selection animation in milliseconds. Example: "250"
 *
 */
const ATTRIBUTES = ['center-indicator', 'length-indicator', 'onchange', 'options', 'time-selection-delay'];

const FULL_CIRCLE_DEGREES = 360;

// Configuration constants
const DEFAULT_OPTIONS = ['PHONO-2', 'PHONO-1', 'TUNER', 'AUX', 'CD', 'TAPE', 'STREAM', 'TV'];

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
  // Note: width and length are the bounding box of the indicator, not the actual length of the indicator.
  WIDTH: 10,
  LENGTH: 60, // Indicator length at default knob size
  CENTER: 15, // Center indicator offset (100% = 15px, default is 0 = 0%)
};

const CIRCLE = {
  WIDTH_OUTER: 4,
  WIDTH_INNER: 2,
};

const HIT_AREA = {
  STROKE_WIDTH: 20,
};

const CONSTRAINTS = {
  MIN_KNOB_WRAP_SIZE: 200,
  MAX_KNOB_WRAP_SIZE: 600,
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
    // Create shadow DOM
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
    // Dynamic dimensions (calculated based on container size)
    this.knobWrapSize = KNOB.WRAP_SIZE;
    this.knobCenter = KNOB.WRAP_SIZE / 2;
    this.labelColumnHeight = LABEL.COLUMN_HEIGHT;
    this.labelVerticalOffsetScale = LABEL.VERTICAL_OFFSET_SCALE;
    this.horizontalLineLength = LINE.HORIZONTAL_LENGTH;
    this.maxSpokeLength = LINE.MAX_SPOKE_LENGTH;
    this.hitAreaStrokeWidth = HIT_AREA.STROKE_WIDTH;
    this.horizontalLineEndOffset = LINE.HORIZONTAL_END_OFFSET;
    this.indicatorWidth = INDICATOR.WIDTH;
    // Percentage values for attributes (default to 100% = default size)
    this.percentages = {
      indicatorLength: 100, // Default to 100% (full length)
      centerIndicator: 0, // Default is 0 (no offset)
      radiusOuter: 100,
      radiusInner: 100,
      widthOuterCircle: 100,
      widthInnerCircle: 100,
      lineThickness: 100,
    };
    // Cache for original CSS values (read once before setting inline styles)
    this.cssValuesCache = null;
  }

  static observedAttributes = ATTRIBUTES;

  initializeOptions() {
    const optionsAttr = this.getAttribute('options');
    this.OPTIONS = optionsAttr ? optionsAttr.split(',').map((opt) => opt.trim()) : DEFAULT_OPTIONS;
  }

  initializeAttributes() {
    // Cache original CSS values before setting any inline styles
    if (this.cssValuesCache === null) {
      this.cssValuesCache = {};
      const computedStyle = getComputedStyle(this);
      const propertiesToCache = [
        '--radius-outer',
        '--radius-inner',
        '--width-outer-circle',
        '--width-inner-circle',
        '--line-stroke-width',
        '--component-height',
        '--component-width',
        '--indicator-color',
        '--color-selection',
        '--color-inner-circle',
        '--color-outer-circle',
        '--font-size',
        '--font-family',
      ];
      propertiesToCache.forEach((prop) => {
        const value = computedStyle.getPropertyValue(prop).trim();
        this.cssValuesCache[prop] = value || null;
      });
    }
    this.updateIndicatorLength();
    this.updateCenterIndicator();
    this.updateSelectionDelay();
    this.updateLineThickness();
    this.updateDimensions();
  }

  setupGeometry() {
    this.buildDOM();
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
    this.initializeOptions();
    this.initializeAttributes();
    this.setupGeometry();
    this.setupResizeObserver();

    // Disable transitions during initial setup
    this.classList.add('no-transitions');

    // Set up window resize handler
    window.addEventListener('resize', () => {
      this.withoutTransitions(() => {
        this.updateDimensions();
        // updateLines() is called after updateDimensions(), which also calls updateLabelPositions()
        this.updateLines();
      });
    });

    this.finalizeInitialization();
  }

  disconnectedCallback() {
    // Clean up ResizeObserver when component is removed
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
  }

  attributeChangedCallback(name, oldValue, newValue) {
    this.handleAttributeChange({ name, oldValue, newValue });
  }

  // Utility methods
  /**
   * Parses a percentage value from an attribute.
   * @param {string} attrName - The attribute name to read
   * @param {number} defaultValue - Default value if attribute is missing or invalid
   * @returns {number} The parsed percentage value
   */
  parsePercentage(attrName, defaultValue = 100) {
    const value = this.getAttribute(attrName);
    if (!value) return defaultValue;
    const percentage = parseFloat(value.replace('%', ''));
    return !isNaN(percentage) && percentage >= 0 ? percentage : defaultValue;
  }

  /**
   * Reads a CSS custom property and parses it as a percentage.
   * @param {string} cssVarName - The CSS custom property name (e.g., '--radius-outer')
   * @param {number} defaultValue - Default value if property is missing or invalid
   * @returns {number} The parsed percentage value
   */
  parsePercentageFromCSS(cssVarName, defaultValue = 100) {
    const computedStyle = getComputedStyle(this);
    const value = computedStyle.getPropertyValue(cssVarName).trim();
    if (!value) return defaultValue;
    // Remove 'px' or '%' and parse
    const numericValue = parseFloat(value.replace(/[px%]/g, ''));
    return !isNaN(numericValue) && numericValue >= 0 ? numericValue : defaultValue;
  }

  /**
   * Reads a CSS custom property value as a string from the cached original stylesheet values.
   * @param {string} cssVarName - The CSS custom property name
   * @param {string} defaultValue - Default value if property is missing
   * @returns {string} The CSS property value
   */
  getCSSProperty(cssVarName, defaultValue = '') {
    // Return cached value if available
    if (this.cssValuesCache && cssVarName in this.cssValuesCache) {
      return this.cssValuesCache[cssVarName] || defaultValue;
    }
    // Fallback to reading from computed style (for properties not in cache)
    const computedStyle = getComputedStyle(this);
    const value = computedStyle.getPropertyValue(cssVarName).trim();
    return value || defaultValue;
  }

  /**
   * Updates a CSS custom property from an attribute value.
   * @param {string} attrName - The attribute name to read
   * @param {string} cssVarName - The CSS custom property name (e.g., '--indicator-color')
   * @param {Function|null} transform - Optional transform function to apply to the value
   */
  updateCSSProperty(attrName, cssVarName, transform = null) {
    const value = this.getAttribute(attrName);
    if (value) {
      const finalValue = transform ? transform(value) : value;
      this.style.setProperty(cssVarName, finalValue);
    } else {
      this.style.removeProperty(cssVarName);
    }
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

  degreesToRadians(degrees) {
    return (degrees * Math.PI) / 180;
  }

  /**
   * Calculates the vertical position of a label based on its angle.
   * @param {number} angleRad - Angle in radians
   * @returns {number} Top position in pixels
   */
  calculateLabelTopPosition(angleRad) {
    const columnCenter = this.labelColumnHeight / 2;
    const verticalOffset = Math.sin(angleRad) * this.labelVerticalOffsetScale;
    return columnCenter + verticalOffset;
  }

  /**
   * Selects an option by index and updates the selector.
   * @param {number} index - The index of the option to select
   */
  selectIndex(index) {
    this.currentIndex = index;
    this.updateSelector();
  }

  handleAttributeChange({ name, oldValue, newValue }) {
    const ATTRIBUTE_HANDLERS = {
      'length-indicator': () => this.updateIndicatorLength(),
      'center-indicator': () => this.updateCenterIndicator(),
      'time-selection-delay': () => this.updateSelectionDelay(),
      options: () => this.handleOptionsChange(newValue),
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

  handleOptionsChange(newValue) {
    if (this.isInitialized) {
      // Disable transitions during rebuild
      this.classList.add('no-transitions');
      // Rebuild if options change
      this.OPTIONS = newValue.split(',').map((opt) => opt.trim());
      this.labels = [];
      this.lines = [];
      this.spokeAngles = [];
      this.currentIndex = 0;
      this.previousIndex = -1;
      this.isInitialized = false;
      this.updateDimensions();
      this.calculateAngles();
      this.createLabelsAndLines();
      setTimeout(() => {
        this.updateLines();
        this.updateSelector();
        // Re-enable transitions after rebuild
        this.classList.remove('no-transitions');
      }, ANIMATION.INITIALIZATION_DELAY);
    }
  }

  updateLineThickness() {
    // Read line thickness from CSS custom property --line-stroke-width
    // If not set, use default percentage of 100%
    const lineStrokeWidth = this.getCSSProperty('--line-stroke-width');
    if (lineStrokeWidth) {
      // Parse pixel value and convert to percentage of base
      const pixelMatch = lineStrokeWidth.match(/^(\d+(?:\.\d+)?)px$/);
      if (pixelMatch) {
        const pixelValue = parseFloat(pixelMatch[1]);
        this.percentages.lineThickness = (pixelValue / LINE.STROKE_WIDTH) * 100;
      } else {
        // If it's a percentage or other value, try to parse as percentage
        this.percentages.lineThickness = this.parsePercentageFromCSS('--line-stroke-width', 100);
      }
    } else {
      this.percentages.lineThickness = 100; // Default
    }
  }

  updateIndicatorLength() {
    // Parse as percentage (0+), with or without % sign
    // Allow values > 100% for longer indicators
    this.percentages.indicatorLength = this.parsePercentage('length-indicator', 100);
    // Trigger dimension update to recalculate scaled indicator length
    if (this.isInitialized) {
      this.updateDimensions();
    }
  }

  updateCenterIndicator() {
    // Parse as percentage (0-100+), with or without % sign
    this.percentages.centerIndicator = this.parsePercentage('center-indicator', 0);
    // Trigger dimension update to recalculate scaled center-indicator
    if (this.isInitialized) {
      this.updateDimensions();
    }
  }

  updateSelectionDelay() {
    const timeSelectionDelay = this.getAttribute('time-selection-delay');
    if (timeSelectionDelay) {
      // Convert milliseconds to seconds, clamp to minimum of 0
      const delayMs = parseFloat(timeSelectionDelay);
      const delaySeconds = Math.max(0, delayMs) / 1000;
      this.style.setProperty('--time-selection-delay', `${delaySeconds}s`);
    } else {
      // Reset to default if attribute is removed
      this.style.removeProperty('--time-selection-delay');
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
    const containerWidth = this.getBoundingClientRect().width;
    const containerHeight = this.getBoundingClientRect().height;
    const selector = this.shadowRoot.querySelector('.selector');
    const knobWrap = this.shadowRoot.querySelector('.knob-wrap');
    const heightCSS = this.getCSSProperty('--component-height');
    const hasFixedHeight = !!heightCSS && heightCSS !== 'auto';

    // Calculate available space (accounting for gaps)
    const computedStyle = getComputedStyle(selector);
    const gap = parseFloat(computedStyle.gap) || 0;
    const availableWidth = containerWidth - gap * 2; // Two gaps between three columns

    // Target knob size: aim for about 40-50% of container width, but respect min/max
    // If height is set, also consider height constraints
    let targetSize = Math.min(
      Math.max(CONSTRAINTS.MIN_KNOB_WRAP_SIZE, availableWidth * 0.45),
      CONSTRAINTS.MAX_KNOB_WRAP_SIZE
    );

    if (hasFixedHeight && containerHeight > 0) {
      // When height is fixed, ensure knob fits within height
      // Knob is square, so use the smaller of width-based or height-based size
      const heightBasedSize = containerHeight;
      targetSize = Math.min(targetSize, heightBasedSize);
      // Still respect min/max
      targetSize = Math.min(Math.max(CONSTRAINTS.MIN_KNOB_WRAP_SIZE, targetSize), CONSTRAINTS.MAX_KNOB_WRAP_SIZE);
    }

    // Set the knob-wrap size via CSS variable on host
    this.style.setProperty('--knob-wrap-size', `${targetSize}px`);

    // Force a reflow to ensure the browser has applied the size
    void knobWrap.offsetWidth;

    // Measure the actual rendered size (may differ slightly due to grid constraints)
    const actualSize = knobWrap.getBoundingClientRect().width;

    this.knobWrapSize = actualSize;
    this.knobCenter = this.knobWrapSize / 2;

    // Calculate scale factor relative to base size
    return this.knobWrapSize / KNOB.WRAP_SIZE;
  }

  updateKnobRadii(scale) {
    // Get the base radius values from CSS custom properties
    // Read as percentages relative to base values
    const radiusOuterCSS = this.getCSSProperty('--radius-outer');
    const radiusInnerCSS = this.getCSSProperty('--radius-inner');

    if (radiusOuterCSS) {
      // Parse pixel value and convert to percentage of base
      const pixelMatch = radiusOuterCSS.match(/^(\d+(?:\.\d+)?)px$/);
      if (pixelMatch) {
        const pixelValue = parseFloat(pixelMatch[1]);
        // Convert to percentage based on unscaled base value
        this.percentages.radiusOuter = (pixelValue / KNOB.RADIUS_OUTER) * 100;
      } else {
        this.percentages.radiusOuter = this.parsePercentageFromCSS('--radius-outer', 100);
      }
    } else {
      this.percentages.radiusOuter = 100; // Default
    }

    if (radiusInnerCSS) {
      const pixelMatch = radiusInnerCSS.match(/^(\d+(?:\.\d+)?)px$/);
      if (pixelMatch) {
        const pixelValue = parseFloat(pixelMatch[1]);
        this.percentages.radiusInner = (pixelValue / KNOB.RADIUS_INNER) * 100;
      } else {
        this.percentages.radiusInner = this.parsePercentageFromCSS('--radius-inner', 100);
      }
    } else {
      this.percentages.radiusInner = 100; // Default
    }

    // Calculate base radii from percentages
    const baseRadiusOuter = (KNOB.RADIUS_OUTER * this.percentages.radiusOuter) / 100;
    const baseRadiusInner = (KNOB.RADIUS_INNER * this.percentages.radiusInner) / 100;

    // Scale the radii based on the current scale factor
    const scaledRadiusOuter = baseRadiusOuter * scale;
    const scaledRadiusInner = baseRadiusInner * scale;

    // Update knob size CSS variables (for responsive scaling)
    this.style.setProperty('--radius-outer', `${scaledRadiusOuter}px`);
    this.style.setProperty('--radius-inner', `${scaledRadiusInner}px`);

    return { scaledRadiusOuter, scaledRadiusInner };
  }

  updateScaledDimensions(scale) {
    const containerHeight = this.getBoundingClientRect().height;
    const heightCSS = this.getCSSProperty('--component-height');
    const hasFixedHeight = !!heightCSS && heightCSS !== 'auto';

    // Scale all proportional dimensions
    // If height is fixed, use the container height for label columns
    if (hasFixedHeight && containerHeight > 0) {
      this.labelColumnHeight = containerHeight;
    } else {
      this.labelColumnHeight = LABEL.COLUMN_HEIGHT * scale;
    }
    this.labelVerticalOffsetScale = LABEL.VERTICAL_OFFSET_SCALE * scale;
    this.horizontalLineLength = LINE.HORIZONTAL_LENGTH * scale;
    this.maxSpokeLength = LINE.MAX_SPOKE_LENGTH * scale;
    this.hitAreaStrokeWidth = HIT_AREA.STROKE_WIDTH * scale;
    this.horizontalLineEndOffset = LINE.HORIZONTAL_END_OFFSET * scale;
    this.indicatorWidth = INDICATOR.WIDTH * scale;
  }

  updateCSSVariables(scale, scaledRadiusOuter) {
    // Read circle widths from CSS custom properties
    const widthOuterCSS = this.getCSSProperty('--width-outer-circle');
    const widthInnerCSS = this.getCSSProperty('--width-inner-circle');

    if (widthOuterCSS) {
      const pixelMatch = widthOuterCSS.match(/^(\d+(?:\.\d+)?)px$/);
      if (pixelMatch) {
        const pixelValue = parseFloat(pixelMatch[1]);
        this.percentages.widthOuterCircle = (pixelValue / CIRCLE.WIDTH_OUTER) * 100;
      } else {
        this.percentages.widthOuterCircle = this.parsePercentageFromCSS('--width-outer-circle', 100);
      }
    } else {
      this.percentages.widthOuterCircle = 100; // Default
    }

    if (widthInnerCSS) {
      const pixelMatch = widthInnerCSS.match(/^(\d+(?:\.\d+)?)px$/);
      if (pixelMatch) {
        const pixelValue = parseFloat(pixelMatch[1]);
        this.percentages.widthInnerCircle = (pixelValue / CIRCLE.WIDTH_INNER) * 100;
      } else {
        this.percentages.widthInnerCircle = this.parsePercentageFromCSS('--width-inner-circle', 100);
      }
    } else {
      this.percentages.widthInnerCircle = 100; // Default
    }

    // Calculate and set scaled circle widths
    const baseWidthOuter = (CIRCLE.WIDTH_OUTER * this.percentages.widthOuterCircle) / 100;
    const baseWidthInner = (CIRCLE.WIDTH_INNER * this.percentages.widthInnerCircle) / 100;
    const scaledWidthOuter = baseWidthOuter * scale;
    const scaledWidthInner = baseWidthInner * scale;
    this.style.setProperty('--width-outer-circle', `${scaledWidthOuter}px`);
    this.style.setProperty('--width-inner-circle', `${scaledWidthInner}px`);

    // Scale center-indicator offset
    const baseCenterIndicator = (INDICATOR.CENTER * this.percentages.centerIndicator) / 100;
    const scaledCenterIndicator = baseCenterIndicator * scale;
    this.style.setProperty('--center-indicator', `${scaledCenterIndicator}px`);

    // Calculate indicator length based on knob radius and percentage
    // Indicator length is proportional to knob radius
    // Ratio: INDICATOR.LENGTH / KNOB.RADIUS_OUTER
    const indicatorLengthRatio = INDICATOR.LENGTH / KNOB.RADIUS_OUTER;
    const scaledIndicatorLength = scaledRadiusOuter * indicatorLengthRatio * (this.percentages.indicatorLength / 100);
    this.style.setProperty('--indicator-length', `${scaledIndicatorLength}px`);

    // Update remaining CSS custom properties
    this.style.setProperty('--knob-center', `${this.knobCenter}px`);
    this.style.setProperty('--label-column-height', `${this.labelColumnHeight}px`);
    this.style.setProperty('--label-vertical-offset-scale', `${this.labelVerticalOffsetScale}px`);
    this.style.setProperty('--horizontal-line-length', `${this.horizontalLineLength}px`);
    this.style.setProperty('--max-spoke-length', `${this.maxSpokeLength}px`);
    this.style.setProperty('--hit-area-stroke-width', `${this.hitAreaStrokeWidth}px`);
    this.style.setProperty('--horizontal-line-end-offset', `${this.horizontalLineEndOffset}px`);
    this.style.setProperty('--indicator-width', `${this.indicatorWidth}px`);
  }

  /**
   * Updates all component dimensions based on container size and attributes.
   * Calculates scale factor and updates all proportional dimensions.
   */
  updateDimensions() {
    if (!this.validateContainer()) {
      return;
    }

    const scale = this.calculateScale();
    const { scaledRadiusOuter } = this.updateKnobRadii(scale);
    this.updateScaledDimensions(scale);
    this.updateCSSVariables(scale, scaledRadiusOuter);

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
					overflow: hidden;
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
				}

				.label-column {
					position: relative;
					display: flex;
					flex-direction: column;
					justify-content: center;
					height: var(--label-column-height, 320px);
					margin: 0;
					padding: 0;
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
				}

				.indicator {
					position: absolute;
					width: var(--indicator-width, 10px);
					height: var(--indicator-length, 60px);
					background: var(--indicator-gradient, var(--indicator-color));
					border-radius: calc(var(--indicator-width, 10px) / 2);
					top: calc(50% + sin(var(--indicator-angle)) * var(--center-indicator, 0px) - var(--indicator-length, 60px));
					left: calc(50% + cos(var(--indicator-angle)) * var(--center-indicator, 0px) - var(--indicator-width, 10px) / 2);
					transform-origin: 50% 100%;
					transform: rotate(calc(90deg + var(--indicator-angle)));
					transition: var(
						--indicator-transition,
						transform 0.25s ease-in var(--time-selection-delay, 0s),
						top 0.25s ease-in var(--time-selection-delay, 0s),
						left 0.25s ease-in var(--time-selection-delay, 0s)
					);
				}

				:host(.no-transitions) .indicator {
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
					transform: translateY(-50%);
					white-space: nowrap;
				}

				.dial-label.active {
					color: var(--color-selection);
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
			</style>
			<div class="selector" part="panel">
				<div class="label-column left" id="leftColumn" part="labels label-row">
					<!-- Left labels will be generated by JavaScript -->
				</div>

				<div class="knob-wrap" part="dial">
					<svg id="lineContainer" width="100%" height="100%" style="position: absolute; overflow: visible;">
						<!-- Lines will be generated by JavaScript -->
					</svg>
					<div class="knob">
						<div class="indicator" part="indicator"></div>
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
      return [(start + end) / 2];
    }
    return Array.from({ length: count }, (_, i) => start + ((end - start) * i) / (count - 1));
  }

  calculateAngles() {
    this.leftCount = Math.ceil(this.OPTIONS.length / 2);
    this.rightCount = this.OPTIONS.length - this.leftCount;

    // Generate angles for right and left sides
    this.spokeAngles = [
      ...this.generateArcAngles(this.rightCount, ARCS.RIGHT_START, ARCS.RIGHT_END),
      ...this.generateArcAngles(this.leftCount, ARCS.LEFT_START, ARCS.LEFT_END),
    ];
  }

  createLabelsAndLines() {
    const leftColumn = this.shadowRoot.querySelector('#leftColumn');
    const rightColumn = this.shadowRoot.querySelector('#rightColumn');
    const lineContainer = this.shadowRoot.querySelector('#lineContainer');
    const advanceButton = this.shadowRoot.querySelector('#advanceButton');

    // Clear existing content
    if (leftColumn) leftColumn.innerHTML = '';
    if (rightColumn) rightColumn.innerHTML = '';
    if (lineContainer) lineContainer.innerHTML = '';
    this.hitAreas = [];

    this.OPTIONS.forEach((option, index) => {
      // Left side gets first half (indices 0 to leftCount-1), right side gets second half (indices leftCount to length-1)
      const isLeft = index < this.leftCount;
      const container = isLeft ? leftColumn : rightColumn;
      // Map option index to angle index:
      // - Left side: options 0..leftCount-1 map to angles rightCount..rightCount+leftCount-1 (left angles in spokeAngles array)
      // - Right side: options leftCount..length-1 map to angles 0..rightCount-1 (right angles in spokeAngles array)
      const angleIndex = isLeft ? this.rightCount + index : index - this.leftCount;
      const angle = this.spokeAngles[angleIndex];
      const angleRad = this.degreesToRadians(angle);

      // Calculate vertical position based on angle
      // The knob center is at 50% of the column height
      // We want labels positioned along the vertical arc where the indicator points
      const topPosition = this.calculateLabelTopPosition(angleRad);

      // Create label
      const label = document.createElement('label');
      label.className = 'dial-label';
      label.setAttribute('part', 'label');
      label.textContent = option;
      label.dataset.index = index;
      label.dataset.angle = angle;

      // Position label vertically based on angle
      label.style.top = `${topPosition}px`;
      if (isLeft) {
        label.style.right = '0';
      } else {
        label.style.left = '0';
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
  }

  updateLabelPositions() {
    // Update label positions based on current dimensions
    this.labels.forEach((label) => {
      const angle = parseFloat(label.dataset.angle);
      const angleRad = this.degreesToRadians(angle);
      const topPosition = this.calculateLabelTopPosition(angleRad);
      label.style.top = `${topPosition}px`;
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
      intersectX = spokeStartX + maxExtension;
      intersectY = labelY;
    } else {
      // Parametric form: x = spokeStartX + t*cos(angle), y = spokeStartY + t*sin(angle)
      // We want y = labelY, so: t = (labelY - spokeStartY) / sin(angle)
      const t = (labelY - spokeStartY) / Math.sin(angleRad);

      // Limit the spoke length if it would extend too far
      const spokeLength = Math.abs(t);
      if (spokeLength > maxSpokeLength) {
        // Cap the spoke at max length
        const limitedT = t > 0 ? maxSpokeLength : -maxSpokeLength;
        intersectX = spokeStartX + limitedT * Math.cos(angleRad);
        // Keep intersection on the horizontal line at labelY
        intersectY = labelY;
      } else {
        intersectX = spokeStartX + t * Math.cos(angleRad);
        intersectY = labelY;
      }
    }

    return { intersectX, intersectY };
  }

  calculateHorizontalLineEnd(labelX, intersectX, isLeft) {
    const horizontalLength = this.horizontalLineLength;
    // Horizontal line should extend from label to intersection
    // But we want it to stop a bit before the intersection for visual clarity
    const horizontalEndX = isLeft
      ? Math.min(intersectX - this.horizontalLineEndOffset, labelX + horizontalLength)
      : Math.max(intersectX + this.horizontalLineEndOffset, labelX - horizontalLength);
    return horizontalEndX;
  }

  updateLines() {
    const knobWrap = this.shadowRoot.querySelector('.knob-wrap');
    if (!knobWrap) return;

    const centerX = this.knobCenter;
    const centerY = this.knobCenter;
    // Get the actual knob radius from CSS variable, with fallback to default
    const computedStyle = getComputedStyle(this);
    const radiusOuter = computedStyle.getPropertyValue('--radius-outer').trim() || '90px';
    const knobRadius = parseFloat(radiusOuter);

    this.labels.forEach((label, index) => {
      const labelRect = label.getBoundingClientRect();
      const knobWrapRect = knobWrap.getBoundingClientRect();

      const angle = parseFloat(label.dataset.angle);
      const angleRad = this.degreesToRadians(angle);
      const isLeft = index < this.leftCount;

      // Label connection point (relative to knob-wrap)
      const labelX = isLeft ? labelRect.right - knobWrapRect.left : labelRect.left - knobWrapRect.left;
      const labelY = labelRect.top + labelRect.height / 2 - knobWrapRect.top;

      // Spoke start point at knob edge
      const spokeStartX = centerX + Math.cos(angleRad) * knobRadius;
      const spokeStartY = centerY + Math.sin(angleRad) * knobRadius;

      // Calculate intersection point
      const { intersectX, intersectY } = this.calculateSpokeIntersection(
        angleRad,
        spokeStartX,
        spokeStartY,
        labelY,
        isLeft
      );

      // Calculate horizontal line end point
      const horizontalEndX = this.calculateHorizontalLineEnd(labelX, intersectX, isLeft);
      const horizontalEndY = labelY;

      // Create polyline: label -> horizontal end -> intersection -> spoke start
      const points = `${labelX},${labelY} ${horizontalEndX},${horizontalEndY} ${intersectX},${intersectY} ${spokeStartX},${spokeStartY}`;
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
      this.currentAngle = targetAngle;
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
        this.currentAngle = this.currentAngle - backwardDist;
      } else {
        this.currentAngle = this.currentAngle + forwardDist;
      }
    }

    this.style.setProperty('--indicator-angle', `${this.currentAngle}deg`);

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
    const event = new CustomEvent('change', {
      bubbles: true,
      cancelable: true,
      detail: {
        value: this.OPTIONS[this.currentIndex],
        index: this.currentIndex,
        previousValue: this.OPTIONS[this.previousIndex],
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
