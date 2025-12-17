# Vercel Deployment Guide

## Prisma Engine Download Error Fix

If you encounter Prisma engine download errors during Vercel deployment:

```
Error: Failed to fetch the engine file at https://binaries.prisma.sh/... - 500 Internal Server Error
```

### Solution: Add Environment Variable in Vercel Dashboard (REQUIRED)

1. Go to your Vercel project → **Settings** → **Environment Variables**
2. Add a new environment variable:
   - **Name**: `PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING`
   - **Value**: `1`
   - **Environment**: Select all (Production, Preview, Development)
3. Save and redeploy

### Configuration

The backend is configured exactly like the old Trackdesk backend:
- Simple `postinstall: "prisma generate"` script
- No special build scripts
- Standard Prisma schema configuration

### Notes

- This error occurs when Prisma's CDN returns 500 errors
- The environment variable tells Prisma to skip checksum verification
- This is safe to use in production
- If the error persists, it may be a temporary Prisma CDN issue - try deploying again later

