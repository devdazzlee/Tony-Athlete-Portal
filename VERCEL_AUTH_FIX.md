# Vercel Authentication Fix - Complete Solution

## Problem Summary

- Infinite refresh loop on `https://trackdesk-t1hm.vercel.app/`
- "Session expired" errors
- Cookies being removed on refresh
- Access denied errors after login

## Root Causes

### 1. Cookie Configuration Issues

- **Backend**: Using `samesite: "strict"` (blocks cross-domain)
- **Frontend**: Setting duplicate cookies
- **Result**: Cookie conflicts and rejections

### 2. Cross-Origin Cookie Issues

- Frontend domain: `trackdesk-t1hm.vercel.app`
- Backend domain: `trackdesk-ihom.vercel.app`
- Cookies set by one domain cannot be read by another

### 3. Cookie Format Conflicts

- Different SameSite values (strict vs none)
- Different HttpOnly settings
- Duplicate cookies with different properties

## Solution Implemented

### ✅ Using Next.js API Routes (Recommended Approach)

Instead of making direct cross-domain requests, we use Next.js API routes which act as a **same-origin proxy**.

#### How It Works:

```
Frontend (Client)
  ↓
POST /api/auth/login (same-origin)
  ↓
Next.js API Route (proxy)
  ↓
Backend API (receives request)
  ↓
Backend responds with cookies
  ↓
Next.js API Route forwards cookies
  ↓
Frontend receives cookies (same domain, works!)
```

#### Files Created:

1. **`/frontend/app/api/auth/login/route.ts`**
   - Next.js API route handler
   - Proxies login request to backend
   - Forwards cookies from backend response
   - Sets cookies on frontend domain

#### Files Modified:

2. **`/frontend/lib/auth-client.ts`**

   - Changed `API_BASE_URL` from `http://localhost:3003/api` to `/api`
   - Now uses same-origin Next.js API routes

3. **`/backend/src/middleware/auth.ts`**

   - Updated cookie configuration for Vercel
   - Uses `samesite: "none"` when `VERCEL=1`

4. **`/frontend/middleware.ts`**
   - Added logging for debugging
   - Added API route skip

## Current Request Flow

### Login Flow:

```
User submits login form
  ↓
POST /api/auth/login (Next.js API route)
  ↓
Fetch to backend: http://localhost:3003/api/auth/login
  ↓
Backend processes, returns response with cookies
  ↓
Next.js API route extracts cookies
  ↓
Sets cookies on trackdesk-t1hm.vercel.app
  ↓
Redirects user to dashboard
  ↓
Middleware reads cookies (same domain)
  ↓
User authenticated ✅
```

### API Request Flow:

```
Frontend component
  ↓
Uses apiClient from /lib/api-client.ts
  ↓
apiClient.get("/dashboard/overview")
  ↓
Fetches from backend with credentials: "include"
  ↓
Backend reads cookies and returns data
```

## Environment Variables

### Frontend (Vercel):

```
NEXT_PUBLIC_API_URL=https://trackdesk-ihom.vercel.app/api
```

### Backend (Vercel):

```
VERCEL=1
NODE_ENV=production
```

## Deployment Steps

### 1. Backend Deployment:

```bash
cd backend
# Add environment variable
echo "VERCEL=1" >> .env
npm run build
# Deploy to Vercel
```

### 2. Frontend Deployment:

```bash
cd frontend
# Set environment variable
# NEXT_PUBLIC_API_URL=https://trackdesk-ihom.vercel.app/api
npm run build
# Deploy to Vercel
```

### 3. After Deployment:

1. Clear all cookies on `trackdesk-t1hm.vercel.app`
2. Go to `https://trackdesk-t1hm.vercel.app/`
3. Login
4. Check cookies in DevTools - should see:
   - One `accessToken` (HttpOnly=true, Secure=true, SameSite=None)
   - One `userData` (HttpOnly=false, Secure=true, SameSite=None)

## Testing

### Local Testing:

```bash
# Terminal 1: Start backend
cd backend
npm run dev  # Runs on :3003

# Terminal 2: Start frontend
cd frontend
npm run dev  # Runs on :3001

# Test login
# Open http://localhost:3001
# Login with credentials
# Check cookies in DevTools
```

### Vercel Testing:

1. Deploy both frontend and backend
2. Visit `https://trackdesk-t1hm.vercel.app/`
3. Click "Sign In"
4. Enter credentials
5. Should redirect to dashboard without infinite refresh

## Key Benefits

✅ **No CORS issues** - Same-origin requests
✅ **Cookies work** - Set on same domain as frontend
✅ **No conflicts** - Single source of truth (backend)
✅ **Secure** - HttpOnly cookies for tokens
✅ **Scalable** - Works on Vercel and other platforms

## Troubleshooting

### Issue: Still getting "session expired"

**Solution**: Clear all cookies and try again after fresh deployment

### Issue: Infinite redirect loop

**Solution**: Check middleware logs in browser console

### Issue: Access denied after login

**Solution**: Verify backend `VERCEL=1` environment variable is set

## Summary

The authentication system now uses **Next.js API routes** to act as a proxy between the frontend and backend. This ensures:

1. **Same-origin cookies**: All cookies are set on the frontend domain
2. **No CORS issues**: Requests go through Next.js API routes
3. **Proper cookie handling**: Backend sets cookies, Next.js forwards them
4. **Secure by default**: HttpOnly cookies for tokens

The infinite refresh and session expired errors should now be completely resolved! 🎉
