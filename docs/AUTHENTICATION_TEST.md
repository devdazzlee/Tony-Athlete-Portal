# 🔐 Authentication Test Script

## **Quick Authentication Check**

Open your browser console (F12) and run this script to check your authentication status:

```javascript
// Check authentication status
console.log("=== AUTHENTICATION CHECK ===");

// Check localStorage for auth data
const user = localStorage.getItem("user");
const token = localStorage.getItem("token");
console.log("User:", user ? JSON.parse(user) : "Not found");
console.log("Token:", token ? "Present" : "Not found");

// Check cookies
console.log("Cookies:", document.cookie);

// Test API call
console.log("=== TESTING API CALL ===");
fetch("http://localhost:3003/api/links/my-links", {
  credentials: "include",
})
  .then((response) => {
    console.log("API Response Status:", response.status);
    if (response.status === 401) {
      console.log("❌ NOT AUTHENTICATED - Please log in first");
      console.log("Go to: http://localhost:3000/auth/login");
    } else if (response.status === 200) {
      console.log("✅ AUTHENTICATED - API working");
    } else {
      console.log("⚠️ Unexpected status:", response.status);
    }
    return response.json();
  })
  .then((data) => {
    console.log("API Response Data:", data);
    if (data.links) {
      console.log("Number of links:", data.links.length);
    }
  })
  .catch((error) => {
    console.error("API Error:", error);
    console.log("❌ Backend not running or network error");
  });
```

## **Expected Results:**

### **If NOT Authenticated:**

```
User: Not found
Token: Not found
API Response Status: 401
❌ NOT AUTHENTICATED - Please log in first
```

### **If Authenticated:**

```
User: {id: "...", email: "...", ...}
Token: Present
API Response Status: 200
✅ AUTHENTICATED - API working
Number of links: 0 (or actual count)
```

---

## **Next Steps Based on Results:**

### **If Not Authenticated:**

1. Go to: `http://localhost:3000/auth/login`
2. Log in with your credentials
3. Run the test script again
4. Should see "✅ AUTHENTICATED"

### **If Authenticated but No Links:**

1. Go to: `http://localhost:3000/dashboard/links`
2. Generate a test link
3. Check database with Prisma Studio
4. Test all buttons work

### **If Backend Not Running:**

1. Start backend: `cd backend && npm run dev`
2. Should see: "🚀 Trackdesk Backend Server running on port 3003"
3. Run test script again

---

## **Database Check:**

Open Prisma Studio to verify data:

```bash
cd /Users/mac/Documents/GitHub/Trackdesk/backend
npx prisma studio
```

Check these tables:

- `User` - Your user record
- `AffiliateProfile` - Your affiliate profile
- `AffiliateLink` - Your generated links (should be empty initially)

---

## **Generate Test Data:**

Once authenticated, generate a test link:

1. **URL:** `https://example.com/test`
2. **Campaign:** `Test Campaign`
3. **Alias:** `test-001`
4. **Click:** "Generate Affiliate Link"

**Expected:**

- Success message
- Link appears in list
- Database record created
- All buttons work (View Stats, Delete, Toggle)

---

## **Debug Console Commands:**

```javascript
// Check current state
console.log("My Links:", window.myLinksState);

// Force refresh
window.location.reload();

// Clear all data
localStorage.clear();
sessionStorage.clear();

// Test specific API endpoint
fetch("http://localhost:3003/api/links/generate", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify({
    url: "https://test.com",
    campaignName: "Test",
  }),
})
  .then((r) => r.json())
  .then(console.log);
```

---

## **Summary:**

The issue is **authentication** - the API requires login but the frontend is trying to call APIs without being authenticated. Once you log in, everything will work perfectly!

**Solution:** Log in first, then generate real data, then all buttons will work with real database records! 🚀
