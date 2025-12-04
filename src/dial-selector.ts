import {
  ATTRIBUTES,
  FULL_CIRCLE_DEGREES,
  DEFAULT_OPTIONS,
  ARCS,
  KNOB,
  LINE,
  HIT_AREA,
  OPACITY,
  ANIMATION,
} from './constants';

import { getStyles, getTemplate } from './styles';
import mathHelper from './helpers/math';
import geometryHelper from './helpers/geometry';
import configHelper from './helpers/config';
import dimensionsHelper from './helpers/dimensions';
import linesHelper from './helpers/lines';
import labelsHelper from './helpers/labels';
import domHelper from './helpers/dom';
import eventsHelper from './helpers/events';
import type { DialOption, OneSidedConfig, LabelData, KnobRadii } from './types';

/** Parameters for handleAttributeChange */
type AttributeChangeParams = {
  name: string;
  oldValue: string | null;
  newValue: string | null;
};

/** Parameters for resolveOptionPlacement */
type ResolveOptionPlacementParams = {
  index: number;
  oneSided: OneSidedConfig;
  isSpokes: boolean;
  knobWrap: Element | null;
  leftColumn: Element | null;
  rightColumn: Element | null;
};

/** Result of resolveOptionPlacement */
type OptionPlacementResult = {
  isLeft: boolean;
  container: Element | null;
  angle: number;
};

/**
 * A custom web component that renders a dial selector interface with labels,
 * lines, and an interactive knob. Supports responsive sizing, custom styling,
 * and various configuration options via HTML attributes.
 */
class DialSelector extends HTMLElement {
  // Private fields
  #currentIndex: number = 0;
  #previousIndex: number = -1;
  #currentAngle: number = 0;
  #isInitialized: boolean = false;
  #labels: HTMLLabelElement[] = [];
  #lines: SVGPolylineElement[] = [];
  #hitAreas: SVGPolylineElement[] = [];
  #spokeAngles: number[] = [];
  #rightCount: number = 0;
  #leftCount: number = 0;
  #resizeObserver: ResizeObserver | null = null;
  #childObserver: MutationObserver | null = null;
  #options: DialOption[] = [];
  #hasConnected: boolean = false;
  #resizeHandler: (() => void) | null = null;
  // Dynamic dimensions (read from CSS computed styles)
  #knobWrapSize: number = KNOB.WRAP_SIZE;
  #horizontalLineLength: number = LINE.HORIZONTAL_LENGTH;
  #maxSpokeLength: number = LINE.MAX_SPOKE_LENGTH;
  #hitAreaStrokeWidth: number = HIT_AREA.STROKE_WIDTH;
  #horizontalLineEndOffset: number = LINE.HORIZONTAL_END_OFFSET;

  constructor() {
    super();
    // Create shadow DOM in constructor
    this.attachShadow({ mode: 'open' });
  }

  static observedAttributes = ATTRIBUTES;

  initializeOptions(): void {
    const childOptions = Array.from(this.querySelectorAll('dial-option'));
    this.#options = configHelper.parseChildOptions(childOptions, DEFAULT_OPTIONS);
  }

  initializeAttributes(): void {
    this.updateSelectionDelay();
    this.updateDimensions();
  }

  setupGeometry(): void {
    // buildDOM is now called in connectedCallback if needed
    this.calculateAngles();
    this.updateDimensions();
    this.createLabelsAndLines();
  }

  finalizeInitialization(): void {
    setTimeout(() => {
      this.updateLines();
      this.updateSelector();
      // Re-enable transitions after initial setup
      this.classList.remove('no-transitions');
    }, ANIMATION.INITIALIZATION_DELAY);
  }

  connectedCallback(): void {
    // Avoid re-running init if the element is moved in the DOM
    if (this.#hasConnected) return;
    this.#hasConnected = true;

    // Build DOM if shadow root is empty (no content yet)
    if (!this.shadowRoot || this.shadowRoot.innerHTML === '') {
      this.buildDOM();
    }

    // Do everything that depends on children in the *next task*,
    // so the parser has had time to create <dial-option> children.
    const init = (): void => {
      this.initializeOptions(); // <-- now sees real <dial-option> children
      this.initializeAttributes();
      this.setupGeometry();
      this.setupResizeObserver();
      this.setupChildObserver();

      // Disable transitions during initial setup
      this.classList.add('no-transitions');

      // One-time window resize handler
      if (!this.#resizeHandler) {
        this.#resizeHandler = (): void => {
          this.withoutTransitions(() => {
            this.updateDimensions();
            this.updateLines();
          });
        };
        window.addEventListener('resize', this.#resizeHandler);
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

  disconnectedCallback(): void {
    if (this.#resizeObserver) {
      this.#resizeObserver.disconnect();
      this.#resizeObserver = null;
    }
    if (this.#childObserver) {
      this.#childObserver.disconnect();
      this.#childObserver = null;
    }
    if (this.#resizeHandler) {
      window.removeEventListener('resize', this.#resizeHandler);
      this.#resizeHandler = null;
    }
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    this.handleAttributeChange({ name, oldValue, newValue });
  }

  /**
   * Executes a callback with transitions temporarily disabled.
   * @param callback - The function to execute without transitions
   */
  withoutTransitions(callback: () => void): void {
    this.classList.add('no-transitions');
    callback();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.classList.remove('no-transitions');
      });
    });
  }

  /**
   * Selects an option by index and updates the selector.
   * @param index - The index of the option to select
   */
  selectIndex(index: number): void {
    if (index >= 0 && index < this.#options.length) {
      this.#currentIndex = index;
      this.updateSelector();
      // Update value attribute (only if it's different to avoid triggering change handler)
      const currentOption = this.#options[this.#currentIndex];
      if (currentOption) {
        const currentValue = this.getAttribute('value');
        if (currentValue !== currentOption.value) {
          this.setAttribute('value', currentOption.value);
        }
      }
    }
  }

  handleAttributeChange({ name, oldValue, newValue }: AttributeChangeParams): void {
    const ATTRIBUTE_HANDLERS: Record<string, () => void> = {
      mode: () => this.handleModeChange(),
      'time-selection-delay': () => this.updateSelectionDelay(),
      'one-sided': () => this.handleOneSidedChange(),
      value: () => this.handleValueChange(newValue),
      onchange: () => {
        // onchange attribute changes are handled automatically
        // No action needed here
      },
    };

    ATTRIBUTE_HANDLERS[name]?.();
  }

  handleOneSidedChange(): void {
    if (this.#isInitialized) {
      // Rebuild component when one-sided mode changes
      this.rebuildComponent();
    }
  }

  handleModeChange(): void {
    if (this.#isInitialized) {
      // Rebuild component when mode changes
      this.rebuildComponent();
    }
  }

  handleValueChange(newValue: string | null): void {
    if (newValue && this.#isInitialized) {
      const index = domHelper.findOptionIndexByValue(this.#options, newValue);
      if (index !== -1 && index !== this.#currentIndex) {
        this.#currentIndex = index;
        this.updateSelector();
      }
    }
  }

  setInitialSelection(): void {
    const valueAttr = this.getAttribute('value');
    if (valueAttr) {
      const index = domHelper.findOptionIndexByValue(this.#options, valueAttr);
      if (index !== -1) {
        this.#currentIndex = index;
        this.#previousIndex = index;
      }
    }
    // Always set the value attribute to keep it in sync
    if (this.#options.length > 0 && this.#currentIndex >= 0) {
      const currentOption = this.#options[this.#currentIndex];
      if (currentOption) {
        this.setAttribute('value', currentOption.value);
      }
    }
  }

  rebuildComponent(): void {
    this.#labels = [];
    this.#lines = [];
    this.#spokeAngles = [];
    this.#currentIndex = 0;
    this.#previousIndex = -1;
    this.#isInitialized = false;
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

  setupChildObserver(): void {
    this.#childObserver = new MutationObserver((mutations) => {
      if (domHelper.shouldRebuildFromMutations(mutations) && this.#isInitialized) {
        this.initializeOptions();
        this.rebuildComponent();
      }
    });

    this.#childObserver.observe(this, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['value', 'line-length'],
      characterData: true,
    });
  }

  updateSelectionDelay(): void {
    const result = dimensionsHelper.computeSelectionDelay(
      this.getAttribute('time-selection-delay'),
      mathHelper.roundToThousandths
    );

    if (result) {
      this.style.setProperty('--time-selection-delay', result.delay);
      if (result.disableTransitions) {
        this.style.setProperty('--indicator-transition', 'none');
        this.style.setProperty('--line-transition', 'none');
      } else {
        this.style.removeProperty('--indicator-transition');
        this.style.removeProperty('--line-transition');
      }
    } else {
      this.style.removeProperty('--time-selection-delay');
      this.style.removeProperty('--indicator-transition');
      this.style.removeProperty('--line-transition');
    }
  }

  setupResizeObserver(): void {
    if (typeof ResizeObserver !== 'undefined') {
      this.#resizeObserver = new ResizeObserver(() => {
        this.withoutTransitions(() => {
          this.updateDimensions();
          this.updateLines();
        });
      });
      this.#resizeObserver.observe(this);
    }
  }

  validateContainer(): boolean {
    const containerWidth = this.getBoundingClientRect().width;
    if (containerWidth === 0) {
      return false;
    }
    const knobWrap = this.shadowRoot!.querySelector('.knob-wrap');
    const selector = this.shadowRoot!.querySelector('.selector');
    return !!(knobWrap && selector);
  }

  calculateScale(): number {
    const knobWrap = this.shadowRoot!.querySelector('.knob-wrap')!;
    const actualSize = knobWrap.getBoundingClientRect().width;

    const { knobWrapSize, scale } = dimensionsHelper.calculateKnobScale({
      actualSize,
      baseSize: KNOB.WRAP_SIZE,
      roundFn: mathHelper.roundToThousandths,
    });

    this.#knobWrapSize = knobWrapSize;
    return scale;
  }

  updateKnobRadii(): KnobRadii {
    return dimensionsHelper.parseKnobRadii({
      computedStyle: getComputedStyle(this),
      defaults: KNOB,
      roundFn: mathHelper.roundToThousandths,
    });
  }

  updateScaledDimensions(): void {
    const dims = dimensionsHelper.parseDimensionsFromCSS({
      computedStyle: getComputedStyle(this),
      defaults: { LINE, HIT_AREA },
      roundFn: mathHelper.roundToThousandths,
    });

    this.#horizontalLineLength = dims.horizontalLineLength;
    this.#maxSpokeLength = dims.maxSpokeLength;
    this.#hitAreaStrokeWidth = dims.hitAreaStrokeWidth;
    this.#horizontalLineEndOffset = dims.horizontalLineEndOffset;
  }

  /**
   * Updates all component dimensions based on CSS values.
   * Reads CSS custom properties and updates internal dimension values for positioning.
   */
  updateDimensions(): void {
    if (!this.validateContainer()) {
      return;
    }

    this.calculateScale();
    this.updateKnobRadii();
    this.updateScaledDimensions();
    // Label positions now update automatically via CSS custom properties
  }

  buildDOM(): void {
    // Use imported styles and template
    this.shadowRoot!.innerHTML = getStyles() + getTemplate();
  }

  /**
   * Checks if spokes mode is enabled.
   * @returns True if mode="spokes" attribute is set
   */
  isSpokesMode(): boolean {
    return this.getAttribute('mode') === 'spokes';
  }

  /**
   * Gets the one-sided configuration from the attribute.
   * @returns The side to show options on, or null for both sides
   */
  getOneSidedConfig(): OneSidedConfig {
    return configHelper.parseOneSidedValue(this.getAttribute('one-sided'));
  }

  calculateAngles(): void {
    const { leftCount, rightCount, spokeAngles } = configHelper.calculateSideCounts({
      optionCount: this.#options.length,
      oneSided: this.getOneSidedConfig(),
      arcs: ARCS,
      generateAngles: mathHelper.generateArcAngles,
    });

    this.#leftCount = leftCount;
    this.#rightCount = rightCount;
    this.#spokeAngles = spokeAngles;
  }

  createLabelsAndLines(): void {
    // Ensure DOM is built
    if (!this.shadowRoot || !this.shadowRoot.querySelector('#lineContainer')) {
      this.buildDOM();
    }

    const leftColumn = this.shadowRoot!.querySelector('#leftColumn') as HTMLElement | null;
    const rightColumn = this.shadowRoot!.querySelector('#rightColumn') as HTMLElement | null;
    const lineContainer = this.shadowRoot!.querySelector('#lineContainer') as SVGElement | null;
    const knobWrap = this.shadowRoot!.querySelector('.knob-wrap') as HTMLElement | null;
    const advanceButton = this.shadowRoot!.querySelector('#advanceButton');
    const oneSided = this.getOneSidedConfig();
    const isSpokes = this.isSpokesMode();

    // Clear existing content
    domHelper.clearContainers({ leftColumn, rightColumn, lineContainer, knobWrap });
    this.#hitAreas = [];

    // Update one-sided state on host element for CSS styling
    if (oneSided) {
      this.setAttribute('data-one-sided', oneSided);
    } else {
      this.removeAttribute('data-one-sided');
    }

    this.#options.forEach((option, index) => {
      const { isLeft, container, angle } = this.resolveOptionPlacement({
        index,
        oneSided,
        isSpokes,
        knobWrap,
        leftColumn,
        rightColumn,
      });

      // Create label
      const label = domHelper.createLabelElement({
        option,
        index,
        angle,
        isLeft,
        isSpokes,
        onClick: () => this.selectIndex(index),
      });
      if (container) container.appendChild(label);
      this.#labels.push(label);

      // Create hit area and line
      const hitArea = domHelper.createHitAreaElement({
        index,
        hitAreaStrokeWidth: this.#hitAreaStrokeWidth,
        onClick: () => this.selectIndex(index),
      });
      const line = domHelper.createLineElement({
        index,
        strokeWidth: LINE.STROKE_WIDTH,
        opacity: OPACITY.LINE_INACTIVE,
      });

      lineContainer!.appendChild(hitArea);
      lineContainer!.appendChild(line);
      this.#lines.push(line);
      this.#hitAreas.push(hitArea);
    });

    if (advanceButton) {
      advanceButton.addEventListener('click', () => {
        this.selectIndex((this.#currentIndex + 1) % this.#options.length);
      });
    }
    // Label positioning is now handled automatically by CSS
  }

  /**
   * Resolves the placement (side, container, angle) for an option.
   */
  resolveOptionPlacement({
    index,
    oneSided,
    isSpokes,
    knobWrap,
    leftColumn,
    rightColumn,
  }: ResolveOptionPlacementParams): OptionPlacementResult {
    const { isLeft, angleIndex } = configHelper.resolveOptionSide({
      index,
      oneSided,
      leftCount: this.#leftCount,
      rightCount: this.#rightCount,
    });

    const container = isSpokes ? knobWrap : isLeft ? leftColumn : rightColumn;
    return { isLeft, container, angle: this.#spokeAngles[angleIndex] };
  }

  // Label positioning is now handled entirely by CSS using sin() and cos()
  // See styles.js .dial-label and :host([mode="spokes"]) .dial-label.spokes

  updateLines(): void {
    const knobWrap = this.shadowRoot!.querySelector('.knob-wrap');
    if (!knobWrap) return;

    const isSpokes = this.isSpokesMode();
    const knobCenter = this.#knobWrapSize / 2;
    const centerX = knobCenter;
    const centerY = knobCenter;
    // Get the actual knob radius from CSS variable, with fallback to default
    const computedStyle = getComputedStyle(this);
    const radiusOuter = computedStyle.getPropertyValue('--radius-outer').trim() || '90px';
    const knobRadius = mathHelper.roundToThousandths(parseFloat(radiusOuter));

    if (isSpokes) {
      this.updateSpokesLines(centerX, centerY, knobRadius);
    } else {
      this.updateStandardLines(knobWrap as HTMLElement, centerX, centerY, knobRadius);
    }
  }

  updateStandardLines(knobWrap: HTMLElement, centerX: number, centerY: number, knobRadius: number): void {
    const leftCenterIndex = this.#leftCount % 2 === 1 ? Math.floor(this.#leftCount / 2) : -1;
    const rightCenterIndex = this.#rightCount % 2 === 1 ? Math.floor(this.#rightCount / 2) : -1;

    // Calculate geometry data for all labels
    const labelData: LabelData[] = this.#labels.map((label, index) => {
      const optionIndex = parseInt(label.dataset.index!, 10);
      const option = this.#options[optionIndex];

      const geom = linesHelper.calculateLabelGeometry({
        angle: parseFloat(label.dataset.angle!),
        isLeft: label.dataset.isLeft === 'true',
        optionIndex,
        customLineLength: option?.lineLength ?? null,
        leftCount: this.#leftCount,
        leftCenterIndex,
        rightCenterIndex,
        centerX,
        centerY,
        knobRadius,
        maxSpokeLength: this.#maxSpokeLength,
      });

      return { label, index, ...geom };
    });

    // Calculate column positions
    const { leftColumnX, rightColumnX } = linesHelper.calculateColumnPositions(labelData, this.#horizontalLineLength);

    // Draw lines and position labels
    labelData.forEach((data) => {
      const { label, index, isLeft, isCenterOption, spokeStartX, spokeStartY, spokeEndX, spokeEndY, horizontalStartY } =
        data;

      const horizontalLength = linesHelper.calculateHorizontalLength({
        useRadial: data.useRadial,
        customLineLength: data.customLineLength,
        isLeft,
        spokeEndX,
        leftColumnX,
        rightColumnX,
      });

      const { horizontalEndX, horizontalEndY } = linesHelper.calculateHorizontalEnd({
        isLeft,
        spokeEndX,
        horizontalLength,
        horizontalStartY,
      });

      // Build and apply line points
      const points = linesHelper.buildLinePoints({
        horizontalLength,
        isCenterOption,
        spokeStartX,
        spokeStartY,
        spokeEndX,
        spokeEndY,
        horizontalStartY,
        horizontalEndX,
        horizontalEndY,
      });

      this.#lines[index].setAttribute('points', points);
      if (this.#hitAreas[index]) {
        this.#hitAreas[index].setAttribute('points', points);
      }

      // Ensure label is in knobWrap
      if (label.parentElement !== knobWrap) {
        knobWrap.appendChild(label);
      }

      // Position label inline first
      const inlinePosition = labelsHelper.calculateInlineLabelPosition({
        isLeft,
        horizontalEndX,
        horizontalEndY,
        labelGap: this.#horizontalLineEndOffset,
      });
      labelsHelper.applyLabelPosition(label, inlinePosition);

      // Check for overflow and reposition if needed
      const hostRect = this.getBoundingClientRect();
      const labelRect = label.getBoundingClientRect();
      const labelOverflows = labelsHelper.detectLabelOverflow({ isLeft, labelRect, hostRect });

      if (labelOverflows && horizontalLength > 0) {
        const overflowPosition = labelsHelper.calculateOverflowLabelPosition({
          horizontalEndX,
          horizontalEndY,
          centerY,
        });
        labelsHelper.applyLabelPosition(label, overflowPosition);
      }
    });
  }

  updateSpokesLines(centerX: number, centerY: number, knobRadius: number): void {
    this.#labels.forEach((label, index) => {
      const { points } = linesHelper.calculateSpokeEndpoints({
        angle: parseFloat(label.dataset.angle!),
        centerX,
        centerY,
        knobRadius,
        spokeLength: this.#maxSpokeLength,
        labelGap: this.#horizontalLineEndOffset,
      });

      this.#lines[index].setAttribute('points', points);
      if (this.#hitAreas[index]) {
        this.#hitAreas[index].setAttribute('points', points);
      }
    });
  }

  /**
   * Updates the selector indicator position and active states.
   */
  updateSelector(): void {
    if (this.#labels.length === 0) return;

    const targetAngle = parseFloat(this.#labels[this.#currentIndex].dataset.angle!);

    if (!this.#isInitialized) {
      this.#currentAngle = mathHelper.roundToThousandths(targetAngle);
      this.#isInitialized = true;
      this.#previousIndex = this.#currentIndex;
    } else {
      // Calculate the shortest angular path to the target
      const delta = geometryHelper.calculateShortestRotation(this.#currentAngle, targetAngle, FULL_CIRCLE_DEGREES);
      this.#currentAngle = mathHelper.roundToThousandths(this.#currentAngle + delta);
    }

    this.style.setProperty('--indicator-angle', `${mathHelper.roundToThousandths(this.#currentAngle)}deg`);

    domHelper.updateActiveStates({
      labels: this.#labels,
      lines: this.#lines,
      activeIndex: this.#currentIndex,
      activeOpacity: OPACITY.LINE_ACTIVE,
      inactiveOpacity: OPACITY.LINE_INACTIVE,
    });

    // Dispatch change event if the selection actually changed
    if (this.#previousIndex !== this.#currentIndex && this.#isInitialized) {
      eventsHelper.dispatchDialChangeEvent({
        element: this,
        currentOption: this.#options[this.#currentIndex],
        previousOption: this.#options[this.#previousIndex],
        currentIndex: this.#currentIndex,
        previousIndex: this.#previousIndex,
      });
      this.#previousIndex = this.#currentIndex;
    }
  }
}

customElements.define('dial-selector', DialSelector);
