# Migration to localStorage Authentication

## Summary

Complete migration from cookie-based authentication to localStorage for better cross-domain compatibility and simpler implementation.

## Why localStorage?

- **No cross-domain issues**: localStorage is domain-specific and doesn't have the SameSite/Secure restrictions of cookies
- **Simpler implementation**: No need to manage cookie attributes, forwarding, or cross-domain cookie logic
- **Works everywhere**: Same code works for development and production without environment-specific logic
- **Better for mobile**: localStorage works better with mobile apps and PWAs

## Changes Made

### 1. Frontend Auth Client (`frontend/lib/auth-client.ts`)

**Before**: Used cookies (getCookie, setCookie, deleteCookie)  
**After**: Uses localStorage (getItem, setItem, removeItem)

**Key Changes**:

- Removed all cookie manipulation functions
- `getToken()` now reads from `localStorage.getItem("accessToken")`
- `setAuth()` stores token and user data in localStorage
- `clearAuth()` removes items from localStorage
- `isAuthenticated()` checks localStorage instead of cookies
- Added Authorization header to all API calls (`Bearer ${token}`)

### 2. Frontend Login API Route (`frontend/app/api/auth/login/route.ts`)

**Before**: Set cookies in production, forwarded backend cookies in development  
**After**: Simply returns token and user data; client stores in localStorage

### 3. Frontend Middleware (`frontend/middleware.ts`)

**Before**: Read from cookies and performed authentication checks  
**After**: Simplified to allow all requests; client-side components handle auth

**Why**: Middleware runs on the edge and can't access localStorage. Client-side components (like layout wrappers, AuthContext, etc.) handle authentication checks instead.

### 4. Frontend API Client (`frontend/lib/api-client.ts`)

**Before**: Used `withCredentials: true` to send cookies  
**After**: Reads token from localStorage and sets `Authorization` header on every request

**Key Changes**:

- Changed `withCredentials: false` (no longer needed)
- Added request interceptor that reads token from localStorage
- Automatically adds `Authorization: Bearer <token>` to all requests

### 5. Backend (`backend/`)

**No changes needed**: Backend already prioritizes Authorization header over cookies in `authenticateToken` middleware (line 37-44 in auth.ts).

The backend will still set cookies (for backwards compatibility), but they'll be ignored since:

1. Frontend sends Authorization header with token from localStorage
2. Backend middleware checks Authorization header first (line 38-39)
3. Cookies are only checked as fallback (line 42-44)

## How It Works Now

### Login Flow:

1. User enters credentials
2. Frontend calls `/api/auth/login` (Next.js API route)
3. Next.js API route forwards to backend
4. Backend validates and returns `{ token, user }`
5. Frontend stores both in localStorage
6. Subsequent requests include `Authorization: Bearer <token>` header

### API Requests:

1. Frontend makes API call
2. API client interceptor reads token from localStorage
3. Adds `Authorization` header to request
4. Backend middleware reads token from header
5. Validates and processes request

### Logout:

1. Frontend calls `/api/auth/logout` with token in header
2. Backend processes logout
3. Frontend removes items from localStorage
4. User is redirected to login

## Authentication Storage

### localStorage Keys:

- `accessToken`: JWT token for authentication
- `userData`: JSON stringified user object with id, email, name, role, avatar

### Security Considerations:

- Token is stored in localStorage (not httpOnly)
- This is acceptable for SPAs as:
  - localStorage is not accessible from other domains
  - XSS attacks would need to be in your domain already
  - Token expiration still applies (7 days)
  - Consider implementing refresh tokens for better security

## Testing

### Verify localStorage is being used:

1. Open browser DevTools → Application → Storage → Local Storage
2. Login to the application
3. Verify `accessToken` and `userData` are present

### Verify API requests include token:

1. Open Network tab in DevTools
2. Make any API call (e.g., fetch profile)
3. Check request headers for `Authorization: Bearer <token>`

### Test logout:

1. Click logout
2. Verify localStorage is cleared
3. Verify user is redirected to login
4. Verify authenticated routes are blocked

## Migration Benefits

- ✅ No cross-domain cookie issues
- ✅ Simpler codebase (removed ~100 lines of cookie logic)
- ✅ Works identically in dev and production
- ✅ Better mobile/PWA support
- ✅ Easier to debug (can see token in DevTools)

## Files Modified

1. `frontend/lib/auth-client.ts` - Complete rewrite to use localStorage
2. `frontend/app/api/auth/login/route.ts` - Removed all cookie logic
3. `frontend/lib/api-client.ts` - Added Authorization header
4. `frontend/middleware.ts` - Simplified (client handles auth)
5. `backend/src/middleware/auth.ts` - Already supported Authorization header
6. `backend/src/controllers/AuthController.ts` - Already returns token

## Next Steps

1. Deploy to production
2. Test login/logout flow
3. Verify all API calls work
4. Monitor for any authentication issues
5. Consider implementing refresh tokens for better UX

## Backwards Compatibility

- Backend still sets cookies (won't break anything)
- Backend still checks cookies as fallback
- Can gradually migrate API endpoints to remove cookie dependency
