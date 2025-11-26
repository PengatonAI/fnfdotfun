/**
 * Utility functions for displaying user identities
 * Never expose OAuth names (user.name) publicly - only use username
 */

interface User {
  username: string | null;
  xHandle?: string | null;
  name?: string | null; // Only for internal use, never display
  email?: string | null;
}

/**
 * Get the public display name for a user
 * Returns username, or fallback to email if no username
 * Never returns OAuth name
 */
export function getPublicDisplayName(user: User | null | undefined): string {
  if (!user) return "Unknown";
  if (user.username) {
    return user.username;
  }
  // Fallback to email if no username (shouldn't happen in production)
  return user.email || "Unknown";
}

/**
 * Format username with X handle if available
 * Returns: "username" or "username (@xhandle)"
 */
export function formatUsernameWithHandle(user: User | null | undefined): string {
  if (!user) return "Unknown";
  const displayName = getPublicDisplayName(user);
  if (user.xHandle && user.username) {
    return `${displayName} (@${user.xHandle})`;
  }
  return displayName;
}

/**
 * Get user avatar fallback initial
 * Uses username first, then email, never name
 */
export function getUserInitial(user: User | null | undefined): string {
  if (!user) return "?";
  if (user.username) {
    return user.username[0].toUpperCase();
  }
  if (user.email) {
    return user.email[0].toUpperCase();
  }
  return "?";
}

