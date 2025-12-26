/**
 * Service for performing morphological analysis on Hebrew text using OpenRouter API
 * 
 * This service:
 * - Sends vocalized Hebrew text to OpenRouter API for morphological analysis
 * - Validates the returned JSON structure
 * - Returns structured morphological data for each word
 * 
 * Based on the morphological analysis logic from v2/hebrew_morphology_app_v2.jsx
 */

import { getSettings, DEFAULT_MORPHOLOGY_PROMPT } from "@/lib/settings";

// ==================== TYPES ====================

/**
 * Valid part of speech values
 */
export const VALID_POS = new Set([
  'noun', 'verb', 'adjective', 'pronoun', 'preposition',
  'adverb', 'conjunction', 'proper_noun', 'particle', 'numeral',
  'quantifier', 'interrogative'
]);

/**
 * Valid morphology part types
 */
export const VALID_TYPES = new Set(['prefix', 'stem', 'suffix']);

/**
 * Valid morphology part roles
 */
export const VALID_ROLES = new Set([
  'conjunction', 'definite_article', 'preposition', 'relativizer', 'question',
  'stem', 'plural', 'dual', 'possessive', 'tense_person', 'object_pronoun',
  'directional', 'construct'
]);

/**
 * Valid binyanim (verb patterns)
 */
export const VALID_BINYANIM = new Set([
  'paal', 'nifal', 'piel', 'pual', 'hifil', 'hufal', 'hitpael'
]);

/**
 * Valid gizrot (verb root patterns)
 */
export const VALID_GIZROT = new Set([
  'shlemim', 'ayin_vav', 'ayin_yod', 'peh_nun', 'peh_yod',
  'lamed_heh', 'lamed_alef', 'kfulim', 'peh_alef'
]);

/**
 * Morphology part structure
 */
export interface MorphologyPart {
  text: string;
  type: 'prefix' | 'stem' | 'suffix';
  role: string;
}

/**
 * Niqqud mark structure
 */
export interface NiqqudMark {
  mark: string;
  name: string;
  position?: number;
}

/**
 * Single word morphological analysis result
 */
export interface MorphologyWord {
  word: string;
  pos: string;
  morphology_parts: MorphologyPart[];
  syllables: string[];
  root: string | null;
  binyan: string | null;
  gizra: string | null;
  tense: string | null;
  person: string | null;
  gender: string | null;
  number: string | null;
  construct_state: 'absolute' | 'construct';
  definiteness: 'definite' | 'indefinite';
  frequency: number;
  level: string;
  related_words: string[] | null;
  niqqud: NiqqudMark[];
  confidence: number;
}

/**
 * Validation result structure
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Service configuration
 */
export interface MorphologyServiceConfig {
  apiKey: string;
  model: string;
  prompt?: string;
  temperature?: number;
}

/**
 * Service response structure
 */
export interface MorphologyServiceResponse {
  success: boolean;
  results?: Array<{
    data: MorphologyWord;
    validation: ValidationResult;
  }>;
  rawResponse?: string;
  error?: string;
}

// ==================== CONSTANTS ====================

/**
 * OpenRouter API URL
 */
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

// ==================== VALIDATION ====================

/**
 * Validates a single morphology word response
 * Checks for required fields, valid enum values, and integrity rules
 * 
 * @param item - The word analysis result to validate
 * @returns ValidationResult with valid flag and list of errors
 */
export function validateMorphologyWord(item: MorphologyWord): ValidationResult {
  const errors: string[] = [];
  const required = ['word', 'pos', 'morphology_parts', 'syllables', 'confidence'];

  // Check required fields
  for (const field of required) {
    if (!(field in item)) {
      errors.push(`שדה חסר: ${field}`);
    }
  }
  if (errors.length > 0) {
    return { valid: false, errors };
  }

  const word = item.word;

  // Validate POS
  if (!VALID_POS.has(item.pos)) {
    errors.push(`POS לא תקין: '${item.pos}'`);
  }

  // Validate confidence range
  const conf = item.confidence;
  if (typeof conf !== 'number' || conf < 0 || conf > 1) {
    errors.push(`confidence חייב להיות 0.0-1.0, קיבלנו: ${conf}`);
  }

  // Validate morphology parts
  if (Array.isArray(item.morphology_parts)) {
    for (let i = 0; i < item.morphology_parts.length; i++) {
      const part = item.morphology_parts[i];
      if (!('text' in part)) {
        errors.push(`חלק ${i} חסר 'text'`);
      }
      if (!('type' in part)) {
        errors.push(`חלק ${i} חסר 'type'`);
      } else if (!VALID_TYPES.has(part.type)) {
        errors.push(`חלק ${i} type לא תקין: '${part.type}'`);
      }
      if (!('role' in part)) {
        errors.push(`חלק ${i} חסר 'role'`);
      } else if (!VALID_ROLES.has(part.role)) {
        errors.push(`חלק ${i} role לא תקין: '${part.role}'`);
      }
    }

    // Validate morphology parts integrity - joined text should equal word
    const partsJoined = item.morphology_parts.map(p => p.text || '').join('');
    if (partsJoined !== word) {
      errors.push(`שלמות morphology: '${partsJoined}' ≠ '${word}'`);
    }
  }

  // Validate syllables integrity - joined syllables should equal word
  if (Array.isArray(item.syllables)) {
    const syllablesJoined = item.syllables.join('');
    if (syllablesJoined !== word) {
      errors.push(`שלמות syllables: '${syllablesJoined}' ≠ '${word}'`);
    }
  }

  // Validate binyan if present
  if (item.binyan && !VALID_BINYANIM.has(item.binyan)) {
    errors.push(`בניין לא תקין: '${item.binyan}'`);
  }

  // Validate gizra if present
  if (item.gizra && !VALID_GIZROT.has(item.gizra)) {
    errors.push(`גזרה לא תקינה: '${item.gizra}'`);
  }

  return { valid: errors.length === 0, errors };
}

// ==================== PROMPT BUILDER ====================

/**
 * Builds the prompt for morphological analysis
 * Uses the configured prompt template and replaces {text} with the input
 * 
 * @param text - The vocalized Hebrew text to analyze
 * @param promptTemplate - The prompt template (optional, uses default if not provided)
 * @returns The complete prompt ready for the API
 */
export function buildMorphologyPrompt(text: string, promptTemplate?: string): string {
  const template = promptTemplate || DEFAULT_MORPHOLOGY_PROMPT;
  return template.replace('{text}', text);
}

// ==================== API CALL ====================

/**
 * Analyzes Hebrew text morphologically using OpenRouter API
 * 
 * This function:
 * 1. Validates configuration
 * 2. Builds the prompt with the input text
 * 3. Sends request to OpenRouter API
 * 4. Parses and validates the JSON response
 * 5. Returns structured results with validation status
 * 
 * @param text - The vocalized Hebrew text to analyze
 * @param config - API configuration (apiKey, model, prompt, temperature)
 * @returns Promise with analysis results or error
 */
export async function analyzeMorphology(
  text: string,
  config: MorphologyServiceConfig
): Promise<MorphologyServiceResponse> {
  // Validate input
  if (!text || text.trim().length === 0) {
    return {
      success: false,
      error: "טקסט ריק",
    };
  }

  // Validate API key
  if (!config.apiKey || config.apiKey.trim().length === 0) {
    return {
      success: false,
      error: "API Key לא הוגדר. אנא הגדר ב-הגדרות",
    };
  }

  // Validate model
  if (!config.model || config.model.trim().length === 0) {
    return {
      success: false,
      error: "מודל שפה לא נבחר. אנא בחר מודל ב-הגדרות",
    };
  }

  try {
    // Build the prompt
    const prompt = buildMorphologyPrompt(text, config.prompt);

    // Prepare request body for OpenRouter API (OpenAI-compatible format)
    const requestBody = {
      model: config.model,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 8000,
      ...(config.temperature !== undefined && { temperature: config.temperature }),
    };

    // Prepare headers for OpenRouter
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${config.apiKey}`,
      "HTTP-Referer": typeof window !== "undefined" ? window.location.origin : "https://localhost",
      "X-Title": "Hebrew Reading App - Morphology Analysis",
    };

    console.log("[MorphologyService] Sending request to OpenRouter", {
      model: config.model,
      textLength: text.length,
      textPreview: text.substring(0, 50),
    });

    // Send request to OpenRouter
    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
    });

    // Handle API errors
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("[MorphologyService] OpenRouter API error", {
        status: response.status,
        statusText: response.statusText,
        errorData,
      });
      return {
        success: false,
        error:
          errorData.error?.message ||
          `שגיאת API: ${response.status} ${response.statusText}`,
      };
    }

    // Parse response
    const data = await response.json();

    // Extract content from response
    if (
      !data.choices ||
      !data.choices[0] ||
      !data.choices[0].message ||
      !data.choices[0].message.content
    ) {
      return {
        success: false,
        error: "תגובה לא תקינה מהמודל",
      };
    }

    const rawContent = data.choices[0].message.content.trim();

    console.log("[MorphologyService] Received response", {
      contentLength: rawContent.length,
      contentPreview: rawContent.substring(0, 100),
    });

    // Parse JSON from response (handle potential markdown code blocks)
    let jsonStr = rawContent;
    if (jsonStr.startsWith('```')) {
      // Remove markdown code block formatting
      jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```$/g, '').trim();
    }

    // Parse the JSON
    let parsed: MorphologyWord | MorphologyWord[];
    try {
      parsed = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("[MorphologyService] JSON parse error", {
        error: parseError,
        jsonStr: jsonStr.substring(0, 200),
      });
      return {
        success: false,
        rawResponse: rawContent,
        error: "שגיאה בפענוח תגובת JSON מהמודל",
      };
    }

    // Ensure we have an array
    const resultsArray = Array.isArray(parsed) ? parsed : [parsed];

    // Validate each word result
    const validatedResults = resultsArray.map(item => ({
      data: item,
      validation: validateMorphologyWord(item),
    }));

    console.log("[MorphologyService] Analysis complete", {
      wordCount: validatedResults.length,
      validCount: validatedResults.filter(r => r.validation.valid).length,
    });

    return {
      success: true,
      results: validatedResults,
      rawResponse: rawContent,
    };
  } catch (error) {
    console.error("[MorphologyService] Unexpected error", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "שגיאה לא צפויה בניתוח מורפולוגי",
    };
  }
}

/**
 * Gets the effective API key for morphology analysis
 * Returns either the dedicated morphology API key or the niqqud API key based on settings
 * 
 * @returns The API key to use for morphology analysis
 */
export function getMorphologyApiKey(): string {
  const settings = getSettings();
  
  // If user chose to use niqqud API key and it exists, use it
  if (settings.morphologyUseNiqqudKey && settings.niqqudApiKey) {
    return settings.niqqudApiKey;
  }
  
  // Otherwise use the dedicated morphology API key
  return settings.morphologyApiKey || "";
}

/**
 * Gets the full morphology configuration from settings
 * Resolves the API key based on the useNiqqudKey setting
 * 
 * @returns MorphologyServiceConfig ready for use
 */
export function getMorphologyConfig(): MorphologyServiceConfig {
  const settings = getSettings();
  
  return {
    apiKey: getMorphologyApiKey(),
    model: settings.morphologyModel,
    prompt: settings.morphologyPrompt,
    temperature: settings.morphologyTemperature,
  };
}

