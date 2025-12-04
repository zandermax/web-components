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
export const ATTRIBUTES = ['mode', 'onchange', 'one-sided', 'time-selection-delay', 'value'];

export const FULL_CIRCLE_DEGREES = 360;

// Configuration constants
export const DEFAULT_OPTIONS = ['AUX', 'CD', 'PHONO-1', 'PHONO-2', 'STREAM', 'TAPE', 'TUNER', 'TV'];

// Arc base values - left side is primary, right side is derived
// Note: the base axis is based on polar coordinates, so 0° is directly to the right, 180° is directly to the left.
const LEFT_START_DEGREES = 135;
const ARC_SPAN = 90;
const LEFT_END_DEGREES = LEFT_START_DEGREES + ARC_SPAN;
const HALF_CIRCLE = FULL_CIRCLE_DEGREES / 2; // 180 degrees

export const ARCS = {
  // Left side (base values)
  LEFT_START: LEFT_START_DEGREES,
  LEFT_END: LEFT_END_DEGREES,
  // Right side (derived from left side - 180° offset)
  RIGHT_START: LEFT_START_DEGREES - HALF_CIRCLE,
  RIGHT_END: LEFT_END_DEGREES - HALF_CIRCLE,
};

export const KNOB = {
  WRAP_SIZE: 320,
  RADIUS_OUTER: 90,
  RADIUS_INNER: 72,
};

export const LABEL = {
  COLUMN_HEIGHT: 320,
  VERTICAL_OFFSET_SCALE: 140,
};

export const LINE = {
  HORIZONTAL_LENGTH: 100,
  MAX_SPOKE_LENGTH: 80,
  STROKE_WIDTH: 2,
  HORIZONTAL_END_OFFSET: 10,
};

export const INDICATOR = {
  WIDTH: 10, // Default indicator width
};

export const HIT_AREA = {
  STROKE_WIDTH: 20,
};

export const OPACITY = {
  LINE_INACTIVE: 0.4,
  LINE_ACTIVE: 0.8,
};

export const ANIMATION = {
  INITIALIZATION_DELAY: 100,
};

export const THRESHOLDS = {
  NEARLY_HORIZONTAL: 0.0001,
};

export const COLORS = {
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
