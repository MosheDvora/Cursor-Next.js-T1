import { NextRequest, NextResponse } from "next/server";
import {
  getAppDefaultsAsSettings,
  getAppDefaultsForSettings,
  saveAppDefaults,
  isAdmin,
} from "@/lib/admin-defaults-server";
import { AppSettings } from "@/lib/settings";

/**
 * GET /api/admin/defaults
 * Fetch all app default values
 * - Admins: Get full defaults (for editing)
 * - Non-admins: Get defaults for use as fallback values (read-only)
 */
export async function GET(request: NextRequest) {
  try {
    // Check if user is admin
    const admin = await isAdmin();
    
    if (admin) {
      // Admins get full defaults
      const defaults = await getAppDefaultsAsSettings();
      return NextResponse.json(defaults);
    } else {
      // Non-admins get defaults for fallback use (read-only)
      const defaults = await getAppDefaultsForSettings();
      return NextResponse.json(defaults);
    }
  } catch (error) {
    console.error("[API] Error fetching app defaults:", error);
    return NextResponse.json(
      { error: "Failed to fetch app defaults" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/defaults
 * Save app default values
 * Only accessible by admins
 */
export async function PUT(request: NextRequest) {
  try {
    // Check if user is admin
    const admin = await isAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: "Unauthorized: Only admins can save app defaults" },
        { status: 403 }
      );
    }

    // Parse request body
    const body = (await request.json()) as Partial<AppSettings>;

    // Validate request body
    if (typeof body !== "object" || body === null) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    // Save defaults
    const success = await saveAppDefaults(body);

    if (!success) {
      return NextResponse.json(
        { error: "Failed to save app defaults" },
        { status: 500 }
      );
    }

    // Get updated defaults to return
    const updatedDefaults = await getAppDefaultsAsSettings();

    return NextResponse.json({
      success: true,
      defaults: updatedDefaults,
    });
  } catch (error) {
    console.error("[API] Error saving app defaults:", error);
    return NextResponse.json(
      { error: "Failed to save app defaults" },
      { status: 500 }
    );
  }
}

