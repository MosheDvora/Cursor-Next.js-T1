import { NextRequest, NextResponse } from "next/server";

import { getUserSettings, saveUserSettings } from "@/lib/db";
import { getUserIdFromRequest, getOrCreateUserIdFromRequest } from "@/lib/user";
import { AppSettings, DEFAULT_WORD_SPACING } from "@/lib/settings";
import { getUserPreferences, saveUserPreferences, isAuthenticated } from "@/lib/user-preferences-server";

/**
 * GET /api/settings
 * Fetch user settings from database
 */
export async function GET(request: NextRequest) {
  try {

    const cookieHeader = request.headers.get("cookie") || "";

    // Get user ID from cookies
    const userId = getUserIdFromRequest(cookieHeader) || getOrCreateUserIdFromRequest(cookieHeader);

    if (!userId) {
      return NextResponse.json(
        { error: "User ID not found" },
        { status: 400 }
      );
    }

    // Check if user is authenticated via Supabase
    const authenticated = await isAuthenticated();
    let wordSpacing = DEFAULT_WORD_SPACING;

    // If authenticated, try to get wordSpacing from preferences
    if (authenticated) {
      const preferences = await getUserPreferences();
      if (preferences?.wordSpacing !== undefined) {
        wordSpacing = preferences.wordSpacing;
      }
    }

    // Get settings from database
    const settings = getUserSettings(userId);

    if (!settings) {
      // Return default settings if user doesn't exist yet
      const defaultSettings = {
        niqqudApiKey: "",
        niqqudModel: "",
        niqqudPrompt: "",
        syllablesApiKey: "",
        syllablesModel: "",
        syllablesPrompt: "",
        wordSpacing,
      };
      
      // Set user ID cookie if not already set
      if (!getUserIdFromRequest(cookieHeader)) {
        const response = NextResponse.json(defaultSettings);
        response.cookies.set("user_id", userId, {
          maxAge: 365 * 24 * 60 * 60, // 1 year
          path: "/",
          sameSite: "lax",
        });
        return response;
      }
      
      return NextResponse.json(defaultSettings);
    }

    // Override wordSpacing with value from preferences if authenticated
    const finalSettings = {
      ...settings,
      wordSpacing,
    };

    // Set user ID cookie if not already set
    if (!getUserIdFromRequest(cookieHeader)) {
      const response = NextResponse.json(finalSettings);
      response.cookies.set("user_id", userId, {
        maxAge: 365 * 24 * 60 * 60, // 1 year
        path: "/",
        sameSite: "lax",
      });
      return response;
    }

    return NextResponse.json(finalSettings);
  } catch (error) {
    console.error("[API] Error fetching settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/settings
 * Save user settings to database
 */
export async function PUT(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get("cookie") || "";

    // Get or create user ID
    let userId = getUserIdFromRequest(cookieHeader);

    if (!userId) {
      userId = getOrCreateUserIdFromRequest(cookieHeader);
    }

    if (!userId) {
      return NextResponse.json(
        { error: "Failed to create user ID" },
        { status: 500 }
      );
    }

    // Parse request body
    const body = await request.json() as Partial<AppSettings>;

    // Validate required fields structure
    if (typeof body !== "object" || body === null) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    // Check if user is authenticated via Supabase
    const authenticated = await isAuthenticated();

    // If authenticated and wordSpacing is provided, save to preferences
    if (authenticated && body.wordSpacing !== undefined) {
      await saveUserPreferences({ wordSpacing: body.wordSpacing });
    }

    // Save settings to database (localStorage fallback for unauthenticated users)
    const success = saveUserSettings(userId, body);

    if (!success) {
      return NextResponse.json(
        { error: "Failed to save settings" },
        { status: 500 }
      );
    }

    // Get updated settings
    const baseSettings = getUserSettings(userId);
    
    // If authenticated, override wordSpacing with value from preferences
    let finalWordSpacing = baseSettings?.wordSpacing || DEFAULT_WORD_SPACING;
    if (authenticated) {
      const preferences = await getUserPreferences();
      if (preferences?.wordSpacing !== undefined) {
        finalWordSpacing = preferences.wordSpacing;
      }
    }
    
    // Build updated settings with proper typing
    const updatedSettings: AppSettings = {
      niqqudApiKey: baseSettings?.niqqudApiKey || "",
      niqqudModel: baseSettings?.niqqudModel || "",
      niqqudPrompt: baseSettings?.niqqudPrompt || "",
      niqqudSystemPrompt: baseSettings?.niqqudSystemPrompt || "",
      niqqudUserPrompt: baseSettings?.niqqudUserPrompt || "",
      niqqudTemperature: baseSettings?.niqqudTemperature || 0.2,
      niqqudCompletionSystemPrompt: baseSettings?.niqqudCompletionSystemPrompt || "",
      niqqudCompletionUserPrompt: baseSettings?.niqqudCompletionUserPrompt || "",
      syllablesApiKey: baseSettings?.syllablesApiKey || "",
      syllablesModel: baseSettings?.syllablesModel || "",
      syllablesPrompt: baseSettings?.syllablesPrompt || "",
      syllablesTemperature: baseSettings?.syllablesTemperature || 0.2,
      syllableBorderSize: baseSettings?.syllableBorderSize || 2,
      syllableBackgroundColor: baseSettings?.syllableBackgroundColor || "#dbeafe",
      wordSpacing: finalWordSpacing,
      letterSpacing: baseSettings?.letterSpacing || 0,
      fontSize: baseSettings?.fontSize || 30,
      wordHighlightPadding: baseSettings?.wordHighlightPadding || 4,
      syllableHighlightPadding: baseSettings?.syllableHighlightPadding || 3,
      letterHighlightPadding: baseSettings?.letterHighlightPadding || 2,
      wordHighlightColor: baseSettings?.wordHighlightColor || "#fff176",
      syllableHighlightColor: baseSettings?.syllableHighlightColor || "#fff176",
      letterHighlightColor: baseSettings?.letterHighlightColor || "#fff176",
    };

    // Set user ID cookie
    const response = NextResponse.json({
      success: true,
      settings: updatedSettings,
    });

    response.cookies.set("user_id", userId, {
      maxAge: 365 * 24 * 60 * 60, // 1 year
      path: "/",
      sameSite: "lax",
    });

    return response;
  } catch (error) {
    console.error("[API] Error saving settings:", error);
    return NextResponse.json(
      { error: "Failed to save settings" },
      { status: 500 }
    );
  }
}

