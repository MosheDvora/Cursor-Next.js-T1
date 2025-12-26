/**
 * Custom hook for managing morphological analysis state
 * 
 * This hook:
 * - Manages morphology analysis results, loading state, and errors
 * - Caches results in localStorage for persistence
 * - Integrates with the morphology-service for API calls
 * - Works with the niqqud hook to ensure text is properly vocalized before analysis
 */

import { useState, useCallback, useEffect } from "react";
import {
  analyzeMorphology,
  getMorphologyConfig,
  MorphologyWord,
  ValidationResult,
  MorphologyServiceResponse,
} from "@/services/morphology-service";
import {
  SETTINGS_KEYS,
  getMorphologyRawResponse,
  saveMorphologyRawResponse,
} from "@/lib/settings";

// ==================== TYPES ====================

/**
 * Single word result with validation
 */
export interface MorphologyResult {
  data: MorphologyWord;
  validation: ValidationResult;
}

/**
 * Hook return type
 */
export interface UseMorphologyReturn {
  /** Array of analyzed words with validation results */
  results: MorphologyResult[] | null;
  /** Raw JSON response from the API */
  rawResponse: string | null;
  /** Whether the analysis is currently in progress */
  isLoading: boolean;
  /** Error message if analysis failed */
  error: string | null;
  /** Function to perform morphological analysis on text */
  analyze: (text: string) => Promise<MorphologyServiceResponse>;
  /** Function to clear analysis results and cache */
  clearResults: () => void;
  /** Function to clear error state */
  clearError: () => void;
}

// ==================== HOOK ====================

/**
 * Hook for managing morphological analysis
 * 
 * @returns Object with results, loading state, error, and control functions
 * 
 * @example
 * ```tsx
 * const { results, isLoading, error, analyze, clearResults } = useMorphology();
 * 
 * // To analyze text
 * await analyze("הַיְלָדִים הוֹלְכִים לְבֵית הַסֵּפֶר");
 * 
 * // Results are automatically saved to localStorage
 * // and will be restored on page reload
 * ```
 */
export function useMorphology(): UseMorphologyReturn {
  // State for analysis results
  const [results, setResults] = useState<MorphologyResult[] | null>(null);
  const [rawResponse, setRawResponse] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load cached results from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const savedRawResponse = getMorphologyRawResponse();
      if (savedRawResponse) {
        setRawResponse(savedRawResponse);

        // Try to parse the cached results
        try {
          let jsonStr = savedRawResponse;
          // Handle markdown code block formatting
          if (jsonStr.startsWith('```')) {
            jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```$/g, '').trim();
          }
          
          const parsed = JSON.parse(jsonStr);
          const resultsArray = Array.isArray(parsed) ? parsed : [parsed];
          
          // Note: We don't re-validate on load to avoid overhead
          // The validation was done when the results were first received
          const loadedResults = resultsArray.map((item: MorphologyWord) => ({
            data: item,
            validation: { valid: true, errors: [] }, // Assume valid from cache
          }));
          
          setResults(loadedResults);
          console.log("[useMorphology] Loaded cached results", {
            wordCount: loadedResults.length,
          });
        } catch (parseError) {
          console.warn("[useMorphology] Failed to parse cached results", parseError);
          // Keep raw response for display, but don't set parsed results
        }
      }
    } catch (loadError) {
      console.error("[useMorphology] Failed to load from localStorage", loadError);
    }
  }, []);

  /**
   * Performs morphological analysis on the given text
   * 
   * @param text - The vocalized Hebrew text to analyze
   * @returns The analysis response (also stored in state)
   */
  const analyze = useCallback(async (text: string): Promise<MorphologyServiceResponse> => {
    setIsLoading(true);
    setError(null);

    try {
      // Get configuration from settings
      const config = getMorphologyConfig();

      console.log("[useMorphology] Starting analysis", {
        textLength: text.length,
        textPreview: text.substring(0, 50),
        model: config.model,
        hasApiKey: !!config.apiKey,
      });

      // Perform analysis
      const response = await analyzeMorphology(text, config);

      if (!response.success) {
        setError(response.error || "שגיאה לא ידועה בניתוח מורפולוגי");
        setIsLoading(false);
        return response;
      }

      // Store results
      if (response.results) {
        setResults(response.results);
      }

      // Store raw response
      if (response.rawResponse) {
        setRawResponse(response.rawResponse);
        // Save to localStorage for persistence
        saveMorphologyRawResponse(response.rawResponse);
      }

      console.log("[useMorphology] Analysis complete", {
        wordCount: response.results?.length || 0,
        validCount: response.results?.filter(r => r.validation.valid).length || 0,
      });

      setIsLoading(false);
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "שגיאה לא צפויה בניתוח מורפולוגי";
      setError(errorMessage);
      setIsLoading(false);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }, []);

  /**
   * Clears analysis results from state and localStorage
   */
  const clearResults = useCallback(() => {
    setResults(null);
    setRawResponse(null);
    setError(null);

    // Clear from localStorage
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(SETTINGS_KEYS.MORPHOLOGY_RAW_RESPONSE);
      } catch (clearError) {
        console.error("[useMorphology] Failed to clear localStorage", clearError);
      }
    }

    console.log("[useMorphology] Results cleared");
  }, []);

  /**
   * Clears error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    results,
    rawResponse,
    isLoading,
    error,
    analyze,
    clearResults,
    clearError,
  };
}

