# 🏗️ TC Nutrition Athlete Portal - Complete Architectural Flow

## 📋 Executive Summary

This is a **full-stack affiliate management platform** (TC Nutrition Athlete Portal) built with modern architecture patterns. The system manages affiliates (athletes/influencers), tracks their performance, processes commissions, and handles payouts.

---

## 🎯 System Architecture Overview

### **Technology Stack**

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND LAYER                           │
│  Next.js 14/15 (App Router) + React + TypeScript            │
│  - Client-side rendering (CSR)                              │
│  - Server Components where applicable                       │
│  - Tailwind CSS + Shadcn/ui components                     │
│  Port: 3001                                                 │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTP/REST API
                            │ JWT Authentication
                            │
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND LAYER                            │
│  Node.js + Express + TypeScript                             │
│  - RESTful API architecture                                 │
│  - Service-oriented design                                  │
│  - Middleware-based authentication                          │
│  Port: 3003                                                 │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Prisma ORM
                            │
┌─────────────────────────────────────────────────────────────┐
│                    DATA LAYER                               │
│  PostgreSQL (Neon Tech - Cloud)                             │
│  - Relational database                                      │
│  - ACID compliance                                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 Complete Application Flow

### **Phase 1: Application Initialization**

#### **1.1 Frontend Bootstrap**
```
User visits application
    ↓
Next.js loads root layout (app/layout.tsx)
    ↓
AuthProvider wraps entire app
    ↓
AuthContext initializes:
  - Checks localStorage for accessToken
  - If token exists → fetches user profile from /api/auth/profile
  - Sets user state in React Context
    ↓
ThemeProvider initializes (light theme only)
    ↓
Application ready
```

**Key Files:**
- `frontend/app/layout.tsx` - Root layout with providers
- `frontend/contexts/AuthContext.tsx` - Authentication state management
- `frontend/lib/auth-client.ts` - Auth API client

#### **1.2 Backend Initialization**
```
Backend server starts (backend/src/index.ts)
    ↓
Express app configured:
  - CORS middleware (allows frontend origin)
  - Helmet security headers
  - Cookie parser
  - Rate limiting
  - Body parser (JSON)
    ↓
Socket.IO server initialized (for real-time features)
    ↓
All route handlers registered:
  - /api/auth/* - Authentication
  - /api/athlete/* - Affiliate endpoints
  - /api/admin/* - Admin endpoints
  - /api/tracking/* - Tracking endpoints
    ↓
Server listening on port 3003
```

**Key Files:**
- `backend/src/index.ts` - Server entry point
- `backend/src/middleware/auth.ts` - Authentication middleware

---

### **Phase 2: Authentication Flow**

#### **2.1 User Login Flow**

```
┌─────────────┐
│   Frontend  │
│  Login Page │
└──────┬──────┘
       │
       │ User enters email/password
       │ Clicks "Login"
       │
       ▼
┌─────────────────────────────────────┐
│ AuthContext.login()                  │
│ - Calls authClient.login()           │
│ - Sends POST /api/auth/login         │
└──────────────┬───────────────────────┘
               │
               │ HTTP POST
               │ { email, password }
               │
               ▼
┌─────────────────────────────────────┐
│ Backend: /api/auth/login             │
│ AuthController.login()              │
│   ↓                                  │
│ AuthService.login()                  │
│   - Validates credentials            │
│   - Checks password hash             │
│   - Generates JWT token             │
│   - Returns { token, user }          │
└──────────────┬───────────────────────┘
               │
               │ Response: { token, user }
               │
               ▼
┌─────────────────────────────────────┐
│ Frontend: authClient.login()        │
│ - Stores token in localStorage       │
│ - Stores user data in localStorage  │
│ - Updates AuthContext state          │
└──────────────┬───────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ Redirect based on role:              │
│ - AFFILIATE → /dashboard             │
│ - ADMIN → /admin                     │
│ - MANAGER → /manager                 │
└─────────────────────────────────────┘
```

**Key Components:**
- `frontend/app/auth/login/page.tsx` - Login UI
- `frontend/lib/auth-client.ts` - Auth API wrapper
- `backend/src/routes/auth.ts` - Auth routes
- `backend/src/services/AuthService.ts` - Auth business logic

#### **2.2 Token Management**

**Token Storage:**
- **Frontend:** `localStorage.getItem("accessToken")`
- **Backend:** Validates via `Authorization: Bearer <token>` header

**Token Flow:**
```
Every API Request:
  Frontend → apiClient.interceptors.request
    ↓
  Reads token from localStorage
    ↓
  Adds header: Authorization: Bearer <token>
    ↓
  Backend → authenticateToken middleware
    ↓
  Verifies JWT signature
    ↓
  Extracts userId from token
    ↓
  Fetches user from database
    ↓
  Attaches user to req.user
    ↓
  Route handler processes request
```

**Key Files:**
- `frontend/lib/api-client.ts` - Axios instance with interceptors
- `backend/src/middleware/auth.ts` - Token validation

---

### **Phase 3: Dashboard Flow (Affiliate)**

#### **3.1 Dashboard Page Load**

```
User navigates to /dashboard
    ↓
DashboardLayoutWrapper renders
    ↓
TCNutritionDashboardLayout (sidebar + header)
    ↓
DashboardPage component mounts
    ↓
useEffect triggers fetchData()
    ↓
Parallel API calls:
  ├─ GET /api/athlete/profile
  ├─ GET /api/athlete/performance?dateRange=yesterday
  ├─ GET /api/athlete/detailed-performance?dateRange=yesterday
  └─ GET /api/athlete/commission-summary
    ↓
All responses received
    ↓
State updated:
  - profileData
  - performanceData
  - detailedPerformance
  - commissionSummary
    ↓
UI renders with data
```

**Key File:** `frontend/app/dashboard/page.tsx` (624 lines - needs refactoring!)

#### **3.2 Data Fetching Architecture**

**Current Pattern (Needs Improvement):**
```typescript
// Direct API calls in component - NOT ideal
const fetchData = async () => {
  const [profileRes, performanceRes, ...] = await Promise.all([
    apiClient.get("/athlete/profile"),
    apiClient.get(`/athlete/performance?dateRange=${dateRange}`),
    // ...
  ]);
  setProfileData(profileRes.data);
  // ...
};
```

**Problems:**
1. ❌ Business logic mixed with UI
2. ❌ No error boundaries
3. ❌ No request caching
4. ❌ No loading state management
5. ❌ Hard to test

**Recommended Architecture:**
```
Component (UI only)
    ↓
Custom Hook (useDashboardData)
    ↓
Service Layer (DashboardService)
    ↓
API Client (apiClient)
    ↓
Backend API
```

---

### **Phase 4: Backend Request Processing**

#### **4.1 Request Lifecycle**

```
HTTP Request arrives
    ↓
Express middleware chain:
  1. CORS middleware
  2. Helmet security
  3. Cookie parser
  4. Body parser
  5. Rate limiter
    ↓
Route matcher finds handler
    ↓
Authentication middleware (authenticateToken):
  - Extracts token from header/cookie
  - Validates JWT
  - Fetches user from DB
  - Attaches to req.user
    ↓
Authorization middleware (if needed):
  - requireRole(['ADMIN'])
  - requireAffiliate()
  - requireAdmin()
    ↓
Route handler executes:
  - Extracts params/query/body
  - Calls Service layer
  - Service performs business logic
  - Service queries database via Prisma
  - Returns response
    ↓
Response sent to frontend
```

**Example: GET /api/athlete/profile**

```typescript
// Route: backend/src/routes/athlete.ts
router.get("/profile", authenticateToken, async (req, res) => {
  // req.user is populated by authenticateToken middleware
  const userId = req.user.id;
  
  // Direct database query (should use service layer)
  const affiliate = await prisma.affiliateProfile.findFirst({
    where: { userId },
    include: { user: true, referralCodes: true }
  });
  
  // Format response
  res.json({
    instagram: affiliate.socialMedia.instagram,
    tiktok: affiliate.socialMedia.tiktok,
    discountCodes: [...],
  });
});
```

---

### **Phase 5: Data Flow Patterns**

#### **5.1 State Management Architecture**

**Current State:**
```
React Context (AuthContext)
    ↓
Component-level useState hooks
    ↓
Direct API calls
    ↓
State updates
```

**Issues:**
- No centralized state management
- Prop drilling potential
- No state persistence strategy
- No optimistic updates

**Recommended:**
```
React Query / SWR (for server state)
    ↓
Zustand / Redux (for client state)
    ↓
React Context (for auth only)
```

#### **5.2 Data Flow Diagram**

```
┌─────────────────────────────────────────────────────────┐
│                    USER INTERACTION                      │
│  - Clicks button                                         │
│  - Changes date range                                    │
│  - Submits form                                          │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              REACT COMPONENT                             │
│  - Event handler triggered                               │
│  - Calls hook or service                                 │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              CUSTOM HOOK / SERVICE                       │
│  - Validates input                                       │
│  - Prepares request                                      │
│  - Manages loading state                                 │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              API CLIENT (Axios)                          │
│  - Adds auth token                                       │
│  - Handles errors                                        │
│  - Transforms request                                    │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ HTTP Request
                     │ Authorization: Bearer <token>
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              BACKEND MIDDLEWARE                          │
│  - CORS check                                            │
│  - Auth validation                                       │
│  - Rate limiting                                         │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              ROUTE HANDLER                               │
│  - Extracts params                                       │
│  - Validates input (Zod)                                 │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              SERVICE LAYER                               │
│  - Business logic                                        │
│  - Data transformation                                   │
│  - Error handling                                        │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              PRISMA ORM                                  │
│  - Database queries                                      │
│  - Data mapping                                          │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              POSTGRESQL DATABASE                         │
│  - Data storage                                          │
│  - ACID transactions                                     │
└─────────────────────────────────────────────────────────┘
```

---

## 🔐 Security Architecture

### **Authentication Strategy**

**Multi-source Token Support:**
```typescript
// Backend accepts tokens from:
1. Authorization header: Bearer <token>
2. Cookie: accessToken
3. Cookie: token (legacy)
```

**Token Validation:**
```
Token received
    ↓
JWT.verify(token, JWT_SECRET)
    ↓
Extract { userId, email, role }
    ↓
Query database: User.findUnique({ id: userId })
    ↓
Include related profiles:
  - affiliateProfile (if AFFILIATE)
  - adminProfile (if ADMIN/MANAGER)
    ↓
Attach to req.user
```

### **Authorization Layers**

1. **Route-level:** `requireRole(['ADMIN'])`
2. **Resource-level:** Users can only access their own data
3. **Frontend:** Role-based redirects and UI hiding

---

## 📊 Key Architectural Patterns

### **1. Service Layer Pattern** (Backend)
```
Controller → Service → Database
```
- **Controller:** Handles HTTP, validates input
- **Service:** Business logic, data transformation
- **Database:** Data persistence

### **2. Context Pattern** (Frontend)
```
AuthContext → Provides auth state globally
ThemeContext → Provides theme state globally
```

### **3. Middleware Pattern** (Backend)
```
Request → Middleware Chain → Route Handler
```

### **4. Component Composition** (Frontend)
```
Layout → Dashboard Layout → Page Component
```

---

## 🚨 Current Architectural Issues

### **1. Dashboard Page Complexity**
- **Problem:** 624-line component doing everything
- **Impact:** Hard to maintain, test, and extend
- **Solution:** Break into smaller components + custom hooks

### **2. No Service Layer Abstraction (Frontend)**
- **Problem:** Direct API calls in components
- **Impact:** Business logic scattered, hard to reuse
- **Solution:** Create service layer (e.g., `DashboardService.ts`)

### **3. State Management**
- **Problem:** Multiple useState hooks, no caching
- **Impact:** Unnecessary re-renders, no request deduplication
- **Solution:** React Query or SWR

### **4. Error Handling**
- **Problem:** Basic try/catch, no error boundaries
- **Impact:** Poor user experience on errors
- **Solution:** Error boundaries + centralized error handling

### **5. Type Safety**
- **Problem:** `any[]` types, missing interfaces
- **Impact:** Runtime errors, poor DX
- **Solution:** Define proper TypeScript interfaces

---

## 🎯 Recommended Refactoring Strategy

### **Phase 1: Extract Custom Hooks**
```typescript
// hooks/useDashboardData.ts
export function useDashboardData(dateRange: string) {
  // All data fetching logic here
  // Returns { data, loading, error, refetch }
}
```

### **Phase 2: Create Service Layer**
```typescript
// services/DashboardService.ts
export class DashboardService {
  static async getProfile() { ... }
  static async getPerformance(dateRange: string) { ... }
  // ...
}
```

### **Phase 3: Component Decomposition**
```typescript
// components/dashboard/ProfileSection.tsx
// components/dashboard/PerformanceSection.tsx
// components/dashboard/CommissionSection.tsx
```

### **Phase 4: Add React Query**
```typescript
// Replace useState + useEffect with React Query
const { data, isLoading } = useQuery(['dashboard', dateRange], 
  () => DashboardService.getPerformance(dateRange)
);
```

---

## 📈 Data Models & Relationships

### **Core Entities**

```
User
  ├─ AffiliateProfile (1:1)
  │   ├─ ReferralCodes (1:many)
  │   ├─ Coupons (1:many)
  │   └─ Commissions (1:many)
  │
  └─ AdminProfile (1:1, optional)

AffiliateProfile
  ├─ Tracks performance metrics
  ├─ Stores social media handles
  └─ Links to commissions/orders

Coupon
  ├─ Discount codes for affiliates
  ├─ Linked to AffiliateProfile
  └─ Tracks usage

Commission
  ├─ Calculated from orders
  ├─ Status: PENDING/APPROVED/PAID
  └─ Linked to AffiliateProfile
```

---

## 🔄 Real-World Flow Example

### **Scenario: Affiliate Views Dashboard**

```
1. User opens browser → navigates to app
2. AuthContext checks localStorage → finds token
3. Fetches user profile → validates session
4. User clicks "Dashboard" → navigates to /dashboard
5. DashboardPage mounts → shows loading spinner
6. useEffect triggers → fetchData() called
7. 4 parallel API requests sent:
   - Profile data
   - Performance metrics
   - Detailed charts
   - Commission summary
8. Backend processes each request:
   - Validates JWT token
   - Queries database
   - Formats response
9. Frontend receives responses → updates state
10. UI re-renders with data → shows dashboard
11. User changes date range → triggers new fetch
12. Process repeats with new dateRange parameter
```

---

## 🎓 Key Takeaways

1. **Architecture:** Clean separation between frontend/backend
2. **Authentication:** JWT-based with localStorage storage
3. **Authorization:** Role-based access control (RBAC)
4. **Data Flow:** RESTful API with Prisma ORM
5. **State Management:** React Context + useState (needs improvement)
6. **Error Handling:** Basic, needs enhancement
7. **Type Safety:** Partial TypeScript coverage

---

## 🚀 Next Steps for Improvement

1. **Refactor Dashboard Page** - Break into smaller components
2. **Add React Query** - Better data fetching and caching
3. **Create Service Layer** - Abstract API calls
4. **Improve Type Safety** - Remove all `any` types
5. **Add Error Boundaries** - Better error handling
6. **Implement Optimistic Updates** - Better UX
7. **Add Unit Tests** - Ensure reliability
8. **Performance Optimization** - Code splitting, lazy loading

---

*This document provides a comprehensive architectural overview. For specific implementation details, refer to the individual files mentioned throughout.*




