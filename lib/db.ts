/**
 * Database utilities
 * SQLite database for storing user settings
 */

import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { AppSettings, DEFAULT_MODELS, DEFAULT_NIQQUD_PROMPT, DEFAULT_SYLLABLES_PROMPT } from "./settings";

const DB_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "settings.db");

let db: Database.Database | null = null;

/**
 * Get database instance (singleton)
 */
function getDb(): Database.Database {
  if (db) {
    return db;
  }

  // Ensure data directory exists
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  // Create database connection
  db = new Database(DB_PATH);

  // Enable foreign keys
  db.pragma("foreign_keys = ON");

  // Initialize schema
  initSchema(db);

  return db;
}

/**
 * Initialize database schema
 */
function initSchema(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS user_settings (
      userId TEXT PRIMARY KEY,
      niqqudApiKey TEXT DEFAULT '',
      niqqudModel TEXT DEFAULT '${DEFAULT_MODELS[0].value}',
      niqqudPrompt TEXT DEFAULT '',
      syllablesApiKey TEXT DEFAULT '',
      syllablesModel TEXT DEFAULT '${DEFAULT_MODELS[0].value}',
      syllablesPrompt TEXT DEFAULT '',
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create index on userId for faster lookups
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_user_settings_userId ON user_settings(userId)
  `);
}

/**
 * Get user settings from database
 */
export function getUserSettings(userId: string): AppSettings | null {
  try {
    const database = getDb();
    const stmt = database.prepare("SELECT * FROM user_settings WHERE userId = ?");
    const row = stmt.get(userId) as any;

    if (!row) {
      return null;
    }

    return {
      niqqudApiKey: row.niqqudApiKey || "",
      niqqudModel: row.niqqudModel || DEFAULT_MODELS[0].value,
      niqqudPrompt: row.niqqudPrompt || DEFAULT_NIQQUD_PROMPT,
      syllablesApiKey: row.syllablesApiKey || "",
      syllablesModel: row.syllablesModel || DEFAULT_MODELS[0].value,
      syllablesPrompt: row.syllablesPrompt || DEFAULT_SYLLABLES_PROMPT,
    };
  } catch (error) {
    console.error("[DB] Error getting user settings:", error);
    return null;
  }
}

/**
 * Save user settings to database
 */
export function saveUserSettings(userId: string, settings: Partial<AppSettings>): boolean {
  try {
    const database = getDb();
    
    // Check if user settings exist
    const existing = getUserSettings(userId);

    if (existing) {
      // Update existing settings
      const stmt = database.prepare(`
        UPDATE user_settings 
        SET 
          niqqudApiKey = COALESCE(?, niqqudApiKey),
          niqqudModel = COALESCE(?, niqqudModel),
          niqqudPrompt = COALESCE(?, niqqudPrompt),
          syllablesApiKey = COALESCE(?, syllablesApiKey),
          syllablesModel = COALESCE(?, syllablesModel),
          syllablesPrompt = COALESCE(?, syllablesPrompt),
          updatedAt = CURRENT_TIMESTAMP
        WHERE userId = ?
      `);

      stmt.run(
        settings.niqqudApiKey ?? null,
        settings.niqqudModel ?? null,
        settings.niqqudPrompt ?? null,
        settings.syllablesApiKey ?? null,
        settings.syllablesModel ?? null,
        settings.syllablesPrompt ?? null,
        userId
      );
    } else {
      // Insert new settings
      const stmt = database.prepare(`
        INSERT INTO user_settings (
          userId,
          niqqudApiKey,
          niqqudModel,
          niqqudPrompt,
          syllablesApiKey,
          syllablesModel,
          syllablesPrompt
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        userId,
        settings.niqqudApiKey ?? "",
        settings.niqqudModel ?? DEFAULT_MODELS[0].value,
        settings.niqqudPrompt ?? DEFAULT_NIQQUD_PROMPT,
        settings.syllablesApiKey ?? "",
        settings.syllablesModel ?? DEFAULT_MODELS[0].value,
        settings.syllablesPrompt ?? DEFAULT_SYLLABLES_PROMPT
      );
    }

    return true;
  } catch (error) {
    console.error("[DB] Error saving user settings:", error);
    return false;
  }
}

/**
 * Close database connection
 */
export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}

