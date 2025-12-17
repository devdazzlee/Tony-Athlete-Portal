/**
 * Formats a date string to a user-friendly format
 * @param dateString - The date string to format (ISO format or "Never")
 * @returns Formatted date string
 */
export function formatLastActivity(dateString: string): string {
  if (dateString === "Never" || !dateString) {
    return "Never";
  }

  try {
    const date = new Date(dateString);

    // Check if date is valid
    if (isNaN(date.getTime())) {
      return "Invalid Date";
    }

    // Format as "MMM DD, YYYY at HH:MM AM/PM"
    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    };

    return date.toLocaleDateString("en-US", options);
  } catch (error) {
    console.error("Error formatting date:", error);
    return "Invalid Date";
  }
}

/**
 * Formats a date string to a relative time format (e.g., "2 hours ago")
 * @param dateString - The date string to format
 * @returns Relative time string
 */
export function formatRelativeTime(dateString: string): string {
  if (dateString === "Never" || !dateString) {
    return "Never";
  }

  try {
    const date = new Date(dateString);

    if (isNaN(date.getTime())) {
      return "Invalid Date";
    }

    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return "Just now";
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return `${diffInMinutes} minute${diffInMinutes === 1 ? "" : "s"} ago`;
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours === 1 ? "" : "s"} ago`;
    }

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) {
      return `${diffInDays} day${diffInDays === 1 ? "" : "s"} ago`;
    }

    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInWeeks < 4) {
      return `${diffInWeeks} week${diffInWeeks === 1 ? "" : "s"} ago`;
    }

    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths < 12) {
      return `${diffInMonths} month${diffInMonths === 1 ? "" : "s"} ago`;
    }

    const diffInYears = Math.floor(diffInDays / 365);
    return `${diffInYears} year${diffInYears === 1 ? "" : "s"} ago`;
  } catch (error) {
    console.error("Error formatting relative time:", error);
    return "Invalid Date";
  }
}

/**
 * Formats a date string to a compact format (e.g., "Oct 21, 2025")
 * @param dateString - The date string to format
 * @returns Compact date string
 */
export function formatCompactDate(dateString: string): string {
  if (dateString === "Never" || !dateString) {
    return "Never";
  }

  try {
    const date = new Date(dateString);

    if (isNaN(date.getTime())) {
      return "Invalid Date";
    }

    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "short",
      day: "numeric",
    };

    return date.toLocaleDateString("en-US", options);
  } catch (error) {
    console.error("Error formatting compact date:", error);
    return "Invalid Date";
  }
}
