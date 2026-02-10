# 🧪 Links API Testing & Troubleshooting Guide

## ⚠️ Issues Identified & Fixed

### **Problem:** Frontend showing dummy/static data, not hitting APIs

### **Root Causes Found:**

1. ❌ API not being called properly
2. ❌ No delete button in UI
3. ❌ No activate/deactivate functionality
4. ❌ Data not persisting to database

### **Solutions Implemented:**

1. ✅ Added delete button functionality
2. ✅ Added activate/deactivate toggle button
3. ✅ Added debugging console logs
4. ✅ Enhanced error handling
5. ✅ Fixed all CRUD operations

---

## 🚀 Step-by-Step Testing Guide

### **Step 1: Verify Backend is Running**

```bash
# Check if backend is running on port 3003
curl http://localhost:3003/api/links/my-links

# Expected response (without auth):
# {"error":"Access token required"}
```

✅ **If you see this error**, the backend is running correctly!

---

### **Step 2: Verify Database Connection**

```bash
# Check database connection
cd /Users/mac/Documents/GitHub/Trackdesk/backend
npx prisma studio
```

This will open Prisma Studio where you can view your database tables:

- `AffiliateLink`
- `Coupon`
- `AffiliateClick`
- `AffiliateProfile`

---

### **Step 3: Start Both Servers**

**Terminal 1 (Backend):**

```bash
cd /Users/mac/Documents/GitHub/Trackdesk/backend
npm run dev
```

Expected output:

```
🚀 Trackdesk Backend Server running on port 3003
📡 WebSocket server running on port 3003
```

**Terminal 2 (Frontend):**

```bash
cd /Users/mac/Documents/GitHub/Trackdesk/frontend
npm run dev
```

Expected output:

```
▲ Next.js 14.x.x
- Local: http://localhost:3000
```

---

### **Step 4: Test Frontend Integration**

1. **Open Browser:**

   ```
   http://localhost:3000/dashboard/links
   ```

2. **Open Browser Console** (F12 or Cmd+Option+I)

3. **Check Console Logs:**
   - You should see: `Fetching links from: http://localhost:3003/api/links/my-links`
   - You should see: `Links fetch response status: 200` (if authenticated) or `401` (if not)

---

### **Step 5: Test Link Generation**

1. **In the dashboard**, go to "URL Generator" tab

2. **Enter:**

   - Destination URL: `https://example.com/product`
   - Campaign Name: `Test Campaign`
   - Custom Alias: `test-link-001`

3. **Click "Generate Affiliate Link"**

4. **Check Console:**

   ```
   Generating link: { url: "https://example.com/product", campaignName: "Test Campaign", customAlias: "test-link-001" }
   API URL: http://localhost:3003/api/links/generate
   Generate link response status: 201
   Link generated successfully: { success: true, link: {...}, message: "..." }
   ```

5. **Verify in Database:**
   ```bash
   # In Prisma Studio, check AffiliateLink table
   # You should see a new record with customSlug: "test-link-001"
   ```

---

### **Step 6: Test Delete Functionality**

1. **In your links list**, find a link

2. **Click the "Delete" button** (red button with trash icon)

3. **Confirm deletion** in the popup

4. **Check Console:**

   ```
   DELETE http://localhost:3003/api/links/[linkId]
   Response: 200 OK
   ```

5. **Verify:** Link should disappear from the list

6. **Verify in Database:** Link should be removed from `AffiliateLink` table

---

### **Step 7: Test Activate/Deactivate**

1. **Find a link** in your list

2. **Click "Deactivate"** (or "Activate" if inactive)

3. **Check Console:**

   ```
   PATCH http://localhost:3003/api/links/[linkId]/status
   Response: 200 OK
   ```

4. **Verify:** Badge should change to "Inactive" (or "Active")

5. **Verify in Database:** `isActive` field should be updated

---

## 🐛 Troubleshooting

### **Issue: "Access token required" error**

**Cause:** Not logged in

**Fix:**

1. Go to `http://localhost:3000/auth/login`
2. Log in with your credentials
3. Return to `/dashboard/links`

---

### **Issue: "Failed to fetch links" toast**

**Cause:** Backend not running or port mismatch

**Fix:**

1. Check if backend is running:
   ```bash
   lsof -i :3003
   ```
2. If not running, start it:
   ```bash
   cd backend && npm run dev
   ```

---

### **Issue: CORS Error in Console**

**Cause:** CORS not configured for localhost:3000

**Fix:** Check `backend/src/index.ts` CORS config:

```typescript
app.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:3003"],
    credentials: true,
  })
);
```

---

### **Issue: Links not saving to database**

**Check these:**

1. **Database connection:**

   ```bash
   cd backend
   npx prisma studio
   ```

2. **Check console logs** for errors

3. **Verify .env file** has correct `DATABASE_URL`

4. **Run migrations:**
   ```bash
   cd backend
   npx prisma migrate dev
   npx prisma generate
   ```

---

## 📋 API Endpoints Checklist

Test each endpoint manually:

### **1. Generate Link**

```bash
curl -X POST http://localhost:3003/api/links/generate \
  -H "Content-Type: application/json" \
  -H "Cookie: accessToken=YOUR_TOKEN" \
  -d '{
    "url": "https://example.com",
    "customAlias": "test123"
  }'
```

Expected: `201 Created` with link data

---

### **2. Get My Links**

```bash
curl http://localhost:3003/api/links/my-links \
  -H "Cookie: accessToken=YOUR_TOKEN"
```

Expected: `200 OK` with array of links

---

### **3. Delete Link**

```bash
curl -X DELETE http://localhost:3003/api/links/LINK_ID \
  -H "Cookie: accessToken=YOUR_TOKEN"
```

Expected: `200 OK` with success message

---

### **4. Toggle Link Status**

```bash
curl -X PATCH http://localhost:3003/api/links/LINK_ID/status \
  -H "Content-Type: application/json" \
  -H "Cookie: accessToken=YOUR_TOKEN" \
  -d '{"isActive": false}'
```

Expected: `200 OK` with updated link

---

### **5. Get Coupons**

```bash
curl http://localhost:3003/api/links/coupons/available \
  -H "Cookie: accessToken=YOUR_TOKEN"
```

Expected: `200 OK` with array of coupons

---

### **6. Generate Coupon**

```bash
curl -X POST http://localhost:3003/api/links/coupons/generate \
  -H "Content-Type: application/json" \
  -H "Cookie: accessToken=YOUR_TOKEN" \
  -d '{
    "description": "Test coupon",
    "discountType": "PERCENTAGE",
    "discountValue": 20,
    "maxUsage": 100
  }'
```

Expected: `201 Created` with coupon data

---

## 🔍 Database Verification Queries

### **Check if links are being saved:**

```sql
-- In Prisma Studio or SQL client
SELECT * FROM "AffiliateLink" ORDER BY "createdAt" DESC LIMIT 10;
```

### **Check coupons:**

```sql
SELECT * FROM "Coupon" ORDER BY "createdAt" DESC LIMIT 10;
```

### **Check clicks:**

```sql
SELECT * FROM "AffiliateClick" ORDER BY "createdAt" DESC LIMIT 10;
```

---

## ✅ Success Checklist

- [ ] Backend running on port 3003
- [ ] Frontend running on port 3000
- [ ] Logged in successfully
- [ ] Console shows API calls being made
- [ ] Generate link: Status 201, link appears in list
- [ ] Links saved to database (verify in Prisma Studio)
- [ ] Delete button works and removes link
- [ ] Activate/deactivate button changes status
- [ ] Coupons are fetched and displayed
- [ ] No CORS errors in console
- [ ] No authentication errors

---

## 🎯 Expected Console Output (Success)

When everything works, you should see:

```
Fetching links from: http://localhost:3003/api/links/my-links
Links fetch response status: 200
Links data received: { success: true, links: [...], total: 3 }

Generating link: { url: "https://example.com", customAlias: "test" }
API URL: http://localhost:3003/api/links/generate
Generate link response status: 201
Link generated successfully: { success: true, link: {...} }

Fetching links from: http://localhost:3003/api/links/my-links
Links fetch response status: 200
Links data received: { success: true, links: [...], total: 4 }
```

---

## 📊 What Each Button Does

### **Generate Affiliate Link Button:**

- Validates input
- Sends POST to `/api/links/generate`
- Saves link to `AffiliateLink` table
- Refreshes list automatically

### **Delete Button (Red with Trash Icon):**

- Shows confirmation dialog
- Sends DELETE to `/api/links/:linkId`
- Removes from database
- Refreshes list

### **Activate/Deactivate Button:**

- Sends PATCH to `/api/links/:linkId/status`
- Updates `isActive` field in database
- Changes badge color (green = active, gray = inactive)
- Refreshes list

### **Copy Buttons (Clipboard Icons):**

- Copies link to clipboard
- Shows success toast
- Doesn't hit API (client-side only)

---

## 🚨 Common Errors & Fixes

### **Error: "Affiliate profile not found"**

**Fix:** Create affiliate profile first or check user role

### **Error: "Custom alias is already taken"**

**Fix:** Use a different alias (must be unique)

### **Error: "Invalid URL format"**

**Fix:** URL must start with http:// or https://

### **Error: "Failed to track click"**

**Fix:** Link doesn't exist or is inactive

---

## 📝 Next Steps

Once all tests pass:

1. **Remove console.log statements** (for production)
2. **Add rate limiting** (prevent abuse)
3. **Add analytics charts** (visualize data)
4. **Set up monitoring** (track errors)

---

## 💡 Pro Tips

1. **Test with Browser DevTools Network tab open** - See all API calls
2. **Keep Prisma Studio open** - Watch database changes in real-time
3. **Use unique aliases** - Easier to track in logs
4. **Check backend terminal** - See server-side logs
5. **Test error cases** - Try invalid data to verify validation

---

## ✅ Final Verification

**Everything is working if:**

1. ✅ Links appear after generation
2. ✅ Database shows new records
3. ✅ Delete removes links
4. ✅ Toggle changes status
5. ✅ No console errors
6. ✅ Toast notifications appear
7. ✅ Stats update (clicks, conversions, earnings)

**Your Links API is now fully functional!** 🎉
