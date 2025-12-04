/**
 * Configuration parsing functions for the dial-selector component.
 */

/**
 * Parses the one-sided attribute value.
 * @param {string | null} value - The attribute value
 * @returns {'left' | 'right' | null} The normalized side, or null for both sides
 */
export function parseOneSidedValue(value) {
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

