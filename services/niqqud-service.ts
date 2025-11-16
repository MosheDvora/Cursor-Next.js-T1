/**
 * Service for adding niqqud to Hebrew text using language model API
 */

import { isGoogleModel, getApiUrl } from "@/lib/settings";

export interface NiqqudServiceConfig {
  apiKey: string;
  model: string;
  apiUrl?: string; // Optional custom API URL
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
      requestBody = {
        contents: [
          {
            parts: [
              {
                text: `אתה מומחה בעברית. המשימה שלך היא להוסיף ניקוד מלא לטקסט עברי. החזר רק את הטקסט המנוקד ללא הסברים נוספים.\n\nהוסף ניקוד מלא לטקסט הבא:\n\n${text}`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 4000,
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

      return {
        success: true,
        niqqudText,
      };
    } else {
      // OpenAI API format
      requestBody = {
        model: config.model,
        messages: [
          {
            role: "system",
            content:
              "אתה מומחה בעברית. המשימה שלך היא להוסיף ניקוד מלא לטקסט עברי. החזר רק את הטקסט המנוקד ללא הסברים נוספים.",
          },
          {
            role: "user",
            content: `הוסף ניקוד מלא לטקסט הבא:\n\n${text}`,
          },
        ],
        temperature: 0.3,
        max_tokens: 4000,
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

      return {
        success: true,
        niqqudText,
      };
    }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "שגיאה לא צפויה בעת קריאה למודל",
    };
  }
}

