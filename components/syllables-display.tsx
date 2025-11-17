"use client";

import { SyllablesData } from "@/lib/syllables";

interface SyllablesDisplayProps {
  data: SyllablesData;
  className?: string;
  borderSize?: number;
  backgroundColor?: string;
  wordSpacing?: number;
}

/**
 * Component for displaying Hebrew text divided into syllables
 * Each syllable is wrapped in a span with a border and rounded corners
 */
export function SyllablesDisplay({
  data,
  className = "",
  borderSize = 2,
  backgroundColor = "#dbeafe",
  wordSpacing = 12,
}: SyllablesDisplayProps) {
  return (
    <div
      className={`w-full min-h-[500px] p-4 border rounded-lg bg-background text-right text-lg md:text-xl ${className}`}
      dir="rtl"
    >
      <div 
        className="flex flex-wrap gap-y-2 items-center justify-start" 
        dir="rtl"
        style={{ gap: `${wordSpacing}px` }}
      >
        {data.words.map((wordEntry, wordIndex) => (
          <div
            key={wordIndex}
            className="inline-flex flex-wrap gap-x-1 items-center"
            dir="rtl"
          >
            {wordEntry.syllables.map((syllable, syllableIndex) => (
              <span
                key={`${wordIndex}-${syllableIndex}`}
                className="inline-block px-2 py-1 rounded-lg font-medium text-right"
                dir="rtl"
                style={{
                  borderWidth: `${borderSize}px`,
                  borderColor: "#3b82f6", // blue-500
                  backgroundColor: backgroundColor,
                  color: "#1e40af", // blue-900
                }}
              >
                {syllable}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

