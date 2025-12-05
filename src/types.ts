/**
 * Shared TypeScript types for the dial-selector component.
 */

/** A single option in the dial selector */
export type DialOption = {
  value: string;
  label: string;
  htmlContent: string | null;
  lineLength: number | null;
};

/** One-sided mode configuration */
export type OneSidedConfig = 'left' | 'right' | null;

/** CSS position data for label elements */
export type LabelPosition = {
  left: string;
  right: string;
  top: string;
  transform: string;
  textAlign: string;
  belowLine?: boolean;
};

/** Geometry data for a label's line */
export type LabelGeometry = {
  angle: number;
  angleRad: number;
  isLeft: boolean;
  optionIndex: number;
  customLineLength: number | null;
  useRadial: boolean;
  isCenterOption: boolean;
  spokeStartX: number;
  spokeStartY: number;
  spokeEndX: number;
  spokeEndY: number;
  horizontalStartY: number;
};

/** Extended label data including the element reference */
export type LabelData = LabelGeometry & {
  label: HTMLLabelElement;
  index: number;
};

/** Side counts and angles configuration */
export type SideCountsResult = {
  leftCount: number;
  rightCount: number;
  spokeAngles: number[];
};

/** Option side resolution result */
export type OptionSideResult = {
  isLeft: boolean;
  angleIndex: number;
};

/** Knob scale calculation result */
export type KnobScaleResult = {
  knobWrapSize: number;
  knobCenter: number;
  scale: number;
};

/** Knob radii from CSS */
export type KnobRadii = {
  scaledRadiusOuter: number;
  scaledRadiusInner: number;
};

/** Parsed dimension values from CSS */
export type ParsedDimensions = {
  horizontalLineLength: number;
  maxSpokeLength: number;
  hitAreaStrokeWidth: number;
  horizontalLineEndOffset: number;
};

/** Selection delay configuration */
export type SelectionDelayResult = {
  delay: string;
  disableTransitions: boolean;
};

/** Column X positions for label alignment */
export type ColumnPositions = {
  leftColumnX: number;
  rightColumnX: number;
};

/** Horizontal line end position */
export type HorizontalEndPosition = {
  horizontalEndX: number;
  horizontalEndY: number;
};

/** Spoke intersection result */
export type SpokeIntersection = {
  intersectX: number;
  intersectY: number;
};

/** Spoke endpoints result */
export type SpokeEndpoints = {
  spokeStartX: number;
  spokeStartY: number;
  spokeEndX: number;
  spokeEndY: number;
  points: string;
};

/** Change event detail */
export type DialChangeEventDetail = {
  value: string;
  label: string;
  index: number;
  previousValue: string;
  previousLabel: string;
  previousIndex: number;
};

/** Strongly-typed change event for the dial selector */
export type DialChangeEvent = CustomEvent<DialChangeEventDetail>;

/** Event map for DialSelector component */
export interface DialSelectorEventMap extends HTMLElementEventMap {
  change: DialChangeEvent;
}

/** Event handler type for the onchange property */
export type DialChangeHandler = ((this: HTMLElement, event: DialChangeEvent) => void) | null;
