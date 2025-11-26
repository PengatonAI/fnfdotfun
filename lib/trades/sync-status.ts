/**
 * In-memory sync progress tracker (singleton)
 * Safe, non-intrusive progress reporting for wallet sync operations
 */

export interface SyncStatus {
  stage: string;       // "fetching-transfers", "parsing-trades", "saving-trades", etc.
  current: number;      // 0
  total: number;       // 0
  message: string;      // "Processing trade 3/82"
  updatedAt: number;    // Date.now()
  done: boolean;       // false
  error?: string;
}

// Module-level variable to hold status
let syncStatus: SyncStatus = {
  stage: "idle",
  current: 0,
  total: 0,
  message: "",
  updatedAt: Date.now(),
  done: false,
};

/**
 * Initialize sync status - resets to default, done=false
 * Must NOT throw - always succeeds
 */
export function initSync(): void {
  try {
    syncStatus = {
      stage: "fetching-transfers",
      current: 0,
      total: 0,
      message: "Starting sync...",
      updatedAt: Date.now(),
      done: false,
    };
  } catch (error) {
    // Silently fail - progress reporting must never break sync
    console.error("Error initializing sync status:", error);
  }
}

/**
 * Set sync stage and optional message
 * Must NOT throw - always succeeds
 */
export function setStage(stage: string, message?: string): void {
  try {
    syncStatus.stage = stage;
    if (message) {
      syncStatus.message = message;
    }
    syncStatus.updatedAt = Date.now();
  } catch (error) {
    // Silently fail - progress reporting must never break sync
    console.error("Error setting sync stage:", error);
  }
}

/**
 * Set progress (current/total) and optional message
 * Must NOT throw - always succeeds
 */
export function setProgress(current: number, total: number, message?: string): void {
  try {
    syncStatus.current = current;
    syncStatus.total = total;
    if (message) {
      syncStatus.message = message;
    }
    syncStatus.updatedAt = Date.now();
  } catch (error) {
    // Silently fail - progress reporting must never break sync
    console.error("Error setting sync progress:", error);
  }
}

/**
 * Mark sync as done
 * Must NOT throw - always succeeds
 */
export function setDone(): void {
  try {
    syncStatus.done = true;
    syncStatus.stage = "complete";
    syncStatus.message = "Sync complete!";
    syncStatus.updatedAt = Date.now();
  } catch (error) {
    // Silently fail - progress reporting must never break sync
    console.error("Error setting sync done:", error);
  }
}

/**
 * Set error message
 * Must NOT throw - always succeeds
 */
export function setError(msg: string): void {
  try {
    syncStatus.error = msg;
    syncStatus.done = true;
    syncStatus.stage = "error";
    syncStatus.message = `Error: ${msg}`;
    syncStatus.updatedAt = Date.now();
  } catch (error) {
    // Silently fail - progress reporting must never break sync
    console.error("Error setting sync error:", error);
  }
}

/**
 * Get current sync status
 * Must NOT throw - always returns a safe object
 */
export function getStatus(): SyncStatus {
  try {
    return { ...syncStatus };
  } catch (error) {
    // Return safe default if anything goes wrong
    console.error("Error getting sync status:", error);
    return {
      stage: "error",
      current: 0,
      total: 0,
      message: "Error reading sync status",
      updatedAt: Date.now(),
      done: true,
      error: "Failed to read sync status",
    };
  }
}

