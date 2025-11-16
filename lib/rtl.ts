/**
 * RTL (Right-to-Left) utility functions
 * 
 * This module provides utilities for handling RTL layout and direction.
 * All components and pages should use these utilities to ensure proper RTL support.
 */

export type Direction = "ltr" | "rtl";

/**
 * Get the current text direction
 * @param locale - Optional locale string (e.g., "he", "ar", "en")
 * @returns "rtl" for RTL languages, "ltr" for LTR languages
 */
export function getDirection(locale?: string): Direction {
  if (!locale) {
    // Default to checking browser/document direction
    if (typeof document !== "undefined") {
      return document.documentElement.dir === "rtl" ? "rtl" : "ltr";
    }
    return "ltr";
  }

  // RTL languages
  const rtlLocales = ["he", "ar", "fa", "ur", "yi", "ji"];
  return rtlLocales.includes(locale.toLowerCase()) ? "rtl" : "ltr";
}

/**
 * Get margin/padding direction-aware class
 * @param direction - Current direction ("ltr" or "rtl")
 * @param ltrClass - Class to use for LTR (e.g., "ml-4")
 * @param rtlClass - Class to use for RTL (e.g., "mr-4")
 * @returns The appropriate class based on direction
 */
export function getDirectionalClass(
  direction: Direction,
  ltrClass: string,
  rtlClass: string
): string {
  return direction === "rtl" ? rtlClass : ltrClass;
}

/**
 * Get text alignment class based on direction
 * @param direction - Current direction ("ltr" or "rtl")
 * @returns "text-right" for RTL, "text-left" for LTR
 */
export function getTextAlignClass(direction: Direction): string {
  return direction === "rtl" ? "text-right" : "text-left";
}

/**
 * Reverse array order for RTL layouts
 * @param items - Array of items
 * @param direction - Current direction
 * @returns Original array for LTR, reversed for RTL
 */
export function getDirectionalArray<T>(
  items: T[],
  direction: Direction
): T[] {
  return direction === "rtl" ? [...items].reverse() : items;
}

