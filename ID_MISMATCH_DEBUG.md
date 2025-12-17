# 🔍 Debug Guide - ID Mismatch Issue

## 🚨 **Issue Identified:**

The frontend is using **different link IDs** than what's in the database:

- **Generated link ID:** `012d2dfe-54e7-473a-960c-cad32315d6ea` (UUID format)
- **Frontend trying to use:** `cmggrglmh0007yi1kukxs5njc` (different format)

This causes 404 errors because the IDs don't match.

---

## 🔧 **Debugging Added:**

### **Backend Debugging:**

```typescript
// In LinksService.getMyLinks()
console.log(
  "Raw database links:",
  links.map((l) => ({ id: l.id, customSlug: l.customSlug }))
);
console.log(
  "Mapped links:",
  mappedLinks.map((l) => ({ id: l.id, name: l.name }))
);
```

### **Frontend Debugging:**

```typescript
// In fetchMyLinks()
console.log(
  "Link IDs received:",
  data.links?.map((link) => ({ id: link.id, name: link.name }))
);

// In button handlers
console.log("Delete button clicked - Link ID:", linkId);
console.log("Toggle button clicked - Link ID:", linkId);
console.log("View Stats button clicked - Link ID:", linkId);
```

---

## 🧪 **Test Steps:**

### **1. Refresh the Page**

```
1. Go to: http://localhost:3000/dashboard/links
2. Open browser console (F12)
3. Look for the debugging logs
```

### **2. Check Backend Logs**

**Look for these logs in your backend terminal:**

```
LinksService.getMyLinks - Raw database links: [...]
LinksService.getMyLinks - Mapped links: [...]
```

### **3. Check Frontend Logs**

**Look for these logs in browser console:**

```
Link IDs received: [...]
Number of links: 5
```

### **4. Test Button Clicks**

**Click any button and check console:**

```
Delete button clicked - Link ID: [ID]
Sending DELETE request to: http://localhost:3003/api/links/[ID]
Delete response status: [STATUS]
```

---

## 🎯 **Expected Results:**

### **If IDs Match:**

```
Backend: Raw database links: [{id: "012d2dfe-54e7-473a-960c-cad32315d6ea", customSlug: "test-001"}]
Backend: Mapped links: [{id: "012d2dfe-54e7-473a-960c-cad32315d6ea", name: "test-001"}]
Frontend: Link IDs received: [{id: "012d2dfe-54e7-473a-960c-cad32315d6ea", name: "test-001"}]
Button: Delete button clicked - Link ID: 012d2dfe-54e7-473a-960c-cad32315d6ea
API: DELETE /api/links/012d2dfe-54e7-473a-960c-cad32315d6ea
Response: Status 200 ✅
```

### **If IDs Don't Match:**

```
Backend: Raw database links: [{id: "012d2dfe-54e7-473a-960c-cad32315d6ea", customSlug: "test-001"}]
Backend: Mapped links: [{id: "012d2dfe-54e7-473a-960c-cad32315d6ea", name: "test-001"}]
Frontend: Link IDs received: [{id: "cmggrglmh0007yi1kukxs5njc", name: "test-001"}]
Button: Delete button clicked - Link ID: cmggrglmh0007yi1kukxs5njc
API: DELETE /api/links/cmggrglmh0007yi1kukxs5njc
Response: Status 404 ❌
```

---

## 🔧 **Possible Causes:**

### **1. Old Data in Database**

- There might be old links with different ID formats
- The frontend is showing cached/old data

### **2. Data Mapping Issue**

- The service might be returning wrong IDs
- Frontend might be using wrong field

### **3. Caching Issue**

- Browser cache showing old data
- Frontend state not updating

---

## 🛠️ **Quick Fixes:**

### **Fix 1: Clear Browser Cache**

```javascript
// In browser console
localStorage.clear();
sessionStorage.clear();
location.reload();
```

### **Fix 2: Check Database**

```bash
cd backend
npx prisma studio
# Check AffiliateLink table for actual IDs
```

### **Fix 3: Force Refresh**

```javascript
// In browser console
window.location.reload(true);
```

---

## 📊 **What to Look For:**

### **Backend Terminal:**

```
LinksService.getMyLinks - Raw database links: [
  {id: "012d2dfe-54e7-473a-960c-cad32315d6ea", customSlug: "test-001"},
  {id: "another-uuid-here", customSlug: "another-alias"}
]
```

### **Browser Console:**

```
Link IDs received: [
  {id: "012d2dfe-54e7-473a-960c-cad32315d6ea", name: "test-001"},
  {id: "another-uuid-here", name: "another-alias"}
]
```

### **Button Click:**

```
Delete button clicked - Link ID: 012d2dfe-54e7-473a-960c-cad32315d6ea
Sending DELETE request to: http://localhost:3003/api/links/012d2dfe-54e7-473a-960c-cad32315d6ea
Delete response status: 200
```

---

## 🎉 **Expected Fix:**

Once we identify the ID mismatch, the buttons should work perfectly:

✅ **Delete Button:** Removes link from database  
✅ **Toggle Status:** Updates link status  
✅ **View Stats:** Shows analytics modal

---

## 📞 **Next Steps:**

1. **Refresh the page** and check console logs
2. **Compare backend vs frontend IDs**
3. **Identify the mismatch source**
4. **Apply the appropriate fix**
5. **Test all buttons work**

**The debugging will show us exactly what's happening!** 🔍
