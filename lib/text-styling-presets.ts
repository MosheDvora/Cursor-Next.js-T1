/**
 * Text Styling Presets Configuration
 * 
 * This module defines styling presets that can be applied to text display elements
 * (words, syllables, letters) in viewing mode. Each preset consists of CSS classes
 * that modify the visual appearance of text elements.
 * 
 * Presets are applied via className composition, allowing for easy extension
 * and customization of text styling options.
 */

/**
 * Configuration for a text styling preset
 * 
 * @property id - Unique identifier for the preset (e.g., "default", "neon-border")
 * @property displayName - Human-readable name displayed in the dropdown (in Hebrew)
 * @property wordClasses - CSS classes to apply to word elements (combines with pyramid-word-base)
 * @property syllableClasses - CSS classes to apply to syllable elements (combines with pyramid-syllable-base)
 * @property letterClasses - CSS classes to apply to letter elements (combines with pyramid-letter-base)
 */
export interface TextStylingPreset {
  id: string;
  displayName: string;
  wordClasses: string;
  syllableClasses: string;
  letterClasses: string;
}

/**
 * Dictionary of all available text styling presets
 * 
 * Each preset defines CSS classes that are applied in addition to the base
 * pyramid-*-base classes. Empty strings mean no additional styling.
 */
const TEXT_STYLING_PRESETS: Record<string, TextStylingPreset> = {
  /**
   * Default preset - no additional styling
   * This preserves the original appearance of text elements
   */
  default: {
    id: "default",
    displayName: "ברירת מחדל",
    wordClasses: "",
    syllableClasses: "",
    letterClasses: "",
  },
  
  /**
   * Neon border preset - adds a thin neon green border around words
   * Creates a subtle neon glow effect for visual emphasis
   */
  "neon-border": {
    id: "neon-border",
    displayName: "מסגרת נאון",
    wordClasses: "text-style-neon-border-word",
    syllableClasses: "",
    letterClasses: "",
  },
};

/**
 * Get a styling preset by ID
 * 
 * @param id - The preset identifier
 * @returns The preset configuration, or the default preset if not found
 * 
 * @example
 * const preset = getPreset("neon-border");
 * // Returns: { id: "neon-border", displayName: "מסגרת נאון", ... }
 */
export function getPreset(id: string | null | undefined): TextStylingPreset {
  if (!id || !TEXT_STYLING_PRESETS[id]) {
    return TEXT_STYLING_PRESETS.default;
  }
  return TEXT_STYLING_PRESETS[id];
}

/**
 * Get all available styling presets
 * 
 * Useful for populating dropdown menus or preset selection UI
 * 
 * @returns Array of all preset configurations
 * 
 * @example
 * const presets = getAllPresets();
 * // Returns: [{ id: "default", ... }, { id: "neon-border", ... }]
 */
export function getAllPresets(): TextStylingPreset[] {
  return Object.values(TEXT_STYLING_PRESETS);
}

/**
 * Get preset IDs as an array
 * 
 * Useful for type checking or validation
 * 
 * @returns Array of all preset IDs
 */
export function getPresetIds(): string[] {
  return Object.keys(TEXT_STYLING_PRESETS);
}

