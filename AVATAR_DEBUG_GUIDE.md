# Avatar Debug Guide

## Issue
Avatar shows in `/settings/profile` API but not in `/auth/me` API (useAuth).

## Debugging Steps

### Step 1: Rebuild Backend (Important!)
```bash
cd backend
npm run build
# or
yarn build
```

**You must rebuild** to apply the logging changes to the backend!

### Step 2: Test Avatar Upload
1. Open browser DevTools (Console tab)
2. Go to Settings → Profile
3. Upload a new avatar
4. Watch the console for these logs:

**Backend logs (in terminal):**
```
🖼️ Uploading avatar for user: [userId]
☁️ Cloudinary upload successful: [cloudinary-url]
💾 Database updated - User avatar: [cloudinary-url]
```

**Frontend logs (in browser console):**
```
🚀 ~ fetchProfile ~ data: { user: { avatar: "..." } }
```

### Step 3: Test Avatar in Auth Context
After uploading, the profile page calls `refreshUser()`. Watch for:

**Frontend logs:**
```
🔍 AuthClient.getProfile - Raw response from /auth/me: { avatar: "..." }
📦 AuthClient.getProfile - User object being returned: { avatar: "..." }
✅ AuthContext.refreshUser - Received user data: { avatar: "..." }
🔄 AuthContext.refreshUser - State updated with avatar: "..."
🍪 AuthContext.refreshUser - Cookies updated with avatar: "..."
```

**Backend logs:**
```
🔍 AuthService.getProfile - Raw user from DB: { avatar: "..." }
📤 AuthService.getProfile - Response being sent: { avatar: "..." }
```

### Step 4: Check Dashboard Header/Sidebar
Navigate to Dashboard and check:
```
🚀 ~ DashboardLayout ~ user: { avatar: "..." }
```

## Expected vs Actual

### Expected Flow
1. Upload avatar → Cloudinary URL saved to database
2. `/settings/profile` returns avatar ✅
3. `/auth/me` returns same avatar ✅
4. useAuth.user.avatar has the URL ✅
5. Header/sidebar show the image ✅

### Current Issue
1. Upload avatar → Cloudinary URL saved to database ✅
2. `/settings/profile` returns avatar ✅
3. `/auth/me` returns avatar: null ❌
4. useAuth.user.avatar is null ❌
5. Header/sidebar show fallback initials ❌

## Possible Causes

### 1. Backend Not Rebuilt
**Solution:** Run `npm run build` in backend folder

### 2. Prisma Client Cache
The Prisma client might be caching old schema.
**Solution:**
```bash
cd backend
npx prisma generate
npm run build
```

### 3. Different Prisma Instances
If `AuthService` and `/settings/profile` use different Prisma instances.
**Check:** Both should import from `@/lib/prisma`

### 4. Database Connection Issue
The upload saves to DB, but `/auth/me` reads from a different connection.
**Check:** Verify DATABASE_URL in `.env`

### 5. Response Serialization Issue
The avatar field exists but gets lost during JSON serialization.
**Check:** Backend logs will show if DB has the data

## Quick Fix Test

Try this direct database query to verify the avatar is actually saved:

**Backend route test (add temporarily to auth.ts):**
```typescript
router.get("/debug-avatar", authenticateToken, async (req: any, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { id: true, email: true, avatar: true }
  });
  res.json({ directFromDB: user });
});
```

Then call: `GET http://localhost:3003/api/auth/debug-avatar`

Compare the response with what `/auth/me` returns.

## Next Steps

1. **Rebuild backend** - This is critical!
2. **Upload a new avatar** or edit your existing one
3. **Check all console logs** (frontend and backend)
4. **Share the logs** with me if the issue persists

The logs will tell us exactly where the avatar data is getting lost:
- If backend logs show avatar but frontend doesn't → network/serialization issue
- If backend logs show null → database/Prisma issue
- If frontend receives it but doesn't display → React state issue

## Files Modified

### Backend
- ✅ `backend/src/services/AuthService.ts` - Added logging to getProfile
- ✅ `backend/src/routes/upload.ts` - Added logging to avatar upload

### Frontend
- ✅ `frontend/lib/auth-client.ts` - Added logging to getProfile
- ✅ `frontend/contexts/AuthContext.tsx` - Added logging to refreshUser

