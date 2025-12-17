# 🚀 TC Nutrition Athlete Portal - Complete Application Flow

## 📋 What is This Application?

**TC Nutrition Athlete Portal** is an **Affiliate Marketing Management System** designed to:

1. **Manage Affiliates** (Athletes/Influencers) who promote TC Nutrition products
2. **Track Sales & Commissions** from affiliate referrals
3. **Manage Deliverables** - Track what content affiliates need to post
4. **Process Payouts** - Handle commission payments to affiliates
5. **Admin Management** - Allow admins to manage affiliates, view analytics, and control the system

---

## 🏗️ Architecture Overview

### **Tech Stack:**
- **Frontend:** Next.js 14 (React) + TypeScript + Tailwind CSS
- **Backend:** Node.js + Express + TypeScript + Prisma ORM
- **Database:** PostgreSQL (Neon Tech)
- **Authentication:** JWT tokens stored in localStorage
- **File Storage:** Cloudinary (for images)

### **Ports:**
- Frontend: `http://localhost:3001`
- Backend API: `http://localhost:3003/api`

---

## 👥 User Roles

The system has **3 main user roles**:

### 1. **AFFILIATE** (Athlete/Influencer)
- Promotes TC Nutrition products
- Gets discount codes to share
- Tracks their performance (clicks, conversions, earnings)
- Submits deliverables (social media posts)
- Views commissions and earnings

### 2. **ADMIN**
- Manages all affiliates
- Views all analytics and reports
- Approves/rejects payouts
- Edits affiliate profiles
- Sets custom deliverables notes for each affiliate
- Full system access

### 3. **MANAGER**
- Similar to admin but with limited permissions
- Can manage affiliates and view reports

---

## 🔄 Complete Application Flow

### **Phase 1: User Registration & Authentication**

#### **1.1 Registration Flow:**
```
User visits → /auth/register
  ↓
Fills form (email, password, name)
  ↓
POST /api/auth/register
  ↓
Backend creates User record in database
  ↓
Creates AffiliateProfile (if role = AFFILIATE)
  ↓
Returns JWT token
  ↓
Frontend stores token in localStorage
  ↓
Redirects to /dashboard
```

#### **1.2 Login Flow:**
```
User visits → /auth/login
  ↓
Enters email & password
  ↓
POST /api/auth/login
  ↓
Backend validates credentials
  ↓
Returns JWT token + user data
  ↓
Frontend stores token in localStorage
  ↓
AuthContext updates with user info
  ↓
Redirects based on role:
  - AFFILIATE → /dashboard
  - ADMIN → /admin
  - MANAGER → /manager
```

#### **1.3 Authentication Middleware:**
- Every API request includes JWT token in `Authorization: Bearer <token>` header
- Backend `authenticateToken` middleware validates token
- If invalid → returns 401 Unauthorized
- If valid → attaches user info to `req.user`

---

### **Phase 2: Affiliate Dashboard Flow**

#### **2.1 Dashboard Initialization:**
```
User lands on /dashboard
  ↓
AuthContext checks localStorage for token
  ↓
If no token → redirect to /auth/login
  ↓
If token exists → fetch user profile
  ↓
GET /api/athlete/profile
  ↓
Backend returns:
  - Social media links
  - Discount code
  - Discount value (from coupon)
  - Deliverables note
  ↓
Display in "Affiliate Information" card
```

#### **2.2 Dashboard Data Loading:**
```
Dashboard page loads
  ↓
Multiple API calls in parallel:
  1. GET /api/athlete/profile (user info)
  2. GET /api/athlete/performance (stats)
  3. GET /api/athlete/detailed-performance (charts)
  4. GET /api/athlete/commission-summary (earnings)
  ↓
Display:
  - Profile section (social media, discount code)
  - Performance metrics (conversions, commission)
  - Charts (conversion trends)
  - Commission summary
```

---

### **Phase 3: Discount Code & Tracking System**

#### **3.1 How Discount Codes Work:**
```
Admin creates affiliate account
  ↓
System generates ReferralCode (e.g., "ATHLETE001")
  ↓
Admin creates Coupon linked to that code
  ↓
Coupon has discount value (e.g., "10%", "$5", "FREE_SHIPPING")
  ↓
Affiliate sees code + value on dashboard
  ↓
Affiliate shares code with customers
```

#### **3.2 Tracking Flow (When Customer Clicks Link):**
```
Customer clicks affiliate link: https://store.com/?ref=ATHLETE001
  ↓
Store's tracking script (trackdesk.js) detects ref parameter
  ↓
POST /api/tracking/click
  {
    referralCode: "ATHLETE001",
    storeId: "store-a",
    url: "https://store.com/product",
    referrer: "https://instagram.com",
    userAgent: "...",
    ipAddress: "..."
  }
  ↓
Backend:
  1. Finds ReferralCode in database
  2. Creates AffiliateClick record
  3. Sets cookie (90 days) to remember affiliate
  4. Updates affiliate's totalClicks count
  ↓
Customer browses store (cookie tracks them)
```

#### **3.3 Conversion Tracking (When Customer Buys):**
```
Customer completes purchase
  ↓
Store's order success page calls:
  Trackdesk.trackOrder({
    orderId: "ORD-123",
    orderValue: 99.99,
    customerEmail: "customer@email.com",
    items: [...]
  })
  ↓
POST /api/tracking/order
  ↓
Backend:
  1. Checks cookie for affiliate code
  2. Creates AffiliateOrder record
  3. Calculates commission (based on affiliate's commissionRate)
  4. Creates Commission record (status: PENDING)
  5. Updates affiliate's totalConversions & totalEarnings
  ↓
Affiliate sees new conversion in dashboard
```

---

### **Phase 4: Deliverables Management Flow**

#### **4.1 Admin Sets Deliverables:**
```
Admin goes to /admin/affiliates
  ↓
Clicks "Edit" on an affiliate
  ↓
Opens dialog with form
  ↓
Enters custom note in "Deliverables Note" field:
  "Post 3 times on TikTok per month"
  ↓
PATCH /api/admin/affiliates/:id/deliverables-note
  ↓
Backend updates AffiliateProfile.deliverablesNote
  ↓
Saved to database
```

#### **4.2 Affiliate Views Deliverables:**
```
Affiliate goes to /dashboard/deliverables
  ↓
GET /api/athlete/profile
  ↓
Backend returns deliverablesNote
  ↓
Displays note at top of page (if exists)
  ↓
Affiliate sees what they need to do
```

#### **4.3 Affiliate Submits Deliverables:**
```
Affiliate fills form:
  - Selects month (e.g., "November")
  - Adds links (URL + Platform)
  - Uploads photos (optional)
  ↓
For each link:
  - If photo uploaded → POST /api/upload/deliverable
  - Photo uploaded to Cloudinary
  - Returns photoUrl
  ↓
POST /api/athlete/deliverables
  {
    month: "November",
    links: [
      {
        url: "https://instagram.com/p/...",
        platform: "Instagram",
        photoUrl: "https://cloudinary.com/..."
      }
    ]
  }
  ↓
Backend:
  1. Creates Activity record (action: "deliverable_submitted")
  2. Stores month, URL, platform, photoUrl in details JSON
  ↓
Saved to database
```

#### **4.4 Viewing Submissions:**
```
Affiliate views /dashboard/deliverables
  ↓
GET /api/athlete/deliverables?month=November
  ↓
Backend:
  1. Finds all Activity records with action="deliverable_submitted"
  2. Filters by month (from details JSON)
  3. Returns array of submissions
  ↓
Frontend displays in table:
  - Date
  - Platform
  - URL (clickable)
  - Photo (thumbnail, clickable to view full size)
```

---

### **Phase 5: Commission & Payout Flow**

#### **5.1 Commission Calculation:**
```
Order is tracked → Conversion created
  ↓
Commission = OrderValue × (CommissionRate / 100)
  Example: $100 × 30% = $30 commission
  ↓
Commission record created:
  - status: PENDING
  - amount: $30
  - affiliateId: "..."
  - orderId: "ORD-123"
```

#### **5.2 Commission Approval:**
```
Admin views /admin/commissions
  ↓
Sees pending commissions
  ↓
Clicks "Approve"
  ↓
PATCH /api/admin/commissions/:id/approve
  ↓
Backend updates Commission.status = APPROVED
  ↓
Affiliate's totalEarnings increases
```

#### **5.3 Payout Processing:**
```
Admin creates payout:
  POST /api/admin/payouts
  {
    affiliateId: "...",
    amount: 500.00,
    paymentMethod: "PAYPAL"
  }
  ↓
Backend:
  1. Creates Payout record
  2. Updates Commission records to status = PAID
  3. Deducts from affiliate's earnings
  ↓
Payout processed (manually or via payment gateway)
```

---

## 📊 Data Flow Diagram

```
┌─────────────┐
│   Frontend  │
│  (Next.js)  │
└──────┬──────┘
       │ HTTP Requests (JWT Auth)
       │
       ▼
┌─────────────┐
│   Backend   │
│  (Express)  │
└──────┬──────┘
       │
       │ Prisma ORM
       │
       ▼
┌─────────────┐
│  PostgreSQL │
│  Database   │
└─────────────┘
```

---

## 🔐 Security Flow

### **Authentication:**
1. User logs in → JWT token generated
2. Token stored in `localStorage` (frontend)
3. Every API request includes: `Authorization: Bearer <token>`
4. Backend validates token → extracts user ID
5. Checks user role → allows/denies access

### **Authorization:**
- **Middleware:** `authenticateToken` validates JWT
- **Role-based:** Routes check `req.user.role`
- **Resource-based:** Users can only access their own data (affiliates see only their data)

---

## 🗄️ Key Database Models

### **User & Profiles:**
- `User` - Base user account (email, password, role)
- `AffiliateProfile` - Affiliate-specific data (commission rate, earnings, etc.)
- `AdminProfile` - Admin permissions

### **Tracking:**
- `ReferralCode` - Discount codes assigned to affiliates
- `Coupon` - Coupon details (discount value, status)
- `AffiliateClick` - Tracks when someone clicks affiliate link
- `AffiliateOrder` - Tracks completed purchases
- `Commission` - Commission records (pending/approved/paid)

### **Content:**
- `Activity` - Stores deliverables submissions (JSON format)
- `AffiliateLink` - Shortened tracking links

### **Payouts:**
- `Payout` - Payout records (status, amount, payment method)

---

## 🎯 Main Features Flow Summary

### **1. Affiliate Dashboard:**
- View discount code & value
- Track performance (clicks, conversions, earnings)
- View charts & analytics
- Submit deliverables (links + photos)
- View commission history

### **2. Admin Dashboard:**
- Manage affiliates (create, edit, delete)
- Set custom deliverables notes
- View all analytics
- Approve commissions
- Process payouts
- System monitoring

### **3. Tracking System:**
- Cookie-based tracking (90 days)
- Click tracking
- Order attribution
- Commission calculation
- Real-time analytics

---

## 🔄 Real-World Example Flow

### **Complete Customer Journey:**

```
1. Affiliate (Sarah) shares link on Instagram:
   "Check out TC Nutrition! Use code ATHLETE001 for 10% off"
   Link: https://tcnutrition.com/?ref=ATHLETE001

2. Customer (John) clicks link
   → Tracking script sets cookie (affiliate: ATHLETE001)
   → Click recorded in database

3. John browses products
   → Cookie still active (90 days)

4. John adds items to cart ($100 total)
   → Applies discount code ATHLETE001
   → Gets 10% off ($90 total)

5. John completes purchase
   → Order success page calls Trackdesk.trackOrder()
   → System finds cookie → attributes to Sarah
   → Creates conversion record
   → Calculates commission: $90 × 30% = $27
   → Creates commission (PENDING)

6. Admin approves commission
   → Sarah's earnings increase by $27
   → Commission status = APPROVED

7. Admin processes payout
   → Sarah receives $500 (accumulated commissions)
   → All related commissions marked as PAID
```

---

## 📱 Frontend Pages Structure

```
/ (Home)
├── /auth
│   ├── /login
│   └── /register
├── /dashboard (Affiliate)
│   ├── / (Main dashboard)
│   ├── /deliverables (Submit content)
│   ├── /orders (View orders)
│   ├── /commissions (View earnings)
│   └── /links (Manage tracking links)
├── /admin (Admin)
│   ├── /affiliates (Manage affiliates)
│   ├── /commissions (Approve commissions)
│   └── /analytics (View reports)
└── /manager (Manager dashboard)
```

---

## 🛠️ Key API Endpoints

### **Authentication:**
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### **Affiliate:**
- `GET /api/athlete/profile` - Get profile (includes discount code & value)
- `GET /api/athlete/performance` - Get performance stats
- `POST /api/athlete/deliverables` - Submit deliverables
- `GET /api/athlete/deliverables` - Get submissions

### **Admin:**
- `GET /api/admin/affiliates` - List all affiliates
- `PATCH /api/admin/affiliates/:id` - Update affiliate
- `PATCH /api/admin/affiliates/:id/deliverables-note` - Set deliverables note
- `PATCH /api/admin/commissions/:id/approve` - Approve commission

### **Tracking:**
- `POST /api/tracking/click` - Track link click
- `POST /api/tracking/order` - Track order/conversion

### **Upload:**
- `POST /api/upload/deliverable` - Upload deliverable photo

---

## 🎨 UI/UX Flow

### **Theme System:**
- Dark/Light mode toggle
- Theme stored in localStorage
- Applied via Tailwind `dark:` classes

### **State Management:**
- **AuthContext** - Global auth state
- **ThemeContext** - Global theme state
- **React State** - Component-level state
- **API Client** - Centralized HTTP client with auth headers

---

## 🔍 Error Handling Flow

```
API Request fails
  ↓
Backend returns error (400/401/500)
  ↓
Frontend catches error
  ↓
Shows toast notification (using Sonner)
  ↓
Logs error to console
  ↓
User sees friendly error message
```

---

## 📈 Analytics Flow

```
Data collected:
  - Clicks (when, where, from what device)
  - Conversions (order value, commission)
  - Performance trends (over time)

Displayed as:
  - Charts (Recharts library)
  - Tables (with filters)
  - Cards (KPI metrics)
  - Real-time updates (via Socket.IO - if enabled)
```

---

## 🚀 Deployment Flow

### **Development:**
- Frontend: `npm run dev` → `localhost:3001`
- Backend: `npm run dev` → `localhost:3003`

### **Production:**
- Frontend: Build → Deploy to Vercel/Netlify
- Backend: Build → Deploy to Railway/Render/AWS
- Database: PostgreSQL (Neon Tech - cloud)

---

## 🎯 Summary

This is a **complete affiliate marketing platform** where:

1. **Affiliates** promote products using discount codes
2. **System tracks** clicks and conversions automatically
3. **Commissions** are calculated and managed
4. **Deliverables** are tracked (social media posts)
5. **Admins** manage everything from one dashboard
6. **Payouts** are processed when approved

The entire flow is automated, secure, and provides real-time analytics for both affiliates and admins!

