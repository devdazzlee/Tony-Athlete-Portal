# 🎯 Website Tracking Integration - Quick Summary

Quick reference guide for the complete website and tracking integration flow.

---

## 🔄 **Complete Flow Overview**

```
┌─────────────────────────────────────────────────────────────┐
│                    COMPLETE FLOW                            │
└─────────────────────────────────────────────────────────────┘

1. ADMIN CREATES WEBSITE
   ↓
   Admin → Settings → Websites → Create
   Backend generates: websiteId = "store-1-production"
   ↓
2. AFFILIATE GETS WEBSITE ID
   ↓
   Affiliate → Settings → Websites → View
   Copies: NEXT_PUBLIC_TRACKDESK_WEBSITE_ID=store-1-production
   ↓
3. INTEGRATE IN NEXT.JS
   ↓
   frontend/.env.local:
   NEXT_PUBLIC_TRACKDESK_WEBSITE_ID=store-1-production

   app/layout.tsx:
   Trackdesk.init({ websiteId: 'store-1-production' })
   ↓
4. AFFILIATE SHARES LINK
   ↓
   https://your-store.com/?ref=AFF_0AGXXR
   ↓
5. CUSTOMER VISITS & TRACKING
   ↓
   Tracking script captures ?ref=AFF_0AGXXR
   Sends events with websiteId to /api/tracking/events
   ↓
6. CUSTOMER PURCHASES
   ↓
   Checkout success page sends order with websiteId
   POST /api/tracking/order { websiteId, referralCode, ... }
   ↓
7. COMMISSION CALCULATED
   ↓
   Backend calculates commission
   Creates AffiliateOrder with websiteId
   Updates affiliate stats
   ↓
8. ANALYTICS & REPORTING
   ↓
   View stats filtered by websiteId
   GET /api/tracking/stats/:websiteId
```

---

## 📋 **Backend CRUD Operations**

### **✅ Implemented:**

| Operation  | Endpoint            | Method | Role            | Status     |
| ---------- | ------------------- | ------ | --------------- | ---------- |
| **List**   | `/api/websites`     | GET    | AFFILIATE/ADMIN | ✅ Working |
| **View**   | `/api/websites/:id` | GET    | AFFILIATE/ADMIN | ✅ Working |
| **Create** | `/api/websites`     | POST   | ADMIN           | ✅ Working |
| **Update** | `/api/websites/:id` | PUT    | ADMIN           | ✅ Working |
| **Delete** | `/api/websites/:id` | DELETE | ADMIN           | ✅ Working |

### **Access Control:**

- ✅ **Authenticate:** All endpoints require `authenticateToken`
- ✅ **Admin Only:** Create, Update, Delete require `requireAdmin`
- ✅ **View All:** Affiliates and Admins can view (affiliates read-only)

---

## 🔌 **Tracking Script Integration**

### **How websiteId is Used:**

```javascript
// 1. INITIALIZATION (app/layout.tsx)
window.Trackdesk.init({
  apiUrl: 'http://localhost:3003/api',
  websiteId: 'store-1-production', // ← From .env.local
  debug: true
});

// 2. EVERY EVENT INCLUDES websiteId (trackdesk.js)
tracker.track('page_view', {...});
// Internally creates:
{
  event: 'page_view',
  websiteId: 'store-1-production', // ← Always included
  sessionId: 'session-123',
  data: {...},
  page: {...},
  device: {...},
  browser: {...}
}

// 3. BATCH SENDING (trackdesk.js)
POST /api/tracking/events
{
  events: [...], // Each includes websiteId
  websiteId: 'store-1-production', // ← Batch level
  sessionId: 'session-123',
  timestamp: '2024-01-15T10:30:00Z'
}
```

---

## 🗄️ **Database Integration**

### **Tables Using websiteId:**

1. **TrackingEvent**

   - Stores every tracking event
   - `websiteId` column links to website
   - Query: `WHERE websiteId = 'store-1-production'`

2. **TrackingSession**

   - Tracks user sessions per website
   - `websiteId` links session to website
   - Query: `WHERE websiteId = 'store-1-production'`

3. **TrackingStats**
   - Daily aggregated stats per website
   - Unique constraint: `[websiteId, date]`
   - Query: `WHERE websiteId = 'store-1-production'`

---

## 🔗 **API Integration Points**

### **Frontend → Backend:**

```typescript
// Create Website (Admin)
POST /api/websites
Headers: { Authorization: Bearer <admin-token> }
Body: { name, domain, description }

// List Websites (Affiliate/Admin)
GET /api/websites
Headers: { Authorization: Bearer <token> }
Response: { websites: [...] }

// Update Website (Admin)
PUT /api/websites/:id
Headers: { Authorization: Bearer <admin-token> }
Body: { name?, domain?, description? }

// Delete Website (Admin)
DELETE /api/websites/:id
Headers: { Authorization: Bearer <admin-token> }
```

### **Tracking Script → Backend:**

```javascript
// Batch Events
POST /api/tracking/events
Headers: { Content-Type: application/json }
Body: {
  events: [{ websiteId, event, data, ... }],
  websiteId: "store-1-production",
  sessionId: "session-123"
}

// Track Click
POST /api/tracking/click
Body: {
  referralCode: "AFF_0AGXXR",
  storeId: "store-1-production", // ← websiteId
  url: "...",
  ...
}

// Track Order
POST /api/tracking/order
Body: {
  referralCode: "AFF_0AGXXR",
  storeId: "store-1-production", // ← websiteId
  orderId: "ORD-123",
  orderValue: 99.99,
  ...
}
```

---

## 🎯 **Access Control Summary**

### **Affiliate Dashboard:**

- ✅ **View:** Can see all websites
- ✅ **Copy:** Can copy Website IDs
- ❌ **Create:** Cannot create websites
- ❌ **Edit:** Cannot edit websites
- ❌ **Delete:** Cannot delete websites

### **Admin Dashboard:**

- ✅ **View:** Can see all websites
- ✅ **Create:** Can create new websites
- ✅ **Edit:** Can update websites
- ✅ **Delete:** Can delete websites
- ✅ **Copy:** Can copy Website IDs

---

## 📊 **Data Flow Diagram**

```
┌──────────────┐
│   Admin      │
│  Dashboard   │───▶ POST /api/websites
└──────────────┘         ↓
                    Generate websiteId
                         ↓
                    Store in database
                         ↓
┌──────────────┐
│  Affiliate   │
│  Dashboard   │───▶ GET /api/websites
└──────────────┘         ↓
                    View websiteId
                         ↓
                    Copy to .env.local
                         ↓
┌──────────────┐
│  Next.js     │
│  Website     │───▶ Trackdesk.init({ websiteId })
└──────────────┘         ↓
                    All events include websiteId
                         ↓
┌──────────────┐
│  Tracking    │
│   Script     │───▶ POST /api/tracking/events
└──────────────┘         ↓
                    Backend stores with websiteId
                         ↓
┌──────────────┐
│  Database    │
│  Tables      │───▶ TrackingEvent (websiteId)
└──────────────┘    TrackingSession (websiteId)
                    TrackingStats (websiteId)
                         ↓
┌──────────────┐
│  Analytics   │
│  Dashboard   │───▶ GET /api/tracking/stats/:websiteId
└──────────────┘    Filter by websiteId
```

---

## ✅ **Complete Integration Checklist**

### **Backend:**

- [x] CRUD API endpoints implemented (`/api/websites`)
- [x] Access control (Admin only for CUD operations)
- [x] Validation with Zod schemas
- [x] websiteId generation logic
- [x] Tracking endpoints accept websiteId
- [x] Database tables store websiteId

### **Frontend Dashboard:**

- [x] Websites page created (`/dashboard/settings/websites`)
- [x] Admin websites page created (`/admin/settings/websites`)
- [x] Access control (affiliate view-only, admin full access)
- [x] UI indicators (badges, warning boxes)
- [x] Copy functionality (Website ID, ENV variable)

### **Tracking Script:**

- [x] Accepts websiteId in init() config
- [x] Includes websiteId in every event
- [x] Sends websiteId in batch payload
- [x] Works with environment variables

### **Next.js Integration:**

- [x] Environment variable support
- [x] Layout.tsx integration
- [x] Referral code capture
- [x] Order tracking with websiteId

---

## 🚀 **Ready for Production**

Your complete website tracking integration is:

✅ **Backend APIs:** CRUD operations fully implemented
✅ **Frontend UI:** Professional access control
✅ **Tracking Script:** Fully integrated with websiteId
✅ **Database Schema:** Supports websiteId filtering
✅ **Multi-Website:** Supports multiple Next.js projects
✅ **Referral Codes:** Work across all websites

**Everything is integrated and ready to use!** 🎉
