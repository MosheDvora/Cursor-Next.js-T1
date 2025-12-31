"use client";

/**
 * ReadingSettingsDrawer Component
 * 
 * A slide-out drawer panel for adjusting typography and display settings.
 * Features animated UI elements, RTL support, and persists settings to localStorage/Supabase.
 * 
 * Design inspired by v2/Reading Setting Drawer/ReadingSettingsDrawer.jsx
 * 
 * Features:
 * - Floating settings button with rotation animation on hover
 * - Smooth slide-in/out drawer transition
 * - Backdrop blur overlay
 * - Accordion-style sections for organized settings
 * - Live preview sliders for typography controls
 * - Reset to defaults functionality
 */

import React, { useState } from "react";
import { Settings, X, ChevronDown, Type } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Props for the ReadingSettingsDrawer component
 * All values are controlled by parent component for live preview
 */
interface ReadingSettingsDrawerProps {
  /** Current font size in pixels (16-48) */
  fontSize: number;
  /** Current word spacing in pixels (0-50) */
  wordSpacing: number;
  /** Current line height multiplier (1.2-3.0) */
  lineHeight: number;
  /** Current letter spacing in pixels (0-20) */
  letterSpacing: number;
  /** Current font family name */
  fontFamily: string;
  /** Callback when font size changes */
  onFontSizeChange: (value: number) => void;
  /** Callback when word spacing changes */
  onWordSpacingChange: (value: number) => void;
  /** Callback when line height changes */
  onLineHeightChange: (value: number) => void;
  /** Callback when letter spacing changes */
  onLetterSpacingChange: (value: number) => void;
  /** Callback when font family changes */
  onFontFamilyChange: (value: string) => void;
  /** Callback to reset all settings to defaults */
  onReset: () => void;
}

/**
 * Slider control component for typography settings
 * Displays a labeled range input with current value badge
 */
interface SliderControlProps {
  /** Display label for the slider */
  label: string;
  /** Current value */
  value: number;
  /** Minimum value */
  min: number;
  /** Maximum value */
  max: number;
  /** Step increment (default: 1) */
  step?: number;
  /** Unit suffix for display (e.g., "px") */
  unit?: string;
  /** Callback when value changes */
  onChange: (value: number) => void;
  /** Number of decimal places to display */
  decimals?: number;
}

/**
 * Slider control with label, value display, and range input
 */
const SliderControl: React.FC<SliderControlProps> = ({
  label,
  value,
  min,
  max,
  step = 1,
  unit = "",
  onChange,
  decimals = 0,
}) => (
  <div className="space-y-2">
    <div className="flex justify-between text-xs text-slate-600">
      <span className="font-medium">{label}</span>
      <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-mono">
        {value.toFixed(decimals)}{unit}
      </span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 hover:accent-indigo-700"
    />
    <div className="flex justify-between text-xs text-slate-400">
      <span>{min}{unit}</span>
      <span>{max}{unit}</span>
    </div>
  </div>
);

/**
 * ReadingSettingsDrawer - Main drawer component
 * 
 * Provides a floating action button and slide-out panel with typography controls
 */
export const ReadingSettingsDrawer: React.FC<ReadingSettingsDrawerProps> = ({
  fontSize,
  wordSpacing,
  lineHeight,
  letterSpacing,
  fontFamily,
  onFontSizeChange,
  onWordSpacingChange,
  onLineHeightChange,
  onLetterSpacingChange,
  onFontFamilyChange,
  onReset,
}) => {
  /** Controls drawer visibility */
  const [isOpen, setIsOpen] = useState(false);
  
  /** Controls reset button spinning animation */
  const [isResetting, setIsResetting] = useState(false);

  /**
   * Handle reset button click with animation
   * Shows spinning animation while resetting
   */
  const handleReset = () => {
    setIsResetting(true);
    onReset();
    // Reset animation after 500ms
    setTimeout(() => setIsResetting(false), 500);
  };

  return (
    <div dir="rtl" className="relative">
      {/* Floating Action Button - Opens the drawer */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-20 left-4 p-3 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 hover:scale-110 transition-all z-40 group"
        aria-label="פתח הגדרות תצוגה"
        data-testid="settings-drawer-trigger"
      >
        <Settings
          size={24}
          className="group-hover:rotate-90 transition-transform duration-300"
        />
      </button>

      {/* Backdrop Overlay - Closes drawer when clicked */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity animate-in fade-in duration-200"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Drawer Panel */}
      <div
        className={`fixed inset-y-0 left-0 w-96 bg-white shadow-2xl z-50 transform ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } transition-transform duration-300 ease-in-out border-r border-slate-200`}
        role="dialog"
        aria-labelledby="drawer-title"
        aria-modal="true"
      >
        {/* Drawer Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-gradient-to-l from-indigo-50/50 to-white sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Settings className="text-indigo-600" size={20} />
            </div>
            <h2
              id="drawer-title"
              className="font-bold text-slate-800 text-lg"
            >
              הגדרות תצוגה
            </h2>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-lg transition-colors"
            aria-label="סגור"
            data-testid="settings-drawer-close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Drawer Content - Scrollable area with accordion sections */}
        <div className="overflow-y-auto h-[calc(100vh-160px)] p-5 space-y-3">
          {/* Typography Accordion Section */}
          <details
            className="group border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
            open
          >
            <summary className="flex items-center justify-between p-4 cursor-pointer bg-white hover:bg-slate-50 list-none transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-indigo-50 rounded-lg">
                  <Type size={18} className="text-indigo-600" />
                </div>
                <span className="font-semibold text-slate-700">טיפוגרפיה</span>
              </div>
              <ChevronDown
                size={18}
                className="text-slate-400 group-open:rotate-180 transition-transform duration-200"
              />
            </summary>
            <div className="p-4 pt-2 space-y-5 bg-slate-50/30">
              {/* Font Size Slider */}
              <SliderControl
                label="גודל גופן"
                value={fontSize}
                min={16}
                max={48}
                unit="px"
                onChange={onFontSizeChange}
              />

              {/* Word Spacing Slider */}
              <SliderControl
                label="רווח בין מילים"
                value={wordSpacing}
                min={0}
                max={50}
                unit="px"
                onChange={onWordSpacingChange}
              />

              {/* Line Height Slider */}
              <SliderControl
                label="גובה שורה"
                value={lineHeight}
                min={1.2}
                max={3}
                step={0.1}
                decimals={1}
                onChange={onLineHeightChange}
              />

              {/* Letter Spacing Slider */}
              <SliderControl
                label="ריווח אותיות"
                value={letterSpacing}
                min={0}
                max={20}
                unit="px"
                onChange={onLetterSpacingChange}
              />

              {/* Font Family Selection */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-600 block">
                  משפחת גופן
                </label>
                <Select value={fontFamily} onValueChange={onFontFamilyChange}>
                  <SelectTrigger
                    className="w-full text-right bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    dir="rtl"
                    data-testid="drawer-font-family-select"
                  >
                    <SelectValue placeholder="בחר גופן" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Inter" className="text-right">
                      Inter
                    </SelectItem>
                    <SelectItem value="Frank Ruhl Libre" className="text-right">
                      Frank Ruhl Libre
                    </SelectItem>
                    <SelectItem value="דנה יד" className="text-right">
                      דנה יד
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </details>
        </div>

        {/* Drawer Footer - Reset Button */}
        <div className="p-4 border-t border-slate-200 bg-white sticky bottom-0">
          <button
            onClick={handleReset}
            className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-colors flex items-center justify-center gap-2 group"
            data-testid="settings-drawer-reset"
          >
            <svg
              className={`w-4 h-4 transition-transform duration-500 ${
                isResetting ? "animate-spin" : "group-hover:rotate-180"
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            איפוס להגדרות ברירת מחדל
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReadingSettingsDrawer;

