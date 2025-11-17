/**
 * User identification utilities
 * Handles user ID generation and storage via cookies
 */

const USER_ID_COOKIE_NAME = "user_id";
const USER_ID_COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 1 year in seconds

/**
 * Generate a unique user ID
 */
function generateUserId(): string {
  return `user_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Get user ID from cookie (client-side)
 */
export function getUserId(): string | null {
  if (typeof document === "undefined") {
    return null;
  }

  const cookies = document.cookie.split(";");
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split("=");
    if (name === USER_ID_COOKIE_NAME) {
      return decodeURIComponent(value);
    }
  }

  return null;
}

/**
 * Set user ID in cookie (client-side)
 */
export function setUserId(userId: string): void {
  if (typeof document === "undefined") {
    return;
  }

  const expires = new Date();
  expires.setTime(expires.getTime() + USER_ID_COOKIE_MAX_AGE * 1000);

  document.cookie = `${USER_ID_COOKIE_NAME}=${encodeURIComponent(userId)}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
}

/**
 * Get or create user ID (client-side)
 * If no user ID exists, creates a new one and stores it in cookie
 */
export function getOrCreateUserId(): string {
  let userId = getUserId();

  if (!userId) {
    userId = generateUserId();
    setUserId(userId);
  }

  return userId;
}

/**
 * Get user ID from request cookies (server-side)
 */
export function getUserIdFromRequest(cookies: Record<string, string> | string | undefined): string | null {
  if (!cookies) {
    return null;
  }

  if (typeof cookies === "string") {
    // Parse cookie string
    const cookieMap: Record<string, string> = {};
    cookies.split(";").forEach((cookie) => {
      const [name, value] = cookie.trim().split("=");
      if (name && value) {
        cookieMap[name.trim()] = decodeURIComponent(value.trim());
      }
    });
    return cookieMap[USER_ID_COOKIE_NAME] || null;
  }

  return cookies[USER_ID_COOKIE_NAME] || null;
}

/**
 * Create user ID if not exists (server-side)
 * Returns existing or newly created user ID
 */
export function getOrCreateUserIdFromRequest(cookies: Record<string, string> | string | undefined): string {
  const existingUserId = getUserIdFromRequest(cookies);
  
  if (existingUserId) {
    return existingUserId;
  }

  // Generate new user ID
  return generateUserId();
}

