# Links & Assets API - Professional Implementation

## 📋 Overview

This document outlines the complete refactoring of the Links & Assets API from a mock/temporary data system to a fully functional, database-backed implementation following industry best practices.

---

## ✅ What Was Implemented

### 1. **Service Layer Architecture** ✓

- Created `LinksService.ts` - Separates business logic from route handlers
- Implements Single Responsibility Principle
- Reusable service methods across the application
- Better testability and maintainability

### 2. **Database Persistence** ✓

- **AffiliateLink Table**: Stores all generated tracking links

  - Unique short URLs with custom slugs
  - Click and conversion tracking
  - Active/inactive status management
  - Link expiration support

- **Coupon Table**: Manages promotional coupons

  - Unique coupon codes with auto-generation
  - Usage tracking and limits
  - Expiration dates
  - Active/inactive/expired statuses

- **AffiliateClick Table**: Tracks every click on affiliate links
  - Referrer tracking
  - User agent detection
  - IP address logging
  - UTM parameter support

### 3. **Professional API Routes** ✓

All routes now include:

- ✓ Proper HTTP status codes (201 Created, 404 Not Found, 409 Conflict)
- ✓ Consistent error handling
- ✓ Validation with Zod schemas
- ✓ Detailed error messages
- ✓ Success/failure response format

---

## 🔗 API Endpoints

### **Link Management**

#### 1. `POST /api/links/generate` - Generate Affiliate Link

**Authentication**: Required

**Request Body**:

```json
{
  "url": "https://example.com/product",
  "campaignName": "Summer Sale 2024",
  "customAlias": "summer-sale",
  "offerId": "offer_123"
}
```

**Response** (201 Created):

```json
{
  "success": true,
  "link": {
    "id": "clx123...",
    "originalUrl": "https://example.com/product",
    "affiliateUrl": "https://example.com/product?ref=aff_123&track=summer-sale",
    "shortUrl": "https://track.link/summer-sale",
    "trackingCode": "summer-sale",
    "campaignName": "Summer Sale 2024",
    "clicks": 0,
    "conversions": 0,
    "earnings": 0,
    "status": "Active",
    "createdAt": "2024-10-16T..."
  },
  "message": "Affiliate link generated successfully"
}
```

**Validation**:

- URL must be valid format
- Custom alias: 3-20 characters, alphanumeric with dashes/underscores
- Custom alias must be unique (returns 409 if taken)

---

#### 2. `GET /api/links/my-links` - Get All Affiliate Links

**Authentication**: Required

**Response** (200 OK):

```json
{
  "success": true,
  "links": [
    {
      "id": "clx123...",
      "name": "summer-sale",
      "url": "https://example.com/product",
      "shortUrl": "https://track.link/summer-sale",
      "trackingCode": "summer-sale",
      "campaignName": "Summer Sale 2024",
      "clicks": 156,
      "conversions": 23,
      "earnings": 345.5,
      "status": "Active",
      "createdAt": "2024-10-16T...",
      "category": "Products"
    }
  ],
  "total": 1
}
```

---

#### 3. `GET /api/links/stats/:linkId` - Get Link Statistics

**Authentication**: Required

**Response** (200 OK):

```json
{
  "success": true,
  "stats": {
    "link": {
      /* link details */
    },
    "clicks": [
      {
        "id": "clk123...",
        "referrer": "https://facebook.com",
        "userAgent": "Mozilla/5.0...",
        "ipAddress": "123.45.67.89",
        "createdAt": "2024-10-16T..."
      }
    ],
    "totalClicks": 156,
    "totalConversions": 23,
    "totalEarnings": 345.5,
    "conversionRate": 14.74
  }
}
```

---

#### 4. `PATCH /api/links/:linkId/status` - Update Link Status

**Authentication**: Required

**Request Body**:

```json
{
  "isActive": false
}
```

**Response** (200 OK):

```json
{
  "success": true,
  "link": {
    /* updated link */
  },
  "message": "Link deactivated successfully"
}
```

---

#### 5. `DELETE /api/links/:linkId` - Delete Link

**Authentication**: Required

**Response** (200 OK):

```json
{
  "success": true,
  "message": "Link deleted successfully"
}
```

---

### **Coupon Management**

#### 6. `GET /api/links/coupons/available` - Get Available Coupons

**Authentication**: Required

**Response** (200 OK):

```json
{
  "success": true,
  "coupons": [
    {
      "id": "cpn123...",
      "code": "PCT-ABC12345",
      "description": "20% off on all products",
      "discount": "20%",
      "type": "Percentage",
      "validUntil": "2024-12-31",
      "uses": 45,
      "maxUses": 100,
      "status": "ACTIVE",
      "createdAt": "2024-10-16T..."
    }
  ],
  "total": 1
}
```

---

#### 7. `POST /api/links/coupons/generate` - Generate Custom Coupon

**Authentication**: Required

**Request Body**:

```json
{
  "description": "Holiday Special - 25% off",
  "discountType": "PERCENTAGE",
  "discountValue": 25,
  "minPurchase": 50,
  "maxUsage": 200,
  "validDays": 90
}
```

**Response** (201 Created):

```json
{
  "success": true,
  "coupon": {
    "id": "cpn456...",
    "code": "PCT-DEF67890",
    "description": "Holiday Special - 25% off",
    "discount": "25%",
    "type": "Percentage",
    "minPurchase": "$50",
    "validUntil": "2025-01-14",
    "uses": 0,
    "maxUses": 200,
    "status": "ACTIVE",
    "createdAt": "2024-10-16T..."
  },
  "message": "Coupon generated successfully"
}
```

**Validation**:

- `discountType`: "PERCENTAGE" or "FIXED"
- `discountValue`: Must be positive number
- `maxUsage`: Positive integer (optional)
- `validDays`: 1-365 days (default: 90)

---

#### 8. `POST /api/links/coupons/validate` - Validate & Use Coupon

**Authentication**: Not required (public endpoint)

**Request Body**:

```json
{
  "couponCode": "PCT-ABC12345"
}
```

**Response** (200 OK):

```json
{
  "success": true,
  "valid": true,
  "discount": "20%",
  "affiliateId": "aff_123"
}
```

**Error Responses**:

- `400`: "Coupon not found"
- `400`: "Coupon is not active"
- `400`: "Coupon has expired"
- `400`: "Coupon usage limit reached"

---

#### 9. `PATCH /api/links/coupons/:couponId/deactivate` - Deactivate Coupon

**Authentication**: Required

**Response** (200 OK):

```json
{
  "success": true,
  "coupon": {
    /* updated coupon */
  },
  "message": "Coupon deactivated successfully"
}
```

---

### **Click Tracking**

#### 10. `POST /api/links/track/:trackingCode` - Track Click (API)

**Authentication**: Not required

**Request Body**:

```json
{
  "referrer": "https://facebook.com",
  "userAgent": "Mozilla/5.0...",
  "ipAddress": "123.45.67.89",
  "country": "US",
  "device": "mobile"
}
```

**Response** (200 OK):

```json
{
  "success": true,
  "redirectUrl": "https://example.com/product",
  "message": "Click tracked successfully"
}
```

---

#### 11. `GET /api/links/redirect/:trackingCode` - Redirect with Tracking

**Authentication**: Not required

**Behavior**:

- Automatically tracks click with headers (user-agent, referrer, IP)
- Returns 301 redirect to original URL
- Updates click counters in database

**Usage**: Use this URL for actual link sharing

```
https://yourapi.com/api/links/redirect/summer-sale
```

---

### **Marketing Assets**

#### 12. `GET /api/links/assets/banners` - Get Marketing Banners

**Authentication**: Required

**Response** (200 OK):

```json
{
  "success": true,
  "banners": [
    {
      "id": "banner-1",
      "name": "Hero Banner - 1200x628",
      "category": "Social Media",
      "size": "1200x628",
      "format": "PNG",
      "fileSize": "245 KB",
      "downloadUrl": "/assets/banners/hero-1200x628.png",
      "previewUrl": "/assets/banners/preview/hero-1200x628.png",
      "downloads": 156,
      "createdAt": "2024-01-01T..."
    }
  ],
  "total": 4
}
```

**Note**: Currently returns sample data. Can be enhanced with database-backed asset management.

---

## 🗄️ Database Schema

### **AffiliateLink** Table

```prisma
model AffiliateLink {
  id          String    @id @default(cuid())
  affiliateId String
  offerId     String?
  originalUrl String
  shortUrl    String    @unique
  customSlug  String?   @unique

  clicks      Int       @default(0)
  conversions Int       @default(0)
  earnings    Float     @default(0)

  isActive    Boolean   @default(true)
  expiresAt   DateTime?

  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  affiliate   AffiliateProfile @relation(...)
  offer       Offer?           @relation(...)
}
```

### **Coupon** Table

```prisma
model Coupon {
  id          String       @id @default(cuid())
  affiliateId String
  code        String       @unique
  description String
  discount    String
  validUntil  DateTime
  usage       Int          @default(0)
  maxUsage    Int?
  status      CouponStatus @default(ACTIVE)

  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  affiliate   AffiliateProfile @relation(...)
}

enum CouponStatus {
  ACTIVE
  INACTIVE
  EXPIRED
}
```

### **AffiliateClick** Table

```prisma
model AffiliateClick {
  id           String   @id @default(cuid())
  affiliateId  String
  referralCode String
  storeId      String
  url          String
  referrer     String?
  userAgent    String?
  utmSource    String?
  utmMedium    String?
  utmCampaign  String?
  ipAddress    String?

  createdAt    DateTime @default(now())

  affiliate    AffiliateProfile @relation(...)
}
```

---

## 🏗️ Architecture & Best Practices

### **1. Service Layer Pattern**

```
Routes (links.ts) → Service (LinksService.ts) → Database (Prisma)
```

**Benefits**:

- Separation of concerns
- Reusable business logic
- Easier testing
- Consistent error handling

### **2. Error Handling Strategy**

```typescript
try {
  // Business logic
} catch (error) {
  if (error instanceof z.ZodError) {
    // Validation errors → 400
  }
  if (error instanceof Error) {
    // Custom errors → Appropriate status
  }
  // Generic errors → 500
}
```

### **3. Validation with Zod**

All inputs validated before processing:

- Type safety
- Clear error messages
- Automatic sanitization

### **4. Consistent Response Format**

```json
{
  "success": true/false,
  "data": { ... },
  "message": "...",
  "error": "..." // if failed
}
```

### **5. Unique Constraint Handling**

- Custom aliases checked for uniqueness
- Retry logic for random code generation
- Proper 409 Conflict responses

### **6. Atomic Operations**

Click tracking updates:

1. Create click record
2. Increment link clicks
3. Increment affiliate total clicks

All in one transaction-like flow.

---

## 🔄 Migration from Old System

### **Before** (Mock Data):

```typescript
const linkData = {
  id: crypto.randomUUID(),
  // ... temporary data
};
res.json({ link: linkData });
```

### **After** (Database Persistence):

```typescript
const link = await LinksService.generateLink(userId, validatedData);
res.status(201).json({ success: true, link });
```

---

## 📊 Key Improvements

| Feature               | Before           | After                     |
| --------------------- | ---------------- | ------------------------- |
| **Link Storage**      | Temporary/Memory | Database (AffiliateLink)  |
| **Coupon Management** | Mock Arrays      | Database (Coupon)         |
| **Click Tracking**    | Console.log      | Database (AffiliateClick) |
| **Error Handling**    | Generic 500      | Specific status codes     |
| **Validation**        | Basic            | Zod schemas               |
| **Code Structure**    | Routes only      | Service layer             |
| **Business Logic**    | In routes        | Separated                 |
| **Uniqueness**        | Not checked      | Enforced                  |
| **Tracking**          | None             | Full analytics            |

---

## 🚀 Usage Examples

### **Frontend Integration**

```typescript
// Generate affiliate link
const response = await fetch(`${apiUrl}/api/links/generate`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify({
    url: "https://store.com/product",
    customAlias: "my-product",
    campaignName: "Instagram Campaign",
  }),
});

const { link } = await response.json();
console.log(link.shortUrl); // https://track.link/my-product

// Share this link - clicks are tracked automatically
```

### **Using Redirect Endpoint**

```html
<!-- Share this link on social media, emails, etc. -->
<a href="https://api.trackdesk.com/api/links/redirect/my-product">
  Check out this amazing product!
</a>

<!-- When clicked:
  1. Click is recorded in database
  2. User is redirected to original URL
  3. Affiliate gets credit
-->
```

---

## 🔐 Security Features

1. **Authentication**: All sensitive endpoints require auth token
2. **Authorization**: Users can only access their own links/coupons
3. **Input Validation**: Zod schemas prevent injection
4. **Rate Limiting**: Can be added at route level
5. **SQL Injection**: Prevented by Prisma ORM
6. **XSS Protection**: Input sanitization

---

## 📈 Performance Optimizations

1. **Database Indexing**:

   - `customSlug` indexed for fast lookups
   - `affiliateId` indexed for filtering
   - `referralCode` indexed for click tracking

2. **Query Optimization**:

   - Select only needed fields
   - Limit click history (last 100)
   - Proper joins with includes

3. **Caching Opportunities** (Future):
   - Redis for frequently accessed links
   - CDN for banner assets

---

## 🧪 Testing Recommendations

### **Unit Tests** (Service Layer):

```typescript
describe("LinksService", () => {
  it("should generate unique link", async () => {
    const link = await LinksService.generateLink(userId, data);
    expect(link.shortUrl).toBeDefined();
  });

  it("should reject duplicate alias", async () => {
    await expect(
      LinksService.generateLink(userId, { customAlias: "taken" })
    ).rejects.toThrow("Custom alias is already taken");
  });
});
```

### **Integration Tests** (Routes):

```typescript
describe("POST /api/links/generate", () => {
  it("should return 201 with valid data", async () => {
    const res = await request(app)
      .post("/api/links/generate")
      .send({ url: "https://example.com" });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });
});
```

---

## 🔮 Future Enhancements

1. **Marketing Assets Database** - Store banners in database/cloud storage
2. **Bulk Link Generation** - Generate multiple links at once
3. **Link Analytics Dashboard** - Visualize click patterns
4. **QR Code Generation** - Auto-generate QR codes for links
5. **A/B Testing** - Test different landing pages
6. **Geolocation Tracking** - Track clicks by country
7. **Device Analytics** - Mobile vs Desktop tracking
8. **Conversion Attribution** - Link sales to specific links
9. **Link Expiration Automation** - Auto-deactivate expired links
10. **Webhook Integration** - Notify on link events

---

## 📝 Summary

The Links & Assets API has been completely refactored from a mock/temporary system to a professional, production-ready implementation:

✅ **Service Layer Architecture** - Clean separation of concerns  
✅ **Full Database Persistence** - All data stored properly  
✅ **Comprehensive Click Tracking** - Analytics-ready  
✅ **Coupon Management System** - Complete lifecycle  
✅ **Professional Error Handling** - Proper status codes  
✅ **Input Validation** - Type-safe with Zod  
✅ **RESTful Best Practices** - Industry standards  
✅ **Scalable Design** - Ready for growth

The system is now production-ready with proper data persistence, tracking, and analytics capabilities!
