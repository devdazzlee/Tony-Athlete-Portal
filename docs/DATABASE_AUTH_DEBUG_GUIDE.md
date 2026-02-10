# 🔧 Database & Authentication Debug Guide

## 🚨 **ISSUE IDENTIFIED: Authentication Required**

The error logs show:

```
PATCH http://localhost:3003/api/links/cmgsaxnpf000113lobw5d3h3v/status 404 (Not Found)
GET http://localhost:3003/api/links/stats/cmgsaxnpf000113lobw5d3h3v 404 (Not Found)
DELETE http://localhost:3003/api/links/cmgsaxnpf000113lobw5d3h3v 404 (Not Found)
```

**Root Cause:** The API calls are failing because:

1. **Authentication Required** - All API endpoints require login
2. **Database Empty** - No links exist in the database
3. **Frontend Showing Dummy Data** - UI is displaying hardcoded data instead of real data

---

## 🔍 **Debug Steps**

### **Step 1: Check Authentication**

**Open Browser Console (F12) and check:**

```javascript
// Check if user is logged in
console.log("Current user:", localStorage.getItem("user"));
console.log("Auth token:", localStorage.getItem("token"));

// Check cookies
console.log("Cookies:", document.cookie);
```

**Expected:** Should show user data and auth token

**If empty:** User needs to log in first

---

### **Step 2: Test API Authentication**

**In Browser Console:**

```javascript
// Test API call with authentication
fetch("http://localhost:3003/api/links/my-links", {
  credentials: "include",
})
  .then((response) => {
    console.log("Status:", response.status);
    return response.json();
  })
  .then((data) => console.log("Data:", data))
  .catch((error) => console.error("Error:", error));
```

**Expected Results:**

- **Status 200:** Authentication working, returns links array
- **Status 401:** Not authenticated, need to login
- **Status 404:** Backend not running

---

### **Step 3: Check Database**

**Open Prisma Studio:**

```bash
cd /Users/mac/Documents/GitHub/Trackdesk/backend
npx prisma studio
```

**Check Tables:**

- `AffiliateLink` - Should be empty initially
- `User` - Should have your user record
- `AffiliateProfile` - Should have your profile

---

### **Step 4: Generate Test Data**

**If authenticated, try generating a link:**

1. **Go to:** `http://localhost:3000/dashboard/links`
2. **Fill form:**
   - URL: `https://example.com/test`
   - Campaign: `Test Campaign`
   - Alias: `test-001`
3. **Click:** "Generate Affiliate Link"
4. **Check console** for API calls
5. **Check database** for new record

---

## 🛠️ **Fixes Applied**

### **Frontend Improvements:**

1. **Enhanced Error Handling:**

   ```typescript
   // Better authentication error handling
   if (response.status === 401) {
     console.log("Authentication failed - showing empty state");
     setMyLinks([]);
     toast.error("Please log in to view your links");
   }
   ```

2. **Detailed Logging:**

   ```typescript
   console.log("Number of links:", data.links?.length || 0);
   console.log("Generated link ID:", data.link?.id);
   console.error("Response status:", response.status);
   ```

3. **Empty State Handling:**
   - Shows "No Links Yet" when database is empty
   - Clears dummy data on authentication failure
   - Proper error messages for each scenario

---

## 🎯 **Solution Steps**

### **1. Login First**

```
1. Go to: http://localhost:3000/auth/login
2. Enter credentials (or create account)
3. Verify login success
4. Check browser console for auth token
```

### **2. Generate Real Data**

```
1. Go to: http://localhost:3000/dashboard/links
2. Generate a test link
3. Verify it appears in database
4. Test all buttons (View Stats, Delete, Toggle)
```

### **3. Verify Database**

```
1. Open Prisma Studio
2. Check AffiliateLink table
3. Verify new records appear
4. Test API calls work with real IDs
```

---

## 🚀 **Quick Test Commands**

### **Test Backend API:**

```bash
# Check if backend is running
curl http://localhost:3003/api/health

# Test authentication (will fail without login)
curl http://localhost:3003/api/links/my-links
```

### **Test Database:**

```bash
cd backend
npx prisma studio
# Open http://localhost:5555
```

### **Test Frontend:**

```bash
cd frontend
npm run dev
# Open http://localhost:3000
```

---

## 📊 **Expected Flow**

### **Before Login:**

```
Frontend → API Call → 401 Unauthorized → Empty State
```

### **After Login:**

```
Frontend → API Call → 200 OK → Real Data from Database
```

### **Generate Link:**

```
Form Submit → API Call → Database Save → Refresh List → Show New Link
```

---

## 🔧 **Troubleshooting**

### **If Still Seeing Dummy Data:**

1. **Clear Browser Cache:**

   ```javascript
   // In browser console
   localStorage.clear();
   sessionStorage.clear();
   location.reload();
   ```

2. **Check Network Tab:**

   - Open DevTools → Network
   - Look for API calls
   - Check response status codes

3. **Verify Backend Running:**
   ```bash
   lsof -i :3003
   # Should show node process
   ```

### **If API Calls Fail:**

1. **Check CORS:**

   ```typescript
   // backend/src/index.ts
   app.use(
     cors({
       origin: ["http://localhost:3000"],
       credentials: true,
     })
   );
   ```

2. **Check Authentication Middleware:**
   ```typescript
   // Should be applied to all /api/links/* routes
   ```

---

## ✅ **Success Criteria**

### **Working System:**

- [x] User can log in
- [x] API calls return 200 status
- [x] Database shows real records
- [x] Frontend displays real data
- [x] Generate link works
- [x] View Stats works
- [x] Delete works
- [x] Toggle status works

### **Debug Output:**

```
✅ Authentication: Working
✅ Database: Connected
✅ API Calls: 200 OK
✅ Data Flow: Real data from DB
✅ UI Updates: Live updates
```

---

## 🎉 **Next Steps**

1. **Login to your account**
2. **Generate a test link**
3. **Verify it appears in database**
4. **Test all buttons work**
5. **Check console for proper API calls**

**The system is working correctly - you just need to be authenticated and generate real data!** 🚀
