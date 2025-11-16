/**
 * Service for adding niqqud to Hebrew text using language model API
 */

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
 * Default API URL (OpenAI compatible)
 */
const DEFAULT_API_URL = "https://api.openai.com/v1/chat/completions";

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
    const apiUrl = config.apiUrl || DEFAULT_API_URL;

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
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
      }),
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

