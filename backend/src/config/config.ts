import dotenv from 'dotenv';
dotenv.config();

export const config = {
  // Server
  port: process.env.PORT || 3003,
  nodeEnv: process.env.NODE_ENV || 'development',

  // Database
  databaseUrl: process.env.DATABASE_URL,

  // JWT
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  // Shopify USA Store
  shopify: {
    usa: {
      apiKey: process.env.SHOPIFY_USA_API_KEY || '',
      apiSecret: process.env.SHOPIFY_USA_API_SECRET || '',
      accessToken: process.env.SHOPIFY_USA_ACCESS_TOKEN || '',
      domain: process.env.SHOPIFY_USA_DOMAIN || 'tc-nutra.myshopify.com',
    },
    canada: {
      apiKey: process.env.SHOPIFY_CANADA_API_KEY || '',
      apiSecret: process.env.SHOPIFY_CANADA_API_SECRET || '',
      accessToken: process.env.SHOPIFY_CANADA_ACCESS_TOKEN || '',
      domain: process.env.SHOPIFY_CANADA_DOMAIN || 'tc-nutrition-canada.myshopify.com',
    },
    // Default settings
    defaultCommissionRate: parseFloat(process.env.SHOPIFY_DEFAULT_COMMISSION_RATE || '0.10'),
    apiVersion: process.env.SHOPIFY_API_VERSION || '2024-01',
    enableAutoSync: process.env.ENABLE_SHOPIFY_SYNC !== 'false',
    syncIntervalMs: parseInt(process.env.SHOPIFY_SYNC_INTERVAL_MS || '3600000'), // 1 hour
  },

  // Portal URLs
  portalUrl: process.env.PORTAL_URL || 'http://localhost:3000',
  apiUrl: process.env.API_URL || 'http://localhost:3003',
};

export default config;

