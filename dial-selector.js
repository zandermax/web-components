const style = document.createElement('style');
style.textContent = `
dial-selector {
  --color-ink: #f4f4f4;
  --color-selection: #f13b3b;
  --color-line: #c7c2b5;
  --color-indicator: #f13b3b;
  --shadow: 0;
  --label-radius: 150px;
  /* Line styling variables */
  --line-stroke-width: 2;
  --line-opacity-inactive: 0.4;
  --line-opacity-active: 0.8;
  --line-transition: opacity 0.3s ease, stroke 0.3s ease;
  /* Indicator styling variables */
  --indicator-length: 60px;
  --center-indicator: 0px;
  /* Knob circle styling variables */
  --radius-outer: 90px;
  --width-outer-circle: 4px;
  --color-outer-circle: var(--color-ink);
  --radius-inner: 72px;
  --width-inner-circle: 2px;
  --color-inner-circle: var(--color-ink);
  display: block;
  font-family: 'IBM Plex Mono', 'Courier New', monospace;
}

dial-selector * {
  box-sizing: border-box;
}

dial-selector .panel {
  position: relative;
  background: transparent;
  padding: 40px 48px 60px;
  border: 3px solid var(--color-ink);
  width: min(900px, 95vw);
  overflow: visible;
  --indicator-angle: 0deg;
}

dial-selector h1 {
  margin: 0 0 36px;
  letter-spacing: 2px;
  font-size: 18px;
  text-transform: uppercase;
}

dial-selector .selector {
  display: grid;
  grid-template-columns: 200px 320px 200px;
  gap: 40px;
  align-items: center;
  justify-content: center;
}

dial-selector .label-column {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  height: 320px;
}

dial-selector .label-column.left {
  align-items: flex-end;
}

dial-selector .label-column.right {
  align-items: flex-start;
}

dial-selector .knob-wrap {
  position: relative;
  width: 320px;
  height: 320px;
  display: grid;
  place-items: center;
}

dial-selector .knob {
  position: relative;
  width: calc(var(--radius-outer) * 2);
  height: calc(var(--radius-outer) * 2);
  border: var(--width-outer-circle) solid var(--color-outer-circle);
  border-radius: 50%;
  background: #11161c;
  box-shadow: var(--shadow);
  z-index: 2;
}

dial-selector .indicator {
  position: absolute;
  width: 10px;
  height: var(--indicator-length, 60px);
  background: var(--indicator-gradient, var(--color-indicator));
  border-radius: 5px;
  top: calc(50% + sin(var(--indicator-angle)) * var(--center-indicator, 0px) - var(--indicator-length, 60px));
  left: calc(50% + cos(var(--indicator-angle)) * var(--center-indicator, 0px) - 5px);
  transform-origin: 50% 100%;
  transform: rotate(calc(90deg + var(--indicator-angle)));
  transition: transform 0.25s ease-in, top 0.25s ease-in, left 0.25s ease-in;
  transition-delay: 0.125s;
}

dial-selector .knob::before {
  content: '';
  position: absolute;
  inset: calc(var(--radius-outer) - var(--radius-inner));
  border: var(--width-inner-circle) solid var(--color-inner-circle);
  border-radius: 50%;
  opacity: 0.6;
}

dial-selector .dial-label {
  text-decoration: none;
  color: inherit;
  font-size: 14px;
  letter-spacing: 1px;
  display: inline-flex;
  align-items: center;
  gap: 0;
  cursor: pointer;
  user-select: none;
  padding: 8px 12px;
  position: absolute;
  transform: translateY(-50%);
}

dial-selector .dial-label.active {
  color: var(--color-selection);
}

dial-selector #lineContainer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: visible;
}

dial-selector .spoke-line {
  transition: var(--line-transition, opacity 0.3s ease, stroke 0.3s ease);
}

dial-selector .advance {
  position: absolute;
  inset: 0;
  cursor: pointer;
  pointer-events: auto;
  background: transparent;
}

@media (max-width: 900px) {
  dial-selector .panel {
    padding: 28px 22px 50px;
  }

  dial-selector .selector {
    grid-template-columns: 150px 260px 150px;
    gap: 20px;
  }

  dial-selector .knob-wrap {
    width: 260px;
    height: 260px;
  }

  dial-selector .dial-label {
    font-size: 12px;
    padding: 6px 8px;
  }

  dial-selector .label-column {
    gap: 16px;
  }
}
`;

// Inject styles only once
if (!document.getElementById('dial-selector-styles')) {
  style.id = 'dial-selector-styles';
  document.head.appendChild(style);
}

// Constants
const DEFAULT_OPTIONS = ['PHONO-2', 'PHONO-1', 'TUNER', 'AUX', 'CD', 'TAPE', 'STREAM', 'TV'];
const DEFAULT_TITLE = 'Input Selector';

// Arc angles for label positioning
const RIGHT_ARC_START = -45;
const RIGHT_ARC_END = 45;
const LEFT_ARC_START = 135;
const LEFT_ARC_END = 225;

// Knob and dial dimensions
const KNOB_WRAP_SIZE = 320;
const KNOB_SIZE = 180;
const KNOB_CENTER = KNOB_WRAP_SIZE / 2; // 160
const KNOB_RADIUS = 90;
const LABEL_COLUMN_HEIGHT = 320;
const LABEL_RADIUS = 150;
const LABEL_VERTICAL_OFFSET_SCALE = 140;

// Line dimensions
const HORIZONTAL_LINE_LENGTH = 100;
const MAX_SPOKE_LENGTH = 80;
const HIT_AREA_STROKE_WIDTH = 20;
const DEFAULT_LINE_STROKE_WIDTH = 2;
const HORIZONTAL_LINE_END_OFFSET = 10;

// Opacity values
const LINE_OPACITY_INACTIVE = 0.4;
const LINE_OPACITY_ACTIVE = 0.8;

// Indicator dimensions
const INDICATOR_WIDTH = 10;
const INDICATOR_HEIGHT = 60;
const INDICATOR_TOP_OFFSET = 18;
const INDICATOR_TRANSFORM_ORIGIN_Y = 72;

// Animation and timing
const TRANSITION_DELAY = 0.125;
const INITIALIZATION_DELAY = 100;

// Angle calculation threshold
const NEARLY_HORIZONTAL_THRESHOLD = 0.0001;
const FULL_CIRCLE_DEGREES = 360;

// Rainbow gradient colors
const RAINBOW_COLORS = [
  '#ff0000', // Red
  '#ff7f00', // Orange
  '#ffff00', // Yellow
  '#00ff00', // Green
  '#0000ff', // Blue
  '#4b0082', // Indigo
  '#9400d3', // Violet
];

class DialSelector extends HTMLElement {
  constructor() {
    super();
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
    this.halfPoint = 0;
  }

  static get observedAttributes() {
    return [
      'color-indicator',
      'color-selection',
      'options',
      'title',
      'onchange',
      'indicator-rainbow',
      'indicator-gradient',
      'line-thickness',
      'length-indicator',
      'center-indicator',
      'radius-inner',
      'color-inner-circle',
      'color-outer-circle',
      'width-inner-circle',
      'radius-outer',
      'width-outer-circle',
    ];
  }

  connectedCallback() {
    // Parse options from attribute or use default
    const optionsAttr = this.getAttribute('options');
    this.OPTIONS = optionsAttr ? optionsAttr.split(',').map((opt) => opt.trim()) : DEFAULT_OPTIONS;

    this.updateIndicatorColor();
    this.updateIndicatorGradient();
    this.updateSelectionColor();
    this.updateLineThickness();
    this.updateIndicatorLength();
    this.updateCenterIndicator();
    this.updateKnobSize();
    this.buildDOM();
    this.calculateAngles();
    this.createLabelsAndLines();

    setTimeout(() => {
      this.updateLines();
      this.updateSelector();
    }, INITIALIZATION_DELAY);

    window.addEventListener('resize', () => this.updateLines());
  }

  attributeChangedCallback(name, oldValue, newValue) {
    this.handleAttributeChange({ name, oldValue, newValue });
  }

  handleAttributeChange({ name, oldValue, newValue }) {
    switch (name) {
      case 'color-indicator':
        this.updateIndicatorColor();
        break;

      case 'indicator-rainbow':
      case 'indicator-gradient':
        this.updateIndicatorGradient();
        break;

      case 'color-selection':
        this.updateSelectionColor();
        break;

      case 'line-thickness':
        this.updateLineThickness();
        break;

      case 'length-indicator':
        this.updateIndicatorLength();
        break;

      case 'center-indicator':
        this.updateCenterIndicator();
        break;

      case 'radius-inner':
      case 'color-inner-circle':
      case 'color-outer-circle':
      case 'width-inner-circle':
      case 'radius-outer':
      case 'width-outer-circle':
        this.updateKnobSize();
        break;

      case 'options':
        if (this.isInitialized) {
          // Rebuild if options change
          this.OPTIONS = newValue.split(',').map((opt) => opt.trim());
          this.labels = [];
          this.lines = [];
          this.spokeAngles = [];
          this.currentIndex = 0;
          this.previousIndex = -1;
          this.isInitialized = false;
          this.calculateAngles();
          this.createLabelsAndLines();
          setTimeout(() => {
            this.updateLines();
            this.updateSelector();
          }, INITIALIZATION_DELAY);
        }
        break;

      case 'title':
        if (this.isInitialized) {
          const titleEl = this.querySelector('h1');
          if (titleEl) titleEl.textContent = newValue || DEFAULT_TITLE;
        }
        break;

      case 'onchange':
        // onchange attribute changes are handled automatically
        // No action needed here
        break;

      default:
        // Unknown attribute, ignore
        break;
    }
  }

  updateIndicatorColor() {
    const colorIndicator = this.getAttribute('color-indicator');
    if (colorIndicator) {
      this.style.setProperty('--color-indicator', colorIndicator);
    }
  }

  updateIndicatorGradient() {
    // Check if custom gradient is provided
    const gradientColors = this.getAttribute('indicator-gradient');

    if (gradientColors) {
      // Parse comma-separated colors and create gradient
      const colors = gradientColors.split(',').map((color) => color.trim());
      const gradient = this.createGradientFromColors(colors);
      this.style.setProperty('--indicator-gradient', gradient);
    } else if (this.hasAttribute('indicator-rainbow')) {
      // Default rainbow gradient if indicator-rainbow is set
      const rainbowColors = RAINBOW_COLORS;
      const gradient = this.createGradientFromColors(rainbowColors);
      this.style.setProperty('--indicator-gradient', gradient);
    } else {
      // Remove the property so CSS fallback to --color-indicator works
      this.style.removeProperty('--indicator-gradient');
    }
  }

  createGradientFromColors(colors) {
    if (colors.length === 0) return 'none';
    if (colors.length === 1) {
      return `linear-gradient(to bottom, ${colors[0]})`;
    }

    // Create gradient with evenly distributed color stops
    const stops = colors
      .map((color, index) => {
        const percentage = (index / (colors.length - 1)) * 100;
        return `${color} ${percentage}%`;
      })
      .join(', ');

    return `linear-gradient(to bottom, ${stops})`;
  }

  updateSelectionColor() {
    const colorSelection = this.getAttribute('color-selection');
    if (colorSelection) {
      this.style.setProperty('--color-selection', colorSelection);
    }
  }

  updateLineThickness() {
    const lineThickness = this.getAttribute('line-thickness');
    if (lineThickness) {
      this.style.setProperty('--line-stroke-width', lineThickness);
    } else {
      // Reset to default if attribute is removed
      this.style.removeProperty('--line-stroke-width');
    }
  }

  updateIndicatorLength() {
    const lengthIndicator = this.getAttribute('length-indicator');
    if (lengthIndicator) {
      this.style.setProperty('--indicator-length', lengthIndicator);
    } else {
      // Reset to default if attribute is removed
      this.style.removeProperty('--indicator-length');
    }
  }

  updateCenterIndicator() {
    const centerIndicator = this.getAttribute('center-indicator');
    if (centerIndicator) {
      this.style.setProperty('--center-indicator', centerIndicator);
    } else {
      // Reset to default if attribute is removed
      this.style.removeProperty('--center-indicator');
    }
  }

  updateKnobSize() {
    const radiusInner = this.getAttribute('radius-inner');
    if (radiusInner) {
      this.style.setProperty('--radius-inner', radiusInner);
    } else {
      this.style.removeProperty('--radius-inner');
    }

    const colorInnerCircle = this.getAttribute('color-inner-circle');
    if (colorInnerCircle) {
      this.style.setProperty('--color-inner-circle', colorInnerCircle);
    } else {
      this.style.removeProperty('--color-inner-circle');
    }

    const colorOuterCircle = this.getAttribute('color-outer-circle');
    if (colorOuterCircle) {
      this.style.setProperty('--color-outer-circle', colorOuterCircle);
    } else {
      this.style.removeProperty('--color-outer-circle');
    }

    const widthInnerCircle = this.getAttribute('width-inner-circle');
    if (widthInnerCircle) {
      this.style.setProperty('--width-inner-circle', widthInnerCircle);
    } else {
      this.style.removeProperty('--width-inner-circle');
    }

    const radiusOuter = this.getAttribute('radius-outer');
    if (radiusOuter) {
      this.style.setProperty('--radius-outer', radiusOuter);
    } else {
      this.style.removeProperty('--radius-outer');
    }

    const widthOuterCircle = this.getAttribute('width-outer-circle');
    if (widthOuterCircle) {
      this.style.setProperty('--width-outer-circle', widthOuterCircle);
    } else {
      this.style.removeProperty('--width-outer-circle');
    }
  }

  buildDOM() {
    const title = this.getAttribute('title') || DEFAULT_TITLE;
    this.innerHTML = `
			<div class="panel">
				<h1>${title}</h1>
				<div class="selector">
					<div class="label-column left" id="leftColumn">
						<!-- Left labels will be generated by JavaScript -->
					</div>

					<div class="knob-wrap">
						<svg id="lineContainer" width="100%" height="100%" style="position: absolute; overflow: visible;">
							<!-- Lines will be generated by JavaScript -->
						</svg>
						<div class="knob">
							<div class="indicator"></div>
							<div class="advance" id="advanceButton" aria-label="Switch to next option"></div>
						</div>
					</div>

					<div class="label-column right" id="rightColumn">
						<!-- Right labels will be generated by JavaScript -->
					</div>
				</div>
			</div>
		`;
  }

  calculateAngles() {
    this.halfPoint = Math.ceil(this.OPTIONS.length / 2);
    this.rightCount = this.OPTIONS.length - this.halfPoint;
    this.leftCount = this.halfPoint;

    // Generate angles for right side
    for (let i = 0; i < this.rightCount; i++) {
      let angle;
      if (this.rightCount === 1) {
        // Single item on right side - use middle of arc
        angle = (RIGHT_ARC_START + RIGHT_ARC_END) / 2;
      } else {
        angle = RIGHT_ARC_START + ((RIGHT_ARC_END - RIGHT_ARC_START) * i) / (this.rightCount - 1);
      }
      this.spokeAngles.push(angle);
    }

    // Generate angles for left side
    for (let i = 0; i < this.leftCount; i++) {
      let angle;
      if (this.leftCount === 1) {
        // Single item on left side - use middle of arc
        angle = (LEFT_ARC_START + LEFT_ARC_END) / 2;
      } else {
        angle = LEFT_ARC_START + ((LEFT_ARC_END - LEFT_ARC_START) * i) / (this.leftCount - 1);
      }
      this.spokeAngles.push(angle);
    }
  }

  createLabelsAndLines() {
    const leftColumn = this.querySelector('#leftColumn');
    const rightColumn = this.querySelector('#rightColumn');
    const lineContainer = this.querySelector('#lineContainer');
    const advanceButton = this.querySelector('#advanceButton');

    // Clear existing content
    if (leftColumn) leftColumn.innerHTML = '';
    if (rightColumn) rightColumn.innerHTML = '';
    if (lineContainer) lineContainer.innerHTML = '';
    this.hitAreas = [];

    this.OPTIONS.forEach((option, index) => {
      // Left side gets first half (indices 0 to leftCount-1), right side gets second half (indices leftCount to length-1)
      const isLeft = index < this.leftCount;
      const container = isLeft ? leftColumn : rightColumn;
      let angleIndex;
      if (isLeft) {
        // Left side: normal order (Option 1 at top, Option leftCount at bottom)
        // Map index 0 to rightCount (top left), index leftCount-1 to rightCount+leftCount-1 (bottom left)
        angleIndex = this.rightCount + index;
      } else {
        // Right side: normal order (Option leftCount+1 at top, Option length at bottom)
        // Map index leftCount to 0 (top right), index length-1 to rightCount-1 (bottom right)
        angleIndex = index - this.leftCount;
      }
      const angle = this.spokeAngles[angleIndex];
      const angleRad = (angle * Math.PI) / 180;

      // Calculate vertical position based on angle
      // The knob center is at 50% of the column height
      // We want labels positioned along the vertical arc where the indicator points
      const columnCenter = LABEL_COLUMN_HEIGHT / 2;
      const verticalOffset = Math.sin(angleRad) * LABEL_VERTICAL_OFFSET_SCALE;
      const topPosition = columnCenter + verticalOffset;

      // Create label
      const label = document.createElement('label');
      label.className = 'dial-label';
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

      label.addEventListener('click', () => {
        this.currentIndex = index;
        this.updateSelector();
      });

      // Append to containers
      if (container) container.appendChild(label);
      this.labels.push(label);

      // Create invisible wider hit area overlay for easier clicking (Fitt's Law)
      const hitArea = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
      hitArea.setAttribute('class', 'spoke-line-hit-area');
      hitArea.setAttribute('fill', 'none');
      hitArea.setAttribute('stroke', 'transparent');
      hitArea.setAttribute('stroke-width', HIT_AREA_STROKE_WIDTH.toString());
      hitArea.setAttribute('stroke-linejoin', 'miter');
      hitArea.setAttribute('pointer-events', 'auto');
      hitArea.style.cursor = 'pointer';
      hitArea.dataset.index = index;
      // Initialize with empty points - will be set in updateLines()
      hitArea.setAttribute('points', '');

      // Make hit area clickable
      hitArea.addEventListener('click', () => {
        this.currentIndex = index;
        this.updateSelector();
      });

      // Create visible line (spoke + horizontal)
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
      line.setAttribute('class', 'spoke-line');
      line.setAttribute('fill', 'none');
      line.setAttribute('stroke', 'var(--color-ink)');
      line.setAttribute('stroke-width', `var(--line-stroke-width, ${DEFAULT_LINE_STROKE_WIDTH})`);
      line.setAttribute('opacity', `var(--line-opacity-inactive, ${LINE_OPACITY_INACTIVE})`);
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
        this.currentIndex = (this.currentIndex + 1) % this.OPTIONS.length;
        this.updateSelector();
      });
    }
  }

  updateLines() {
    const knobWrap = this.querySelector('.knob-wrap');
    if (!knobWrap) return;

    const centerX = KNOB_CENTER;
    const centerY = KNOB_CENTER;
    // Get the actual knob radius from CSS variable, with fallback to default
    const computedStyle = getComputedStyle(this);
    const radiusOuter = computedStyle.getPropertyValue('--radius-outer').trim() || '90px';
    const knobRadius = parseFloat(radiusOuter);
    const horizontalLength = HORIZONTAL_LINE_LENGTH;

    this.labels.forEach((label, index) => {
      const labelRect = label.getBoundingClientRect();
      const knobWrapRect = knobWrap.getBoundingClientRect();

      const angle = parseFloat(label.dataset.angle);
      const angleRad = (angle * Math.PI) / 180;
      const isLeft = index < this.leftCount;

      // Label connection point (relative to knob-wrap)
      const labelX = isLeft ? labelRect.right - knobWrapRect.left : labelRect.left - knobWrapRect.left;
      const labelY = labelRect.top + labelRect.height / 2 - knobWrapRect.top;

      // Spoke start point at knob edge
      const spokeStartX = centerX + Math.cos(angleRad) * knobRadius;
      const spokeStartY = centerY + Math.sin(angleRad) * knobRadius;

      // Calculate where the spoke (extending from knob edge at angle) meets the horizontal line
      // The spoke extends from spokeStart outward at the given angle
      // We need to find where it intersects with the horizontal line at labelY
      // But limit the spoke length so horizontal spokes don't extend too far
      const maxSpokeLength = MAX_SPOKE_LENGTH;

      let intersectX, intersectY;

      if (Math.abs(Math.sin(angleRad)) < NEARLY_HORIZONTAL_THRESHOLD) {
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

      // Horizontal line should extend from label to intersection
      // But we want it to stop a bit before the intersection for visual clarity
      const horizontalEndX = isLeft
        ? Math.min(intersectX - HORIZONTAL_LINE_END_OFFSET, labelX + horizontalLength)
        : Math.max(intersectX + HORIZONTAL_LINE_END_OFFSET, labelX - horizontalLength);
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

    const panel = this.querySelector('.panel');
    if (panel) {
      panel.style.setProperty('--indicator-angle', `${this.currentAngle}deg`);
    }

    this.labels.forEach((label, index) => {
      const line = this.lines[index];
      if (index === this.currentIndex) {
        label.classList.add('active');
        line.classList.add('active');
        line.setAttribute('opacity', `var(--line-opacity-active, ${LINE_OPACITY_ACTIVE})`);
        line.setAttribute('stroke', 'var(--color-selection)');
      } else {
        label.classList.remove('active');
        line.classList.remove('active');
        line.setAttribute('opacity', `var(--line-opacity-inactive, ${LINE_OPACITY_INACTIVE})`);
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
