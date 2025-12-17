# Production Cookie Fix for Cross-Domain Authentication

## Problem
In production on Vercel, the frontend (trackdesk-t1hm.vercel.app) and backend (trackdesk-ihom.vercel.app) are on different domains. When the backend tried to set cookies, they weren't being stored in the browser because cookies set by one domain can't be accessed by another domain due to browser security policies.

## Root Cause
- Backend was setting cookies with `SameSite=None` and `Secure=true` for its own domain
- These cookies can't be read by the frontend in a different domain
- The Next.js API route was trying to forward backend cookies, but they were for the wrong domain

## Solution Applied

### 1. Frontend Login API Route (frontend/app/api/auth/login/route.ts)
- **Changed**: Now detects if running in production/Vercel
- **In Production**: Sets cookies directly on the frontend domain from the response data
- **In Development**: Forwards backend cookies (works because same domain)
- Sets cookies with:
  - `httpOnly: true` for accessToken
  - `httpOnly: false` for userData (so frontend can read it)
  - `secure: true` and `sameSite: "none"` for cross-domain support

### 2. Auth Client (frontend/lib/auth-client.ts)
- **Changed**: Added `credentials: "include"` to all fetch requests
- This ensures cookies are sent with every request to the backend
- Affects: login, register, logout, getProfile methods

### 3. Backend Cookie Setting (backend/src/middleware/auth.ts)
- **Changed**: `setAuthCookies` function now accepts request object
- **Behavior**: Detects cross-domain requests and skips setting cookies
- Allows Next.js API route to set cookies for the correct domain
- In same-domain scenarios (development), still sets cookies normally

### 4. Auth Controller (backend/src/controllers/AuthController.ts)
- **Changed**: Passes request object to `setAuthCookies` function
- Enables cross-domain detection in cookie setting logic

## How It Works Now

### Production Flow (Cross-Domain):
1. User submits login form
2. Browser → Frontend Next.js API route (`/api/auth/login`)
3. Frontend API route → Backend API (`/api/auth/login`)
4. Backend validates credentials, returns token and user data (but skips setting cookies)
5. Frontend API route receives data, sets cookies for frontend domain
6. Browser receives response with cookies set for correct domain
7. Cookies are stored and accessible for subsequent requests

### Development Flow (Same Domain):
1. User submits login form
2. Browser → Frontend Next.js API route
3. Frontend API route → Backend API
4. Backend validates and sets cookies for backend domain
5. Frontend API route forwards backend cookies
6. Browser receives cookies and stores them
7. Works because same domain in development

## Cookie Configuration

### Production Cookies:
```javascript
// accessToken
{
  httpOnly: true,     // Secure, not accessible via JavaScript
  secure: true,       // HTTPS only
  sameSite: "none",   // Cross-domain support
  path: "/",
  maxAge: 7 * 24 * 60 * 60 // 7 days
}

// userData
{
  httpOnly: false,    // Accessible via JavaScript
  secure: true,
  sameSite: "none",
  path: "/",
  maxAge: 7 * 24 * 60 * 60
}
```

## Testing

To verify the fix works:

1. **Check cookie storage**:
   - Open browser DevTools → Application/Storage → Cookies
   - Login to the application
   - Verify `accessToken` and `userData` cookies are present
   - Check that cookies are set for `trackdesk-t1hm.vercel.app` domain

2. **Check authentication**:
   - After login, cookies should be present
   - Should NOT see "Unauthorized" screen
   - Should be able to access protected routes

3. **Check cross-domain requests**:
   - In Network tab, verify that cookies are sent with requests
   - Backend should receive `accessToken` cookie in request
   - Backend should be able to authenticate the user

## Files Modified

1. `frontend/app/api/auth/login/route.ts` - Modified cookie setting logic for production
2. `frontend/lib/auth-client.ts` - Added `credentials: "include"` to fetch requests
3. `backend/src/middleware/auth.ts` - Added cross-domain detection to cookie setting
4. `backend/src/controllers/AuthController.ts` - Pass request to cookie function

## Environment Variables Required

Make sure these are set in Vercel:

### Frontend Environment:
- `NEXT_PUBLIC_BACKEND_URL=https://trackdesk-ihom.vercel.app`
- `NEXT_PUBLIC_API_URL=/api`

### Backend Environment:
- `FRONTEND_URL=https://trackdesk-t1hm.vercel.app`
- `NODE_ENV=production`
- `VERCEL=1` (automatically set by Vercel)
- `JWT_SECRET` (your secret key)
- Other required environment variables

## Next Steps

1. Deploy these changes to Vercel
2. Test login flow in production
3. Verify cookies are being stored
4. Verify authentication works after login
5. Test logout functionality (should clear cookies)

## Notes

- SameSite=None requires Secure=true (HTTPS)
- Modern browsers require both flags for cross-domain cookies
- The `credentials: "include"` flag is essential for sending cookies cross-domain
- In development, cookies work normally because frontend and backend can be same domain

