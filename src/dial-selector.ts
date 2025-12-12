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

import { getStyles } from './styles';
import { getTemplate } from './template';
import * as mathHelper from './helpers/math';
import * as geometryHelper from './helpers/geometry';
import * as configHelper from './helpers/config';
import * as dimensionsHelper from './helpers/dimensions';
import * as linesHelper from './helpers/lines';
import * as labelsHelper from './helpers/labels';
import * as domHelper from './helpers/dom';
import * as eventsHelper from './helpers/events';
import * as overlayHelper from './helpers/overlay';
import * as formHelper from './helpers/form';
import * as selectorHelper from './helpers/selector';
import * as attributesHelper from './helpers/attributes';
import * as lineUpdater from './helpers/line-updater';
import * as navigationHelper from './helpers/navigation';
import * as selectionHelper from './helpers/selection';
import type { DOMCache } from './helpers/dom';
import type { DialOption, OneSidedConfig, LabelData, KnobRadii, DialSelectorEventMap } from './types';

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

/** Computed geometry based on options and configuration */
type GeometryCache = {
  leftCount: number;
  rightCount: number;
  spokeAngles: number[];
};

/**
 * A custom web component that renders a dial selector interface with labels,
 * lines, and an interactive knob. Supports responsive sizing, custom styling,
 * and various configuration options via HTML attributes.
 */
class DialSelector extends HTMLElement {
  // Form-associated custom element support
  static formAssociated = true;
  #internals: ElementInternals | null = null;

  // Core selection state
  #currentIndex: number = 0;
  #previousIndex: number = -1;
  #currentAngle: number = 0;
  #isInitialized: boolean = false;

  // DOM element arrays (created during setup)
  #labels: HTMLLabelElement[] = [];
  #lines: SVGPolylineElement[] = [];
  #hitAreas: SVGPolylineElement[] = [];

  // Options and configuration
  #options: DialOption[] = [];
  #geometry: GeometryCache | null = null;

  // Form reset support
  #initialValue: string | null = null;

  // Observers (need references for cleanup)
  #resizeObserver: ResizeObserver | null = null;
  #childObserver: MutationObserver | null = null;

  // Event handlers (need references for cleanup)
  #resizeHandler: (() => void) | null = null;
  #keydownHandler: ((event: KeyboardEvent) => void) | null = null;
  #mousedownHandler: (() => void) | null = null;
  #advanceButtonHandler: (() => void) | null = null;

  // Cached references (populated once after DOM build)
  #dom: DOMCache | null = null;
  #cachedComputedStyle: CSSStyleDeclaration | null = null;

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

    // Initialize ElementInternals for form integration
    if ('attachInternals' in this) {
      this.#internals = this.attachInternals();
    }
  }

  static observedAttributes = ATTRIBUTES;

  // Form-associated element getters
  get form(): HTMLFormElement | null {
    return this.#internals?.form ?? null;
  }

  get name(): string | null {
    return this.getAttribute('name');
  }

  get type(): string {
    return 'dial-selector';
  }

  get validity(): ValidityState | undefined {
    return this.#internals?.validity;
  }

  get validationMessage(): string {
    return this.#internals?.validationMessage ?? '';
  }

  get willValidate(): boolean {
    return this.#internals?.willValidate ?? false;
  }

  checkValidity(): boolean {
    return this.#internals?.checkValidity() ?? true;
  }

  reportValidity(): boolean {
    return this.#internals?.reportValidity() ?? true;
  }

  /**
   * Called when the form is reset.
   * Resets to the initial value attribute that was set when the component connected.
   */
  formResetCallback(): void {
    const { newIndex, newValue } = formHelper.handleFormReset({
      initialValue: this.#initialValue,
      options: this.#options,
      findOptionByValue: domHelper.findOptionIndexByValue,
    });

    this.#currentIndex = newIndex;
    this.#previousIndex = newIndex; // Prevent change event on reset
    this.updateSelector();
    this.#updateFormValue();
    this.setAttribute('value', newValue);
  }

  /**
   * Called when the form is disabled.
   */
  formDisabledCallback(disabled: boolean): void {
    if (disabled) {
      this.setAttribute('disabled', '');
    } else {
      this.removeAttribute('disabled');
    }
  }

  /**
   * Called when form state is restored (e.g., after navigation).
   */
  formStateRestoreCallback(state: string | FormData | File | null, mode: 'restore' | 'autocomplete'): void {
    const index = formHelper.handleFormStateRestore(state, this.#options, domHelper.findOptionIndexByValue);
    if (index !== -1) {
      this.#currentIndex = index;
      this.updateSelector();
    }
  }

  /**
   * Updates the form value via ElementInternals.
   */
  #updateFormValue(): void {
    const currentOption = this.#options[this.#currentIndex];
    if (currentOption) {
      formHelper.updateFormValue(this.#internals, currentOption.value);
    }
  }

  connectedCallback(): void {
    // Store the initial value attribute for form reset (only on first connect)
    if (this.#initialValue === null) {
      this.#initialValue = this.getAttribute('value');
    }

    // Build DOM if shadow root is empty (first connect or after framework re-render)
    if (!this.shadowRoot || this.shadowRoot.innerHTML === '') {
      this.buildDOM();
    }

    // Do everything that depends on children in the *next task*,
    // so the parser has had time to create <dial-option> children.
    const init = (): void => {
      // Initialize options from child elements
      const childOptions = Array.from(this.querySelectorAll('dial-option'));
      this.#options = configHelper.parseChildOptions(childOptions, DEFAULT_OPTIONS);

      // Initialize attributes
      this.updateSelectionAnimation();
      this.updateSelectionDelay();
      this.updateHeight();
      this.updateDimensions();

      // Setup geometry
      this.calculateAngles();
      this.updateDimensions();
      this.createLabelsAndLines();

      // Setup observers and event handlers
      this.setupResizeObserver();
      this.setupChildObserver();
      this.setupKeyboardNavigation();

      // Disable transitions during initial setup
      this.classList.add('no-transitions');

      // One-time window resize handler
      if (!this.#resizeHandler) {
        this.#resizeHandler = (): void => {
          // Invalidate cached computed style on resize
          this.#invalidateComputedStyleCache();
          this.withoutTransitions(() => {
            this.updateDimensions();
            this.updateLines();
          });
        };
        window.addEventListener('resize', this.#resizeHandler);
      }

      this.setInitialSelection();

      // Finalize initialization after delay
      setTimeout(() => {
        this.updateLines();
        this.updateSelector();
        // Re-enable transitions after initial setup
        this.classList.remove('no-transitions');
      }, ANIMATION.INITIALIZATION_DELAY);
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
    // Clean up event listeners on labels and hit areas to prevent memory leaks
    domHelper.cleanupEventListeners(this.#labels, this.#hitAreas);

    // Clean up advance button handler
    if (this.#advanceButtonHandler) {
      const advanceButton = this.shadowRoot?.querySelector('#advanceButton');
      advanceButton?.removeEventListener('click', this.#advanceButtonHandler);
      this.#advanceButtonHandler = null;
    }

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
    if (this.#keydownHandler) {
      this.removeEventListener('keydown', this.#keydownHandler);
      this.#keydownHandler = null;
    }
    if (this.#mousedownHandler) {
      this.removeEventListener('mousedown', this.#mousedownHandler);
      this.#mousedownHandler = null;
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
    attributesHelper.withoutTransitions(this, callback);
  }

  /**
   * Checks if the component is disabled.
   * @returns True if the disabled attribute is present
   */
  get disabled(): boolean {
    return this.hasAttribute('disabled');
  }

  /**
   * Sets the disabled state of the component.
   * @param value - Whether to disable the component
   */
  set disabled(value: boolean) {
    if (value) {
      this.setAttribute('disabled', '');
    } else {
      this.removeAttribute('disabled');
    }
  }

  /**
   * Gets the current selected value.
   */
  get value(): string {
    const option = this.#options[this.#currentIndex];
    return option?.value ?? '';
  }

  /**
   * Sets the selected value by finding the matching option.
   */
  set value(newValue: string) {
    this.selectValue(newValue);
  }

  /**
   * Gets the current selected index.
   */
  get currentIndex(): number {
    return this.#currentIndex;
  }

  /**
   * Gets the current selected option's label.
   */
  get currentLabel(): string {
    const option = this.#options[this.#currentIndex];
    return option?.label ?? '';
  }

  /**
   * Gets the current selected option object.
   */
  get currentOption(): DialOption | undefined {
    return this.#options[this.#currentIndex];
  }

  /**
   * Gets the total number of options.
   */
  get optionCount(): number {
    return this.#options.length;
  }

  /**
   * Gets all option objects.
   */
  get options(): readonly DialOption[] {
    return [...this.#options];
  }

  /**
   * Selects an option by its value.
   * @param value - The value to select
   * @returns True if the option was found and selected, false otherwise
   */
  selectValue(value: string): boolean {
    if (this.disabled) return false;
    const index = selectionHelper.selectByValue({
      value,
      options: this.#options,
      findOptionByValue: domHelper.findOptionIndexByValue,
    });
    if (index !== -1) {
      this.selectIndex(index);
      return true;
    }
    return false;
  }

  /**
   * Selects the next option in the list (wraps around).
   */
  next(): void {
    if (this.disabled || this.#options.length === 0) return;
    const nextIndex = selectionHelper.calculateNextIndex({
      currentIndex: this.#currentIndex,
      optionCount: this.#options.length,
    });
    this.selectIndex(nextIndex);
  }

  /**
   * Selects the previous option in the list (wraps around).
   */
  previous(): void {
    if (this.disabled || this.#options.length === 0) return;
    const prevIndex = selectionHelper.calculatePreviousIndex({
      currentIndex: this.#currentIndex,
      optionCount: this.#options.length,
    });
    this.selectIndex(prevIndex);
  }

  /**
   * Handles keyboard events for navigation.
   * @param event - The keyboard event
   */
  #handleKeydown(event: KeyboardEvent): void {
    if (this.disabled) return;

    const result = navigationHelper.handleKeyboardEvent(event);

    if (result.shouldPreventDefault) {
      event.preventDefault();
      navigationHelper.enableKeyboardNav(this);
    }

    switch (result.action) {
      case 'next':
        this.next();
        break;
      case 'previous':
        this.previous();
        break;
      case 'first':
        this.selectIndex(0);
        break;
      case 'last':
        this.selectIndex(this.#options.length - 1);
        break;
      case 'confirm':
        this.updateSelector();
        break;
    }
  }

  /**
   * Sets up keyboard event handling and ARIA attributes for the component.
   */
  setupKeyboardNavigation(): void {
    navigationHelper.setupARIAAttributes(this, 'Dial selector');

    // Create bound handler for cleanup
    this.#keydownHandler = (event: KeyboardEvent) => this.#handleKeydown(event);
    this.addEventListener('keydown', this.#keydownHandler);

    // Track mouse interaction to disable keyboard nav styling
    this.#mousedownHandler = () => navigationHelper.disableKeyboardNav(this);
    this.addEventListener('mousedown', this.#mousedownHandler);
  }

  /**
   * Selects an option by index and updates the selector.
   * @param index - The index of the option to select
   */
  selectIndex(index: number): void {
    // Don't allow selection changes when disabled
    if (this.disabled) return;

    if (selectionHelper.isValidIndex(index, this.#options.length)) {
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
      // Update form value for form integration
      this.#updateFormValue();
    }
  }

  handleAttributeChange({ name, oldValue, newValue }: AttributeChangeParams): void {
    const ATTRIBUTE_HANDLERS: Record<string, () => void> = {
      disabled: () => this.handleDisabledChange(),
      mode: () => this.handleModeChange(),
      'time-selection-animation': () => this.updateSelectionAnimation(),
      'time-selection-delay': () => this.updateSelectionDelay(),
      'one-sided': () => this.handleOneSidedChange(),
      value: () => this.handleValueChange(newValue),
      height: () => this.updateHeight(),
    };

    ATTRIBUTE_HANDLERS[name]?.();
  }

  handleDisabledChange(): void {
    const isDisabled = this.hasAttribute('disabled');
    // Update internal state - interaction blocking is handled in selectIndex
    if (isDisabled) {
      this.setAttribute('aria-disabled', 'true');
    } else {
      this.removeAttribute('aria-disabled');
    }
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
    const { index, value } = selectionHelper.setInitialSelection({
      valueAttr: this.getAttribute('value'),
      options: this.#options,
      findOptionByValue: domHelper.findOptionIndexByValue,
    });

    this.#currentIndex = index;
    this.#previousIndex = index;

    if (value) {
      this.setAttribute('value', value);
    }

    // Set initial form value
    this.#updateFormValue();
  }

  rebuildComponent(): void {
    this.#labels = [];
    this.#lines = [];
    this.#geometry = null;
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
        // Re-parse child options before rebuilding
        const childOptions = Array.from(this.querySelectorAll('dial-option'));
        this.#options = configHelper.parseChildOptions(childOptions, DEFAULT_OPTIONS);
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

  updateSelectionAnimation(): void {
    attributesHelper.updateSelectionAnimation({
      element: this,
      attrValue: this.getAttribute('time-selection-animation'),
      roundFn: mathHelper.roundToThousandths,
    });
  }

  updateSelectionDelay(): void {
    attributesHelper.updateSelectionDelay({
      element: this,
      attrValue: this.getAttribute('time-selection-delay'),
      roundFn: mathHelper.roundToThousandths,
    });
  }

  updateHeight(): void {
    attributesHelper.updateHeight({
      element: this,
      heightValue: this.getAttribute('height'),
    });
  }

  setupResizeObserver(): void {
    if (typeof ResizeObserver !== 'undefined') {
      this.#resizeObserver = new ResizeObserver(() => {
        // Invalidate cached computed style on resize as CSS values may change
        this.#invalidateComputedStyleCache();
        this.withoutTransitions(() => {
          this.updateDimensions();
          this.updateLines();
        });
      });
      this.#resizeObserver.observe(this);
    }
  }

  /**
   * Updates all component dimensions based on CSS values.
   * Reads CSS custom properties and updates internal dimension values for positioning.
   */
  updateDimensions(): void {
    if (!this.#dom) return;

    // Validate container
    if (!dimensionsHelper.validateContainer({ element: this, dom: this.#dom })) {
      return;
    }

    if (!this.#dom.knobWrap) return;

    // Calculate all dimensions
    const dims = dimensionsHelper.updateDimensionsState({
      computedStyle: this.#getComputedStyleCached(),
      knobWrapActualSize: this.#dom.knobWrap.getBoundingClientRect().width,
      baseKnobSize: KNOB.WRAP_SIZE,
      defaults: { LINE, HIT_AREA, KNOB },
      roundFn: mathHelper.roundToThousandths,
    });

    // Update instance variables
    this.#knobWrapSize = dims.knobWrapSize;
    this.#horizontalLineLength = dims.horizontalLineLength;
    this.#maxSpokeLength = dims.maxSpokeLength;
    this.#hitAreaStrokeWidth = dims.hitAreaStrokeWidth;
    this.#horizontalLineEndOffset = dims.horizontalLineEndOffset;
    // Label positions now update automatically via CSS custom properties
  }

  buildDOM(): void {
    // Use imported styles and template
    this.shadowRoot!.innerHTML = getStyles() + getTemplate();
    // Cache DOM references after building
    this.#dom = domHelper.cacheElements(this.shadowRoot);
  }

  /**
   * Gets the cached computed style, refreshing if needed.
   * @returns The computed style for this element
   */
  #getComputedStyleCached(): CSSStyleDeclaration {
    if (!this.#cachedComputedStyle) {
      this.#cachedComputedStyle = getComputedStyle(this);
    }
    return this.#cachedComputedStyle;
  }

  /**
   * Invalidates the cached computed style (call after style changes).
   */
  #invalidateComputedStyleCache(): void {
    this.#cachedComputedStyle = null;
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
    this.#geometry = configHelper.calculateSideCounts({
      optionCount: this.#options.length,
      oneSided: this.getOneSidedConfig(),
      arcs: ARCS,
      generateAngles: mathHelper.generateArcAngles,
    });
  }

  createLabelsAndLines(): void {
    // Ensure DOM is built and elements are cached
    if (!this.shadowRoot || !this.#dom?.lineContainer) {
      this.buildDOM();
    }

    const { leftColumn, rightColumn, lineContainer, knobWrap, advanceButton } = this.#dom!;
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

    // Keep the dial-layout-overlay in sync with the current options and layout.
    if (this.shadowRoot) {
      overlayHelper.rebuildDialLayoutOverlay({
        shadowRoot: this.shadowRoot,
        options: this.#options,
        geometry: this.#geometry!,
        oneSided: this.getOneSidedConfig(),
      });
    }

    if (advanceButton) {
      // Store handler reference for cleanup
      this.#advanceButtonHandler = () => {
        this.selectIndex((this.#currentIndex + 1) % this.#options.length);
      };
      advanceButton.addEventListener('click', this.#advanceButtonHandler);
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
    const { leftCount, rightCount, spokeAngles } = this.#geometry!;
    const { isLeft, angleIndex } = configHelper.resolveOptionSide({
      index,
      oneSided,
      leftCount,
      rightCount,
    });

    const container = isSpokes ? knobWrap : isLeft ? leftColumn : rightColumn;
    return { isLeft, container, angle: spokeAngles[angleIndex] };
  }

  // Label positioning is now handled entirely by CSS using sin() and cos()
  // See styles.js .dial-label and :host([mode="spokes"]) .dial-label.spokes

  updateLines(): void {
    if (!this.#dom?.knobWrap) return;

    lineUpdater.updateLines({
      isSpokes: this.isSpokesMode(),
      knobWrapSize: this.#knobWrapSize,
      computedStyle: this.#getComputedStyleCached(),
      roundFn: mathHelper.roundToThousandths,
      labels: this.#labels,
      lines: this.#lines,
      hitAreas: this.#hitAreas,
      options: this.#options,
      geometry: this.#geometry!,
      knobWrap: this.#dom.knobWrap,
      parentElement: this.parentElement,
      maxSpokeLength: this.#maxSpokeLength,
      horizontalLineLength: this.#horizontalLineLength,
      horizontalLineEndOffset: this.#horizontalLineEndOffset,
    });
  }

  /**
   * Updates the selector indicator position and active states.
   */
  updateSelector(): void {
    if (this.#labels.length === 0) return;

    const targetAngle = parseFloat(this.#labels[this.#currentIndex].dataset.angle!);

    // Calculate new angle
    const { newAngle, shouldInitialize } = selectorHelper.calculateSelectorAngle({
      targetAngle,
      currentAngle: this.#currentAngle,
      isInitialized: this.#isInitialized,
      fullCircleDegrees: FULL_CIRCLE_DEGREES,
      calculateShortestRotation: geometryHelper.calculateShortestRotation,
      roundFn: mathHelper.roundToThousandths,
    });

    this.#currentAngle = newAngle;

    if (shouldInitialize) {
      this.#isInitialized = true;
      this.#previousIndex = this.#currentIndex;
    }

    // Update CSS indicator angle
    selectorHelper.updateIndicatorAngle(this, this.#currentAngle, mathHelper.roundToThousandths);

    // Update active states
    domHelper.updateActiveStates({
      labels: this.#labels,
      lines: this.#lines,
      activeIndex: this.#currentIndex,
      activeOpacity: OPACITY.LINE_ACTIVE,
      inactiveOpacity: OPACITY.LINE_INACTIVE,
    });

    // Update ARIA active descendant
    selectorHelper.updateActiveDescendant(this, this.#labels[this.#currentIndex]);

    // Dispatch change event if the selection actually changed
    if (this.#previousIndex !== this.#currentIndex && this.#isInitialized) {
      const currentOption = this.#options[this.#currentIndex];

      // Announce to screen readers
      if (currentOption) {
        selectorHelper.announceSelection(this.#dom?.liveRegion ?? null, currentOption.label);
      }

      eventsHelper.dispatchDialChangeEvent({
        element: this,
        currentOption,
        previousOption: this.#options[this.#previousIndex],
        currentIndex: this.#currentIndex,
        previousIndex: this.#previousIndex,
      });
      this.#previousIndex = this.#currentIndex;
    }
  }
}

// Strongly-typed event listener overloads for DialSelector
// These enable type inference for event.detail when using addEventListener('change', ...)
declare module './dial-selector' {
  interface DialSelector {
    addEventListener<K extends keyof DialSelectorEventMap>(
      type: K,
      listener: (this: DialSelector, ev: DialSelectorEventMap[K]) => void,
      options?: boolean | AddEventListenerOptions
    ): void;
    addEventListener(
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | AddEventListenerOptions
    ): void;

    removeEventListener<K extends keyof DialSelectorEventMap>(
      type: K,
      listener: (this: DialSelector, ev: DialSelectorEventMap[K]) => void,
      options?: boolean | EventListenerOptions
    ): void;
    removeEventListener(
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | EventListenerOptions
    ): void;
  }
}

// Global augmentation for HTMLElementTagNameMap
// Enables type inference when using document.querySelector('dial-selector')
declare global {
  interface HTMLElementTagNameMap {
    'dial-selector': DialSelector;
  }
}

customElements.define('dial-selector', DialSelector);

// Export the class and event types for consumers
export { DialSelector };
export type {
  DialOption,
  DialChangeEventDetail,
  DialChangeEvent,
  DialSelectorEventMap,
  DialChangeHandler,
} from './types';
