/**
 * All attributes that can be set on the component.
 *
 * `disabled`: Disables the dial selector, preventing user interaction.
 *
 * `mode`: Sets the layout mode for the dial selector. Values:
 *         - "spokes": Positions labels radially around the dial at the ends of spoke lines,
 *           eliminating horizontal line segments and side columns for a more space-efficient layout.
 *           Labels remain horizontal for readability.
 *
 * `one-sided`: Show options only on one side. Values: "left", "inline-start", "right", "inline-end"
 *
 * `time-selection-animation`: The duration of the knob rotation animation in milliseconds. Example: "500"
 *
 * `time-selection-delay`: The delay before selection animation in milliseconds. Example: "250"
 *
 * `value`: The initial selected value. Must match the value attribute of a child dial-option element.
 *
 * `height`: Sets the height of the component. Can be any valid CSS height value. Example: "400px", "50vh", "100%"
 *
 * Note: For change events, use addEventListener('change', handler) or set the onchange property via JS.
 * The onchange HTML attribute is not supported for security reasons.
 */
export const ATTRIBUTES = [
  'disabled',
  'mode',
  'one-sided',
  'time-selection-animation',
  'time-selection-delay',
  'value',
  'height',
] as const;

export const FULL_CIRCLE_DEGREES = 360 as const;

// Configuration constants
export const DEFAULT_OPTIONS = ['AUX', 'CD', 'PHONO-1', 'PHONO-2', 'STREAM', 'TAPE', 'TUNER', 'TV'] as const;

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
} as const;

export const KNOB = {
  WRAP_SIZE: 320,
  RADIUS_OUTER: 90,
  RADIUS_INNER: 72,
} as const;

export const LINE = {
  HORIZONTAL_LENGTH: 100,
  MAX_SPOKE_LENGTH: 80,
  STROKE_WIDTH: 2,
  HORIZONTAL_END_OFFSET: 10,
} as const;

export const HIT_AREA = {
  STROKE_WIDTH: 20,
} as const;

export const OPACITY = {
  LINE_INACTIVE: 0.4,
  LINE_ACTIVE: 0.8,
} as const;

export const INDICATOR = {
  LENGTH: 60,
  WIDTH: 10,
} as const;

export const COMPONENT = {
  MIN_WIDTH: 200,
  MIN_HEIGHT: 200,
} as const;

export const LAYOUT = {
  LABEL_COLUMN_HEIGHT: 320,
  LABEL_VERTICAL_OFFSET_SCALE: 140,
} as const;

export const ANIMATION = {
  INITIALIZATION_DELAY: 100,
} as const;
