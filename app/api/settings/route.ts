import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUserSettings, saveUserSettings } from "@/lib/db";
import { getUserIdFromRequest, getOrCreateUserIdFromRequest } from "@/lib/user";
import { AppSettings } from "@/lib/settings";

/**
 * GET /api/settings
 * Fetch user settings from database
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const cookieHeader = request.headers.get("cookie") || "";
    
    // Get user ID from cookies
    const userId = getUserIdFromRequest(cookieHeader) || getOrCreateUserIdFromRequest(cookieHeader);

    if (!userId) {
      return NextResponse.json(
        { error: "User ID not found" },
        { status: 400 }
      );
    }

    // Get settings from database
    const settings = getUserSettings(userId);

    if (!settings) {
      // Return default settings if user doesn't exist yet
      return NextResponse.json({
        niqqudApiKey: "",
        niqqudModel: "",
        niqqudPrompt: "",
        syllablesApiKey: "",
        syllablesModel: "",
        syllablesPrompt: "",
      });
    }

    // Set user ID cookie if not already set
    if (!getUserIdFromRequest(cookieHeader)) {
      const response = NextResponse.json(settings);
      response.cookies.set("user_id", userId, {
        maxAge: 365 * 24 * 60 * 60, // 1 year
        path: "/",
        sameSite: "lax",
      });
      return response;
    }

    return NextResponse.json(settings);
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

    // Save settings to database
    const success = saveUserSettings(userId, body);

    if (!success) {
      return NextResponse.json(
        { error: "Failed to save settings" },
        { status: 500 }
      );
    }

    // Return updated settings
    const updatedSettings = getUserSettings(userId);

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

