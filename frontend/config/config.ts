// Development  URL
// export const API_URL =
  // process.env.NEXT_PUBLIC_API_URL || "http://localhost:3003/api";

// Production URL
export const API_URL = "https://trackdesk.com/api";

// Configuration object
export const config = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3003/api",
  appName: "Trackdesk",
  version: "1.0.0",
  environment: process.env.NODE_ENV || "development",
};

// Authentication configuration
export const authConfig = {
  cookieNames: {
    accessToken: "accessToken",
    userData: "userData",
  },
  tokenExpiry: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
  refreshThreshold: 24 * 60 * 60 * 1000, // 1 day in milliseconds
};
