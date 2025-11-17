"use client";

import { SyllablesData } from "@/lib/syllables";

interface SyllablesDisplayProps {
  data: SyllablesData;
  className?: string;
}

/**
 * Component for displaying Hebrew text divided into syllables
 * Each syllable is wrapped in a span with a border and rounded corners
 */
export function SyllablesDisplay({
  data,
  className = "",
}: SyllablesDisplayProps) {
  return (
    <div
      className={`w-full min-h-[500px] p-4 border rounded-lg bg-background text-right text-lg md:text-xl ${className}`}
      dir="rtl"
    >
      <div className="flex flex-wrap gap-x-3 gap-y-2 items-center justify-start" dir="rtl">
        {data.words.map((wordEntry, wordIndex) => (
          <div
            key={wordIndex}
            className="inline-flex flex-wrap gap-x-1 items-center"
            dir="rtl"
          >
            {wordEntry.syllables.map((syllable, syllableIndex) => (
              <span
                key={`${wordIndex}-${syllableIndex}`}
                className="inline-block px-2 py-1 border-2 border-blue-500 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-900 dark:text-blue-100 font-medium text-right"
                dir="rtl"
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

