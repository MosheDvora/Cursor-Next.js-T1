/**
 * Service for adding niqqud to Hebrew text using language model API
 */

import { isGoogleModel, getApiUrl } from "@/lib/settings";
import { hasNiqqud, removeNiqqud } from "@/lib/niqqud";

// Debug: Verify imports
if (typeof hasNiqqud !== "function") {
  console.error("[NiqqudService] hasNiqqud is not a function!", typeof hasNiqqud);
}
if (typeof removeNiqqud !== "function") {
  console.error("[NiqqudService] removeNiqqud is not a function!", typeof removeNiqqud);
}

export interface NiqqudServiceConfig {
  apiKey: string;
  model: string;
  apiUrl?: string; // Optional custom API URL
  temperature?: number; // Optional temperature (default: 1.0)
  systemPrompt?: string; // Optional system-level instructions
  userPrompt?: string; // Optional user message template (with {text} placeholder)
}

export interface NiqqudServiceResponse {
  success: boolean;
  niqqudText?: string;
  error?: string;
}

/**
 * Add niqqud to Hebrew text using language model API
 * @param text - Hebrew text without niqqud
 * @param config - API configuration
 * @returns Promise with niqqud text or error
 */
export async function addNiqqud(
  text: string,
  config: NiqqudServiceConfig
): Promise<NiqqudServiceResponse> {
  if (!text || text.trim().length === 0) {
    return {
      success: false,
      error: "טקסט ריק",
    };
  }

  if (!config.apiKey || config.apiKey.trim().length === 0) {
    return {
      success: false,
      error: "API Key לא הוגדר. אנא הגדר ב-הגדרות",
    };
  }

  if (!config.model || config.model.trim().length === 0) {
    return {
      success: false,
      error: "מודל שפה לא נבחר. אנא בחר מודל ב-הגדרות",
    };
  }

  try {
    const isGoogle = isGoogleModel(config.model);
    const apiUrl = config.apiUrl || getApiUrl(config.model);

    let requestBody: unknown;
    let headers: Record<string, string>;

    if (isGoogle) {
      // Google Gemini API format
      const modelUrl = `${apiUrl}/${config.model}:generateContent?key=${config.apiKey}`;

      // Use configurable prompts or fall back to defaults
      const systemPrompt = config.systemPrompt || "אתה מומחה בעברית. המשימה שלך היא להוסיף ניקוד מלא לטקסט עברי. החזר רק את הטקסט המנוקד ללא הסברים נוספים.";
      const userPromptTemplate = config.userPrompt || `הוסף ניקוד מלא לטקסט הבא:\n\n{text}`;
      const userPrompt = userPromptTemplate.replace('{text}', text);

      // For Google API, combine system and user prompts
      const combinedPrompt = `${systemPrompt}\n\n${userPrompt}`;

      requestBody = {
        contents: [
          {
            parts: [
              {
                text: combinedPrompt,
              },
            ],
          },
        ],
        generationConfig: {
          maxOutputTokens: 4000,
          ...(config.temperature !== undefined && { temperature: config.temperature }),
        },
      };
      headers = {
        "Content-Type": "application/json",
      };

      const response = await fetch(modelUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("[NiqqudService] Google API error", {
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

      const data = await response.json();

      if (
        !data.candidates ||
        !data.candidates[0] ||
        !data.candidates[0].content ||
        !data.candidates[0].content.parts ||
        !data.candidates[0].content.parts[0] ||
        !data.candidates[0].content.parts[0].text
      ) {
        return {
          success: false,
          error: "תגובה לא תקינה מהמודל",
        };
      }

      const niqqudText = data.candidates[0].content.parts[0].text.trim();

      console.log("[NiqqudService] Google API response received", {
        originalLength: text.length,
        returnedLength: niqqudText.length,
        hasNiqqudFunction: typeof hasNiqqud,
      });

      // Validate that the returned text actually has niqqud
      if (!niqqudText || niqqudText.length === 0) {
        console.error("[NiqqudService] Empty response from model");
        return {
          success: false,
          error: "המודל החזיר תגובה ריקה",
        };
      }

      try {
        // Check if the returned text is the same as the original (no changes)
        const normalizedOriginal = removeNiqqud(text.trim());
        const normalizedReturned = removeNiqqud(niqqudText.trim());

        console.log("[NiqqudService] Normalized comparison", {
          originalNormalized: normalizedOriginal.substring(0, 50),
          returnedNormalized: normalizedReturned.substring(0, 50),
          areSame: normalizedOriginal === normalizedReturned,
        });

        if (normalizedOriginal === normalizedReturned && !hasNiqqud(niqqudText)) {
          console.error("[NiqqudService] Model returned same text without niqqud");
          return {
            success: false,
            error: "המודל החזיר את אותו הטקסט ללא ניקוד",
          };
        }

        // Check if the returned text actually has niqqud
        const hasNiqqudResult = hasNiqqud(niqqudText);
        console.log("[NiqqudService] Niqqud check result", {
          hasNiqqud: hasNiqqudResult,
          textPreview: niqqudText.substring(0, 50),
        });

        if (!hasNiqqudResult) {
          console.error("[NiqqudService] Model returned text without niqqud");
          return {
            success: false,
            error: "המודל החזיר טקסט ללא ניקוד. נסה שוב או בחר מודל אחר",
          };
        }
      } catch (validationError) {
        console.error("[NiqqudService] Validation error", validationError);
        return {
          success: false,
          error: `שגיאה בוולידציה: ${validationError instanceof Error ? validationError.message : "שגיאה לא צפויה"}`,
        };
      }

      return {
        success: true,
        niqqudText,
      };
    } else {
      // OpenAI API format

      // Use configurable prompts or fall back to defaults
      const systemPrompt = config.systemPrompt || "אתה מומחה בעברית. המשימה שלך היא להוסיף ניקוד מלא לטקסט עברי. החזר רק את הטקסט המנוקד ללא הסברים נוספים.";
      const userPromptTemplate = config.userPrompt || `הוסף ניקוד מלא לטקסט הבא:\n\n{text}`;
      const userPrompt = userPromptTemplate.replace('{text}', text);

      requestBody = {
        model: config.model,
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: userPrompt,
          },
        ],
        max_completion_tokens: 4000,
        ...(config.temperature !== undefined && { temperature: config.temperature }),
      };
      headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      };

      const response = await fetch(apiUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("[NiqqudService] OpenAI API error", {
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

      const data = await response.json();

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

      const niqqudText = data.choices[0].message.content.trim();

      console.log("[NiqqudService] OpenAI API response received", {
        originalLength: text.length,
        returnedLength: niqqudText.length,
        hasNiqqudFunction: typeof hasNiqqud,
      });

      // Validate that the returned text actually has niqqud
      if (!niqqudText || niqqudText.length === 0) {
        console.error("[NiqqudService] Empty response from model");
        return {
          success: false,
          error: "המודל החזיר תגובה ריקה",
        };
      }

      try {
        // Check if the returned text is the same as the original (no changes)
        const normalizedOriginal = removeNiqqud(text.trim());
        const normalizedReturned = removeNiqqud(niqqudText.trim());

        console.log("[NiqqudService] Normalized comparison", {
          originalNormalized: normalizedOriginal.substring(0, 50),
          returnedNormalized: normalizedReturned.substring(0, 50),
          areSame: normalizedOriginal === normalizedReturned,
        });

        if (normalizedOriginal === normalizedReturned && !hasNiqqud(niqqudText)) {
          console.error("[NiqqudService] Model returned same text without niqqud");
          return {
            success: false,
            error: "המודל החזיר את אותו הטקסט ללא ניקוד",
          };
        }

        // Check if the returned text actually has niqqud
        const hasNiqqudResult = hasNiqqud(niqqudText);
        console.log("[NiqqudService] Niqqud check result", {
          hasNiqqud: hasNiqqudResult,
          textPreview: niqqudText.substring(0, 50),
        });

        if (!hasNiqqudResult) {
          console.error("[NiqqudService] Model returned text without niqqud");
          return {
            success: false,
            error: "המודל החזיר טקסט ללא ניקוד. נסה שוב או בחר מודל אחר",
          };
        }
      } catch (validationError) {
        console.error("[NiqqudService] Validation error", validationError);
        return {
          success: false,
          error: `שגיאה בוולידציה: ${validationError instanceof Error ? validationError.message : "שגיאה לא צפויה"}`,
        };
      }

      return {
        success: true,
        niqqudText,
      };
    }
  } catch (error) {
    console.error("[NiqqudService] Unexpected error", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "שגיאה לא צפויה בעת קריאה למודל",
    };
  }
}

