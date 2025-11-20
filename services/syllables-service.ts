/**
 * Service for dividing Hebrew text into syllables using language model API
 */

import { isGoogleModel, getApiUrl } from "@/lib/settings";
import { parseSyllablesResponse, SyllablesData } from "@/lib/syllables";

export interface SyllablesServiceConfig {
  apiKey: string;
  model: string;
  prompt: string;
  apiUrl?: string; // Optional custom API URL
  temperature?: number; // Optional temperature (default: 1.0)
}

export interface SyllablesServiceResponse {
  success: boolean;
  syllablesData?: SyllablesData;
  rawResponse?: string; // Raw response from the model for debugging
  error?: string;
}

/**
 * Divide Hebrew text into syllables using language model API
 * @param text - Hebrew text to divide
 * @param config - API configuration including prompt
 * @returns Promise with syllables data or error
 */
export async function divideIntoSyllables(
  text: string,
  config: SyllablesServiceConfig
): Promise<SyllablesServiceResponse> {
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

  if (!config.prompt || config.prompt.trim().length === 0) {
    return {
      success: false,
      error: "פרומפט לא הוגדר. אנא הגדר פרומפט ב-הגדרות",
    };
  }

  try {
    const isGoogle = isGoogleModel(config.model);
    const apiUrl = config.apiUrl || getApiUrl(config.model);

    // Replace {text} placeholder in prompt
    const formattedPrompt = config.prompt.replace(/{text}/g, text);

    let requestBody: unknown;
    let headers: Record<string, string>;

    if (isGoogle) {
      // Google Gemini API format
      const modelUrl = `${apiUrl}/${config.model}:generateContent?key=${config.apiKey}`;
      requestBody = {
        contents: [
          {
            parts: [
              {
                text: formattedPrompt,
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
        console.error("[SyllablesService] Google API error", {
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

      const responseText = data.candidates[0].content.parts[0].text.trim();

      console.log("[SyllablesService] Google API response received", {
        originalLength: text.length,
        responseLength: responseText.length,
      });

      // Validate that the returned text is not empty
      if (!responseText || responseText.length === 0) {
        console.error("[SyllablesService] Empty response from model");
        return {
          success: false,
          rawResponse: responseText || "",
          error: "המודל החזיר תגובה ריקה",
        };
      }

      // Parse the text response
      const syllablesData = parseSyllablesResponse(responseText);

      if (!syllablesData) {
        console.error("[SyllablesService] Failed to parse syllables data");
        return {
          success: false,
          rawResponse: responseText,
          error: "המודל החזיר תגובה לא תקינה. נסה שוב או בחר מודל אחר",
        };
      }

      return {
        success: true,
        syllablesData,
        rawResponse: responseText,
      };
    } else {
      // OpenAI API format
      requestBody = {
        model: config.model,
        messages: [
          {
            role: "system",
            content:
              "אתה מומחה בעברית. המשימה שלך היא לחלק טקסט עברי להברות. החזר רק את הטקסט המחולק להברות בפורמט המבוקש ללא הסברים נוספים.",
          },
          {
            role: "user",
            content: formattedPrompt,
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
        console.error("[SyllablesService] OpenAI API error", {
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

      const responseText = data.choices[0].message.content.trim();

      console.log("[SyllablesService] OpenAI API response received", {
        originalLength: text.length,
        responseLength: responseText.length,
      });

      // Validate that the returned text is not empty
      if (!responseText || responseText.length === 0) {
        console.error("[SyllablesService] Empty response from model");
        return {
          success: false,
          rawResponse: responseText || "",
          error: "המודל החזיר תגובה ריקה",
        };
      }

      // Parse the text response
      const syllablesData = parseSyllablesResponse(responseText);

      if (!syllablesData) {
        console.error("[SyllablesService] Failed to parse syllables data");
        return {
          success: false,
          rawResponse: responseText,
          error: "המודל החזיר תגובה לא תקינה. נסה שוב או בחר מודל אחר",
        };
      }

      return {
        success: true,
        syllablesData,
        rawResponse: responseText,
      };
    }
  } catch (error) {
    console.error("[SyllablesService] Unexpected error", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "שגיאה לא צפויה בעת קריאה למודל",
    };
  }
}

